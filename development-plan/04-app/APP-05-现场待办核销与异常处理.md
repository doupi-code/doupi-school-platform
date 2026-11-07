# APP-05 现场待办核销与异常处理

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#app-05)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

优先级：P1；工期：3个单人工作日；依赖：APP-04、MINI-05。按1名Java开发+AI辅助估算，工期包括页面、接口、自测和联调。

包含负责人审核/退回、执行岗位接单、文印现场领纸/核销/退纸、到校预约核验和证据反馈；操作入口按角色显示但服务端始终校验。不搬运批量盘点、基础资料全维护、全量导出与门户编辑器。

- [ ] 第1日：`pages/work/todo`关联目标task/print/delivery，完成领取任务和审批；任务版本与根版本分开。
- [ ] 第2日：文印现场动作表单和招生扫码后查详情再核销；仓管验收需要现场实物核对。
- [ ] 第3日：拍照证据私有上传、本人审批/跨校区/重复扫码/无网络验收；争议由负责人核定后重新签收。

验收：核销码不是员工授权；扫码只识别预约，未校验不显示到校成功；数量异常不默认修正。

## 2. 接口设计清单

统一外层`code:int,msg:string,traceId:string,replayed:boolean,data:object`；下表为data。ID为十进制字符串，数据库BIGINT；版本为非负整数。业务写命令头`Idempotency-Key:string(1..64)`必填；私有上传和ExternalCommands动作另限8..64个字母数字或_.:-字符；登录、分析和文本候选不要求该头；JWT认证派生操作者和部门。接口不得接受客户端权限、角色和操作者作为授权依据。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 审批任务 | POST | `/api/v1/office/tasks/{id}/actions` | id/string/是/taskId；expectedVersion,expectedTaskVersion/long/是；decision/CLAIM或APPROVE或RETURN或REJECT/是；comment/string≤1000/退回拒绝是 | taskId,requestId/string；version/long；status/string；decision或taskStatus/string | office:task:act及职责范围，MATERIAL不可通过本入口APPROVE |
| 物资逐项批准 | POST | `/api/v1/office/material-requests/{id}/approve` | id/string/是；expectedVersion/long/是；items/[{requestItemId:string,approvedQty:非负long}]/是且覆盖全部申请行 | requestId/string；version/long；status/string | material:request:approve，先CLAIM固定REVIEW任务，禁止本人及代录人自审 |
| 实际领纸 | POST | `/api/v1/office/print-requests/{id}/paper-issues` | id/string/是；expectedVersion/long/是；printId,paperGoodsId,receiverUserId/string/是；qty/正long/是；reason/string(1..500)/是 | issueId,movementId,requestId/string；issuedQty,stockQtyBase,version/long；status/string | print:paper:issue，仓库职责 |
| 完工核销 | POST | `/api/v1/office/print-requests/{id}/settlements` | id/string/是；expectedVersion,expectedSettlementVersion/long/是；printId,paperGoodsId/string/是；goodCopyCount,goodPaperQty,templatePaperQty,previewPaperQty,wastePaperQty,unusedQty/非负long/是；resultFileIds/string[]/否/已上传结果文件ID；reason/string≤1000/否 | settlementId,requestId/string；consumedQty,unusedQty,settlementVersion,version/long；paperStatus,status/string | print:settlement:confirm，受派核销人 |
| 可用余纸退回 | POST | `/api/v1/office/print-requests/{id}/paper-returns` | id/string/是；expectedVersion,expectedSettlementVersion/long/是；printId,paperGoodsId,originalIssueId,receiverUserId/string/是；qty/正long/是；condition/REUSABLE/是；reason/string1..500/是 | returnIssueId,movementId,requestId/string；stockQtyBase,version/long；status/string | print:paper:return，仓库验收职责 |
| 预约详情 | GET | `/api/v1/staff/appointments/{id}` | id/string/是 | appointmentId,campusId,assignedTeacherUserId/string或null；appointmentNo,status,studentName,studentGrade,campusName,timeSlot,assignedTeacherName,parentName,parentPhone,remark,auditRemark/string或null；visitDate,verifiedAt/ISO时间或null；version/long；checkInCode/null | recruit:appointment:query及校区/分配范围 |
| 到校核销 | POST | `/api/v1/staff/appointments/{id}/verify` | expectedVersion/long/是；checkInCode/string(1..64)/是；id/string/是 | 同预约详情；status=VERIFIED；alreadyVerified/boolean/已核销时true且不再改version | recruit:appointment:verify且校区/接待范围 |

## 3. 数据流转细节

所有移动写动作使用同一后端Controller→Service→Repository，不新建App专用库存/事项表。Bearer由服务端生成，clientSource=STAFF_APP仅审计。App不接收和保存学校secret；列表/权限以服务端返回为准。网络超时先展示“结果待确认”，原CommandTicket重发，禁止自动改变expectedVersion或生成新键。

1. 待办动作使用task.target_type/id定位真实事项，OfficeService读取task.round_no/excluded/assignee及root.revision/version；不同对象不能共用旧ticket。本人及代录本人审批403；新审批根状态与下一任务同事务，不靠消息送达再生成核心任务。
2. 领纸：printId/paperGoodsId须与根子项一致；receiverUserId必须当前handler。插`edu_print_paper_issue(kind=ISSUE,qty,original_issue_id=NULL,operator_user_id,receiver_user_id,confirmed_by,confirmed_at,action_id)`→StockLedger锁goods，`stock_qty_base-=qty`、重算stock_num/remain_sheets、version+1、插signed负delta `stock_movement(source_type=PRINT_PAPER,source_id=issueId,source_item_id=issueId,movement_kind=ISSUE)`→回填issue.stock_movement_id，print.issued_qty+=qty。
3. 核销：受派执行人，goodCopyCount不得超获准份数/低于已交付量；goodPaperQty须等合格份数乘获准单份纸数（双面向上取整）；`consumed=goodPaper+template+preview+waste`，必须`issued=consumed+returned+unused`；resultFileIds是正ID字符串数组，逐文件校私有权限并绑定RESULT。写`edu_print_settlement`有效核销及print.consumed_qty/production_status，unused>0 PENDING_RETURN否则CLOSED。无库存movement；余纸任务同事务建立。
4. 退纸：校原ISSUE/root/print/goods及未退额度，condition必须REUSABLE；插RETURN并调用ledger正delta，更新print.returned_qty、settlement.unused_qty/status/version。已耗或损坏不走退纸。
5. 预约核销：扫描只取得id/code，先staffDetail校范围；Service核check_in_code一致，首次核销比较expectedVersion、status=APPROVED和visit_on=上海当天；写`doupi_recruit_appointment.status=VERIFIED,verify_time,verifier_user_id,verifier,version+1`，写`recruit_appointment_action`审计及`recruit_notification`，ExternalCommands存结果。已取消/过期409，同键原正文重放；已核销再次提交相同合法码返回alreadyVerified=true，不再写核销事实或递增version。
6. 库存动作与预约动作分别事务，不把招生核销混为office root；照片经sys_file绑定到其合法办公事项，招生备注不接受无授权私有原稿路径；Redis只会话/限流，不负责数量正确性。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

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

**doupi_recruit_appointment**

