# ADM-07 分次交付、签收争议与新单重印

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-07)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期3人日。负责真实交付登记、指定实际领取人确认、数量差异、独立事实核定和新事项重印。已交接但PENDING/DISPUTED的数量继续占用delivered_count；只有CONFIRMED计signed_count。依赖ADM-03固定任务与不自审、ADM-05印品、ADM-06合格份数和核销、ADM-04私有凭证。

- [ ] 第1日：在`PrintService.deliver/receipt`与`PrintRepository`实现额度和签收
- [ ] 第2日：实现`resolve/reprint`、before/after证据和新根关联，在待实施`doupi-web-admin-react/src/pages/office/print/delivery.tsx`展示交接/待确认/已签/争议
- [ ] 第3日：完成60+40分批、60争议不可再发同额度、核定更正后重签、多子项未完及重印不改原库存验收。接口接入`src/api/office.ts`；本轮仅整理说明与已内嵌代码定位。

验收：100份合格，交付60后handedOver60/confirmed0/remaining40；争议后仍占60；领取人确认才signed60；全部子项签收且核销CLOSED、争议为0才根COMPLETED。重印创建新requestId/printId并关联旧printId，旧核销、交付和耗纸保留。

## 2. 接口设计清单

前缀`/api/v1/office/print-requests`，全部员工JWT，写请求带`Idempotency-Key`。path `{id}`为根ID，`{delivery}`为该根交付，`{source}`为原印品。所有普通命令body都带`expectedVersion`；交付回执/核定额外`expectedDeliveryVersion`。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/是否必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 办理 deliveries | POST | `/api/v1/office/print-requests/{id}/deliveries` | `expectedVersion,printId,deliveryCount`正数，`receiverUserId`正ID，`receiverName`1—64；`receiptFileIds`可省略，元素为正fileId字符串的数组 | `deliveryId,handedOverCount,confirmedCount,pendingConfirmationCount,remainingCount,paperStatus,requestId,status,version`；201 | `print:delivery:create` |
| 办理 confirm | POST | `/api/v1/office/print-requests/{id}/deliveries/{delivery}/confirm` | `expectedVersion,expectedDeliveryVersion,receivedCount`正数 | 同计数data；200 | `print:delivery:confirm` |
| 办理 dispute | POST | `/api/v1/office/print-requests/{id}/deliveries/{delivery}/dispute` | `expectedVersion,expectedDeliveryVersion,observedCount`非负，`reason`1—1000，`evidenceFileIds`可省略，元素为正fileId字符串的数组 | 同计数data；200 | `print:delivery:dispute` |
| 办理 review | POST | `/api/v1/office/print-requests/{id}/deliveries/{delivery}/review` | `expectedVersion,expectedDeliveryVersion,verifiedDeliveryCount`正数，`reason`1—1000 | 同计数data；200；转PENDING等待实际领取人重新确认 | `print:delivery:resolve` |
| 办理 {source} | POST | `/api/v1/office/print-requests/reprints/{source}` | 根创建字段`title,applicantUserId,clientSource,dueAt`可选，`reprintReason`1—500必填，`record`一个完整印品：printName/teacherId/classId/paperGoodsId/paperType/printCount/pageCount/printSide/colorCategory/printPurpose，templatePaperQty/previewPaperQty可省略0，sourceConversationId/sourceMessageId可空成对，files[{fileId}]非空；不传expectedVersion | `requestId,status,version,printId,reprintOfPrintId,plannedSheets`；201，自动提交审核 | `print:request:reprint` |

计数公式：`handedOverCount=delivered_count`；`confirmedCount=signed_count`；`pendingConfirmationCount=delivered_count-signed_count`（含争议）；`remainingCount=good_copy_count-delivered_count`。remaining不是“未签收量”。交付0不建事件；核定整批未交接时不能用0伪造本参考的正交付记录，应保留争议并走人工事实纠正扩展。


## 3. 数据流转细节

