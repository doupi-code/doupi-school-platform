# ADM-06 实物领纸、纸张核销与可用余纸退库

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-06)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期5人日。负责受派执行人的实际领纸/补领、仓库发出、四类真实耗用核销、专门更正、原领纸可用余纸验收与库存兼容凭证；不把计划和签收再次计为出库。排期前置为ADM-05；复用ADM-03根锁/幂等与已定义的统一库存写入契约、ADM-04私有结果文件。完整库存管理界面在ADM-10联调，不倒置依赖。

- [ ] 第1日：实现`StockLedger.java`余额锁、signed delta及兼容凭证
- [ ] 第2日：实现`PrintService.issue/paperReturn`和`PrintRepository`纸张事件
- [ ] 第3日：实现`settle`四类守恒及更正审计
- [ ] 第4日：在待实施`doupi-web-admin-react/src/pages/office/print/paper.tsx`和`settlement.tsx`展示领/耗/退/余及独立版本
- [ ] 第5日：用真实H2事务跑重复领纸、余纸先退、错误原单、核销后退纸、并发余额不足和回滚。实现说明代码见本模块第5节，不改生产src，不执行生产DDL。

验收基线：库存1000→实领220后780；核销200合格纸+1制版+2试印+5损耗=208，库存仍780；可用余纸退12后库存792，核销CLOSED；issued220=consumed208+returned12+unused0。同键重放不新增事件或流水，根只加一次version。废纸不得以REUSABLE退库。

## 2. 接口设计清单

前缀`/api/v1/office/print-requests/{id}`。全部为员工鉴权写请求，要求`Idempotency-Key`与body `expectedVersion`。所有ID正数、数量为精确整数；paperGoodsId必须等于印品获准纸张。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/是否必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 办理 paper-issues | POST | `/api/v1/office/print-requests/paper-issues` | `expectedVersion,printId,paperGoodsId,receiverUserId,qty`正数，`reason`1—500 | `issueId,movementId,issuedQty,stockQtyBase,requestId,status,version`；201 | `print:paper:issue` |
| 办理 settlements | POST | `/api/v1/office/print-requests/settlements` | `expectedVersion,printId,paperGoodsId,expectedSettlementVersion`，`goodCopyCount,goodPaperQty,templatePaperQty,previewPaperQty,wastePaperQty,unusedQty`均非负；`resultFileIds`可省略，元素为正fileId字符串的数组；`reason`可空≤1000 | `settlementId,consumedQty,unusedQty,paperStatus,settlementVersion,requestId,status,version`；200 | `print:settlement:confirm` |
| 办理 settlement-corrections | POST | `/api/v1/office/print-requests/settlement-corrections` | 同核销全部字段，`expectedSettlementVersion`必须当前值，`reason`1—1000必填 | 同核销；200 | `print:settlement:correct` |
| 办理 paper-returns | POST | `/api/v1/office/print-requests/paper-returns` | `expectedVersion,printId,paperGoodsId,originalIssueId,receiverUserId,qty`正数，`expectedSettlementVersion`非负，`condition=REUSABLE`，`reason`1—500 | `returnIssueId,movementId,stockQtyBase,requestId,status,version`；201 | `print:paper:return` |
| 查询 {id} | GET | `/api/v1/office/print-requests/{id}` | path id；无body | `request,records,issues,settlements,deliveries,files`；200，见ADM-05 | `print:request:read` |

`expectedSettlementVersion=0`在尚无核销行时代表不存在；存在且version=0也可合法匹配，根expectedVersion同时防止创建/退纸竞争。响应paperStatus只允许PENDING_RETURN/CLOSED；首次核销settlementVersion=0，之后更正及退纸都+1。


## 3. 数据流转细节

| API字段/来源 | 校验、逻辑及字段落点 | 同事务事实与缓存 |
|---|---|---|
| issue：id/expectedVersion | 根必须PRINT，状态PROCESSING/WAIT_RECEIPT/WAIT_SETTLEMENT；Actor须根快照warehouseRoleId有效岗位；锁根后锁本根print | Commands固定PRINT_PAPER_ISSUE先查幂等再版本；不依赖Redis库存锁 |
| issue：printId,paperGoodsId,receiverUserId,qty,reason | print归本根且NEW_ISSUE，无已有核销；纸张一致；receiver必须有效且等于根handler_user_id；qty>0，reason存补领/用途说明 | 先INSERT edu_print_paper_issue得issue_id；request_id/print_id/paper_goods_id/kind=ISSUE/qty/base_unit=张/operator_user_id=Actor/receiver_user_id/confirmed_by=Actor/confirmed_at=服务端/action_id。随后movement写source_type=PRINT_PAPER/source_id=source_item_id=issue_id/kind=ISSUE/delta=-qty；回填事件stock_movement_id/out_id；print.issued_qty+=qty/production_status=PRINTING/version+1 |
| StockLedger：goodsId与signed delta来自内部命令 | 锁有效edu_goods；before=stock_qty_base，after=before+delta非负且不溢出；conversion_rate>0/base_unit非空，条件版本更新 | goods.stock_qty_base=after、stock_num=after/rate、remain_sheets=after%rate、version+1；stock_movement写goods/request/action/source/type/kind/delta/before/after/base_unit/goods_version/actor/occurred_at/posted_at/reason；兼容stock_out/in头按action复用、明细movement_id唯一，单位基础量快照，禁止旧保存分支再扣一次 |
| settlement：printId/paperGoodsId/expectedSettlementVersion | 根及子项归属正确，PROCESSING/WAIT_RECEIPT/WAIT_SETTLEMENT/CANCEL_PENDING；初次仅受派PRINT_SETTLE任务，已存在必须专门更正；更正需executor岗位且理由必填 | 通过print_id确定request归属，edu_print_settlement没有request_id，不得误用该列；根锁→print→settlement；核销不调用StockLedger |
| settlement：goodCopyCount,goodPaperQty,templatePaperQty,previewPaperQty,wastePaperQty,unusedQty | copies介于已交付与获准份数；合格品耗纸须等于合格份数×获准每份用纸（双面向上取整），零合格对应零纸；consumed=good+template+preview+waste；unused必须精确等于issued-returned-consumed，负数或溢出拒绝 | settlement写good_copy_count及四类paper_qty、consumed_qty、unused_qty/status/request_revision/confirmed_by/confirmed_at/action_id/version；print.consumed_qty、production_status=FINISHED、settlement_status、旧status=1、version+1。未用>0建PRINT_RETURN/PRINT/printId仓库任务；为0关闭本印品退纸任务；关闭本PRINT_SETTLE任务 |
| settlement：resultFileIds[]、reason | 文件READY/PASSED，自己或已绑定本根；RESULT由服务端固定；reason存exception_reason，更正需保留before/after | office_request_file.record_scope_id=printId/purpose=RESULT/revision=根revision；action.after_json.details保存原核销及新四类数值；事件PRINT_SETTLED。库存余额完全不变 |
| return：originalIssueId、printId、paperGoodsId、receiverUserId、qty、condition、expectedSettlementVersion、reason | Actor仓库岗位；condition只能REUSABLE；原事件必须同根同print同纸且kind ISSUE；交回人同原领纸人；qty≤原领累计可退，且≤本print issued-returned-consumed；已有核销还需qty≤unused，核销版本匹配 | INSERT RETURN事件original_issue_id/receiver/确认人等；StockLedger正delta=qty，只在验收可再用实物时入库；print.returned_qty+=qty/version+1；已有settlement.unused_qty-=qty，0则CLOSED，否则PENDING_RETURN，version+1并同步print.settlement_status；只关闭该print退纸任务；PRINT_PAPER_RETURNED事件 |
| 未核销时先退纸 | expectedSettlementVersion=0，根锁重查若出现新核销或根版本变化409；原单累计上限照常 | 不虚建零核销，只RETURN及余额正流水；以后核销用已退数量计算unused |
| 各动作后根状态 | 多子项逐项读取：仍有未核销/未完工为PROCESSING；全部生产完成但余纸未清为WAIT_SETTLEMENT；纸已清但未全签为WAIT_RECEIPT；全部子项签收+核销CLOSED+无争议才COMPLETED；取消中的根保留CANCEL_PENDING等专属关闭 | 根version仅由Commands增加；COMPLETED设置closed_at；Outbox与业务提交，通知失败异步重试。查询缓存可失效，库存不缓存为事实 |

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**edu_print_record**

