# ADM-11 基准盘点、期间收发与独立复核

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-11)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期4人日。负责建立逐物品基准、记录实盘和期间收发、独立人员退回/批准，以及只叠加核定差异的调整流水；不停止正常领退，不把旧实盘数覆盖现余额。排期前置为ADM-10；复用ADM-02认证/复核角色、ADM-03固定任务/根锁/幂等，以及ADM-10唯一库存余额与连续统一流水。

- [ ] 第1日：实现`InventoryService.createCheck`及`InventoryRepository.period/lastMovement`基准
- [ ] 第2日：实现`count`逐项实盘还原与流水边界核对
- [ ] 第3日：实现`review`独立资格、期间收发确认、signed差异及退回轮次
- [ ] 第4日：在待实施`doupi-web-admin-react/src/pages/stock/check/index.tsx`和`review.tsx`联调，跑基准100、期间入10出5、实盘103→基准实盘98→差异-2，批准前又出10时现量95仅调到93，以及自审、零差异、重复批准和边界变化测试。本轮参考代码不执行生产迁移。

验收：每物品保存baseline_goods_version与baseline_movement_id；实盘/复核逐项核对期间in/out及当前该物品movement边界；counted_by与reviewer不可同人；审批只delta=real_num-book_num，不UPDATE stock=早先real_num；0差异无流水；重复同键重放、换键再次批准409。

## 2. 接口设计清单

前缀`/api/v1/office/inventory/checks`。员工JWT，所有写操作带`Idempotency-Key`，ID字符串，数量精确整数。POST创建新`biz_type=STOCK_CHECK`根，可选`applicantUserId,title,clientSource,dueAt`遵循Roots。后续动作body同时带根`expectedVersion`及盘点头`expectedCheckVersion`。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/是否必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 办理 checks | POST | `/api/v1/office/inventory/checks` | `goodsIds`1—500个不重复正ID，及可选根字段 | `checkId,checkVersion=0,items,requestId,status=PROCESSING,version`；201 | `inventory:check:create` |
| 查询 {id} | GET | `/api/v1/office/inventory/checks/{id}` | path checkId | `request,check,items`；200 | `inventory:check:read` |
| 办理 counts | POST | `/api/v1/office/inventory/checks/{id}/counts` | path checkId；`expectedVersion,expectedCheckVersion,items`覆盖全部行，每项`itemId,actualQtyAtCount,expectedMovementId,periodInQty,periodOutQty`均非负（itemId正），`diffReason`可空≤1000，有差异必填 | `checkId,checkVersion,reviewStatus=PENDING_REVIEW,requestId,status=SUBMITTED,version`；200 | `inventory:check:count` |
| 办理 review | POST | `/api/v1/office/inventory/checks/{id}/review` | path checkId；`expectedVersion,expectedCheckVersion,decision`枚举APPROVE/RETURN，`comment`1—1000；APPROVE的`items`覆盖全部行，每项`itemId,expectedMovementId,periodInQty,periodOutQty`；RETURN可省略items | `checkId,checkVersion,reviewStatus=APPROVED/RETURNED,adjustments[{itemId,adjustmentQty,movementId,period}],requestId,status,version`；200，RETURN的adjustments为空 | `inventory:check:review` |

check返回`check_id,check_no,request_id,check_type,category,check_time,baseline_at,counted_by,reviewer_user_id,review_status,review_round,reviewed_at,review_comment,version,status,operator`；items返回`item_id,check_id,goods_id,book_num,real_num,diff_num,baseline_goods_version,baseline_movement_id,reconciled_movement_id,period_in_qty,period_out_qty,counted_at,diff_reason,adjustment_movement_id`。`period`对象含`last_id,in_qty,out_qty`。数量均为基础单位。`real_num`是还原到基准的实盘量；实盘当时的物理actualQtyAtCount及提交时流水边界另存动作audit，二者不能混淆。


## 3. 数据流转细节