| API/字段来源 | 校验和服务端计算 | 表字段、任务与审计 | 事务/缓存 |
|---|---|---|---|
| deliver：id、expectedVersion、Actor | 根PRINT且PROCESSING/WAIT_RECEIPT/WAIT_SETTLEMENT，Actor必须当前handler，不从正文认经办 | 根、print、settlement顺序锁；无库存变更 | action PRINT_DELIVERY_CREATE；Commands重放优先版本 |
| printId、deliveryCount | print归本根；已有settlement，qty>0且不超good_copy_count-delivered_count；PENDING、CONFIRMED、DISPUTED均占已交付额度 | INSERT edu_print_delivery.request_id/print_id/delivery_count/status=PENDING/version=0/action_id；print.delivered_count+=qty/version+1；signed_count不变 | 超额整事务回滚，不释放争议额度 |
| receiverUserId、receiverName | 有效sys_user；name必须与核实nick_name一致；本参考仅支持有校内账户指定领取人，代领先核实登记其真实账号 | delivery.receiver_user_id/receiver_name；delivered_by=Actor/delivered_at=服务端；建PRINT_RECEIPT,target=DELIVERY/deliveryId,user=receiver | 不把申请人自动冒充代领人 |
| receiptFileIds[] | 文件READY/PASSED且自己或已绑定本根；purpose固定RECEIPT | office_request_file作用域printId；具体deliveryId与凭证列表存action.after_json.details；Outbox PRINT_DELIVERED聚合taskIds | 私有文件无object_key返回；不缓存下载授权 |
| confirm：path delivery、expectedDeliveryVersion、receivedCount、Actor | 路径目标规范加入body.deliveryId参与hash；delivery归本根，version匹配且PENDING；Actor等于指定receiver且具有PRINT_RECEIPT任务；receivedCount必须等本delivery_count | delivery.status=CONFIRMED/confirmed_by/confirmed_at/version+1；重新聚合全部delivery，delivered=sum全部，signed=sumCONFIRMED；只关本DELIVERY任务；PRINT_RECEIPT_CONFIRMED事件 | 锁根→delivery→print；不扣纸，不改变consumed |
| dispute：observedCount/reason/evidenceFileIds | 指定receiver、PENDING及版本同上；observed>=0；reason必填；文件逐项权限验证 | delivery.status=DISPUTED/version+1；before/observedCount/reason/evidenceFileIds归档action；绑定凭证；关闭本PRINT_RECEIPT，创建DELIVERY_REVIEW目标该delivery，executorRoleId岗位且排除提争议者；PRINT_DELIVERY_DISPUTED事件 | delivered_count保持不变，signed不增加，核销和库存不回滚 |
| review：verifiedDeliveryCount/reason、Actor | DISPUTED且版本匹配；Actor具有该DELIVERY_REVIEW固定任务并非被排除人；qty>0；更正后所有delivery总数仍≤good_copy_count | delivery.delivery_count更正、status=PENDING/version+1；重算print.delivered_count/signed_count；audit保存完整旧delivery、verified qty、reason；关闭REVIEW，给原receiver新PRINT_RECEIPT；PRINT_DELIVERY_REVIEWED事件 | 只能核实实物去向后更正；审核员不代领取人签收；本动作不直接增signed |
| reprint：source path、reprintReason、record字段、Actor | 先确认原print对应根可见；sourcePrintId服务端加入摘要；新定义再次验证教师、班级、纸张、页数和私有原稿；不得复用已登记的相同来源消息冒充首次录入 | Roots新建PRINT根，新增print.reprint_of_print_id/reprint_reason；其issued/returned/consumed/delivered/signed全0；新ORIGINAL绑定，提交新REVIEW，target=新PRINT；audit关联源print | action PRINT_REPRINT_CREATE；新根新动作新库存生命周期；原根/print/movement无写入 |
| 每次动作后根 | 重新遍历所有有效print，FINISHED且settlement CLOSED、signed=good_copy_count、无DISPUTED才COMPLETED；其余区分PROCESSING/WAIT_SETTLEMENT/WAIT_RECEIPT | office_request.status/current_node/closed_at；version由Commands一次增加 | 实时数据库事实判断；通知或Redis故障不误完成 |

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**edu_print_delivery**