```sql
CREATE TABLE `doupi_recruit_appointment` (
  `appointment_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '预约ID',
  `appointment_no` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '预约单号',
  `openid` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT 'PENDING' COMMENT '状态: PENDING-待审核 APPROVED-已通过 CANCELLED-已取消 VERIFIED-已核销/已到校',
  `parent_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '家长姓名',
  `parent_phone` VARCHAR(32) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '学生姓名',
  `student_gender` VARCHAR(10) COLLATE utf8mb4_unicode_ci DEFAULT '男' COMMENT '学生性别',
  `student_grade` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `current_school` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '原就读学校',
  `campus_id` VARCHAR(32) COLLATE utf8mb4_unicode_ci DEFAULT 'default' COMMENT '校区ID',
  `campus_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '汉阳校区' COMMENT '校区名称',
  `visit_date` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '预约访校日期(YYYY-MM-DD)',
  `time_slot` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '预约时间段',
  `check_in_code` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `teacher_id` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `teacher_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '对接教师姓名',
  `verify_time` DATETIME DEFAULT NULL COMMENT '核销到校时间',
  `verifier` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '家长备注/诉求',
  `audit_remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '审核/接待备注',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`appointment_id`),
  UNIQUE `uk_appointment_no` (
    `appointment_no`
  ),
  INDEX `idx_phone` (`parent_phone`),
  INDEX `idx_visit_date` (`visit_date`),
  INDEX `idx_status` (`status`),
  `visitor_identity_id` BIGINT NULL COMMENT '新增，关联已识别访客的sys_external_identity，不能自动继承员工权限',
  `public_access_token_hash` CHAR(64) NULL COMMENT '新增，Web查询高熵访问凭证的摘要，结合本人核验；不存明文凭证',
  `visit_on` DATE NULL COMMENT '新增，校验后日期',
  `assigned_teacher_user_id` BIGINT NULL COMMENT '新增，明确sys_user关联',
  `verifier_user_id` BIGINT NULL COMMENT '新增，核销身份',
  `source_channel` VARCHAR(16) NOT NULL DEFAULT 'LEGACY' COMMENT '新增，四端来源，仅审计',
  `create_key` VARCHAR(64) NULL COMMENT '新增，创建重试键',
  `create_actor_key` VARCHAR(128) NULL COMMENT '新增，认证家长或受控访客会话，不由任意body指定',
  `payload_hash` CHAR(64) NULL COMMENT '新增，规范创建摘要',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，分配/取消/核销并发',
  UNIQUE `uk_appointment_create` (
    `create_actor_key`,
    `create_key`
  ),
  UNIQUE `uk_appointment_public_token` (
    `public_access_token_hash`
  ),
  INDEX `idx_appointment_visitor` (`visitor_identity_id`, `appointment_id`),
  INDEX `idx_appointment_teacher` (`assigned_teacher_user_id`, `status`, `visit_on`),
  INDEX `idx_appointment_owner` (`openid`, `appointment_id`),
  INDEX `idx_appointment_code` (`campus_id`, `check_in_code`, `status`),
  CONSTRAINT `fk_ref_083` FOREIGN KEY (`assigned_teacher_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_084` FOREIGN KEY (`verifier_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_100` FOREIGN KEY (`visitor_identity_id`) REFERENCES `sys_external_identity` (
    `identity_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='访校预约表';
```

**recruit_appointment_action**

```sql
CREATE TABLE recruit_appointment_action (
  action_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '招生预约动作轨迹ID',
  appointment_id BIGINT NOT NULL COMMENT '同一预约聚合',
  actor_user_id BIGINT NULL COMMENT '真实员工操作者；访客为空',
  actor_identity_id BIGINT NULL COMMENT '真实认证渠道身份；纯员工密码登录可空',
  action_code VARCHAR(32) NOT NULL COMMENT 'CREATE、CANCEL、CONFIRM、VERIFY、REMARK固定动作',
  previous_status VARCHAR(20) NULL COMMENT '动作前状态，创建为空',
  next_status VARCHAR(20) NOT NULL COMMENT '动作后状态',
  remark VARCHAR(500) NOT NULL COMMENT '动作原因或学校处理说明',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC事实时间',
  PRIMARY KEY (action_id),
  INDEX idx_recruit_action_root (appointment_id, action_id)   COMMENT '预约有序轨迹',
  INDEX idx_recruit_action_user (actor_user_id, created_at)   COMMENT '员工审计',
  INDEX idx_recruit_action_identity (actor_identity_id, created_at)   COMMENT '访客审计',
  CONSTRAINT fk_recruit_action_root FOREIGN KEY (appointment_id) REFERENCES doupi_recruit_appointment (
    appointment_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_recruit_action_user FOREIGN KEY (actor_user_id) REFERENCES sys_user (
    user_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_recruit_action_identity FOREIGN KEY (actor_identity_id) REFERENCES sys_external_identity (
    identity_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_recruit_action_actor CHECK (NOT actor_user_id IS NULL OR NOT actor_identity_id IS NULL),
  CONSTRAINT ck_recruit_action_code CHECK (action_code IN ('CREATE', 'CANCEL', 'CONFIRM', 'VERIFY', 'REMARK'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='预约状态和接待备注审计，与预约及通知同事务';
```

**channel_idempotency**

```sql
/* Target schema definition. The complete schema is at database/target/schema.sql. */
/* This file adds six channel tables. Existing technical-design tables are not recreated. */
CREATE TABLE channel_idempotency (
  command_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '渠道命令主键',
  scope_key VARCHAR(128) NOT NULL COMMENT '服务端主体范围IDENTITY或STAFF，不接受body操作者',
  action_code VARCHAR(64) NOT NULL COMMENT '固定动作代码，目标ID只进入payload摘要',
  idempotency_key VARCHAR(64) NOT NULL COMMENT '客户端同一命令重试键',
  payload_hash CHAR(64) NOT NULL COMMENT '规范载荷SHA256，包含路径目标ID',
  http_status SMALLINT NULL COMMENT '成功归档HTTP状态，事务提交前填充',
  result_json JSON NULL COMMENT '可重放业务结果，不含token和查询明文凭证',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC占键时间',
  PRIMARY KEY (command_id),
  UNIQUE uk_channel_command (
    scope_key,
    action_code,
    idempotency_key
  ) COMMENT '同主体同动作同键只执行一次',
  INDEX idx_channel_created (created_at, command_id)   COMMENT '审计查询和归档，不自动删除有效业务重试记录',
  CONSTRAINT ck_channel_result CHECK ((
    http_status IS NULL AND result_json IS NULL
  )
  OR (
    http_status BETWEEN 200 AND 299 AND NOT result_json IS NULL
  ))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='无office_request根的渠道动作幂等，与业务同事务';
```

## 5. 代码实现骨架

命名采用Java驼峰、类PascalCase、SQL snake_case和REST资源路径。Controller负责HTTP适配，Service负责校验、权限、事务与业务，Repository经MyBatis参数绑定访问数据库；公共ApiErrors/SecurityConfig输出脱敏异常和traceId日志。公共组件定义及运行依赖见[公共契约与内嵌实现](../00-shared/公共契约.md)。



**backend/src/main/java/com/doupi/planref/office/OfficeController.java**

```java
package com.doupi.planref.office;

import com.doupi.planref.ApiReply;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/office")
public final class OfficeController {
    private final OfficeService service;
    public OfficeController(OfficeService service){this.service=service;}
    @GetMapping("/requests") public ResponseEntity<Map<String,Object>> list(@RequestParam(defaultValue="0")long afterId){return ApiReply.of(service.list(afterId),200);}
    @GetMapping("/requests/{id}") public ResponseEntity<Map<String,Object>> detail(@PathVariable long id){return ApiReply.of(service.detail(id),200);}
    @GetMapping("/tasks") public ResponseEntity<Map<String,Object>> tasks(){return ApiReply.of(service.tasks(),200);}
    @PostMapping("/requests/{id}/submit") public ResponseEntity<Map<String,Object>> submit(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.submit(id,key,b),200);}
    @PostMapping("/tasks/{id}/actions") public ResponseEntity<Map<String,Object>> action(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.taskAction(id,key,b),200);}
    @PostMapping("/requests/{id}/cancel-request") public ResponseEntity<Map<String,Object>> cancel(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.cancel(id,key,b),200);}
    @PostMapping("/requests/{id}/close") public ResponseEntity<Map<String,Object>> close(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.close(id,key,b),200);}
}
```

**backend/src/main/java/com/doupi/planref/office/OfficeService.java**

```java
package com.doupi.planref.office;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public final class OfficeService {
    private final OfficeRepository repo;
    private final Commands commands;
    private final Rules rules;
    public OfficeService(OfficeRepository repo,Commands commands,Rules rules){this.repo=repo;this.commands=commands;this.rules=rules;}
    public Map<String,Object> list(long after){
        Actor a=Actors.current();a.requireStaff();a.require("office:request:list");
        List<Map<String,Object>> visible=new ArrayList<>();long scanned=after;
        if(after<0)throw Problem.bad("afterId不能为负数");for(Map<String,Object> row:repo.requests(after)){scanned=Inputs.number(row.get("request_id"));try{Access.requireRequest(a,row,repo.db());visible.add(row);}catch(Problem denied){if(denied.http()!=403&&denied.http()!=404)throw denied;}}
        return P.of("items",visible,"scannedThroughId",scanned);
    }
    public Map<String,Object> detail(long id){Actor a=Actors.current();a.requireStaff();a.require("office:request:read");Map<String,Object> r=repo.request(id);Access.requireRequest(a,r,repo.db());return P.of("request",r,"history",repo.history(id));}
    public Map<String,Object> tasks(){Actor a=Actors.current();a.requireStaff();a.require("office:task:list");List<Map<String,Object>> out=new ArrayList<>();for(Map<String,Object> t:repo.tasks(a.userId())){try{Access.requireRequest(a,repo.request(Inputs.number(t.get("request_id"))),repo.db());out.add(t);}catch(Problem denied){if(denied.http()!=403&&denied.http()!=404)throw denied;}}return P.of("items",out);}
    public void requireState(Map<String,Object> r,String...allowed){if(Arrays.stream(allowed).noneMatch(x->x.equals(r.get("status"))))throw Problem.conflict("当前事项状态不允许此操作");}
    public Long role(Map<String,Object> r,String name){return rules.role(name,Json.readMap(r.get("rule_snapshot")));}
    public void requireRole(Commands.Context c,String name){Long id=role(c.request(),name);if(id==null||!repo.inRole(c.actor().userId(),id))throw Problem.forbidden("不具备该事项固定岗位资格");}
    public void eligible(Actor a,Map<String,Object> t){
        if(!Set.of("OPEN","CLAIMED").contains(String.valueOf(t.get("status"))))throw Problem.conflict("任务已经结清");
        if(t.get("excluded_user_id")!=null&&Inputs.number(t.get("excluded_user_id"))==a.userId())throw Problem.forbidden("不能办理本人须回避的审核");
        if(t.get("assignee_user_id")!=null){if(Inputs.number(t.get("assignee_user_id"))!=a.userId())throw Problem.forbidden("任务已指派其他人员");}
        else if(t.get("assignee_role_id")==null||!repo.inRole(a.userId(),Inputs.number(t.get("assignee_role_id"))))throw Problem.forbidden("不具备任务岗位资格");
    }
    public void requireTask(Commands.Context c,String node,String type,long target){eligible(c.actor(),repo.taskFor(c.requestId(),node,type,target));}
    public void submitWithin(Commands.Context c){
        requireState(c.request(),"DRAFT","RETURNED");String biz=String.valueOf(c.request().get("biz_type"));
        String field=switch(biz){case "PRINT"->"printReviewerRoleId";case "MATERIAL"->"materialReviewerRoleId";default->throw Problem.conflict("该业务请使用专属提交入口");};
        Long reviewer=role(c.request(),field);if(reviewer==null)throw new Problem(503,"RULE_MISSING","审核岗位尚未配置");
        repo.state(c.requestId(),"SUBMITTED","REVIEW");c.task("REVIEW","REQUEST",c.requestId(),null,reviewer,Inputs.number(c.request().get("applicant_user_id")));
        c.target("REQUEST",c.requestId());c.event("REQUEST_SUBMITTED",P.of("requestId",c.requestId()));
    }
    public Map<String,Object> submit(long id,String key,Map<String,Object> b){Actors.current().require("office:request:submit");return commands.run(id,"REQUEST_SUBMIT",key,b,200,c->{submitWithin(c);return P.of("submitted",true);});}
    public Map<String,Object> taskAction(long taskId,String key,Map<String,Object> b){
        Actor a=Actors.current();a.require("office:task:act");Map<String,Object> t=repo.locateTask(taskId);long id=Inputs.number(t.get("request_id"));
        String decision=Inputs.text(b,"decision",1,24);String comment=Inputs.optionalText(b,"comment",1000);
        String action=switch(decision){case "CLAIM"->"TASK_CLAIM";case "APPROVE"->"REVIEW_APPROVE";case "RETURN"->"REVIEW_RETURN";case "REJECT"->"REVIEW_REJECT";default->throw Problem.bad("不支持的任务决定");};Map<String,Object> payload=new LinkedHashMap<>(b);payload.put("targetTaskId",taskId);
        return commands.run(id,action,key,payload,200,c->{Map<String,Object> locked=repo.task(taskId);eligible(c.actor(),locked);if(Inputs.nonNegative(b,"expectedTaskVersion")!=Inputs.number(locked.get("version")))throw Problem.conflict("任务版本已变化");c.target("TASK",taskId);
            if("CLAIM".equals(decision)){repo.claim(taskId,c.actor().userId());return P.of("taskId",taskId,"taskStatus","CLAIMED");}
            if(!"REVIEW".equals(locked.get("node_code"))||!"REQUEST".equals(locked.get("target_type")))throw Problem.conflict("须通过该任务的业务办理入口操作");
            requireState(c.request(),"SUBMITTED");if(Inputs.number(c.request().get("applicant_user_id"))==c.actor().userId()||Inputs.number(c.request().get("created_by_user_id"))==c.actor().userId())throw Problem.forbidden("不能审核本人申请或本人代录事项");
            if("MATERIAL".equals(c.request().get("biz_type"))&&"APPROVE".equals(decision))throw Problem.conflict("物资批准必须通过逐项获准数量的专属审批入口");
            if(Set.of("RETURN","REJECT").contains(decision)&&(comment==null||comment.isBlank()))throw Problem.bad("退回或拒绝原因必填");
            repo.finish(taskId,c.actor().userId(),decision,comment);
            if("RETURN".equals(decision))repo.state(id,"RETURNED",null);
            else if("REJECT".equals(decision))repo.state(id,"REJECTED",null);
            else{repo.state(id,"APPROVED","EXECUTE");String node="PRINT".equals(c.request().get("biz_type"))?"PRINT_EXECUTE":"MATERIAL_EXECUTE";c.task(node,"REQUEST",id,null,role(c.request(),"executorRoleId"),null);}
            c.audit(P.of("taskId",taskId,"decision",decision,"comment",comment));c.event("TASK_DECIDED",P.of("taskId",taskId,"decision",decision));return P.of("taskId",Long.toString(taskId),"decision",decision);
        });
    }
    public Map<String,Object> cancel(long id,String key,Map<String,Object> b){Actors.current().require("office:request:cancel");String reason=Inputs.text(b,"reason",1,500);return commands.run(id,"REQUEST_CANCEL",key,b,200,c->{
        requireState(c.request(),"DRAFT","RETURNED","SUBMITTED","APPROVED","PROCESSING","WAIT_RECEIPT","WAIT_SETTLEMENT");
        if(!"PRINT".equals(c.request().get("biz_type")))throw Problem.conflict("请使用该业务的专属取消入口");
        boolean outstanding=repo.printFacts(id).stream().anyMatch(p->Inputs.number(p.get("issued_qty"))!=Inputs.number(p.get("returned_qty"))+Inputs.number(p.get("consumed_qty"))||Inputs.number(p.get("delivered_count"))!=Inputs.number(p.get("signed_count")));
        if(!outstanding)repo.cancelTasks(id);else{c.closeTasks("REVIEW","REQUEST",id);c.closeTasks("PRINT_EXECUTE","REQUEST",id);}
        repo.state(id,outstanding?"CANCEL_PENDING":"CANCELLED",outstanding?"RECONCILE":null);
        if(outstanding)c.task("RECONCILE","REQUEST",id,null,role(c.request(),"warehouseRoleId"),null);
        c.target("REQUEST",id);c.event("REQUEST_CANCELLED",P.of("requestId",id,"reason",reason,"reconciliationRequired",outstanding));return P.of("cancelStatus",outstanding?"CANCEL_PENDING":"CANCELLED");
    });}
    public Map<String,Object> close(long id,String key,Map<String,Object> b){Actors.current().require("office:request:close");return commands.run(id,"REQUEST_CLOSE",key,b,200,c->{
        String biz=String.valueOf(c.request().get("biz_type"));boolean cancelling="CANCEL_PENDING".equals(c.request().get("status"));
        requireState(c.request(),"APPROVED","PROCESSING","WAIT_RECEIPT","WAIT_SETTLEMENT","CANCEL_PENDING");
        if("PRINT".equals(biz)){
            List<Map<String,Object>> facts=repo.printFacts(id);if(facts.isEmpty())throw Problem.conflict("事项没有印品");
            for(Map<String,Object> p:facts){long issued=Inputs.number(p.get("issued_qty")),returned=Inputs.number(p.get("returned_qty")),consumed=Inputs.number(p.get("consumed_qty"));
                if(issued!=Math.addExact(returned,consumed)||Inputs.number(p.get("delivered_count"))!=Inputs.number(p.get("signed_count")))throw Problem.conflict("领纸或交付尚未核清");
                if(!cancelling&&(!"CLOSED".equals(p.get("paper_status"))||!"FINISHED".equals(p.get("production_status"))||Inputs.number(p.get("signed_count"))!=Inputs.number(p.get("good_copy_count"))))throw Problem.conflict("仍有子项未完成核销及全部领取");}
        }else if("MATERIAL".equals(biz)){if(repo.materialOutstanding(id)!=0||repo.materialReturnsOutstanding(id)!=0||repo.liabilities(id)!=0)throw Problem.conflict("尚有待发、未签收、待归还或责任事项");}
        else throw Problem.conflict("该业务通过专属结案动作完成");
        repo.cancelTasks(id);repo.state(id,cancelling?"CANCELLED":"COMPLETED",null);c.target("REQUEST",id);c.event("REQUEST_CLOSED",P.of("requestId",id));return P.of("closed",true);
    });}
}
```

**backend/src/main/java/com/doupi/planref/office/OfficeRepository.java**

```java
package com.doupi.planref.office;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class OfficeRepository {
    private final Db db;
    public OfficeRepository(Db db){this.db=db;}
    public Db db(){return db;}
    public Map<String,Object> request(long id){return db.required("select * from office_request where request_id=#{p.id}",P.of("id",id));}
    public List<Map<String,Object>> requests(long after){return db.list("select * from office_request where request_id>#{p.after} order by request_id limit 200",P.of("after",after));}
    public List<Map<String,Object>> tasks(long user){return db.list("select t.* from office_task t where t.status in ('OPEN','CLAIMED') and (t.excluded_user_id is null or t.excluded_user_id<>#{p.user}) and (t.assignee_user_id=#{p.user} or (t.assignee_user_id is null and t.assignee_role_id in(select role_id from sys_user_role where user_id=#{p.user}))) order by t.task_id limit 200",P.of("user",user));}
    public Map<String,Object> task(long id){return db.required("select * from office_task where task_id=#{p.id} for update",P.of("id",id));}
    public Map<String,Object> locateTask(long id){return db.required("select * from office_task where task_id=#{p.id}",P.of("id",id));}
    public Map<String,Object> taskFor(long request,String node,String type,long target){return db.required("select * from office_task where request_id=#{p.request} and node_code=#{p.node} and target_type=#{p.type} and target_id=#{p.target} and status in('OPEN','CLAIMED') order by task_id desc limit 1 for update",P.of("request",request,"node",node,"type",type,"target",target));}
    public boolean inRole(long user,long role){return !db.one("select ur.role_id from sys_user_role ur join sys_role r on r.role_id=ur.role_id where ur.user_id=#{p.user} and ur.role_id=#{p.role} and r.status='0' and r.del_flag='0'",P.of("user",user,"role",role)).isEmpty();}
    public void state(long id,String state,String node){db.write("update office_request set status=#{p.state},current_node=#{p.node},submitted_at=case when #{p.state}='SUBMITTED' then current_timestamp else submitted_at end,closed_at=case when #{p.state} in('COMPLETED','CANCELLED','REJECTED') then current_timestamp else closed_at end,updated_at=current_timestamp where request_id=#{p.id}",P.of("id",id,"state",state,"node",node));}
    public void claim(long id,long user){db.write("update office_task set assignee_user_id=#{p.user},status='CLAIMED',claimed_at=current_timestamp,version=version+1,updated_at=current_timestamp where task_id=#{p.id}",P.of("id",id,"user",user));}
    public void finish(long id,long user,String decision,String comment){db.write("update office_task set status='COMPLETED',acted_by=#{p.user},acted_at=current_timestamp,decision=#{p.decision},comment=#{p.comment},version=version+1,updated_at=current_timestamp where task_id=#{p.id}",P.of("id",id,"user",user,"decision",decision,"comment",comment));}
    public void cancelTasks(long request){db.write("update office_task set status='CANCELLED',version=version+1,updated_at=current_timestamp where request_id=#{p.id} and status in('OPEN','CLAIMED')",P.of("id",request));}
    public List<Map<String,Object>> printFacts(long request){return db.list("select p.*,s.good_copy_count,s.unused_qty,s.status as paper_status from edu_print_record p left join edu_print_settlement s on s.print_id=p.print_id and s.paper_goods_id=p.paper_goods_id where p.request_id=#{p.id} and p.del_flag='0' order by p.print_id",P.of("id",request));}
    public long materialOutstanding(long request){long lines=Inputs.number(db.required("select count(*) as n from edu_material_request_item where request_id=#{p.id} and (approved_qty<>issued_qty+cancelled_qty or signed_qty<>issued_qty)",P.of("id",request)).get("n"));long intents=Inputs.number(db.required("select count(*) as n from office_task where request_id=#{p.id} and target_type='MATERIAL_RETURN_INTENT' and status in ('OPEN','CLAIMED')",P.of("id",request)).get("n"));return Math.addExact(lines,intents);}
    public long materialReturnsOutstanding(long request){return Inputs.number(db.required("select count(*) as n from edu_material_request_item q where q.request_id=#{p.id} and q.return_required=1 and q.returned_qty+coalesce((select sum(i.written_off_qty) from edu_material_record_item i join edu_material_record r on r.record_id=i.record_id where i.request_item_id=q.request_item_id and r.record_type='1'),0)<q.issued_qty",P.of("id",request)).get("n"));}
    public long liabilities(long request){return Inputs.number(db.required("select count(*) as n from edu_material_record_item i join edu_material_record r on r.record_id=i.record_id where r.request_id=#{p.id} and i.liability_status='PENDING'",P.of("id",request)).get("n"));}
    public List<Map<String,Object>> history(long request){return db.list("select action_id,target_type,target_id,action_code,actor_user_id,from_status,to_status,request_revision,created_at from office_action_log where request_id=#{p.id} order by action_id",P.of("id",request));}
}
```

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

**backend/src/main/java/com/doupi/planref/recruit/RecruitController.java**

```java
package com.doupi.planref.recruit;

import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class RecruitController {
    private final RecruitService service;
    public RecruitController(RecruitService service) {this.service=service;}
    @GetMapping("/public/appointment-rules") public ResponseEntity<Map<String,Object>> rules(){return ApiReply.of(service.rules(),200);}
    @PostMapping("/public/appointments") public ResponseEntity<Map<String,Object>> create(@RequestBody Map<String,Object> b,@RequestHeader("Idempotency-Key") String key){return ApiReply.of(service.create(b,key),201);}
    @PostMapping("/public/appointments/query") public ResponseEntity<Map<String,Object>> query(@RequestBody Map<String,Object> b){return ApiReply.of(service.query(b),200);}
    @GetMapping("/visitor/appointments") public ResponseEntity<Map<String,Object>> mine(){return ApiReply.of(service.mine(),200);}
    @GetMapping("/visitor/appointments/{id}") public ResponseEntity<Map<String,Object>> detail(@PathVariable long id){return ApiReply.of(service.mineDetail(id),200);}
    @GetMapping("/staff/appointments/{id}") public ResponseEntity<Map<String,Object>> staffDetail(@PathVariable long id){return ApiReply.of(service.staffDetail(id),200);}
    @PostMapping("/public/appointments/{id}/cancel") public ResponseEntity<Map<String,Object>> cancel(@PathVariable long id,@RequestBody Map<String,Object> b,@RequestHeader("Idempotency-Key") String key){return ApiReply.of(service.cancel(id,b,key),200);}
    @GetMapping("/staff/appointments") public ResponseEntity<Map<String,Object>> staff(){return ApiReply.of(service.staffList(),200);}
    @PostMapping("/staff/appointments/{id}/{action:confirm|verify|remark}") public ResponseEntity<Map<String,Object>> action(@PathVariable long id,@PathVariable String action,@RequestBody Map<String,Object> b,@RequestHeader("Idempotency-Key") String key){return ApiReply.of(service.staffAction(id,action,b,key),200);}
}
```

**backend/src/main/java/com/doupi/planref/recruit/RecruitService.java**

```java
package com.doupi.planref.recruit;

import com.doupi.planref.*;
import com.doupi.planref.auth.*;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class RecruitService {
    private final Db db;private final RecruitRepository repo;private final ExternalCommands commands;private final AuthRepository auth;
    public RecruitService(Db db,RecruitRepository repo,ExternalCommands commands,AuthRepository auth) {this.db=db;this.repo=repo;this.commands=commands;this.auth=auth;}
    public Map<String,Object> rules() {
        Map<String,Object> basic=db.one("SELECT config_value FROM doupi_recruit_config WHERE config_key='basic_config'",Map.of());
        Map<String,Object> slots=db.one("SELECT config_value FROM doupi_recruit_config WHERE config_key='time_slots'",Map.of());
        if(basic.isEmpty()||slots.isEmpty()) throw new Problem(503,"BOOKING_RULES_NOT_CONFIGURED","School booking rules are not configured");
        try {
            Map<String,Object> b=Json.readMap(basic.get("config_value").toString());
            long days=Inputs.positive(b,"openDaysAhead");
            if(days>60||!b.containsKey("needAudit")) throw Problem.bad("Invalid booking rules");
            List<Map<String,Object>> list=Inputs.list(Json.readMap("{\"slots\":"+slots.get("config_value")+"}"),"slots");
            if(list.isEmpty()) throw Problem.bad("No available booking slots");
            Set<String> names=new HashSet<>();
            for(Map<String,Object> s:list) {String name=Inputs.text(s,"name",1,64);if(!names.add(name)) throw Problem.bad("Duplicate slot");Inputs.positive(s,"maxQuota");}
            return P.of("openDaysAhead",days,"needAudit",Inputs.bool(b,"needAudit",true),"timeSlots",list);
        } catch(RuntimeException ex) {throw new Problem(503,"BOOKING_RULES_INVALID","School booking rules require correction");}
    }
    public Map<String,Object> create(Map<String,Object> b,String key) {
        Actor a=Actors.current();if(a.identityId()<=0) throw Problem.forbidden("Controlled visitor session required");
        String student=Inputs.text(b,"studentName",1,64),parent=Inputs.text(b,"parentName",1,64),phone=Inputs.text(b,"parentPhone",11,16);
        if(!phone.matches("\\+?[0-9]{11,15}")) throw Problem.bad("Invalid contact phone");
        String campus=Inputs.text(b,"campusId",1,32),grade=Inputs.text(b,"studentGrade",1,64),slot=Inputs.text(b,"timeSlot",1,64),date=Inputs.text(b,"visitDate",10,10);
        String proof=proof(b),remark=Inputs.optionalText(b,"remark",500); LocalDate visit;
        try {visit=LocalDate.parse(date);} catch(DateTimeParseException ex) {throw Problem.bad("Invalid visit date");}
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Shanghai"));
        return commands.run("IDENTITY:"+a.identityId(),"APPOINTMENT_CREATE",key,b,201,()->{
            Map<String,Object> r=rules();
            if(visit.isBefore(today)||visit.isAfter(today.plusDays(Inputs.number(r.get("openDaysAhead"))))) throw Problem.bad("Date outside booking window");
            long quota=0;
            for(Map<String,Object> s:Inputs.list(r,"timeSlots")) if(slot.equals(s.get("name"))) quota=Inputs.positive(s,"maxQuota");
            if(quota==0) throw Problem.bad("Slot is not open");
            Map<String,Object> c=db.required("SELECT campus_id,campus_name FROM doupi_recruit_campus WHERE campus_id=#{p.campus} AND published=1 FOR UPDATE",P.of("campus",campus));
            Map<String,Object> count=db.required("SELECT COUNT(*) AS used_count FROM doupi_recruit_appointment WHERE campus_id=#{p.campus} AND visit_on=#{p.date} AND time_slot=#{p.slot} AND status IN ('PENDING','APPROVED','VERIFIED')",P.of("campus",campus,"date",date,"slot",slot));
            if(Inputs.number(count.get("used_count"))>=quota) throw Problem.conflict("Booking slot is full");
            Map<String,Object> identity=auth.identity(a.identityId(),false);
            String status=Inputs.bool(r,"needAudit",true)?"PENDING":"APPROVED";
            String no="A"+UUID.randomUUID().toString().replace("-","").substring(0,28);
            String code="APPROVED".equals(status)?UUID.randomUUID().toString().replace("-",""):null;
            Map<String,Object> p=P.of("no",no,"identity",a.identityId(),"hash",ExternalCommands.sha256(proof),"openid","WECHAT".equals(identity.get("provider"))?identity.get("subject_id"):null,
                "status",status,"parent",parent,"phone",phone,"student",student,"grade",grade,"campus",campus,"campusName",c.get("campus_name"),"date",date,"slot",slot,"code",code,
                "channel","WECHAT".equals(identity.get("provider"))?"WECHAT_MINI":"PUBLIC_WEB","key",key,"actor","IDENTITY:"+a.identityId(),"payloadHash",Json.hash(b),"remark",remark);
            long id=db.insert("INSERT INTO doupi_recruit_appointment(appointment_no,visitor_identity_id,public_access_token_hash,openid,status,parent_name,parent_phone,student_name,student_grade,campus_id,campus_name,visit_date,visit_on,time_slot,check_in_code,source_channel,create_key,create_actor_key,payload_hash,remark,version,create_time) "
                + "VALUES(#{p.no},#{p.identity},#{p.hash},#{p.openid},#{p.status},#{p.parent},#{p.phone},#{p.student},#{p.grade},#{p.campus},#{p.campusName},#{p.date},#{p.date},#{p.slot},#{p.code},#{p.channel},#{p.key},#{p.actor},#{p.payloadHash},#{p.remark},0,CURRENT_TIMESTAMP(3))",p);
            repo.audit(id,a,"CREATE",null,status,"Visitor created appointment");
            Map<String,Object> row=repo.appointment(id,false);repo.notifyVisitor(row,"预约已登记","请在本人预约中查询确认状态，未确认前不承诺接待。");
            return repo.view(row,false);
        });
    }
    private String proof(Map<String,Object> b) {
        String s=Inputs.text(b,"querySecret",43,128);
        if(!s.matches("[A-Za-z0-9_-]{43,128}")) throw Problem.bad("Query proof must be cryptographically generated base64url");
        return s;
    }
    private void owner(Map<String,Object> row,Map<String,Object> b) {
        Actor actor=Actors.current();
        if(actor.identityId()<=0 || row.get("visitor_identity_id")==null || Inputs.number(row.get("visitor_identity_id"))!=actor.identityId()) throw new Problem(404,"APPOINTMENT_NOT_FOUND","Appointment or access proof is invalid");
        String no=Inputs.text(b,"appointmentNo",1,32),secret=proof(b);
        if(!no.equals(row.get("appointment_no"))||!ExternalCommands.matches(secret,String.valueOf(row.get("public_access_token_hash"))))
            throw new Problem(404,"APPOINTMENT_NOT_FOUND","Appointment or access proof is invalid");
    }
    public Map<String,Object> query(Map<String,Object> b) {
        String no=Inputs.text(b,"appointmentNo",1,32);proof(b);
        Map<String,Object> row=db.one("SELECT * FROM doupi_recruit_appointment WHERE appointment_no=#{p.no}",P.of("no",no));
        if(row.isEmpty()) throw new Problem(404,"APPOINTMENT_NOT_FOUND","Appointment or access proof is invalid");
        owner(row,b);return repo.view(row,false);
    }
    public Map<String,Object> mine() {
        Actor a=Actors.current();if(a.identityId()<=0) throw Problem.forbidden("Visitor identity required");
        List<Map<String,Object>> items=db.list("SELECT appointment_id,appointment_no,status,campus_name,visit_date,time_slot,version FROM doupi_recruit_appointment WHERE visitor_identity_id=#{p.id} ORDER BY appointment_id DESC LIMIT 100",P.of("id",a.identityId()));
        List<Map<String,Object>> out=new ArrayList<>();
        for(Map<String,Object> row:items) out.add(P.of("appointmentId",String.valueOf(row.get("appointment_id")),"appointmentNo",row.get("appointment_no"),"status",row.get("status"),"campusName",row.get("campus_name"),"visitDate",row.get("visit_date"),"timeSlot",row.get("time_slot"),"version",row.get("version")));
        return P.of("items",out);
    }
    public Map<String,Object> mineDetail(long id) {
        Actor a=Actors.current();Map<String,Object> row=repo.appointment(id,false);
        if(a.identityId()<=0 || row.get("visitor_identity_id")==null || Inputs.number(row.get("visitor_identity_id"))!=a.identityId()) throw Problem.notFound("Appointment not found");
        return repo.view(row,false);
    }
    public Map<String,Object> staffDetail(long id) {
        Actor a=Actors.current();a.require("recruit:appointment:query");Map<String,Object> row=repo.appointment(id,false);repo.staffScope(a,row);return repo.view(row,true);
    }
    public Map<String,Object> cancel(long id,Map<String,Object> b,String key) {
        Map<String,Object> prior=repo.appointment(id,false);owner(prior,b);
        String reason=Inputs.text(b,"reason",1,500);
        return commands.run("IDENTITY:"+Actors.current().identityId(),"APPOINTMENT_CANCEL",key,P.of("appointmentId",id,"body",b),200,()->{
            Map<String,Object> row=repo.appointment(id,true);owner(row,b);
            if("CANCELLED".equals(row.get("status"))) return repo.view(row,false);
            requireVersion(row,b);
            if(!BookingPolicy.canCancel(String.valueOf(row.get("status")))) throw Problem.conflict("Checked-in appointment cannot be cancelled");
            db.write("UPDATE doupi_recruit_appointment SET status='CANCELLED',audit_remark=#{p.reason},check_in_code=NULL,version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"reason",reason));
            Actor a=Actors.current();repo.audit(id,a,"CANCEL",String.valueOf(row.get("status")),"CANCELLED",reason);
            repo.notifyVisitor(row,"预约已取消","本预约已取消，原到校凭证不再有效。");return repo.view(repo.appointment(id,false),false);
        });
    }
    private void requireVersion(Map<String,Object> row,Map<String,Object> b) {
        if(Inputs.nonNegative(b,"expectedVersion")!=Inputs.number(row.get("version"))) throw Problem.conflict("Appointment changed; refresh first");
    }
    public Map<String,Object> staffList() {
        Actor a=Actors.current();a.requireStaff();a.require("recruit:appointment:query");
        Map<String,Object> p=P.of("user",a.userId());
        List<String> placeholders=new ArrayList<>();int n=0;
        for(Long dept:a.scopeDeptIds()) {String k="scope"+(n++);p.put(k,dept);placeholders.add("#{p."+k+"}");}
        String scopes=placeholders.isEmpty()?"1=0":"cs.dept_id IN ("+String.join(",",placeholders)+")";
        String clause=a.allData()?"1=1":"(a.assigned_teacher_user_id=#{p.user} OR EXISTS (SELECT 1 FROM recruit_campus_scope cs WHERE cs.campus_id=a.campus_id AND "+scopes+"))";
        List<Map<String,Object>> visible=new ArrayList<>();
        for(Map<String,Object> row:db.list("SELECT a.* FROM doupi_recruit_appointment a WHERE "+clause+" ORDER BY a.appointment_id DESC LIMIT 100",p)) visible.add(repo.view(row,true));
        return P.of("items",visible);
    }
    public Map<String,Object> staffAction(long id,String action,Map<String,Object> b,String key) {
        Actor a=Actors.current();a.requireStaff();
        String permission=switch(action){case "confirm"->"recruit:appointment:confirm";case "verify"->"recruit:appointment:verify";case "remark"->"recruit:appointment:edit";default->throw Problem.bad("Invalid appointment action");};
        a.require(permission);repo.staffScope(a,repo.appointment(id,false));
        String actionCode=switch(action){case "confirm"->"APPOINTMENT_CONFIRM";case "verify"->"APPOINTMENT_VERIFY";case "remark"->"APPOINTMENT_REMARK";default->throw Problem.bad("Invalid appointment action");};
        return commands.run("STAFF:"+a.userId(),actionCode,key,P.of("appointmentId",id,"body",b),200,()->{
            Map<String,Object> row=repo.appointment(id,true);repo.staffScope(a,row);
            String from=String.valueOf(row.get("status")),to=from,reason;
            if("verify".equals(action)) {
                String code=Inputs.text(b,"checkInCode",1,64);
                if(!ExternalCommands.matches(code,ExternalCommands.sha256(String.valueOf(row.get("check_in_code"))))) throw Problem.bad("Invalid check-in proof");
                boolean change;
                try {change=BookingPolicy.checkInChangesState(from);}catch(IllegalArgumentException ex){throw Problem.conflict("Appointment is not approved for check-in");}
                if(!change) {Map<String,Object> out=repo.view(row,true);out.put("alreadyVerified",true);return out;}
                if(row.get("visit_on")==null || !LocalDate.now(ZoneId.of("Asia/Shanghai")).toString().equals(row.get("visit_on").toString())) throw Problem.conflict("Check-in is only valid on the appointment date");
                requireVersion(row,b);to="VERIFIED";reason="Checked in by authorized staff";
                db.write("UPDATE doupi_recruit_appointment SET status='VERIFIED',verify_time=CURRENT_TIMESTAMP(3),verifier_user_id=#{p.user},verifier=#{p.name},version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"user",a.userId(),"name",Long.toString(a.userId())));
            } else if("confirm".equals(action)) {
                requireVersion(row,b);if(!"PENDING".equals(from)) throw Problem.conflict("Appointment is not pending confirmation");
                String decision=Inputs.text(b,"decision",6,7);reason=Inputs.text(b,"remark",1,500);
                if(!Set.of("APPROVE","REJECT").contains(decision)) throw Problem.bad("Invalid confirmation decision");
                to="APPROVE".equals(decision)?"APPROVED":"CANCELLED";
                Long teacher="APPROVE".equals(decision)?Inputs.id(b,"assignedTeacherUserId"):null;
                if(teacher!=null) {
                    if(teacher!=a.userId()) a.require("recruit:appointment:assign");
                    Actor receiver=auth.staff(teacher,0);receiver.require("recruit:appointment:query");
                    Map<String,Object> target=P.of("assigned_teacher_user_id",null,"campus_id",row.get("campus_id"));
                    repo.staffScope(receiver,target);
                }
                db.write("UPDATE doupi_recruit_appointment SET status=#{p.status},assigned_teacher_user_id=#{p.teacher},teacher_name=(SELECT nick_name FROM sys_user WHERE user_id=#{p.teacher}),audit_remark=#{p.remark},check_in_code=#{p.code},version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"status",to,"teacher",teacher,"remark",reason,"code","APPROVED".equals(to)?UUID.randomUUID().toString().replace("-",""):null));
            } else {
                requireVersion(row,b);reason=Inputs.text(b,"remark",1,500);
                db.write("UPDATE doupi_recruit_appointment SET audit_remark=#{p.remark},version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"remark",reason));
            }
            repo.audit(id,a,action.toUpperCase(Locale.ROOT),from,to,reason);
            if(!from.equals(to)) repo.notifyVisitor(row,"预约状态更新","请在本人预约详情查看正式结果。");
            return repo.view(repo.appointment(id,false),true);
        });
    }
}
```

**backend/src/main/java/com/doupi/planref/recruit/RecruitRepository.java**

```java
package com.doupi.planref.recruit;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class RecruitRepository {
    private final Db db;
    public RecruitRepository(Db db) {this.db=db;}
    public Map<String,Object> appointment(long id,boolean lock) {
        return db.required("SELECT * FROM doupi_recruit_appointment WHERE appointment_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));
    }
    public void staffScope(Actor a,Map<String,Object> row) {
        a.requireStaff();
        if(a.allData() || (row.get("assigned_teacher_user_id")!=null && Inputs.number(row.get("assigned_teacher_user_id"))==a.userId())) return;
        for(Map<String,Object> d:db.list("SELECT dept_id FROM recruit_campus_scope WHERE campus_id=#{p.id}",P.of("id",row.get("campus_id"))))
            if(a.scopeDeptIds().contains(Inputs.number(d.get("dept_id")))) return;
        throw Problem.forbidden("Appointment outside staff scope");
    }
    public void audit(long id,Actor a,String action,String from,String to,String reason) {
        db.insert("INSERT INTO recruit_appointment_action(appointment_id,actor_user_id,actor_identity_id,action_code,previous_status,next_status,remark,created_at) "
            + "VALUES(#{p.id},#{p.user},#{p.identity},#{p.action},#{p.from},#{p.to},#{p.reason},CURRENT_TIMESTAMP(3))",
            P.of("id",id,"user",a.userId()>0?a.userId():null,"identity",a.identityId()>0?a.identityId():null,"action",action,"from",from,"to",to,"reason",reason));
    }
    public void notifyVisitor(Map<String,Object> row,String title,String content) {
        if(row.get("visitor_identity_id")==null) return;
        db.insert("INSERT INTO recruit_notification(appointment_id,recipient_identity_id,title,content,is_read,provider_status,created_at) "
            + "VALUES(#{p.id},#{p.identity},#{p.title},#{p.content},0,'NOT_REQUESTED',CURRENT_TIMESTAMP(3))",
            P.of("id",row.get("appointment_id"),"identity",row.get("visitor_identity_id"),"title",title,"content",content));
    }
    public Map<String,Object> view(Map<String,Object> r,boolean staff) {
        Map<String,Object> out=P.of("appointmentId",String.valueOf(r.get("appointment_id")),"appointmentNo",r.get("appointment_no"),
            "status",r.get("status"),"studentName",r.get("student_name"),"studentGrade",r.get("student_grade"),
            "campusId",r.get("campus_id"),"campusName",r.get("campus_name"),"visitDate",r.get("visit_date"),
            "timeSlot",r.get("time_slot"),"version",r.get("version"),"assignedTeacherName",r.get("teacher_name"),"verifiedAt",r.get("verify_time") instanceof java.sql.Timestamp t?t.toInstant().toString():r.get("verify_time"),"checkInCode",!staff&&"APPROVED".equals(r.get("status"))?r.get("check_in_code"):null);
        if(staff) {out.put("parentName",r.get("parent_name"));out.put("parentPhone",r.get("parent_phone"));out.put("remark",r.get("remark"));out.put("auditRemark",r.get("audit_remark"));out.put("assignedTeacherUserId",r.get("assigned_teacher_user_id")==null?null:String.valueOf(r.get("assigned_teacher_user_id")));}
        else {String phone=String.valueOf(r.get("parent_phone"));out.put("parentPhoneMasked",phone.length()>=7?phone.substring(0,3)+"****"+phone.substring(phone.length()-4):"***");}
        return out;
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





**app/office-api.uts**

```typescript
// Copy into doupi-app/api/office-plan.uts after APP-01 toolchain verification.
// Set the reviewed HTTPS origin in a build environment; never put server secrets here.
const apiOrigin = 'https://replace-with-test-domain.invalid/api/v1'
const tokenKey = 'office_employee_token'

export type CommandTicket = { key: string, body: UTSJSONObject }
export function newTicket(body: UTSJSONObject): CommandTicket {
  return { key: 'app-' + Date.now().toString() + '-' + Math.random().toString(36).substring(2, 14), body: body }
}
export function setEmployeeToken(token: string): void { uni.setStorageSync(tokenKey, token) }
export function clearEmployeeToken(): void { uni.removeStorageSync(tokenKey) }
export function callOffice(path: string, method: string, body: UTSJSONObject | null = null, key: string = ''): Promise<UTSJSONObject> {
  return new Promise<UTSJSONObject>((resolve, reject) => {
    const headers: UTSJSONObject = { 'Content-Type': 'application/json' }
    const token = uni.getStorageSync(tokenKey) as string
    if (token != null && token.length > 0) headers['Authorization'] = 'Bearer ' + token
    if (key.length > 0) headers['Idempotency-Key'] = key
    uni.request<UTSJSONObject>({
      url: apiOrigin + path,
      method: method as RequestMethod,
      data: body,
      header: headers,
      timeout: 15000,
      success: (res) => {
        if (res.statusCode == 401) clearEmployeeToken()
        const reply = res.data
        if (res.statusCode < 200 || res.statusCode >= 300 || reply == null) {
          reject(new Error('HTTP_' + res.statusCode.toString() + ': ' + (reply?.getString('msg') ?? '请求失败')))
          return
        }
        const data = reply.getJSON('data')
        if (data == null) { reject(new Error('INVALID_RESPONSE')); return }
        resolve(data)
      },
      fail: (error) => { reject(new Error('NETWORK_UNKNOWN_OUTCOME: ' + error.errMsg)) }
    })
  })
}
export function login(username: string, password: string): Promise<UTSJSONObject> {
  return callOffice('/auth/login', 'POST', { username: username, password: password }).then((data: UTSJSONObject): UTSJSONObject => {
    if (data.getString('kind') != 'STAFF') throw new Error('STAFF_IDENTITY_REQUIRED')
    const token = data.getString('token')
    if (token == null) throw new Error('TOKEN_MISSING')
    setEmployeeToken(token)
    return data
  })
}
export function command(path: string, ticket: CommandTicket): Promise<UTSJSONObject> {
  // Retry the same ticket after an uncertain timeout; a changed payload needs explicit reconfirmation and a new ticket.
  return callOffice(path, 'POST', ticket.body, ticket.key)
}
export function workbench(): Promise<UTSJSONObject> { return callOffice('/office/requests?afterId=0', 'GET') }
export function tasks(): Promise<UTSJSONObject> { return callOffice('/office/tasks', 'GET') }
export function inbox(): Promise<UTSJSONObject> { return callOffice('/office/notices?after=0', 'GET') }
export function printDetail(id: string): Promise<UTSJSONObject> { return callOffice('/office/print-requests/' + encodeURIComponent(id), 'GET') }
export function materialDetail(id: string): Promise<UTSJSONObject> { return callOffice('/office/material-requests/' + encodeURIComponent(id), 'GET') }
export function readNotice(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/notices/' + encodeURIComponent(id) + '/read', ticket) }
export function acknowledgeNotice(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/notices/' + encodeURIComponent(id) + '/ack', ticket) }
export function createPrint(ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/print-requests', ticket) }
export function taskAction(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/tasks/' + encodeURIComponent(id) + '/actions', ticket) }
export function confirmPrint(id: string, delivery: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/print-requests/' + encodeURIComponent(id) + '/deliveries/' + encodeURIComponent(delivery) + '/confirm', ticket) }
export function disputePrint(id: string, delivery: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/print-requests/' + encodeURIComponent(id) + '/deliveries/' + encodeURIComponent(delivery) + '/dispute', ticket) }
export function createMaterial(ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests', ticket) }
export function receiveMaterial(id: string, record: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/records/' + encodeURIComponent(record) + '/receipt', ticket) }
export function returnMaterial(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/returns', ticket) }
export function returnIntents(id: string): Promise<UTSJSONObject> { return callOffice('/office/material-requests/' + encodeURIComponent(id) + '/return-intents', 'GET') }
export function proposeReturn(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/return-intents', ticket) }
export function reviewReturn(id: string, intent: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/return-intents/' + encodeURIComponent(intent) + '/review', ticket) }
export function cancelReturn(id: string, intent: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/return-intents/' + encodeURIComponent(intent) + '/cancel', ticket) }
export function verifyAppointment(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/staff/appointments/' + encodeURIComponent(id) + '/verify', ticket) }
export function uploadPrivate(filePath: string, key: string): Promise<UTSJSONObject> {
  return new Promise<UTSJSONObject>((resolve, reject) => {
    const token = uni.getStorageSync(tokenKey) as string
    if (token == null || token.length == 0) { reject(new Error('AUTH_REQUIRED')); return }
    uni.uploadFile({ url: apiOrigin + '/staff/files', filePath: filePath, name: 'file', header: { 'Authorization': 'Bearer ' + token, 'Idempotency-Key': key },
      success: (res) => {
        if (res.statusCode == 401) clearEmployeeToken()
        const reply = JSON.parseObject(res.data)
        if (res.statusCode < 200 || res.statusCode >= 300 || reply == null) { reject(new Error('UPLOAD_FAILED')); return }
        const data = reply.getJSON('data')
        if (data == null) { reject(new Error('INVALID_RESPONSE')); return }
        resolve(data)
      }, fail: (error) => { reject(new Error('UPLOAD_UNKNOWN_OUTCOME: ' + error.errMsg)) }
    })
  })
}
```



## 6. 边界与异常场景处理

- 401清员工会话后重新登录；403显示岗位不允许；对象不可见404；409刷新正式事实并让用户重新核对，新决定用新ticket，原载荷重试用旧ticket。
- 网络失败/超时不显示成功，不本地模拟审批/签收/扣库；返回前进程退出须通过事项列表核对，不按最后点击状态推断提交结果。
- 私有文件无权限不显示临时地址；原稿、照片、学生联系资料和JWT不打印日志或写普通公共缓存；退出清理临时预览。
- 参考UTS需在APP-01锁定的HBuilderX/Android工具链实编译并真机验收，当前Java/H2/TS验证不代表原生平台已验证。