| API与字段来源 | 字段级校验与计算 | 读取/写入事实 | 事务与缓存 |
|---|---|---|---|
| create：goodsIds、Actor | 列表非空不重复；排序goodsId后逐行锁；Actor须快照warehouse岗位；不把全库MAX movement当统一提交边界 | Roots建STOCK_CHECK根；INSERT check_no=CHK+actionId/request_id/check_type=2/check_time/baseline_at=server/counted_by=Actor/review_status=COUNTING/review_round=1/version=0/status=1/operator=姓名 | 固定action STOCK_CHECK_CREATE先幂等后创建；根→头→goods有序；全部基准同事务 |
| create每goods | 读goods.stock_qty_base/version；在该goods行锁持有期间查该goods最后movement_id，避免未提交顺序假设 | check_item.book_num=real_num=当前base/diff_num=0；baseline_goods_version=goods.version/baseline_movement_id=本物品MAX或0；period_in/out=0，counted_at=NULL，表示尚未盘点；根PROCESSING/current_node=STOCK_COUNT，任务受派Actor | 不写库存；不把初值real_num当已完成实盘 |
| detail：path checkId、Actor | 定位check.request_id后校验根范围或显式任务受派资格，再返回头/行 | 只读office_request、edu_stock_check/item；期间新流水应通过ADM-10 movement查询核对 | 不缓存盘点办理依据 |
| count：expectedVersion/expectedCheckVersion、Actor | 路径checkId规范加入摘要；根锁后锁check；review_status必须COUNTING/RETURNED；本人必须counted_by且有STOCK_COUNT任务；头version匹配 | 固定action STOCK_CHECK_COUNT；不允许复核人冒名录盘 | 重放在版本前；失败全回滚 |
| count items[].itemId | 全部check行一一对应无重复；逐goodsId升序锁余额 | 锁check_item和goods，不能跨盘点单提交行 | 不用客户端goodsId改归属 |
| expectedMovementId/periodInQty/periodOutQty | server汇总本物品movement_id>baseline_movement_id的正delta为in_qty、负delta绝对值为out_qty，last_id为最新或基准ID；三字段必须与服务端完全一致；验证book+in-out=current goods.stock_qty_base | 读stock_movement；若余额与流水不连续则409先对账，不能凭实盘覆盖掩盖问题 | 持goods行锁检查，新的收发须在本事务后提交；客户端必须重新核实边界变化 |
| actualQtyAtCount/diffReason | actual≥0；normalized=actual-periodIn+periodOut≥0且不溢出；diff=normalized-book；非0差异必填reason | item.real_num=normalized/diff_num=diff/reconciled_movement_id=last_id/period_in_qty/period_out_qty/counted_at=server/diff_reason；action.after_json.details.counts存actual和period及normalized/diff | 不写stock_movement，不改变余额 |
| count提交后 | 关闭该check的STOCK_COUNT；创建STOCK_CHECK_REVIEW岗位任务，excluded=counted_by；岗位ID来自规则key解析快照 | check.review_status=PENDING_REVIEW/version+1；根SUBMITTED/current_node=STOCK_CHECK_REVIEW；STOCK_CHECK_SUBMITTED事件含taskIds | 根version只Commands+1；通知不能替代任务 |
| review：decision/comment/Actor | 头必须PENDING_REVIEW，版本匹配；Actor不等counted_by及created_by，必须持该check的REVIEW任务，comment必填 | 固定action STOCK_CHECK_REVIEW；before/decision/comment/adjustments完整审计 | 动作幂等不能绕过不同check目标 |
| APPROVE items[].itemId/expectedMovementId/periodInQty/periodOutQty | 必须全部已counted_at非空；重新按当前流水边界逐项核清；读取当前stock，不使用旧real覆盖；after=current+diff须非负 | diff非0调用StockLedger(source_type=STOCK_CHECK,source_id=checkId,source_item_id=itemId,movement_kind=CHECK_ADJUST,delta_qty=diff)；0差异movement=null；更新item.reconciled_movement_id/period_in/out/adjustment_movement_id；兼容凭证引用该movement | 所有调整同事务；一行不足/冲突全单回滚；各goods升序锁，不需要Redis锁 |
| APPROVE头/根 | reviewer真实Actor，独立复核任务完成 | check.review_status=APPROVED/reviewer_user_id/reviewed_at/review_comment/version+1/旧status=2；根COMPLETED/closed_at；关闭该check REVIEW任务，STOCK_CHECK_REVIEWED事件 | 禁止换键重复批准，状态校验409 |
| RETURN | 不产生库存流水；保留基准及历轮实盘审计；退回实际counted_by继续 | check.review_status=RETURNED/review_round+1/reviewer/时间/意见/version+1/status=1；根RETURNED/current_node=STOCK_COUNT；新STOCK_COUNT任务给原盘点人；关闭旧REVIEW | 重盘仍基于原基准，重新核实全部期间流水；不可删除旧action |

示例：book=100，基准后入10出5，实际物理盘103，则real_num=103-10+5=98，diff=-2。复核前又出10，当前95，复核确认in=10/out=15，批准后95-2=93；不把当前库存写成98或103。新的收发只影响核对期间，不凭空改变已确认的盘盈亏差异。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**edu_stock_check**