```sql
CREATE TABLE `edu_print_delivery` (
  `delivery_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '本次交付',
  `request_id` BIGINT NOT NULL COMMENT '根事项',
  `print_id` BIGINT NOT NULL COMMENT '印品子项',
  `delivery_count` BIGINT NOT NULL COMMENT '本次交付份数，大于0',
  `receiver_user_id` BIGINT NULL COMMENT '校内实际领取人',
  `receiver_name` VARCHAR(64) NOT NULL COMMENT '领取快照，代领不冒充申请人',
  `delivered_by` BIGINT NOT NULL COMMENT '实际发出人',
  `delivered_at` DATETIME(3) NOT NULL COMMENT '发出时间',
  `confirmed_by` BIGINT NULL COMMENT '回执确认人',
  `confirmed_at` DATETIME(3) NULL COMMENT '回执时间',
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/CONFIRMED/DISPUTED',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '防重复确认',
  `action_id` BIGINT NOT NULL COMMENT '创建交付动作；确认动作另留action_log',
  `created_by_user_id` BIGINT NOT NULL COMMENT '创建者身份',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`delivery_id`),
  UNIQUE `uk_delivery_action` (
    `action_id`
  ),
  INDEX `idx_delivery_print` (`print_id`, `delivery_id`),
  INDEX `idx_delivery_request` (`request_id`, `status`),
  CONSTRAINT `fk_ref_054` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_055` FOREIGN KEY (`receiver_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_056` FOREIGN KEY (`delivered_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_057` FOREIGN KEY (`confirmed_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_058` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_059` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_108` FOREIGN KEY (`print_id`) REFERENCES `edu_print_record` (
    `print_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='edu_print_delivery';
```

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

**office_request_file**

```sql
CREATE TABLE `office_request_file` (
  `link_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '绑定',
  `request_id` BIGINT NOT NULL COMMENT '授权边界',
  `file_id` BIGINT NOT NULL COMMENT 'sys_file',
  `purpose` VARCHAR(24) NOT NULL COMMENT 'ORIGINAL/RESULT/RECEIPT/CHECK_EVIDENCE等',
  `record_scope_id` BIGINT NOT NULL DEFAULT 0 COMMENT '0整事项，非0为biz_type下print_id等子项，强制校验归属',
  `revision` INT NOT NULL COMMENT '内容/证据修订',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '展示顺序',
  `linked_by` BIGINT NOT NULL COMMENT '绑定人',
  `linked_at` DATETIME(3) NOT NULL COMMENT '时间',
  PRIMARY KEY (`link_id`),
  UNIQUE `uk_request_file` (
    `request_id`,
    `file_id`,
    `purpose`,
    `record_scope_id`
  ),
  INDEX `idx_file_bindings` (`file_id`),
  INDEX `idx_request_file_scope` (`request_id`, `purpose`, `record_scope_id`, `revision`),
  CONSTRAINT `fk_ref_017` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_018` FOREIGN KEY (`file_id`) REFERENCES `sys_file` (
    `file_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_019` FOREIGN KEY (`linked_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='office_request_file';
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



## 6. 边界与异常场景处理

400拒绝0交付、非整数、姓名与身份不符、确认数有差异和缺理由；403拒绝经办人代签、他人确认、无任务岗位核定；404隐藏跨根delivery；409处理版本、重复签收、已争议继续confirm、超合格份数及同键换delivery。争议时不能再发同额度；更正后要求实际领取人重签。纸已耗即使印品丢失或争议也不增加库存；需补印只能创建新审批事项。一个子项签齐不关闭仍有余纸或另一子项未签的根。所有失败回滚本动作新增任务、文件绑定、计数与动作归档。