```sql
CREATE TABLE `edu_print_record` (
  `print_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '印刷ID',
  `print_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '印刷名称',
  `paper_goods_id` BIGINT NOT NULL COMMENT '用纸物品ID',
  `paper_type` VARCHAR(10) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '用纸类型：A3/A4/8K/16K',
  `print_count` BIGINT NOT NULL COMMENT '印刷份数',
  `page_count` BIGINT DEFAULT '1' COMMENT '每份页数/张数',
  `print_side` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '1' COMMENT '印刷方式(1单页印刷 2双页印刷)',
  `color_category` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '黑白' COMMENT '颜色类别(黑白/彩色，必填，默认黑白)',
  `print_purpose` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '文印用途(≤20份必填，>20份选填，300字内)',
  `template_paper_count` BIGINT DEFAULT '0' COMMENT '模板用纸张数(新规则固定1张，历史记录为0表示旧规则未计入)',
  `preview_paper_count` BIGINT DEFAULT '0' COMMENT '印刷预览用纸张数(新规则固定1张，历史记录为0表示旧规则未计入)',
  `total_pages` BIGINT DEFAULT NULL COMMENT '消耗总张数(份数*页数)',
  `teacher_id` BIGINT DEFAULT NULL COMMENT '申请教师ID，关联edu_teacher',
  `grade` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '年级',
  `class_id` BIGINT DEFAULT NULL COMMENT '班级ID',
  `class_name` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '班级名称',
  `operator` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '经办人',
  `print_time` DATETIME NOT NULL COMMENT '印刷时间',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '状态 0-待印刷 1-已完成 2-已作废',
  `out_id` BIGINT DEFAULT NULL COMMENT '关联出库单ID',
  `attachment` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '原稿附件',
  `result_img` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '印刷效果图',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  `error_count` BIGINT DEFAULT NULL COMMENT '印刷错误张数',
  `error_remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '印刷错误说明',
  `error_out_id` BIGINT DEFAULT NULL COMMENT '错误关联出库单ID',
  `source_conversation_id` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源微信导出会话ID',
  `source_message_id` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '来源微信消息标识',
  PRIMARY KEY (`print_id`),
  INDEX `idx_teacher_id` (`teacher_id`),
  INDEX `idx_error_out_id` (`error_out_id`),
  INDEX `idx_print_source_conv_msg` (`source_conversation_id`, `source_message_id`),
  `request_id` BIGINT NULL COMMENT '新增，1:N普通索引，不能加UK',
  `item_no` INT NOT NULL COMMENT '新增，同一申请稳定子项序号，历史回填后收紧',
  `reprint_of_print_id` BIGINT NULL COMMENT '新增，重印对应原印品，不能覆盖原事实',
  `reprint_reason` VARCHAR(500) NULL COMMENT '新增，重印必填原因',
  `planned_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，预计基础用纸，不扣库',
  `issued_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，领纸累计投影',
  `returned_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，可用退纸累计投影',
  `consumed_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，核销实耗投影，不再扣库',
  `delivered_count` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，实际交付累计，包含待确认和争议中的交付',
  `signed_count` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，只累计CONFIRMED交付份数',
  `production_status` VARCHAR(16) NOT NULL DEFAULT 'PLANNED' COMMENT '新增，PLANNED/PRINTING/FINISHED/STOPPED',
  `settlement_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '新增，PENDING/PENDING_RETURN/CLOSED/EXCEPTION',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，子项版本，动作还锁根版本',
  `legacy_stock_mode` VARCHAR(16) NOT NULL DEFAULT 'NEW_ISSUE' COMMENT '新增，LEGACY_DEDUCTED/NEW_ISSUE，旧已扣纸隔离',
  UNIQUE `uk_print_request_item` (
    `request_id`,
    `item_no`
  ),
  INDEX `idx_print_request` (`request_id`, `print_id`),
  INDEX `idx_print_class` (`class_id`, `print_time`),
  INDEX `idx_print_goods` (`paper_goods_id`),
  INDEX `idx_print_out_id` (`out_id`),
  INDEX `idx_print_reprint` (`reprint_of_print_id`),
  CONSTRAINT `fk_ref_040` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_041` FOREIGN KEY (`paper_goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_042` FOREIGN KEY (`class_id`) REFERENCES `edu_class` (
    `class_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_103` FOREIGN KEY (`reprint_of_print_id`) REFERENCES `edu_print_record` (
    `print_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_104` FOREIGN KEY (`teacher_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='印刷登记表';
```

**edu_print_paper_issue**

```sql
CREATE TABLE `edu_print_paper_issue` (
  `issue_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '实物事件，无独立issue_item表',
  `request_id` BIGINT NOT NULL COMMENT '所属申请',
  `print_id` BIGINT NOT NULL COMMENT '印品子项',
  `paper_goods_id` BIGINT NOT NULL COMMENT '必须与子项纸张一致',
  `kind` VARCHAR(8) NOT NULL COMMENT 'ISSUE领纸/RETURN验收可用余纸',
  `qty` BIGINT NOT NULL COMMENT '本次基础量，大于0',
  `base_unit` VARCHAR(20) NOT NULL DEFAULT '张' COMMENT '计量快照',
  `original_issue_id` BIGINT NULL COMMENT 'RETURN必填原ISSUE，多次退纸累计不得超可退量',
  `stock_movement_id` BIGINT NULL COMMENT '事务内暂空，提交前必须绑定唯一库存流水；历史回填亦需核对',
  `out_id` BIGINT NULL COMMENT 'ISSUE兼容出库头',
  `in_id` BIGINT NULL COMMENT 'RETURN兼容入库头',
  `operator_user_id` BIGINT NOT NULL COMMENT '经办人',
  `receiver_user_id` BIGINT NOT NULL COMMENT '领纸人/交回人',
  `confirmed_by` BIGINT NOT NULL COMMENT '发出/验收确认人',
  `confirmed_at` DATETIME(3) NOT NULL COMMENT '实物时间',
  `reason` VARCHAR(500) NULL COMMENT '补领/退回原因',
  `action_id` BIGINT NOT NULL COMMENT '幂等动作',
  `created_at` DATETIME(3) NOT NULL COMMENT '建立时间',
  PRIMARY KEY (`issue_id`),
  UNIQUE `uk_paper_movement` (
    `stock_movement_id`
  ),
  UNIQUE `uk_paper_action` (
    `action_id`
  ),
  INDEX `idx_paper_print` (`print_id`, `issue_id`),
  INDEX `idx_paper_request` (`request_id`, `issue_id`),
  INDEX `idx_paper_original` (`original_issue_id`),
  INDEX `idx_paper_goods` (`paper_goods_id`, `confirmed_at`),
  INDEX `idx_paper_out` (`out_id`),
  INDEX `idx_paper_in` (`in_id`),
  CONSTRAINT `ck_edu_print_paper_issue_0` CHECK (qty > 0),
  CONSTRAINT `ck_edu_print_paper_issue_1` CHECK (kind IN ('ISSUE', 'RETURN')),
  CONSTRAINT `fk_ref_043` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_044` FOREIGN KEY (`paper_goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_045` FOREIGN KEY (`stock_movement_id`) REFERENCES `stock_movement` (
    `movement_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_046` FOREIGN KEY (`operator_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_047` FOREIGN KEY (`receiver_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_048` FOREIGN KEY (`confirmed_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_049` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_105` FOREIGN KEY (`print_id`) REFERENCES `edu_print_record` (
    `print_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_106` FOREIGN KEY (`original_issue_id`) REFERENCES `edu_print_paper_issue` (
    `issue_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='edu_print_paper_issue';
```

**edu_print_settlement**

```sql
CREATE TABLE `edu_print_settlement` (
  `settlement_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '核销',
  `print_id` BIGINT NOT NULL COMMENT '子项，可反查根',
  `paper_goods_id` BIGINT NOT NULL COMMENT '固定纸张',
  `good_copy_count` BIGINT NOT NULL COMMENT '合格印品份数',
  `good_paper_qty` BIGINT NOT NULL COMMENT '合格品耗纸',
  `template_paper_qty` BIGINT NOT NULL COMMENT '实际制版纸',
  `preview_paper_qty` BIGINT NOT NULL COMMENT '实际试印纸',
  `waste_paper_qty` BIGINT NOT NULL COMMENT '错印及其他已损耗纸',
  `consumed_qty` BIGINT NOT NULL COMMENT '四类实际耗用之和',
  `unused_qty` BIGINT NOT NULL COMMENT '当前未用且尚待处置的纸张，退纸后实时核减',
  `status` VARCHAR(16) NOT NULL COMMENT 'PENDING_RETURN/CLOSED；有未解释差异不能确认核销',
  `request_revision` INT NOT NULL COMMENT '批准内容轮次',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '有效核销版本',
  `confirmed_by` BIGINT NOT NULL COMMENT '核销人',
  `confirmed_at` DATETIME(3) NOT NULL COMMENT '时间',
  `action_id` BIGINT NOT NULL COMMENT '最近核销/专门更正动作，历史由action快照保存',
  `exception_reason` VARCHAR(1000) NULL COMMENT '差异/更正说明',
  `created_by_user_id` BIGINT NOT NULL COMMENT '创建者身份',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`settlement_id`),
  UNIQUE `uk_settlement_print_goods` (
    `print_id`,
    `paper_goods_id`
  ),
  CONSTRAINT `ck_edu_print_settlement_0` CHECK (consumed_qty = good_paper_qty + template_paper_qty + preview_paper_qty + waste_paper_qty),
  CONSTRAINT `ck_edu_print_settlement_1` CHECK (unused_qty >= 0),
  CONSTRAINT `fk_ref_050` FOREIGN KEY (`paper_goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_051` FOREIGN KEY (`confirmed_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_052` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_053` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_107` FOREIGN KEY (`print_id`) REFERENCES `edu_print_record` (
    `print_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='edu_print_settlement';
```

**stock_movement**

```sql
CREATE TABLE `stock_movement` (
  `movement_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '流水，不当作全库提交顺序',
  `goods_id` BIGINT NOT NULL COMMENT '所有写入先锁该物品余额',
  `request_id` BIGINT NULL COMMENT '来源事项',
  `action_id` BIGINT NOT NULL COMMENT '一次动作可多物品',
  `source_type` VARCHAR(32) NOT NULL COMMENT 'IN_ITEM/OUT_ITEM/PRINT_PAPER/CHECK_ITEM等',
  `source_id` BIGINT NOT NULL COMMENT '来源头/纸张事件',
  `source_item_id` BIGINT NOT NULL COMMENT '来源明细，一规格事件取issue_id',
  `movement_kind` VARCHAR(24) NOT NULL COMMENT 'RECEIVE/ISSUE/RETURN/CHECK_ADJUST/CORRECTION/OPENING',
  `delta_qty` BIGINT NOT NULL COMMENT '基础量增减，入正出负',
  `before_qty` BIGINT NOT NULL COMMENT '变化前可用量',
  `after_qty` BIGINT NOT NULL COMMENT '变化后量，必须非负',
  `base_unit` VARCHAR(20) NOT NULL COMMENT '历史单位快照',
  `goods_version` BIGINT NOT NULL COMMENT '该物品变化后版本，逐物品递增',
  `actor_user_id` BIGINT NOT NULL COMMENT '操作者身份',
  `occurred_at` DATETIME(3) NOT NULL COMMENT '实物时间，可补录，不作并发边界',
  `posted_at` DATETIME(3) NOT NULL COMMENT '入账时间',
  `reversal_of_movement_id` BIGINT NULL COMMENT '经批准更正的原流水，真实归还是RETURN',
  `reason` VARCHAR(1000) NULL COMMENT '变动依据',
  PRIMARY KEY (`movement_id`),
  UNIQUE `uk_movement_source` (
    `source_type`,
    `source_id`,
    `source_item_id`,
    `movement_kind`
  ),
  UNIQUE `uk_goods_movement_version` (
    `goods_id`,
    `goods_version`
  ),
  INDEX `idx_movement_goods` (`goods_id`, `movement_id`),
  INDEX `idx_movement_request` (`request_id`, `movement_id`),
  INDEX `idx_movement_action` (`action_id`),
  INDEX `idx_movement_reversal` (`reversal_of_movement_id`),
  CONSTRAINT `ck_stock_movement_0` CHECK (delta_qty <> 0),
  CONSTRAINT `ck_stock_movement_1` CHECK (after_qty >= 0),
  CONSTRAINT `fk_ref_073` FOREIGN KEY (reversal_of_movement_id) REFERENCES `stock_movement` (
    `movement_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_074` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_075` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_076` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_077` FOREIGN KEY (`actor_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='stock_movement';
```

**edu_goods**

```sql
CREATE TABLE `edu_goods` (
  `goods_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '物品ID',
  `goods_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物品名称',
  `category` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '分类：1-教师办公品 2-学生教材 3-文印耗材',
  `supplier_id` BIGINT DEFAULT NULL COMMENT '默认供应商ID',
  `grade` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '适用年级（如高一、初一，非教材类为空）',
  `spec` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '规格',
  `unit` VARCHAR(10) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '单位',
  `stock_num` BIGINT NOT NULL DEFAULT '0' COMMENT '当前库存',
  `warn_low` BIGINT NOT NULL DEFAULT '0' COMMENT '库存下限',
  `location` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '存放位置',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志 0存在 2删除',
  `conversion_rate` INT DEFAULT '500' COMMENT '每包装基础数量换算率(如1000张/包)',
  `base_unit` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '张' COMMENT '最小基础消耗单位(如张/支/本)',
  `remain_sheets` INT DEFAULT '0' COMMENT '散张/零头余量(如整包拆开后剩余散张数)',
  PRIMARY KEY (`goods_id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_grade` (`grade`),
  INDEX `idx_supplier_id` (`supplier_id`),
  `stock_qty_base` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，唯一可写基础单位余额',
  `warn_low_base_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，基础单位预警线',
  `return_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '新增，应归还标记',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，库存行版本',
  INDEX `idx_goods_active` (`category`, `del_flag`),
  CONSTRAINT `ck_edu_goods_0` CHECK (stock_qty_base >= 0),
  CONSTRAINT `ck_edu_goods_1` CHECK (conversion_rate > 0),
  CONSTRAINT `ck_edu_goods_2` CHECK (remain_sheets >= 0 AND remain_sheets < conversion_rate),
  CONSTRAINT `fk_ref_022` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_023` FOREIGN KEY (`supplier_id`) REFERENCES `edu_supplier` (
    `supplier_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='物品档案表';
```

**edu_stock_in**

```sql
CREATE TABLE `edu_stock_in` (
  `in_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '入库ID',
  `in_no` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '入库单号',
  `in_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '入库类型：1-采购 2-调拨 3-其他',
  `supplier_id` BIGINT DEFAULT NULL COMMENT '供应商ID',
  `in_time` DATETIME NOT NULL COMMENT '入库时间',
  `operator` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '经办人',
  `operator_id` BIGINT DEFAULT NULL COMMENT '经办人用户ID',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '状态：1-正常 2-作废',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  `declared_package_count` INT DEFAULT NULL COMMENT '历史进货确认的总箱数，纸型可待核实',
  `declared_amount` DECIMAL(12, 2) DEFAULT NULL COMMENT '历史进货确认的总金额',
  PRIMARY KEY (`in_id`),
  UNIQUE `uk_in_no` (
    `in_no`
  ),
  `request_id` BIGINT NULL COMMENT '新增，归还/余纸退回/验收事项',
  `acceptance_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '新增，PENDING/PARTIAL/ACCEPTED/EXCEPTION',
  `source_type` VARCHAR(32) NULL COMMENT '新增，PRINT_RETURN/MATERIAL_RETURN/ARRIVAL等',
  `source_id` BIGINT NULL COMMENT '新增，来源记录',
  `action_id` BIGINT NULL COMMENT '新增，确认动作，历史可空',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增',
  UNIQUE `uk_in_action` (
    `action_id`
  ),
  INDEX `idx_in_request` (`request_id`, `in_time`),
  INDEX `idx_in_supplier` (`supplier_id`, `in_time`),
  INDEX `idx_in_status_time` (`status`, `in_time`),
  CONSTRAINT `fk_ref_024` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_025` FOREIGN KEY (`supplier_id`) REFERENCES `edu_supplier` (
    `supplier_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_026` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='入库单主表';
```

**edu_stock_in_item**

```sql
CREATE TABLE `edu_stock_in_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `in_id` BIGINT NOT NULL COMMENT '入库单ID',
  `goods_id` BIGINT NOT NULL COMMENT '物品ID',
  `quantity` BIGINT NOT NULL COMMENT '数量',
  `price` DECIMAL(10, 2) DEFAULT '0.00' COMMENT '单价',
  `amount` DECIMAL(10, 2) DEFAULT '0.00' COMMENT '小计',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  INDEX `idx_in_id` (`in_id`),
  `base_qty` BIGINT NOT NULL COMMENT '新增，验收可用基础量',
  `arrived_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，实到基础量',
  `rejected_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，破损拒收基础量',
  `unit` VARCHAR(10) NOT NULL COMMENT '新增，登记单位快照',
  `conversion_rate` INT NOT NULL COMMENT '新增，换算快照',
  `movement_id` BIGINT NULL COMMENT '新增，唯一统一流水',
  INDEX `idx_in_item_goods` (`goods_id`, `in_id`),
  UNIQUE `uk_in_item_movement` (
    `movement_id`
  ),
  CONSTRAINT `fk_ref_027` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_028` FOREIGN KEY (`movement_id`) REFERENCES `stock_movement` (
    `movement_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_109` FOREIGN KEY (`in_id`) REFERENCES `edu_stock_in` (
    `in_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='入库单明细表';
```

**edu_stock_out**

```sql
CREATE TABLE `edu_stock_out` (
  `out_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '出库ID',
  `out_no` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '出库单号',
  `out_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '出库类型：1-教师领用 2-学生领书 3-耗材出库',
  `receiver` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '领用人/班级',
  `class_id` BIGINT DEFAULT NULL COMMENT '关联班级ID',
  `out_time` DATETIME NOT NULL COMMENT '出库时间',
  `operator` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '经办人',
  `operator_id` BIGINT DEFAULT NULL COMMENT '经办人用户ID',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '状态：1-正常 2-作废',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`out_id`),
  UNIQUE `uk_out_no` (
    `out_no`
  ),
  `request_id` BIGINT NULL COMMENT '新增，同事项可多次发放',
  `receiver_user_id` BIGINT NULL COMMENT '新增，校内领取身份；非账号不虚构ID',
  `class_name` VARCHAR(50) NULL COMMENT '新增，现有映射为关联展示，目标存历史快照',
  `grade` VARCHAR(20) NULL COMMENT '新增，现有映射为关联展示，目标存历史快照',
  `receipt_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '新增，PENDING/CONFIRMED/DISPUTED',
  `action_id` BIGINT NULL COMMENT '新增',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增',
  UNIQUE `uk_out_action` (
    `action_id`
  ),
  INDEX `idx_out_request` (`request_id`, `out_time`),
  INDEX `idx_out_class` (`class_id`, `out_time`),
  INDEX `idx_out_status_time` (`status`, `out_time`),
  CONSTRAINT `fk_ref_029` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_030` FOREIGN KEY (`receiver_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_031` FOREIGN KEY (`class_id`) REFERENCES `edu_class` (
    `class_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_032` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='出库单主表';
```

**edu_stock_out_item**

```sql
CREATE TABLE `edu_stock_out_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `out_id` BIGINT NOT NULL COMMENT '出库单ID',
  `goods_id` BIGINT NOT NULL COMMENT '物品ID',
  `quantity` BIGINT NOT NULL COMMENT '数量',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  INDEX `idx_out_id` (`out_id`),
  `base_qty` BIGINT NOT NULL COMMENT '新增，实际发出基础量',
  `unit` VARCHAR(10) NOT NULL COMMENT '新增，登记单位快照',
  `conversion_rate` INT NOT NULL COMMENT '新增，换算快照',
  `movement_id` BIGINT NULL COMMENT '新增，复用同一流水，不再生成一次',
  INDEX `idx_out_item_goods` (`goods_id`, `out_id`),
  UNIQUE `uk_out_item_movement` (
    `movement_id`
  ),
  CONSTRAINT `fk_ref_033` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_034` FOREIGN KEY (`movement_id`) REFERENCES `stock_movement` (
    `movement_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_110` FOREIGN KEY (`out_id`) REFERENCES `edu_stock_out` (
    `out_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='出库单明细表';
```

## 5. 代码实现骨架



**backend/src/main/java/com/doupi/planref/print/PrintController.java**

```java
package com.doupi.planref.print;

import com.doupi.planref.ApiReply;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/office/print-requests")
public final class PrintController {
    private final PrintService service;
    public PrintController(PrintService service){this.service=service;}
    @PostMapping public ResponseEntity<Map<String,Object>> create(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.create(key,b),201);}
    @GetMapping("/{id}") public ResponseEntity<Map<String,Object>> detail(@PathVariable long id){return ApiReply.of(service.detail(id),200);}
    @PutMapping("/{id}") public ResponseEntity<Map<String,Object>> revise(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.revise(id,key,b),200);}
    @PostMapping("/{id}/accept") public ResponseEntity<Map<String,Object>> accept(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.accept(id,key,b),200);}
    @PostMapping("/{id}/paper-issues") public ResponseEntity<Map<String,Object>> issue(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.issue(id,key,b),201);}
    @PostMapping("/{id}/settlements") public ResponseEntity<Map<String,Object>> settle(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.settle(id,key,b,false),200);}
    @PostMapping("/{id}/settlement-corrections") public ResponseEntity<Map<String,Object>> correct(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.settle(id,key,b,true),200);}
    @PostMapping("/{id}/paper-returns") public ResponseEntity<Map<String,Object>> returns(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.paperReturn(id,key,b),201);}
    @PostMapping("/{id}/deliveries") public ResponseEntity<Map<String,Object>> deliver(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.deliver(id,key,b),201);}
    @PostMapping("/{id}/deliveries/{delivery}/confirm") public ResponseEntity<Map<String,Object>> confirm(@PathVariable long id,@PathVariable long delivery,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.receipt(id,delivery,key,b,false),200);}
    @PostMapping("/{id}/deliveries/{delivery}/dispute") public ResponseEntity<Map<String,Object>> dispute(@PathVariable long id,@PathVariable long delivery,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.receipt(id,delivery,key,b,true),200);}
    @PostMapping("/{id}/deliveries/{delivery}/review") public ResponseEntity<Map<String,Object>> review(@PathVariable long id,@PathVariable long delivery,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.resolve(id,delivery,key,b),200);}
    @PostMapping("/reprints/{source}") public ResponseEntity<Map<String,Object>> reprint(@PathVariable long source,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.reprint(source,key,b),201);}
}
```

**backend/src/main/java/com/doupi/planref/print/PrintService.java**

```java
package com.doupi.planref.print;

import com.doupi.planref.*;
import com.doupi.planref.office.OfficeService;
import java.util.*;
import org.springframework.stereotype.Service;

/** All paper effects share the request command transaction; plans and settlements never post stock. */
@Service
public final class PrintService {
    private final PrintRepository repo;
    private final Commands commands;
    private final Roots roots;
    private final OfficeService office;
    private final StockLedger ledger;
    public PrintService(PrintRepository repo,Commands commands,Roots roots,OfficeService office,StockLedger ledger){this.repo=repo;this.commands=commands;this.roots=roots;this.office=office;this.ledger=ledger;}
    public Map<String,Object> create(String key,Map<String,Object>b){
        Actors.current().require("print:request:create");
        Map<String,Object> payload=new LinkedHashMap<>(b);payload.put("bizType","PRINT");return commands.create("CREATE_REQUEST",key,payload,201,()->roots.create("PRINT",key,b),c->{
            List<Map<String,Object>> records=Inputs.list(b,"records");if(records.isEmpty())throw Problem.bad("至少一个印品子项");
            Set<String> seen=new HashSet<>();List<Map<String,Object>> out=new ArrayList<>();int no=0;
            for(Map<String,Object> input:records){String client=Inputs.text(input,"clientItemId",1,64);if(!seen.add(client))throw Problem.bad("clientItemId重复");Map<String,Object> p=definition(c,input,++no,0);
                long id=repo.insert(p);repo.bindFiles(c,id,files(input,"files"),"ORIGINAL",1);if(repo.originalFiles(c.requestId(),id,1)==0)throw Problem.bad("每个印品须有原稿");
                out.add(P.of("clientItemId",client,"printId",Long.toString(id),"plannedSheets",p.get("planned")));}
            if(Inputs.bool(b,"submit",true))office.submitWithin(c);c.target("REQUEST",c.requestId());return P.of("records",out);
        });
    }
    public Map<String,Object> revise(long request,String key,Map<String,Object>b){
        Actors.current().require("print:request:update");return commands.run(request,"PRINT_REQUEST_REVISE",key,b,200,c->{requirePrint(c);office.requireState(c.request(),"DRAFT","RETURNED");
            List<Map<String,Object>> inputs=Inputs.list(b,"records"),existing=repo.records(request);if(inputs.size()!=existing.size())throw Problem.bad("修订须提交全部现有印品");
            int revision=Math.toIntExact(n(c.request(),"revision")+1);Set<Long> seen=new HashSet<>();List<Map<String,Object>> out=new ArrayList<>();
            for(Map<String,Object> input:inputs){long id=Inputs.id(input,"printId");if(!seen.add(id))throw Problem.bad("重复印品");Map<String,Object> old=repo.print(request,id);if(n(old,"issued_qty")!=0)throw Problem.conflict("已领纸不能修改计划");
                Map<String,Object> p=definition(c,input,Math.toIntExact(n(old,"item_no")),id);repo.revise(id,p);if(files(input,"files").isEmpty())throw Problem.bad("修订须明确原稿");repo.bindFiles(c,id,files(input,"files"),"ORIGINAL",revision);out.add(P.of("printId",Long.toString(id),"plannedSheets",p.get("planned")));}
            repo.revision(request);c.target("REQUEST",request);c.audit(P.of("revision",revision,"records",out));return P.of("revision",revision,"records",out);
        });
    }
    private Map<String,Object> definition(Commands.Context c,Map<String,Object> b,int no,long self){
        long goods=Inputs.id(b,"paperGoodsId"),teacher=Inputs.id(b,"teacherId"),classId=Inputs.id(b,"classId"),copies=Inputs.positive(b,"printCount"),pages=Inputs.positive(b,"pageCount");
        Map<String,Object> g=repo.goods(goods),u=repo.teacher(teacher),cl=repo.schoolClass(classId);if(!"张".equals(g.get("base_unit")))throw Problem.bad("纸张基础单位必须为张");if(!"ACTIVE".equals(cl.get("status")))throw Problem.bad("班级已归档");
        if(!c.actor().allData()&&!c.actor().scopeDeptIds().contains(n(u,"dept_id"))&&teacher!=n(c.request(),"applicant_user_id"))throw Problem.forbidden("教师超出事项部门范围");
        String side=Inputs.text(b,"printSide",1,1);long template=b.get("templatePaperQty")==null?0:Inputs.nonNegative(b,"templatePaperQty"),preview=b.get("previewPaperQty")==null?0:Inputs.nonNegative(b,"previewPaperQty"),planned;
        try{planned=BusinessMath.planned(copies,pages,side,template,preview);}catch(IllegalArgumentException|ArithmeticException e){throw Problem.bad("印刷计量或计划用纸超出范围");}
        String conversation=Inputs.optionalText(b,"sourceConversationId",64),message=Inputs.optionalText(b,"sourceMessageId",255);
        if((conversation==null)!=(message==null))throw Problem.bad("来源会话和消息须成对");if(conversation!=null){repo.sourceLock(conversation);if(repo.sourceExists(conversation,message,self))throw Problem.conflict("来源消息已登记；重印请使用专门入口");}
        return P.of("request",c.requestId(),"no",no,"name",Inputs.text(b,"printName",1,100),"goods",goods,"paperType",Inputs.text(b,"paperType",1,10),"copies",copies,"pages",pages,"side",side,"color",Inputs.text(b,"colorCategory",1,20),"purpose",Inputs.text(b,"printPurpose",1,500),"teacher",teacher,"classId",classId,"className",cl.get("class_name"),"grade",cl.get("grade"),"template",template,"preview",preview,"planned",planned,"original",null,"reprintReason",null,"conversation",conversation,"message",message,"operator",Long.toString(c.actor().userId()));
    }
    public Map<String,Object> detail(long id){Actor a=Actors.current();a.require("print:request:read");Map<String,Object> r=repo.request(id);Access.requireRequest(a,r,repo.db());if(!"PRINT".equals(r.get("biz_type")))throw Problem.notFound("文印事项不存在");return P.of("request",r,"records",repo.records(id),"issues",repo.facts("issues",id),"settlements",repo.facts("settlements",id),"deliveries",repo.facts("deliveries",id),"files",repo.facts("files",id));}
    public Map<String,Object> accept(long id,String key,Map<String,Object>b){Actors.current().require("print:execute:accept");return commands.run(id,"PRINT_EXECUTION_ACCEPT",key,b,200,c->{requirePrint(c);office.requireState(c.request(),"APPROVED");office.requireTask(c,"PRINT_EXECUTE","REQUEST",id);repo.handler(id,c.actor().userId());repo.state(id,"PROCESSING","PRINT_EXECUTE");c.closeTasks("PRINT_EXECUTE","REQUEST",id);List<Long> tasks=new ArrayList<>();for(Map<String,Object> p:repo.records(id))tasks.add(c.task("PRINT_SETTLE","PRINT",n(p,"print_id"),c.actor().userId(),null,null));c.event("PRINT_ACCEPTED",P.of("taskIds",tasks));return P.of("handlerUserId",Long.toString(c.actor().userId()));});}
    public Map<String,Object> issue(long id,String key,Map<String,Object>b){Actors.current().require("print:paper:issue");return commands.run(id,"PRINT_PAPER_ISSUE",key,b,201,c->{requirePrint(c);office.requireState(c.request(),"PROCESSING","WAIT_RECEIPT","WAIT_SETTLEMENT");office.requireRole(c,"warehouseRoleId");long print=Inputs.id(b,"printId"),goods=Inputs.id(b,"paperGoodsId"),qty=Inputs.positive(b,"qty"),receiver=Inputs.id(b,"receiverUserId");Map<String,Object> p=repo.print(id,print);paper(p,goods);if(!"NEW_ISSUE".equals(p.get("legacy_stock_mode")))throw Problem.conflict("历史已扣纸记录不得走新领纸");if(!repo.settlement(print).isEmpty())throw Problem.conflict("已核销不得补领；须新建重印事项");if(receiver!=n(c.request(),"handler_user_id"))throw Problem.bad("领纸人必须为当前受派执行人");repo.teacher(receiver);String reason=Inputs.text(b,"reason",1,500);long event=repo.paperEvent(P.of("request",id,"print",print,"goods",goods,"kind","ISSUE","qty",qty,"unit","张","original",null,"actor",c.actor().userId(),"receiver",receiver,"reason",reason,"action",c.actionId()));long movement=ledger.move(c,goods,-qty,"PRINT_PAPER",event,event,"ISSUE",reason);repo.paperMovement(event,movement);repo.addIssued(print,qty);c.target("PRINT_PAPER",event);c.event("PRINT_PAPER_ISSUED",P.of("printId",print,"issueId",event));return P.of("issueId",Long.toString(event),"movementId",Long.toString(movement),"issuedQty",n(p,"issued_qty")+qty,"stockQtyBase",repo.goods(goods).get("stock_qty_base"));});}
    public Map<String,Object> settle(long id,String key,Map<String,Object>b,boolean correction){Actors.current().require(correction?"print:settlement:correct":"print:settlement:confirm");return commands.run(id,correction?"PRINT_SETTLEMENT_CORRECT":"PRINT_SETTLEMENT_CONFIRM",key,b,200,c->{requirePrint(c);office.requireState(c.request(),"PROCESSING","WAIT_RECEIPT","WAIT_SETTLEMENT","CANCEL_PENDING");long print=Inputs.id(b,"printId"),goods=Inputs.id(b,"paperGoodsId");Map<String,Object> p=repo.print(id,print);paper(p,goods);Map<String,Object> old=repo.settlement(print);settlementVersion(b,old);
        if(correction){office.requireRole(c,"executorRoleId");if(old.isEmpty())throw Problem.conflict("尚无可更正核销");Inputs.text(b,"reason",1,1000);}else{if(!old.isEmpty())throw Problem.conflict("核销已确认，请使用专门更正动作");office.requireTask(c,"PRINT_SETTLE","PRINT",print);}
        long copies=Inputs.nonNegative(b,"goodCopyCount"),good=Inputs.nonNegative(b,"goodPaperQty"),template=Inputs.nonNegative(b,"templatePaperQty"),preview=Inputs.nonNegative(b,"previewPaperQty"),waste=Inputs.nonNegative(b,"wastePaperQty"),unused=Inputs.nonNegative(b,"unusedQty"),consumed;
        if(copies>n(p,"print_count")||copies<n(p,"delivered_count"))throw Problem.bad("合格份数须介于已交付量与获准份数之间");if((copies==0)!=(good==0))throw Problem.bad("合格份数和合格品耗纸须一致");
        try{long requiredGood=copies==0?0:BusinessMath.planned(copies,n(p,"page_count"),String.valueOf(p.get("print_side")),0,0);if(good!=requiredGood)throw Problem.bad("合格品耗纸须与合格份数和获准页数/单双面一致");consumed=BusinessMath.consumed(good,template,preview,waste);if(unused!=BusinessMath.unused(n(p,"issued_qty"),n(p,"returned_qty"),consumed))throw Problem.bad("领纸=实耗+已退+未用不成立");}catch(IllegalArgumentException|ArithmeticException e){throw Problem.bad("核销数量不守恒");}
        String status=unused==0?"CLOSED":"PENDING_RETURN";Map<String,Object> values=P.of("print",print,"goods",goods,"copies",copies,"good",good,"template",template,"preview",preview,"waste",waste,"consumed",consumed,"unused",unused,"status",status,"revision",c.request().get("revision"),"actor",c.actor().userId(),"action",c.actionId(),"reason",Inputs.optionalText(b,"reason",1000));long sid;if(correction){sid=n(old,"settlement_id");repo.correctSettlement(sid,values);}else sid=repo.insertSettlement(values);repo.settled(print,consumed,status);repo.bindFiles(c,print,fileIds(b,"resultFileIds"),"RESULT",Math.toIntExact(n(c.request(),"revision")));c.closeTasks("PRINT_SETTLE","PRINT",print);c.closeTasks("PRINT_RETURN","PRINT",print);if(unused>0)c.task("PRINT_RETURN","PRINT",print,null,office.role(c.request(),"warehouseRoleId"),null);c.target("SETTLEMENT",sid);c.audit(P.of("before",old,"after",values));refresh(c);c.event("PRINT_SETTLED",P.of("printId",print,"paperStatus",status));return P.of("settlementId",Long.toString(sid),"consumedQty",consumed,"unusedQty",unused,"paperStatus",status,"settlementVersion",old.isEmpty()?0:n(old,"version")+1);
    });}
    public Map<String,Object> paperReturn(long id,String key,Map<String,Object>b){Actors.current().require("print:paper:return");return commands.run(id,"PRINT_PAPER_RETURN",key,b,201,c->{requirePrint(c);office.requireState(c.request(),"PROCESSING","WAIT_RECEIPT","WAIT_SETTLEMENT","CANCEL_PENDING");office.requireRole(c,"warehouseRoleId");long print=Inputs.id(b,"printId"),goods=Inputs.id(b,"paperGoodsId"),original=Inputs.id(b,"originalIssueId"),qty=Inputs.positive(b,"qty"),receiver=Inputs.id(b,"receiverUserId");if(!"REUSABLE".equals(Inputs.text(b,"condition",1,16)))throw Problem.bad("只能验收可再用余纸入库");Map<String,Object> p=repo.print(id,print);paper(p,goods);Map<String,Object> issue=repo.issue(original);if(n(issue,"request_id")!=id||n(issue,"print_id")!=print||n(issue,"paper_goods_id")!=goods||!"ISSUE".equals(issue.get("kind")))throw Problem.bad("原领纸不属于该印品及纸张");if(n(issue,"receiver_user_id")!=receiver)throw Problem.bad("交回人须与原领纸人一致");Map<String,Object> s=repo.settlement(print);settlementVersion(b,s);long max=BusinessMath.unused(n(p,"issued_qty"),n(p,"returned_qty"),n(p,"consumed_qty"));if(qty>n(issue,"qty")-repo.alreadyReturned(original)||qty>max||(!s.isEmpty()&&qty>n(s,"unused_qty")))throw Problem.conflict("超过核实可退余纸");String reason=Inputs.text(b,"reason",1,500);long event=repo.paperEvent(P.of("request",id,"print",print,"goods",goods,"kind","RETURN","qty",qty,"unit","张","original",original,"actor",c.actor().userId(),"receiver",receiver,"reason",reason,"action",c.actionId()));long movement=ledger.move(c,goods,qty,"PRINT_PAPER",event,event,"RETURN",reason);repo.paperMovement(event,movement);repo.returned(print,qty,s);if(!s.isEmpty()&&qty==n(s,"unused_qty"))c.closeTasks("PRINT_RETURN","PRINT",print);c.target("PRINT_PAPER",event);refresh(c);c.event("PRINT_PAPER_RETURNED",P.of("printId",print,"returnIssueId",event));return P.of("returnIssueId",Long.toString(event),"movementId",Long.toString(movement),"stockQtyBase",repo.goods(goods).get("stock_qty_base"));});}
    public Map<String,Object> deliver(long id,String key,Map<String,Object>b){Actors.current().require("print:delivery:create");return commands.run(id,"PRINT_DELIVERY_CREATE",key,b,201,c->{requirePrint(c);office.requireState(c.request(),"PROCESSING","WAIT_RECEIPT","WAIT_SETTLEMENT");handler(c);long print=Inputs.id(b,"printId"),qty=Inputs.positive(b,"deliveryCount"),receiver=Inputs.id(b,"receiverUserId");Map<String,Object> p=repo.print(id,print),s=repo.settlement(print);if(s.isEmpty()||qty>n(s,"good_copy_count")-n(p,"delivered_count"))throw Problem.conflict("尚未核定合格份数或交付超过剩余额度");Map<String,Object> u=repo.teacher(receiver);String name=Inputs.text(b,"receiverName",1,64);if(!name.equals(u.get("nick_name")))throw Problem.bad("领取姓名须与核实身份一致");long delivery=repo.delivery(P.of("request",id,"print",print,"qty",qty,"receiver",receiver,"name",name,"actor",c.actor().userId(),"action",c.actionId()));repo.addDelivered(print,qty);repo.bindFiles(c,print,fileIds(b,"receiptFileIds"),"RECEIPT",Math.toIntExact(n(c.request(),"revision")));long task=c.task("PRINT_RECEIPT","DELIVERY",delivery,receiver,null,null);c.target("DELIVERY",delivery);c.audit(P.of("deliveryId",delivery,"receiptFileIds",b.getOrDefault("receiptFileIds",List.of())));refresh(c);c.event("PRINT_DELIVERED",P.of("taskIds",List.of(task),"deliveryId",delivery));return counts(print,delivery);});}
    public Map<String,Object> receipt(long id,long delivery,String key,Map<String,Object>b,boolean disputed){Actors.current().require(disputed?"print:delivery:dispute":"print:delivery:confirm");return commands.run(id,disputed?"PRINT_DELIVERY_DISPUTE":"PRINT_DELIVERY_CONFIRM",key,target(b,"deliveryId",delivery),200,c->{requirePrint(c);Map<String,Object> d=repo.delivery(id,delivery);version(b,"expectedDeliveryVersion",d);if(!"PENDING".equals(d.get("status")))throw Problem.conflict("该交付已确认或进入争议");if(n(d,"receiver_user_id")!=c.actor().userId())throw Problem.forbidden("只有指定实际领取人可签收或提出争议");office.requireTask(c,"PRINT_RECEIPT","DELIVERY",delivery);long print=n(d,"print_id");repo.print(id,print);
        if(disputed){long observed=Inputs.nonNegative(b,"observedCount");String reason=Inputs.text(b,"reason",1,1000);repo.bindFiles(c,print,fileIds(b,"evidenceFileIds"),"RECEIPT",Math.toIntExact(n(c.request(),"revision")));repo.deliveryState(delivery,"DISPUTED",c.actor().userId());c.closeTasks("PRINT_RECEIPT","DELIVERY",delivery);c.task("DELIVERY_REVIEW","DELIVERY",delivery,null,office.role(c.request(),"executorRoleId"),c.actor().userId());c.audit(P.of("observedCount",observed,"reason",reason,"evidenceFileIds",b.getOrDefault("evidenceFileIds",List.of())));}
        else{if(Inputs.positive(b,"receivedCount")!=n(d,"delivery_count"))throw Problem.bad("签收数量须与本次实际交付一致，有差异请提争议");repo.deliveryState(delivery,"CONFIRMED",c.actor().userId());repo.recount(print);c.closeTasks("PRINT_RECEIPT","DELIVERY",delivery);}
        c.target("DELIVERY",delivery);refresh(c);c.event(disputed?"PRINT_DELIVERY_DISPUTED":"PRINT_RECEIPT_CONFIRMED",P.of("deliveryId",delivery));return counts(print,delivery);
    });}
    public Map<String,Object> resolve(long id,long delivery,String key,Map<String,Object>b){Actors.current().require("print:delivery:resolve");return commands.run(id,"PRINT_DELIVERY_REVIEW",key,target(b,"deliveryId",delivery),200,c->{requirePrint(c);Map<String,Object>d=repo.delivery(id,delivery);version(b,"expectedDeliveryVersion",d);if(!"DISPUTED".equals(d.get("status")))throw Problem.conflict("交付不是待核定争议");office.requireTask(c,"DELIVERY_REVIEW","DELIVERY",delivery);long print=n(d,"print_id"),qty=Inputs.positive(b,"verifiedDeliveryCount");String reason=Inputs.text(b,"reason",1,1000);Map<String,Object>p=repo.print(id,print),s=repo.settlement(print);if(qty>n(s,"good_copy_count")-(n(p,"delivered_count")-n(d,"delivery_count")))throw Problem.bad("核定数量超过合格份数");repo.resolveQuantity(delivery,qty);repo.deliveryState(delivery,"PENDING",c.actor().userId());repo.recount(print);c.closeTasks("DELIVERY_REVIEW","DELIVERY",delivery);c.task("PRINT_RECEIPT","DELIVERY",delivery,n(d,"receiver_user_id"),null,null);c.target("DELIVERY",delivery);c.audit(P.of("before",d,"verifiedDeliveryCount",qty,"reason",reason));refresh(c);c.event("PRINT_DELIVERY_REVIEWED",P.of("deliveryId",delivery));return counts(print,delivery);});}
    public Map<String,Object> reprint(long source,String key,Map<String,Object>b){Actors.current().require("print:request:reprint");Map<String,Object> original=repo.original(source);Map<String,Object> r=repo.request(n(original,"request_id"));Access.requireRequest(Actors.current(),r,repo.db());String reason=Inputs.text(b,"reprintReason",1,500);return commands.create("PRINT_REPRINT_CREATE",key,target(b,"sourcePrintId",source),201,()->roots.create("PRINT",key,b),c->{Map<String,Object> p=definition(c,Inputs.map(b.get("record")),1,0);p.put("original",source);p.put("reprintReason",reason);long print=repo.insert(p);repo.bindFiles(c,print,files(Inputs.map(b.get("record")),"files"),"ORIGINAL",1);if(repo.originalFiles(c.requestId(),print,1)==0)throw Problem.bad("重印须明确原稿");office.submitWithin(c);c.target("PRINT",print);c.audit(P.of("sourcePrintId",source,"reprintReason",reason));return P.of("printId",Long.toString(print),"reprintOfPrintId",Long.toString(source),"plannedSheets",p.get("planned"));});}
    private void refresh(Commands.Context c){boolean done=true,productionPending=false,paperPending=false;for(Map<String,Object>p:repo.records(c.requestId())){Map<String,Object>s=repo.settlement(n(p,"print_id"));productionPending|=s.isEmpty()||!"FINISHED".equals(p.get("production_status"));paperPending|=s.isEmpty()||!"CLOSED".equals(s.get("status"));if(s.isEmpty()||!"CLOSED".equals(s.get("status"))||!"FINISHED".equals(p.get("production_status"))||n(p,"signed_count")!=n(s,"good_copy_count")||repo.disputes(n(p,"print_id"))>0)done=false;}if("CANCEL_PENDING".equals(c.request().get("status")))return;String state=done?"COMPLETED":productionPending?"PROCESSING":paperPending?"WAIT_SETTLEMENT":"WAIT_RECEIPT";repo.state(c.requestId(),state,done?null:"RECEIPT_OR_SETTLEMENT");}
    private Map<String,Object> counts(long print,long delivery){Map<String,Object> p=repo.original(print),s=repo.settlement(print);long handed=n(p,"delivered_count"),signed=n(p,"signed_count");return P.of("deliveryId",Long.toString(delivery),"handedOverCount",handed,"confirmedCount",signed,"pendingConfirmationCount",handed-signed,"remainingCount",n(s,"good_copy_count")-handed,"paperStatus",s.get("status"));}
    private static void requirePrint(Commands.Context c){if(!"PRINT".equals(c.request().get("biz_type")))throw Problem.notFound("文印事项不存在");}
    private static void handler(Commands.Context c){if(n(c.request(),"handler_user_id")!=c.actor().userId())throw Problem.forbidden("只有受派执行人可登记交付");}
    private static void paper(Map<String,Object>p,long goods){if(n(p,"paper_goods_id")!=goods)throw Problem.bad("纸张与获准子项不一致");}
    private static void settlementVersion(Map<String,Object>b,Map<String,Object>s){long expected=Inputs.nonNegative(b,"expectedSettlementVersion");if(expected!=(s.isEmpty()?0:n(s,"version")))throw Problem.conflict("核销版本已变化");}
    private static void version(Map<String,Object>b,String field,Map<String,Object>row){if(Inputs.nonNegative(b,field)!=n(row,"version"))throw Problem.conflict("业务记录版本已变化");}
    private static List<Map<String,Object>> files(Map<String,Object>b,String key){return b.get(key)==null?List.of():Inputs.list(b,key);}
    private static List<Map<String,Object>> fileIds(Map<String,Object>b,String key){if(b.get(key)==null)return List.of();List<Map<String,Object>>out=new ArrayList<>();for(long id:Inputs.ids(b,key))out.add(P.of("fileId",id));return out;}
    private static Map<String,Object> target(Map<String,Object>b,String field,long id){Map<String,Object>out=new LinkedHashMap<>(b);out.put(field,id);return out;}
    private static long n(Map<String,Object>m,String k){return m.get(k)==null?0:Inputs.number(m.get(k));}
}
```

**backend/src/main/java/com/doupi/planref/print/PrintRepository.java**

```java
package com.doupi.planref.print;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class PrintRepository {
    private final Db db;
    public PrintRepository(Db db){this.db=db;}
    public Db db(){return db;}
    public Map<String,Object> print(long request,long id){return db.required("select * from edu_print_record where request_id=#{p.request} and print_id=#{p.id} and del_flag='0' for update",P.of("request",request,"id",id));}
    public Map<String,Object> original(long id){return db.required("select * from edu_print_record where print_id=#{p.id} and del_flag='0'",P.of("id",id));}
    public Map<String,Object> request(long id){return db.required("select * from office_request where request_id=#{p.id}",P.of("id",id));}
    public Map<String,Object> goods(long id){return db.required("select * from edu_goods where goods_id=#{p.id} and del_flag='0'",P.of("id",id));}
    public Map<String,Object> teacher(long id){return db.required("select user_id,nick_name,grade,dept_id from sys_user where user_id=#{p.id} and status='0' and del_flag='0'",P.of("id",id));}
    public Map<String,Object> schoolClass(long id){return db.required("select * from edu_class where class_id=#{p.id} and del_flag='0'",P.of("id",id));}
    public List<Map<String,Object>> records(long request){return db.list("select * from edu_print_record where request_id=#{p.id} and del_flag='0' order by item_no",P.of("id",request));}
    public List<Map<String,Object>> facts(String kind,long request){return switch(kind){
        case "issues"->db.list("select * from edu_print_paper_issue where request_id=#{p.id} order by issue_id",P.of("id",request));
        case "settlements"->db.list("select s.* from edu_print_settlement s join edu_print_record p on p.print_id=s.print_id where p.request_id=#{p.id}",P.of("id",request));
        case "deliveries"->db.list("select * from edu_print_delivery where request_id=#{p.id} order by delivery_id",P.of("id",request));
        case "files"->db.list("select l.link_id,l.file_id,l.purpose,l.record_scope_id,l.revision,f.original_name,f.mime_type,f.byte_size from office_request_file l join sys_file f on f.file_id=l.file_id where l.request_id=#{p.id} and f.status='READY'",P.of("id",request));
        default->throw Problem.bad("未知查询类别");};}
    public void sourceLock(String conversation){db.write("insert into edu_print_source_lock(source_conversation_id) values(#{p.id}) on duplicate key update source_conversation_id=source_conversation_id",P.of("id",conversation));}
    public boolean sourceExists(String conversation,String message,long self){return !db.one("select print_id from edu_print_record where source_conversation_id=#{p.c} and source_message_id=#{p.m} and print_id<>#{p.self} and del_flag='0' and status<>'2' limit 1",P.of("c",conversation,"m",message,"self",self)).isEmpty();}
    public long insert(Map<String,Object> p){return db.insert("insert into edu_print_record(request_id,item_no,print_name,paper_goods_id,paper_type,print_count,page_count,print_side,color_category,print_purpose,teacher_id,class_id,class_name,grade,template_paper_count,preview_paper_count,total_pages,planned_qty,issued_qty,returned_qty,consumed_qty,delivered_count,signed_count,production_status,settlement_status,version,legacy_stock_mode,reprint_of_print_id,reprint_reason,source_conversation_id,source_message_id,operator,print_time,status,del_flag,create_time) values(#{p.request},#{p.no},#{p.name},#{p.goods},#{p.paperType},#{p.copies},#{p.pages},#{p.side},#{p.color},#{p.purpose},#{p.teacher},#{p.classId},#{p.className},#{p.grade},#{p.template},#{p.preview},#{p.planned},#{p.planned},0,0,0,0,0,'PLANNED','PENDING',0,'NEW_ISSUE',#{p.original},#{p.reprintReason},#{p.conversation},#{p.message},#{p.operator},current_timestamp,'0','0',current_timestamp)",p);}
    public void revise(long id,Map<String,Object> p){p.put("id",id);db.write("update edu_print_record set print_name=#{p.name},paper_goods_id=#{p.goods},paper_type=#{p.paperType},print_count=#{p.copies},page_count=#{p.pages},print_side=#{p.side},color_category=#{p.color},print_purpose=#{p.purpose},teacher_id=#{p.teacher},class_id=#{p.classId},class_name=#{p.className},grade=#{p.grade},template_paper_count=#{p.template},preview_paper_count=#{p.preview},total_pages=#{p.planned},planned_qty=#{p.planned},source_conversation_id=#{p.conversation},source_message_id=#{p.message},version=version+1,update_time=current_timestamp where print_id=#{p.id}",p);}
    public void revision(long request){db.write("update office_request set revision=revision+1,updated_at=current_timestamp where request_id=#{p.id}",P.of("id",request));}
    public void bindFiles(Commands.Context c,long printId,List<Map<String,Object>> files,String purpose,int revision){
        for(Map<String,Object> item:files){long file=Inputs.id(item,"fileId");Map<String,Object> f=db.required("select * from sys_file where file_id=#{p.id} for update",P.of("id",file));
            if(!"READY".equals(f.get("status"))||!"PASSED".equals(f.get("scan_status")))throw Problem.conflict("附件尚未完成安全检查");
            boolean bound=!db.one("select link_id from office_request_file where request_id=#{p.r} and file_id=#{p.f} limit 1",P.of("r",c.requestId(),"f",file)).isEmpty();
            if(Inputs.number(f.get("owner_user_id"))!=c.actor().userId()&&!bound)throw Problem.forbidden("无权绑定他人私有附件");
            if(db.one("select link_id from office_request_file where request_id=#{p.r} and file_id=#{p.f} and purpose=#{p.purpose} and record_scope_id=#{p.print}",P.of("r",c.requestId(),"f",file,"purpose",purpose,"print",printId)).isEmpty())
                db.insert("insert into office_request_file(request_id,file_id,purpose,record_scope_id,revision,sort_order,linked_by,linked_at) values(#{p.r},#{p.f},#{p.purpose},#{p.print},#{p.revision},0,#{p.actor},current_timestamp)",P.of("r",c.requestId(),"f",file,"purpose",purpose,"print",printId,"revision",revision,"actor",c.actor().userId()));
        }
    }
    public long originalFiles(long request,long print,int revision){return Inputs.number(db.required("select count(*) as n from office_request_file where request_id=#{p.r} and record_scope_id=#{p.print} and revision=#{p.revision} and purpose='ORIGINAL'",P.of("r",request,"print",print,"revision",revision)).get("n"));}
    public void state(long request,String state,String node){db.write("update office_request set status=#{p.state},current_node=#{p.node},closed_at=case when #{p.state}='COMPLETED' then current_timestamp else null end,updated_at=current_timestamp where request_id=#{p.id}",P.of("id",request,"state",state,"node",node));}
    public void handler(long request,long user){db.write("update office_request set handler_user_id=#{p.user} where request_id=#{p.id}",P.of("user",user,"id",request));}
    public long paperEvent(Map<String,Object> p){return db.insert("insert into edu_print_paper_issue(request_id,print_id,paper_goods_id,kind,qty,base_unit,original_issue_id,stock_movement_id,operator_user_id,receiver_user_id,confirmed_by,confirmed_at,reason,action_id,created_at) values(#{p.request},#{p.print},#{p.goods},#{p.kind},#{p.qty},#{p.unit},#{p.original},null,#{p.actor},#{p.receiver},#{p.actor},current_timestamp,#{p.reason},#{p.action},current_timestamp)",p);}
    public void paperMovement(long id,long movement){db.write("update edu_print_paper_issue set stock_movement_id=#{p.movement} where issue_id=#{p.id}",P.of("id",id,"movement",movement));}
    public void addIssued(long print,long qty){db.write("update edu_print_record set issued_qty=issued_qty+#{p.qty},production_status='PRINTING',version=version+1 where print_id=#{p.id}",P.of("id",print,"qty",qty));}
    public Map<String,Object> settlement(long print){return db.one("select * from edu_print_settlement where print_id=#{p.id} for update",P.of("id",print));}
    public long insertSettlement(Map<String,Object> p){return db.insert("insert into edu_print_settlement(print_id,paper_goods_id,good_copy_count,good_paper_qty,template_paper_qty,preview_paper_qty,waste_paper_qty,consumed_qty,unused_qty,status,request_revision,version,confirmed_by,confirmed_at,action_id,exception_reason,created_by_user_id,created_at,updated_at) values(#{p.print},#{p.goods},#{p.copies},#{p.good},#{p.template},#{p.preview},#{p.waste},#{p.consumed},#{p.unused},#{p.status},#{p.revision},0,#{p.actor},current_timestamp,#{p.action},#{p.reason},#{p.actor},current_timestamp,current_timestamp)",p);}
    public void correctSettlement(long id,Map<String,Object> p){p.put("id",id);db.write("update edu_print_settlement set good_copy_count=#{p.copies},good_paper_qty=#{p.good},template_paper_qty=#{p.template},preview_paper_qty=#{p.preview},waste_paper_qty=#{p.waste},consumed_qty=#{p.consumed},unused_qty=#{p.unused},status=#{p.status},confirmed_by=#{p.actor},confirmed_at=current_timestamp,action_id=#{p.action},exception_reason=#{p.reason},version=version+1,updated_at=current_timestamp where settlement_id=#{p.id}",p);}
    public void settled(long print,long consumed,String status){db.write("update edu_print_record set consumed_qty=#{p.qty},production_status='FINISHED',settlement_status=#{p.status},status='1',version=version+1 where print_id=#{p.id}",P.of("id",print,"qty",consumed,"status",status));}
    public Map<String,Object> issue(long id){return db.required("select * from edu_print_paper_issue where issue_id=#{p.id} for update",P.of("id",id));}
    public long alreadyReturned(long issue){return Inputs.number(db.required("select coalesce(sum(qty),0) as n from edu_print_paper_issue where original_issue_id=#{p.id} and kind='RETURN'",P.of("id",issue)).get("n"));}
    public void returned(long print,long qty,Map<String,Object> settlement){
        db.write("update edu_print_record set returned_qty=returned_qty+#{p.qty},version=version+1 where print_id=#{p.id}",P.of("id",print,"qty",qty));
        if(!settlement.isEmpty()){long unused=Math.subtractExact(Inputs.number(settlement.get("unused_qty")),qty);String state=unused==0?"CLOSED":"PENDING_RETURN";
            db.write("update edu_print_settlement set unused_qty=#{p.unused},status=#{p.status},version=version+1,updated_at=current_timestamp where settlement_id=#{p.id}",P.of("id",settlement.get("settlement_id"),"unused",unused,"status",state));
            db.write("update edu_print_record set settlement_status=#{p.status} where print_id=#{p.id}",P.of("id",print,"status",state));}
    }
    public long delivery(Map<String,Object> p){return db.insert("insert into edu_print_delivery(request_id,print_id,delivery_count,receiver_user_id,receiver_name,delivered_by,delivered_at,status,version,action_id,created_by_user_id,created_at,updated_at) values(#{p.request},#{p.print},#{p.qty},#{p.receiver},#{p.name},#{p.actor},current_timestamp,'PENDING',0,#{p.action},#{p.actor},current_timestamp,current_timestamp)",p);}
    public void addDelivered(long print,long qty){db.write("update edu_print_record set delivered_count=delivered_count+#{p.qty},version=version+1 where print_id=#{p.id}",P.of("id",print,"qty",qty));}
    public Map<String,Object> delivery(long request,long id){return db.required("select * from edu_print_delivery where delivery_id=#{p.id} and request_id=#{p.request} for update",P.of("id",id,"request",request));}
    public void deliveryState(long id,String state,long actor){db.write("update edu_print_delivery set status=#{p.status},confirmed_by=case when #{p.status}='CONFIRMED' then #{p.actor} else confirmed_by end,confirmed_at=case when #{p.status}='CONFIRMED' then current_timestamp else confirmed_at end,version=version+1,updated_at=current_timestamp where delivery_id=#{p.id}",P.of("id",id,"status",state,"actor",actor));}
    public void resolveQuantity(long id,long qty){db.write("update edu_print_delivery set delivery_count=#{p.qty} where delivery_id=#{p.id}",P.of("id",id,"qty",qty));}
    public void signed(long print,long signed,long deliveredDelta){db.write("update edu_print_record set signed_count=signed_count+#{p.signed},delivered_count=delivered_count+#{p.delta},version=version+1 where print_id=#{p.id}",P.of("id",print,"signed",signed,"delta",deliveredDelta));}
    public void recount(long print){Map<String,Object> sums=db.required("select coalesce(sum(delivery_count),0) as delivered,coalesce(sum(case when status='CONFIRMED' then delivery_count else 0 end),0) as signed from edu_print_delivery where print_id=#{p.id}",P.of("id",print));db.write("update edu_print_record set delivered_count=#{p.delivered},signed_count=#{p.signed},version=version+1 where print_id=#{p.id}",P.of("id",print,"delivered",sums.get("delivered"),"signed",sums.get("signed")));}
    public long disputes(long print){return Inputs.number(db.required("select count(*) as n from edu_print_delivery where print_id=#{p.id} and status='DISPUTED'",P.of("id",print)).get("n"));}
}
```

**backend/src/main/java/com/doupi/planref/StockLedger.java**

```java
package com.doupi.planref;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public final class StockLedger {
    private final Db db;
    public StockLedger(Db db){this.db=db;}
    public long move(Commands.Context ctx,long goodsId,long delta,String sourceType,long sourceId,long sourceItemId,String kind,String reason){
        if(delta==0)throw Problem.bad("库存变动不得为零");
        Map<String,Object> g=db.required("select * from edu_goods where goods_id=#{p.id} and del_flag='0' for update",P.of("id",goodsId));
        long before=Inputs.number(g.get("stock_qty_base")),version=Inputs.number(g.get("version"));
        long after;
        try{after=BusinessMath.stockAfter(before,delta);}catch(IllegalArgumentException|ArithmeticException ex){throw Problem.conflict("库存不足或数量溢出");}
        long rate=Inputs.number(g.get("conversion_rate"));
        String unit=String.valueOf(g.get("base_unit"));
        if(rate<=0||g.get("base_unit")==null||unit.isBlank())throw Problem.conflict("物品基础单位尚未核定");
        int changed=db.write("update edu_goods set stock_qty_base=#{p.after},stock_num=#{p.pack},remain_sheets=#{p.remain},version=version+1,update_time=current_timestamp where goods_id=#{p.id} and version=#{p.version}",P.of("after",after,"pack",after/rate,"remain",after%rate,"id",goodsId,"version",version));
        if(changed!=1)throw Problem.conflict("库存版本冲突");
        long movement=db.insert("insert into stock_movement(goods_id,request_id,action_id,source_type,source_id,source_item_id,movement_kind,delta_qty,before_qty,after_qty,base_unit,goods_version,actor_user_id,occurred_at,posted_at,reason) values(#{p.goods},#{p.request},#{p.action},#{p.sourceType},#{p.source},#{p.item},#{p.kind},#{p.delta},#{p.before},#{p.after},#{p.unit},#{p.version},#{p.actor},#{p.at},#{p.at},#{p.reason})",P.of("goods",goodsId,"request",ctx.requestId(),"action",ctx.actionId(),"sourceType",sourceType,"source",sourceId,"item",sourceItemId,"kind",kind,"delta",delta,"before",before,"after",after,"unit",unit,"version",Math.addExact(version,1),"actor",ctx.actor().userId(),"at",Timestamp.from(Instant.now()),"reason",reason));
        project(ctx,goodsId,delta,sourceType,sourceId,sourceItemId,unit,movement,reason);return movement;
    }
    private void project(Commands.Context c,long goods,long delta,String source,long sourceId,long item,String unit,long movement,String reason){
        if("ARRIVAL".equals(source)){if(delta<=0)throw Problem.bad("到货只允许可用量入库");int n=db.write("update edu_stock_in_item set movement_id=#{p.m} where item_id=#{p.item} and in_id=#{p.source} and movement_id is null",P.of("m",movement,"item",item,"source",sourceId));if(n!=1)throw Problem.conflict("验收明细流水重复");return;}
        if("INVENTORY_OUT".equals(source)){if(delta>=0)throw Problem.bad("调出必须为负向流水");int n=db.write("update edu_stock_out_item set movement_id=#{p.m} where item_id=#{p.item} and out_id=#{p.source} and movement_id is null",P.of("m",movement,"item",item,"source",sourceId));if(n!=1)throw Problem.conflict("调出明细流水重复");return;}
        String name=String.valueOf(db.required("select nick_name from sys_user where user_id=#{p.id}",P.of("id",c.actor().userId())).get("nick_name"));
        long qty=delta>0?delta:Math.negateExact(delta),head;
        if(delta>0){Map<String,Object> old=db.one("select in_id from edu_stock_in where action_id=#{p.action}",P.of("action",c.actionId()));head=old.isEmpty()?db.insert("insert into edu_stock_in(in_no,in_type,request_id,operator_id,operator,in_time,status,acceptance_status,source_type,source_id,action_id,version,remark,del_flag) values(#{p.no},'3',#{p.request},#{p.actor},#{p.name},current_timestamp,'1','ACCEPTED',#{p.source},#{p.sourceId},#{p.action},0,#{p.reason},'0')",P.of("no","IN"+c.actionId(),"request",c.requestId(),"actor",c.actor().userId(),"name",name,"source",source,"sourceId",sourceId,"action",c.actionId(),"reason",reason)):Inputs.number(old.get("in_id"));
            db.insert("insert into edu_stock_in_item(in_id,goods_id,quantity,base_qty,arrived_qty,rejected_qty,unit,conversion_rate,price,amount,movement_id) values(#{p.head},#{p.goods},#{p.qty},#{p.qty},#{p.qty},0,#{p.unit},1,0,0,#{p.m})",P.of("head",head,"goods",goods,"qty",qty,"unit",unit,"m",movement));
            if("PRINT_PAPER".equals(source))db.write("update edu_print_paper_issue set in_id=#{p.head} where issue_id=#{p.id}",P.of("head",head,"id",sourceId));
        }else{Map<String,Object> old=db.one("select out_id from edu_stock_out where action_id=#{p.action}",P.of("action",c.actionId()));head=old.isEmpty()?db.insert("insert into edu_stock_out(out_no,out_type,request_id,operator_id,operator,out_time,status,receipt_status,action_id,version,del_flag) values(#{p.no},'3',#{p.request},#{p.actor},#{p.name},current_timestamp,'1','PENDING',#{p.action},0,'0')",P.of("no","OUT"+c.actionId(),"request",c.requestId(),"actor",c.actor().userId(),"name",name,"action",c.actionId())):Inputs.number(old.get("out_id"));
            db.insert("insert into edu_stock_out_item(out_id,goods_id,quantity,base_qty,unit,conversion_rate,movement_id) values(#{p.head},#{p.goods},#{p.qty},#{p.qty},#{p.unit},1,#{p.m})",P.of("head",head,"goods",goods,"qty",qty,"unit",unit,"m",movement));
            if("PRINT_PAPER".equals(source))db.write("update edu_print_paper_issue set out_id=#{p.head} where issue_id=#{p.id}",P.of("head",head,"id",sourceId));}
    }
}
```

**backend/src/main/java/com/doupi/planref/BusinessMath.java**

```java
package com.doupi.planref;

/** Integer base-unit arithmetic shared by executable use cases. */
public final class BusinessMath {
    private BusinessMath() { }
    public static long planned(long copies,long pages,String side,long template,long preview){
        if(copies<=0||pages<=0||template<0||preview<0)throw new IllegalArgumentException("Invalid print quantities");
        if(!"1".equals(side)&&!"2".equals(side))throw new IllegalArgumentException("Unknown print side");
        long sheets="2".equals(side)?pages/2+pages%2:pages;
        return Math.addExact(Math.multiplyExact(copies,sheets),Math.addExact(template,preview));
    }
    public static long consumed(long good,long template,long preview,long waste){
        if(good<0||template<0||preview<0||waste<0)throw new IllegalArgumentException("Negative consumption");
        return Math.addExact(Math.addExact(good,template),Math.addExact(preview,waste));
    }
    public static long unused(long issued,long returned,long consumed){
        if(issued<0||returned<0||consumed<0)throw new IllegalArgumentException("Negative paper quantity");
        long result=Math.subtractExact(Math.subtractExact(issued,returned),consumed);
        if(result<0)throw new IllegalArgumentException("Paper quantities do not balance");
        return result;
    }
    public static long stockAfter(long before,long delta){
        if(before<0)throw new IllegalArgumentException("Invalid stock balance");
        long result=Math.addExact(before,delta);
        if(result<0)throw new IllegalArgumentException("Insufficient available stock");
        return result;
    }
    public static long checkAfter(long current,long book,long real){
        if(book<0||real<0)throw new IllegalArgumentException("Invalid count");
        return stockAfter(current,Math.subtractExact(real,book));
    }
    /** Convert the physical count at a reconciled movement boundary back to the baseline. */
    public static long normalizedCount(long actual,long periodIn,long periodOut){
        if(actual<0||periodIn<0||periodOut<0)throw new IllegalArgumentException("Invalid count interval");
        long result=Math.addExact(Math.subtractExact(actual,periodIn),periodOut);
        if(result<0)throw new IllegalArgumentException("Count interval cannot explain the physical count");
        return result;
    }
}
```



## 6. 边界与异常场景处理

库存不足、根/核销版本变化、超原单退纸量、纸张不匹配、已核销补领均拒绝并回滚，不留下无movement事件。核销更正不重新扣纸，降低合格份数不能小于已交付量。错印纸记waste，不能归还可用库存。历史LEGACY_DEDUCTED禁止新领纸再扣；取消不得把全部issued直接加回。兼容收发明细只引用统一流水。死锁及数据库超时原键重试；响应不明不得换键重复领纸。先退后核销、部分退纸、核销0余纸、补领多原单、多印品交错分别验收。