```sql
CREATE TABLE `edu_stock_check` (
  `check_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '盘点单ID',
  `check_no` VARCHAR(30) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '盘点单号',
  `check_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '盘点范围 1-全量 2-按分类',
  `category` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '盘点分类',
  `check_time` DATETIME NOT NULL COMMENT '盘点时间',
  `operator` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '盘点人',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '状态 1-待审核 2-已审核 3-已作废',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`check_id`),
  UNIQUE `uk_check_no` (
    `check_no`
  ),
  `request_id` BIGINT NULL COMMENT '新增，单次盘点事项，历史可空',
  `baseline_at` DATETIME(3) NULL COMMENT '新增，基准时点；边界不能仅靠时间戳',
  `counted_by` BIGINT NULL COMMENT '新增，实际盘点人身份',
  `reviewer_user_id` BIGINT NULL COMMENT '新增，独立复核人，不能等于counted_by',
  `review_status` VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT '新增，DRAFT/COUNTING/PENDING_REVIEW/RETURNED/APPROVED/CANCELLED',
  `review_round` INT NOT NULL DEFAULT 1 COMMENT '新增，复盘轮次',
  `reviewed_at` DATETIME(3) NULL COMMENT '新增',
  `review_comment` VARCHAR(1000) NULL COMMENT '新增，差异处置和退回原因',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，防重复批准',
  UNIQUE `uk_check_request` (
    `request_id`
  ),
  INDEX `idx_check_review` (`review_status`, `reviewer_user_id`, `baseline_at`),
  CONSTRAINT `fk_ref_035` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_036` FOREIGN KEY (`counted_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_037` FOREIGN KEY (`reviewer_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='库存盘点单表';
```

**edu_stock_check_item**

```sql
CREATE TABLE `edu_stock_check_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `check_id` BIGINT NOT NULL COMMENT '盘点单ID',
  `goods_id` BIGINT NOT NULL COMMENT '物品ID',
  `book_num` BIGINT NOT NULL COMMENT '账面库存',
  `real_num` BIGINT NOT NULL COMMENT '实盘库存',
  `diff_num` BIGINT NOT NULL COMMENT '差异数量(实盘-账面)',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  PRIMARY KEY (`item_id`),
  INDEX `idx_check_id` (`check_id`),
  `baseline_goods_version` BIGINT NOT NULL COMMENT '新增，逐物品基准版本',
  `baseline_movement_id` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，该物品基准已包含的最后流水',
  `reconciled_movement_id` BIGINT NULL COMMENT '新增，复核核清到的该物品流水',
  `period_in_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，核对后的期间收进',
  `period_out_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，核对后的期间发出',
  counted_at DATETIME(3) NULL,
  `diff_reason` VARCHAR(1000) NULL COMMENT '新增，差异原因',
  `adjustment_movement_id` BIGINT NULL COMMENT '新增，批准产生的调整流水',
  UNIQUE `uk_check_goods` (
    `check_id`,
    `goods_id`
  ),
  UNIQUE `uk_check_adjustment` (
    `adjustment_movement_id`
  ),
  CONSTRAINT `fk_ref_038` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_039` FOREIGN KEY (`adjustment_movement_id`) REFERENCES `stock_movement` (
    `movement_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_111` FOREIGN KEY (`check_id`) REFERENCES `edu_stock_check` (
    `check_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='库存盘点单明细表';
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

**office_request**

```sql
CREATE TABLE `office_request` (
  `request_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '一次申请/审批聚合',
  `request_no` VARCHAR(32) NOT NULL COMMENT '事项编号',
  `biz_type` VARCHAR(24) NOT NULL COMMENT 'PRINT/MATERIAL/STOCK_CHECK等固定业务',
  `title` VARCHAR(200) NOT NULL COMMENT '标题',
  `created_by_user_id` BIGINT NOT NULL COMMENT '实际录入主体，来自认证上下文，代录时不冒充申请人',
  `applicant_user_id` BIGINT NOT NULL COMMENT '真实原申请人，默认JWT主体；仅有代录权限且范围内可指定，经服务器核实',
  `applicant_dept_id` BIGINT NOT NULL COMMENT '从真实申请人资料派生的提交部门快照，不信任客户端部门',
  `handler_user_id` BIGINT NULL COMMENT '当前经办人',
  `client_source` VARCHAR(16) NOT NULL COMMENT 'ADMIN_WEB/STAFF_APP/WECHAT_MINI/PUBLIC_WEB，仅来源',
  `status` VARCHAR(24) NOT NULL COMMENT '根状态，不代表库存事实',
  `current_node` VARCHAR(32) NULL COMMENT '当前固定节点',
  `rule_snapshot` JSON NOT NULL COMMENT '本次固定节点规则快照：规则版本、审批人/职责、免审条件、判定来源，禁止客户端任意定义',
  `revision` INT NOT NULL DEFAULT 1 COMMENT '内容修订轮次',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '跨子项动作根行版本',
  `request_key` VARCHAR(64) NOT NULL COMMENT '创建幂等键',
  `payload_hash` CHAR(64) NOT NULL COMMENT '规范创建载荷摘要',
  `due_at` DATETIME(3) NULL COMMENT '期限',
  `submitted_at` DATETIME(3) NULL COMMENT '最近提交',
  `closed_at` DATETIME(3) NULL COMMENT '完成/取消结案',
  `cancelled_at` DATETIME(3) NULL COMMENT '取消决定，不自动退库',
  `cancel_reason` VARCHAR(500) NULL COMMENT '取消原因',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`request_id`),
  UNIQUE `uk_request_no` (
    `request_no`
  ),
  UNIQUE `uk_request_create` (
    `created_by_user_id`,
    `biz_type`,
    `request_key`
  ),
  INDEX `idx_request_applicant` (`applicant_user_id`, `status`, `created_at`),
  INDEX `idx_request_handler` (`handler_user_id`, `status`, `due_at`),
  INDEX `idx_request_dept` (`applicant_dept_id`, `biz_type`, `status`, `created_at`),
  CONSTRAINT `fk_ref_002` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_003` FOREIGN KEY (`applicant_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_004` FOREIGN KEY (`applicant_dept_id`) REFERENCES `sys_dept` (
    `dept_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_005` FOREIGN KEY (`handler_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_request';
```

**office_task**

```sql
CREATE TABLE `office_task` (
  `task_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '待办',
  `request_id` BIGINT NOT NULL COMMENT '所属事项',
  `target_type` VARCHAR(32) NOT NULL COMMENT '具体任务对象REQUEST/PRINT/DELIVERY等',
  `target_id` BIGINT NOT NULL COMMENT '审批指request_id、核销指print_id、签收指delivery_id；强制校验所属根',
  `node_code` VARCHAR(32) NOT NULL COMMENT 'REVIEW/PRINT_EXECUTE/RECEIPT/CHECK_REVIEW等',
  `round_no` INT NOT NULL COMMENT '退回后新轮次',
  `task_order` INT NOT NULL DEFAULT 1 COMMENT '同节点固定任务序号',
  `assignee_user_id` BIGINT NULL COMMENT '指派/认领人',
  `assignee_role_id` BIGINT NULL COMMENT '职责队列，仍检查资格及范围',
  `excluded_user_id` BIGINT NULL COMMENT '盘点经办人等不得完成复核者',
  `status` VARCHAR(16) NOT NULL COMMENT 'OPEN/CLAIMED/COMPLETED/CANCELLED',
  `due_at` DATETIME(3) NULL COMMENT '期限',
  `claimed_at` DATETIME(3) NULL COMMENT '认领时间',
  `acted_by` BIGINT NULL COMMENT '实际完成人',
  `acted_at` DATETIME(3) NULL COMMENT '完成时间',
  `decision` VARCHAR(24) NULL COMMENT 'APPROVE/RETURN等',
  `comment` VARCHAR(1000) NULL COMMENT '意见、退回原因',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '并发认领/完成',
  `created_by_user_id` BIGINT NOT NULL COMMENT '创建者身份',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`task_id`),
  UNIQUE `uk_task_node` (
    `request_id`,
    `node_code`,
    `round_no`,
    `task_order`
  ),
  INDEX `idx_task_user` (`assignee_user_id`, `status`, `due_at`),
  INDEX `idx_task_role` (`assignee_role_id`, `status`, `due_at`),
  INDEX `idx_task_request` (`request_id`, `status`),
  INDEX `idx_task_target` (`target_type`, `target_id`, `status`),
  CONSTRAINT `fk_ref_006` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_007` FOREIGN KEY (`assignee_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_008` FOREIGN KEY (`excluded_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_009` FOREIGN KEY (`acted_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_010` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_101` FOREIGN KEY (`assignee_role_id`) REFERENCES `sys_role` (
    `role_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_task';
```

**office_action_log**

```sql
CREATE TABLE `office_action_log` (
  `action_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '已提交动作',
  `request_id` BIGINT NOT NULL COMMENT '聚合',
  `task_id` BIGINT NULL COMMENT '待办',
  `target_type` VARCHAR(32) NOT NULL COMMENT 'PRINT/ISSUE/SETTLEMENT/DELIVERY等',
  `target_id` BIGINT NULL COMMENT '本次子记录，创建时同事务回填',
  `action_code` VARCHAR(64) NOT NULL COMMENT '幂等operation固定动作，如PRINT_ISSUE，不拼目标ID',
  `actor_user_id` BIGINT NOT NULL COMMENT '认证上下文操作者',
  `actor_dept_id` BIGINT NULL COMMENT '部门快照',
  `client_source` VARCHAR(16) NOT NULL COMMENT '四端来源，仅审计',
  `from_status` VARCHAR(24) NULL COMMENT '前状态',
  `to_status` VARCHAR(24) NULL COMMENT '后状态',
  `request_revision` INT NOT NULL COMMENT '所依据申请版本',
  `idempotency_key` VARCHAR(64) NOT NULL COMMENT '幂等键',
  `payload_hash` CHAR(64) NOT NULL COMMENT '含目标ID及规范正文',
  `result_code` INT NOT NULL COMMENT '已提交响应状态',
  `result_json` JSON NOT NULL COMMENT '可重放最小响应，不含临时文件地址/凭证',
  `before_json` JSON NULL COMMENT '脱敏前值快照',
  `after_json` JSON NULL COMMENT '脱敏后值快照，含核销更正历史',
  `created_at` DATETIME(3) NOT NULL COMMENT '提交时间，不允许普通编辑删除',
  PRIMARY KEY (`action_id`),
  UNIQUE `uk_action_idempotency` (
    `actor_user_id`,
    `action_code`,
    `idempotency_key`
  ),
  INDEX `idx_action_request` (`request_id`, `action_id`),
  INDEX `idx_action_task` (`task_id`),
  CONSTRAINT `fk_ref_011` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_012` FOREIGN KEY (`actor_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_013` FOREIGN KEY (`actor_dept_id`) REFERENCES `sys_dept` (
    `dept_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_102` FOREIGN KEY (`task_id`) REFERENCES `office_task` (
    `task_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_action_log';
```

## 5. 代码实现骨架



**backend/src/main/java/com/doupi/planref/inventory/InventoryController.java**

```java
package com.doupi.planref.inventory;

import com.doupi.planref.ApiReply;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/office/inventory")
public final class InventoryController {
    private final InventoryService service;
    public InventoryController(InventoryService service){this.service=service;}
    @GetMapping("/goods") public ResponseEntity<Map<String,Object>> goods(@RequestParam(defaultValue="0")long afterId,@RequestParam(defaultValue="false")boolean warnings){return ApiReply.of(service.goods(afterId,warnings),200);}
    @PostMapping("/goods") public ResponseEntity<Map<String,Object>> createGoods(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveGoods(null,key,b),201);}
    @PutMapping("/goods/{id}") public ResponseEntity<Map<String,Object>> updateGoods(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveGoods(id,key,b),200);}
    @GetMapping("/suppliers") public ResponseEntity<Map<String,Object>> suppliers(){return ApiReply.of(service.suppliers(),200);}
    @PostMapping("/suppliers") public ResponseEntity<Map<String,Object>> createSupplier(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveSupplier(null,key,b),201);}
    @PutMapping("/suppliers/{id}") public ResponseEntity<Map<String,Object>> updateSupplier(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.saveSupplier(id,key,b),200);}
    @GetMapping("/goods/{id}/movements") public ResponseEntity<Map<String,Object>> movements(@PathVariable long id,@RequestParam(defaultValue="0")long afterId){return ApiReply.of(service.movements(id,afterId),200);}
    @PostMapping("/arrivals") public ResponseEntity<Map<String,Object>> arrival(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.arrival(key,b),201);}
    @PostMapping("/dispatches") public ResponseEntity<Map<String,Object>> dispatch(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.dispatch(key,b),201);}
    @PostMapping("/checks") public ResponseEntity<Map<String,Object>> createCheck(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.createCheck(key,b),201);}
    @GetMapping("/checks/{id}") public ResponseEntity<Map<String,Object>> check(@PathVariable long id){return ApiReply.of(service.checkDetail(id),200);}
    @PostMapping("/checks/{id}/counts") public ResponseEntity<Map<String,Object>> count(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.count(id,key,b),200);}
    @PostMapping("/checks/{id}/review") public ResponseEntity<Map<String,Object>> review(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.review(id,key,b),200);}
}
```

**backend/src/main/java/com/doupi/planref/inventory/InventoryService.java**

```java
package com.doupi.planref.inventory;

import com.doupi.planref.*;
import com.doupi.planref.office.OfficeService;
import com.doupi.planref.directory.DirectoryService;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public final class InventoryService {
    private final InventoryRepository repo;
    private final Commands commands;
    private final Roots roots;
    private final OfficeService office;
    private final StockLedger ledger;
    private final DirectoryService directory;
    public InventoryService(InventoryRepository repo,Commands commands,Roots roots,OfficeService office,StockLedger ledger,DirectoryService directory){this.repo=repo;this.commands=commands;this.roots=roots;this.office=office;this.ledger=ledger;this.directory=directory;}
    public Map<String,Object> goods(long after,boolean warnings){Actor a=Actors.current();a.requireStaff();a.require("inventory:goods:read");if(after<0)throw Problem.bad("afterId不能为负");return P.of("items",repo.goodsList(after,warnings));}
    public Map<String,Object> suppliers(){Actor a=Actors.current();a.requireStaff();a.require("inventory:supplier:read");return P.of("items",repo.db().list("select supplier_id,supplier_name,contact,phone,version from edu_supplier where del_flag='0' order by supplier_id",P.of()));}
    public Map<String,Object> movements(long goods,long after){Actors.current().require("inventory:movement:read");Actors.current().requireStaff();repo.goods(goods);if(after<0)throw Problem.bad("afterId不能为负");return P.of("items",repo.db().list("select * from stock_movement where goods_id=#{p.goods} and movement_id>#{p.after} order by movement_id limit 200",P.of("goods",goods,"after",after)));}
    public Map<String,Object> saveSupplier(Long id,String key,Map<String,Object>b){return directory.saveSupplier(id==null?0:id,key,b);}
    public Map<String,Object> saveGoods(Long id,String key,Map<String,Object>b){Actors.current().require("inventory:goods:write");Map<String,Object> payload=target(b,"goodsId",id==null?0:id);return commands.create(id==null?"INVENTORY_GOODS_CREATE":"INVENTORY_GOODS_UPDATE",key,payload,id==null?201:200,()->roots.create("INVENTORY",key,b),c->{office.requireRole(c,"warehouseRoleId");String name=Inputs.text(b,"goodsName",1,100),category=Inputs.text(b,"category",1,1),unit=Inputs.text(b,"unit",1,10),baseUnit=Inputs.text(b,"baseUnit",1,20);if(!Set.of("1","2","3").contains(category))throw Problem.bad("物品类别只允许1/2/3");long rate=Inputs.positive(b,"conversionRate"),warning=Inputs.nonNegative(b,"warnLowBaseQty");if(rate>Integer.MAX_VALUE)throw Problem.bad("换算率超出范围");Long supplier=b.get("supplierId")==null?null:Inputs.id(b,"supplierId");if(supplier!=null)repo.supplier(supplier);Map<String,Object> values=P.of("name",name,"category",category,"supplier",supplier,"grade",Inputs.optionalText(b,"grade",20),"spec",Inputs.optionalText(b,"spec",50),"unit",unit,"baseUnit",baseUnit,"rate",rate,"warning",warning,"location",Inputs.optionalText(b,"location",100),"returnRequired",Inputs.bool(b,"returnRequired",false)?1:0);long goods;Map<String,Object> before=P.of();
        if(id==null)goods=repo.db().insert("insert into edu_goods(goods_name,category,supplier_id,grade,spec,unit,base_unit,conversion_rate,stock_qty_base,stock_num,remain_sheets,warn_low,warn_low_base_qty,location,return_required,version,del_flag) values(#{p.name},#{p.category},#{p.supplier},#{p.grade},#{p.spec},#{p.unit},#{p.baseUnit},#{p.rate},0,0,0,0,#{p.warning},#{p.location},#{p.returnRequired},0,'0')",values);
        else{goods=id;before=repo.goods(id);if(Inputs.nonNegative(b,"expectedGoodsVersion")!=n(before,"version"))throw Problem.conflict("物品版本已变化");if(repo.lastMovement(id)>0&&(!unit.equals(before.get("unit"))||!baseUnit.equals(before.get("base_unit"))||rate!=n(before,"conversion_rate")))throw Problem.conflict("有历史收发后不能修改单位或换算率");values.put("id",id);repo.db().write("update edu_goods set goods_name=#{p.name},category=#{p.category},supplier_id=#{p.supplier},grade=#{p.grade},spec=#{p.spec},unit=#{p.unit},base_unit=#{p.baseUnit},conversion_rate=#{p.rate},warn_low_base_qty=#{p.warning},location=#{p.location},return_required=#{p.returnRequired},stock_num=stock_qty_base/#{p.rate},remain_sheets=mod(stock_qty_base,#{p.rate}),version=version+1 where goods_id=#{p.id}",values);}
        repo.complete(c.requestId());c.target("GOODS",goods);c.audit(P.of("before",before,"after",values));c.event("INVENTORY_MASTER_CHANGED",P.of("goodsId",goods));return P.of("goodsId",Long.toString(goods),"goodsVersion",id==null?0:n(before,"version")+1,"stockQtyBase",before.isEmpty()?0:n(before,"stock_qty_base"));});}
    public Map<String,Object> arrival(String key,Map<String,Object>b){Actors.current().require("inventory:arrival:accept");return commands.create("INVENTORY_ARRIVAL_ACCEPT",key,b,201,()->roots.create("INVENTORY",key,b),c->{office.requireRole(c,"warehouseRoleId");long supplier=Inputs.id(b,"supplierId");repo.supplier(supplier);String reason=Inputs.text(b,"reason",1,500);List<Map<String,Object>> items=orderedItems(b);long in=repo.db().insert("insert into edu_stock_in(in_no,in_type,request_id,supplier_id,operator_id,operator,in_time,status,acceptance_status,source_type,action_id,version,remark,del_flag) values(#{p.no},'1',#{p.request},#{p.supplier},#{p.actor},#{p.name},current_timestamp,'1','ACCEPTED','ARRIVAL',#{p.action},0,#{p.reason},'0')",P.of("no","IN"+c.actionId(),"request",c.requestId(),"supplier",supplier,"actor",c.actor().userId(),"name",repo.actorName(c.actor().userId()),"action",c.actionId(),"reason",reason));List<Map<String,Object>> out=new ArrayList<>();boolean rejected=false;
        for(Map<String,Object> item:items){long goods=Inputs.id(item,"goodsId"),arrived=Inputs.positive(item,"arrivedQty"),accepted=Inputs.nonNegative(item,"acceptedQty"),reject=Inputs.nonNegative(item,"rejectedQty");if(Math.addExact(accepted,reject)!=arrived)throw Problem.bad("实到量须等于验收可用量加拒收量");Map<String,Object> g=repo.goods(goods);long iid=repo.db().insert("insert into edu_stock_in_item(in_id,goods_id,quantity,base_qty,arrived_qty,rejected_qty,unit,conversion_rate,price,amount) values(#{p.in},#{p.goods},#{p.arrived},#{p.accepted},#{p.arrived},#{p.rejected},#{p.unit},1,0,0)",P.of("in",in,"goods",goods,"arrived",arrived,"accepted",accepted,"rejected",reject,"unit",g.get("base_unit")));Long movement=accepted==0?null:ledger.move(c,goods,accepted,"ARRIVAL",in,iid,"RECEIVE",reason);out.add(P.of("itemId",Long.toString(iid),"goodsId",Long.toString(goods),"movementId",movement==null?null:Long.toString(movement),"acceptedQty",accepted,"rejectedQty",reject));rejected|=reject>0;}
        if(rejected)repo.db().write("update edu_stock_in set acceptance_status='PARTIAL' where in_id=#{p.id}",P.of("id",in));repo.complete(c.requestId());c.target("STOCK_IN",in);c.audit(P.of("items",out,"reason",reason));c.event("INVENTORY_RECEIVED",P.of("inId",in));return P.of("inId",Long.toString(in),"acceptanceStatus",rejected?"PARTIAL":"ACCEPTED","items",out);});}
    public Map<String,Object> dispatch(String key,Map<String,Object>b){Actors.current().require("inventory:dispatch:confirm");return commands.create("INVENTORY_DISPATCH_CONFIRM",key,b,201,()->roots.create("INVENTORY",key,b),c->{office.requireRole(c,"warehouseRoleId");String reason=Inputs.text(b,"reason",1,500),destination=Inputs.text(b,"destination",1,50);List<Map<String,Object>> items=orderedItems(b);long out=repo.db().insert("insert into edu_stock_out(out_no,out_type,request_id,receiver,operator_id,operator,out_time,status,receipt_status,action_id,version,del_flag) values(#{p.no},'2',#{p.request},#{p.destination},#{p.actor},#{p.name},current_timestamp,'1','CONFIRMED',#{p.action},0,'0')",P.of("no","OUT"+c.actionId(),"request",c.requestId(),"destination",destination,"actor",c.actor().userId(),"name",repo.actorName(c.actor().userId()),"action",c.actionId()));List<Map<String,Object>> result=new ArrayList<>();for(Map<String,Object> item:items){long goods=Inputs.id(item,"goodsId"),qty=Inputs.positive(item,"qty");Map<String,Object>g=repo.goods(goods);long iid=repo.db().insert("insert into edu_stock_out_item(out_id,goods_id,quantity,base_qty,unit,conversion_rate) values(#{p.out},#{p.goods},#{p.qty},#{p.qty},#{p.unit},1)",P.of("out",out,"goods",goods,"qty",qty,"unit",g.get("base_unit")));long movement=ledger.move(c,goods,-qty,"INVENTORY_OUT",out,iid,"TRANSFER_OUT",reason);result.add(P.of("itemId",Long.toString(iid),"movementId",Long.toString(movement)));}repo.complete(c.requestId());c.target("STOCK_OUT",out);c.audit(P.of("destination",destination,"reason",reason,"items",result));c.event("INVENTORY_DISPATCHED",P.of("outId",out));return P.of("outId",Long.toString(out),"items",result);});}
    public Map<String,Object> createCheck(String key,Map<String,Object>b){Actors.current().require("inventory:check:create");return commands.create("STOCK_CHECK_CREATE",key,b,201,()->roots.create("STOCK_CHECK",key,b),c->{office.requireRole(c,"warehouseRoleId");List<Long> ids=new ArrayList<>(Inputs.ids(b,"goodsIds"));if(ids.isEmpty()||new HashSet<>(ids).size()!=ids.size())throw Problem.bad("盘点物品不得为空或重复");Collections.sort(ids);long check=repo.db().insert("insert into edu_stock_check(check_no,request_id,check_type,check_time,baseline_at,counted_by,review_status,review_round,version,status,operator) values(#{p.no},#{p.request},'2',current_timestamp,current_timestamp,#{p.actor},'COUNTING',1,0,'1',#{p.name})",P.of("no","CHK"+c.actionId(),"request",c.requestId(),"actor",c.actor().userId(),"name",repo.actorName(c.actor().userId())));for(long id:ids){Map<String,Object>g=repo.goods(id);repo.db().insert("insert into edu_stock_check_item(check_id,goods_id,book_num,real_num,diff_num,baseline_goods_version,baseline_movement_id,period_in_qty,period_out_qty,counted_at) values(#{p.check},#{p.goods},#{p.book},#{p.book},0,#{p.version},#{p.movement},0,0,null)",P.of("check",check,"goods",id,"book",g.get("stock_qty_base"),"version",g.get("version"),"movement",repo.lastMovement(id)));}repo.db().write("update office_request set status='PROCESSING',current_node='STOCK_COUNT' where request_id=#{p.id}",P.of("id",c.requestId()));c.task("STOCK_COUNT","STOCK_CHECK",check,c.actor().userId(),null,null);c.target("STOCK_CHECK",check);c.event("STOCK_CHECK_OPENED",P.of("checkId",check));return P.of("checkId",Long.toString(check),"checkVersion",0,"items",repo.checkItems(check));});}
    public Map<String,Object> checkDetail(long check){Actors.current().require("inventory:check:read");Map<String,Object> row=repo.locateCheck(check);Map<String,Object>root=repo.db().required("select * from office_request where request_id=#{p.id}",P.of("id",row.get("request_id")));Access.requireRequest(Actors.current(),root,repo.db());return P.of("request",root,"check",row,"items",repo.checkItems(check));}
    public Map<String,Object> count(long check,String key,Map<String,Object>b){Actors.current().require("inventory:check:count");long request=n(repo.locateCheck(check),"request_id");return commands.run(request,"STOCK_CHECK_COUNT",key,target(b,"checkId",check),200,c->{Map<String,Object>h=repo.check(check);checkVersion(b,h);if(!Set.of("COUNTING","RETURNED").contains(h.get("review_status")))throw Problem.conflict("不在可提交盘点状态");if(n(h,"counted_by")!=c.actor().userId())throw Problem.forbidden("必须由实际盘点人提交");office.requireTask(c,"STOCK_COUNT","STOCK_CHECK",check);List<Map<String,Object>> rows=repo.checkItems(check);Map<Long,Map<String,Object>> inputs=index(b,"itemId");if(inputs.size()!=rows.size())throw Problem.bad("须提交全部盘点行");List<Map<String,Object>> evidence=new ArrayList<>();for(Map<String,Object> row:rows){Map<String,Object>i=inputs.get(n(row,"item_id"));if(i==null)throw Problem.bad("盘点行不属于该单");Map<String,Object>g=repo.goods(n(row,"goods_id")),period=period(row,g);acknowledge(i,period);long actual=Inputs.nonNegative(i,"actualQtyAtCount"),real=BusinessMath.normalizedCount(actual,n(period,"in_qty"),n(period,"out_qty")),diff=Math.subtractExact(real,n(row,"book_num"));String reason=Inputs.optionalText(i,"diffReason",1000);if(diff!=0&&(reason==null||reason.isBlank()))throw Problem.bad("差异必须说明原因");repo.db().write("update edu_stock_check_item set real_num=#{p.real},diff_num=#{p.diff},reconciled_movement_id=#{p.movement},period_in_qty=#{p.in},period_out_qty=#{p.out},counted_at=current_timestamp,diff_reason=#{p.reason} where item_id=#{p.id}",P.of("id",row.get("item_id"),"real",real,"diff",diff,"movement",period.get("last_id"),"in",period.get("in_qty"),"out",period.get("out_qty"),"reason",reason));evidence.add(P.of("itemId",row.get("item_id"),"actualQtyAtCount",actual,"period",period,"normalizedRealQty",real,"diffQty",diff));}repo.db().write("update edu_stock_check set review_status='PENDING_REVIEW',version=version+1 where check_id=#{p.id}",P.of("id",check));repo.db().write("update office_request set status='SUBMITTED',current_node='STOCK_CHECK_REVIEW' where request_id=#{p.id}",P.of("id",request));c.closeTasks("STOCK_COUNT","STOCK_CHECK",check);long task=c.task("STOCK_CHECK_REVIEW","STOCK_CHECK",check,null,office.role(c.request(),"checkReviewerRoleId"),c.actor().userId());c.target("STOCK_CHECK",check);c.audit(P.of("counts",evidence));c.event("STOCK_CHECK_SUBMITTED",P.of("taskIds",List.of(task)));return P.of("checkId",Long.toString(check),"checkVersion",n(h,"version")+1,"reviewStatus","PENDING_REVIEW");});}
    public Map<String,Object> review(long check,String key,Map<String,Object>b){Actors.current().require("inventory:check:review");long request=n(repo.locateCheck(check),"request_id");return commands.run(request,"STOCK_CHECK_REVIEW",key,target(b,"checkId",check),200,c->{Map<String,Object>h=repo.check(check);checkVersion(b,h);if(!"PENDING_REVIEW".equals(h.get("review_status")))throw Problem.conflict("盘点不是待复核");if(n(h,"counted_by")==c.actor().userId()||n(c.request(),"created_by_user_id")==c.actor().userId())throw Problem.forbidden("盘点与复核必须由不同人员完成");office.requireTask(c,"STOCK_CHECK_REVIEW","STOCK_CHECK",check);String decision=Inputs.text(b,"decision",1,16),comment=Inputs.text(b,"comment",1,1000);if(!Set.of("APPROVE","RETURN").contains(decision))throw Problem.bad("复核决定只允许APPROVE/RETURN");List<Map<String,Object>> result=new ArrayList<>();
        if("APPROVE".equals(decision)){List<Map<String,Object>>rows=repo.checkItems(check);Map<Long,Map<String,Object>>inputs=index(b,"itemId");if(inputs.size()!=rows.size())throw Problem.bad("须逐项确认期间收发");for(Map<String,Object>row:rows){Map<String,Object>i=inputs.get(n(row,"item_id"));if(i==null||row.get("counted_at")==null)throw Problem.bad("存在未完成的盘点行");Map<String,Object>g=repo.goods(n(row,"goods_id")),p=period(row,g);acknowledge(i,p);long diff=n(row,"diff_num");BusinessMath.stockAfter(n(g,"stock_qty_base"),diff);Long movement=diff==0?null:ledger.move(c,n(row,"goods_id"),diff,"STOCK_CHECK",check,n(row,"item_id"),"CHECK_ADJUST",comment);repo.db().write("update edu_stock_check_item set reconciled_movement_id=#{p.last},period_in_qty=#{p.in},period_out_qty=#{p.out},adjustment_movement_id=#{p.movement} where item_id=#{p.id}",P.of("id",row.get("item_id"),"last",p.get("last_id"),"in",p.get("in_qty"),"out",p.get("out_qty"),"movement",movement));result.add(P.of("itemId",row.get("item_id"),"adjustmentQty",diff,"movementId",movement==null?null:Long.toString(movement),"period",p));}repo.complete(request);}
        else{repo.db().write("update office_request set status='RETURNED',current_node='STOCK_COUNT' where request_id=#{p.id}",P.of("id",request));c.task("STOCK_COUNT","STOCK_CHECK",check,n(h,"counted_by"),null,null);}
        repo.db().write("update edu_stock_check set review_status=#{p.status},reviewer_user_id=#{p.actor},reviewed_at=current_timestamp,review_comment=#{p.comment},review_round=review_round+case when #{p.status}='RETURNED' then 1 else 0 end,version=version+1,status=case when #{p.status}='APPROVED' then '2' else '1' end where check_id=#{p.id}",P.of("id",check,"status","APPROVE".equals(decision)?"APPROVED":"RETURNED","actor",c.actor().userId(),"comment",comment));c.closeTasks("STOCK_CHECK_REVIEW","STOCK_CHECK",check);c.target("STOCK_CHECK",check);c.audit(P.of("decision",decision,"comment",comment,"adjustments",result));c.event("STOCK_CHECK_REVIEWED",P.of("checkId",check,"decision",decision));return P.of("checkId",Long.toString(check),"checkVersion",n(h,"version")+1,"reviewStatus","APPROVE".equals(decision)?"APPROVED":"RETURNED","adjustments",result);});}
    private Map<String,Object> period(Map<String,Object>row,Map<String,Object>g){Map<String,Object>p=repo.period(n(row,"goods_id"),n(row,"baseline_movement_id"));if(n(p,"last_id")==0)p.put("last_id",n(row,"baseline_movement_id"));if(Math.addExact(n(row,"book_num"),Math.subtractExact(n(p,"in_qty"),n(p,"out_qty")))!=n(g,"stock_qty_base"))throw Problem.conflict("余额与基准后流水不一致，须先对账");return p;}
    private static void acknowledge(Map<String,Object>b,Map<String,Object>p){if(Inputs.nonNegative(b,"expectedMovementId")!=n(p,"last_id")||Inputs.nonNegative(b,"periodInQty")!=n(p,"in_qty")||Inputs.nonNegative(b,"periodOutQty")!=n(p,"out_qty"))throw Problem.conflict("期间收发已变化，请重新核实实盘和流水边界");}
    private static Map<Long,Map<String,Object>> index(Map<String,Object>b,String key){Map<Long,Map<String,Object>>out=new HashMap<>();for(Map<String,Object>i:Inputs.list(b,"items"))if(out.put(Inputs.id(i,key),i)!=null)throw Problem.bad("重复盘点行");return out;}
    private static List<Map<String,Object>> orderedItems(Map<String,Object>b){List<Map<String,Object>>items=new ArrayList<>(Inputs.list(b,"items"));if(items.isEmpty())throw Problem.bad("收发明细不能为空");Set<Long>seen=new HashSet<>();for(Map<String,Object>i:items)if(!seen.add(Inputs.id(i,"goodsId")))throw Problem.bad("同物品须合并一行");items.sort(Comparator.comparingLong(i->Inputs.id(i,"goodsId")));return items;}
    private static void checkVersion(Map<String,Object>b,Map<String,Object>h){if(Inputs.nonNegative(b,"expectedCheckVersion")!=n(h,"version"))throw Problem.conflict("盘点单版本已变化");}
    private static Map<String,Object> target(Map<String,Object>b,String field,long id){Map<String,Object>out=new LinkedHashMap<>(b);out.put(field,id);return out;}
    private static long n(Map<String,Object>m,String key){return m.get(key)==null?0:Inputs.number(m.get(key));}
}
```

**backend/src/main/java/com/doupi/planref/inventory/InventoryRepository.java**

```java
package com.doupi.planref.inventory;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class InventoryRepository {
    private final Db db;
    public InventoryRepository(Db db){this.db=db;}
    public Db db(){return db;}
    public Map<String,Object> goods(long id){return db.required("select * from edu_goods where goods_id=#{p.id} and del_flag='0' for update",P.of("id",id));}
    public Map<String,Object> supplier(long id){return db.required("select * from edu_supplier where supplier_id=#{p.id} and del_flag='0' for update",P.of("id",id));}
    public Map<String,Object> check(long id){return db.required("select * from edu_stock_check where check_id=#{p.id} for update",P.of("id",id));}
    public Map<String,Object> locateCheck(long id){return db.required("select * from edu_stock_check where check_id=#{p.id}",P.of("id",id));}
    public List<Map<String,Object>> checkItems(long id){return db.list("select * from edu_stock_check_item where check_id=#{p.id} order by goods_id for update",P.of("id",id));}
    public List<Map<String,Object>> goodsList(long after,boolean warnings){return warnings?db.list("select goods_id,goods_name,category,supplier_id,unit,conversion_rate,base_unit,stock_qty_base,stock_num,remain_sheets,warn_low_base_qty,location,return_required,version from edu_goods where del_flag='0' and goods_id>#{p.after} and stock_qty_base<=warn_low_base_qty order by goods_id limit 200",P.of("after",after)):db.list("select * from edu_goods where del_flag='0' and goods_id>#{p.after} order by goods_id limit 200",P.of("after",after));}
    public Map<String,Object> period(long goods,long baseline){return db.required("select coalesce(max(movement_id),0) as last_id,coalesce(sum(case when delta_qty>0 then delta_qty else 0 end),0) as in_qty,coalesce(sum(case when delta_qty<0 then -delta_qty else 0 end),0) as out_qty from stock_movement where goods_id=#{p.goods} and movement_id>#{p.baseline}",P.of("goods",goods,"baseline",baseline));}
    public long lastMovement(long goods){return Inputs.number(db.required("select coalesce(max(movement_id),0) as n from stock_movement where goods_id=#{p.id}",P.of("id",goods)).get("n"));}
    public String actorName(long id){return String.valueOf(db.required("select nick_name from sys_user where user_id=#{p.id} and status='0' and del_flag='0'",P.of("id",id)).get("nick_name"));}
    public void complete(long request){db.write("update office_request set status='COMPLETED',current_node=null,closed_at=current_timestamp where request_id=#{p.id}",P.of("id",request));}
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



## 6. 边界与异常场景处理

400处理空/重复/缺失盘点行、非法数值、未解释差异、归一化实盘负值和溢出；403处理自盘自审、非实际盘点人录入和无固定复核资格；404隐藏跨根单据；409处理根/头版本、期间收发边界变化、账流不符、负调整导致不足和再次批准。零差异也必须完成独立复核但不生成0库存流水。审批中并发收发被goods行锁串行；审批后仍可正常收发。任务和动作同事务失败全部回滚，不遗留部分调整。盘点单作废不得自动反向撤销已提交调整；若需纠错重新建有证据的新盘点事项并独立复核。
