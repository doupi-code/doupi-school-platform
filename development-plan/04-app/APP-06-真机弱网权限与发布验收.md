# APP-06 真机弱网权限与发布验收

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#app-06)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

优先级：P1；工期：3个单人工作日；依赖：APP-05。按1名Java开发+AI辅助估算，工期包括页面、接口、自测和联调。

包含Android真机功能/弱网/权限/隐私/发布前验收、历史演示数据清除与版本回滚；不把应用商店等待或iOS签名/原生编译算作已完成。

- [ ] 第1日：锁定工具链版本在干净工作副本构建Android，执行真实登录→文印申请→后台批准→接单→领取确认，及物资实发→归还验收；各角色交叉验证。
- [ ] 第2日：飞行模式/慢网/断网重连/前后台切换/进程重启、token撤销、跨端重复命令、冲突与私有文件预览；修阻断问题并重测受影响链路。
- [ ] 第3日：隐私权限和拒绝访问提示、截图/操作日志脱敏、签名包版本号/环境隔离、升级回滚与业务验收记录。阶段另有3日整体缓冲。

验收：安装包版本和后端契约可定位；无演示成功/硬编码消息；失败可恢复且正式结果一致。

## 2. 接口设计清单

统一外层`code:int,msg:string,traceId:string,replayed:boolean,data:object`；下表为data。ID为十进制字符串，数据库BIGINT；版本为非负整数。业务写命令头`Idempotency-Key:string(1..64)`必填；私有上传和ExternalCommands动作另限8..64个字母数字或_.:-字符；登录、分析和文本候选不要求该头；JWT认证派生操作者和部门。接口不得接受客户端权限、角色和操作者作为授权依据。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 全链回归 | GET/POST/PUT | APP-01至05列明的同一正式接口 | 每个场景使用对应完整字段和角色；重试同ticket；不新增测试专用生产API | 断言正式数据库/页面结果；业务HTTP原响应 | 对应真实业务权限 |
| 会话撤销验证 | POST | `/api/v1/auth/logout` | Authorization/Bearer/是；无body | revoked/boolean，旧token再访问401 | 本人 |
| 结果复查 | GET | `/api/v1/office/print-requests/{id}`、`/api/v1/office/material-requests/{id}` | id/string/是/原事项 | 完整根/子事实，字段见APP-03/04 | print:request:read或material:request:query及范围 |

## 3. 数据流转细节

所有移动写动作使用同一后端Controller→Service→Repository，不新建App专用库存/事项表。Bearer由服务端生成，clientSource=STAFF_APP仅审计。App不接收和保存学校secret；列表/权限以服务端返回为准。网络超时先展示“结果待确认”，原CommandTicket重发，禁止自动改变expectedVersion或生成新键。

1. 使用隔离环境种子用户与可追溯测试资料，记录每次requestId、taskId、fileId、动作键和版本，不记录密码/原稿正文。页面所有ID string；生成动作后保留原body和key于内存，未确认前不改。
2. 文印验收读`edu_goods.stock_qty_base`1000，建计划202仍1000；实领220后780；核销208/unused12仍780；退12后792；两次签收60/40累计100才完成。核对issue/movement/action数量与UK，重新登录查询结果。
3. 物资验收核`edu_material_request_item.requested_qty/approved_qty/issued_qty/signed_qty/cancelled_qty/returned_qty`及原发放行written_off_qty；原行已还量从原单归还子行SUM(base_qty)派生；一次归还的usable_return_qty才进入正movement，损坏/责任核销不增加余额。
4. 弱网：HTTP发出后断开，原ticket重试；查`office_action_log.actor_user_id/action_code/idempotency_key`仅一条成功响应，余额/交付仅变一次。同key异正文/目标409；新key旧version409；原key旧version优先重放。通知READ与ACK分别查recipient时间戳，不能把阅读当审批。
5. 越权：改path ID、fileId、teacherId、receiverUserId、校区/角色与客户端来源，断言401/403/404且目标表零增量。停用/范围变更后旧JWT阻断；App清本地角色再登录实际变化。
6. 发布：独立配置测试/正式HTTPS域名，应用签名/版本与后端产物记录，先灰度、监测错误与容量、可回退上一前端包；数据库新增向后兼容，回滚不删除已写业务事实。App不直接执行DDL。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

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

**sys_file**

```sql
CREATE TABLE `sys_file` (
  `file_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '文件身份，不等于公开地址',
  `storage_provider` VARCHAR(16) NOT NULL COMMENT '受控存储方式',
  `bucket` VARCHAR(64) NOT NULL COMMENT '容器',
  `object_key` VARCHAR(512) NOT NULL COMMENT '私有定位，不允许访客直读',
  `original_name` VARCHAR(255) NOT NULL COMMENT '原文件名',
  `mime_type` VARCHAR(127) NOT NULL COMMENT '核验后的内容类型',
  `byte_size` BIGINT NOT NULL COMMENT '字节数',
  `sha256` CHAR(64) NOT NULL COMMENT '完整性摘要，不允许凭hash跨用户取文件',
  `owner_user_id` BIGINT NOT NULL COMMENT '上传者',
  `upload_key` VARCHAR(64) NOT NULL COMMENT '上传幂等键，上传可发生在尚无request时',
  `upload_payload_hash` CHAR(64) NOT NULL COMMENT '文件内容摘要及规范上传参数的摘要，同键异载荷冲突',
  `owner_dept_id` BIGINT NULL COMMENT '部门快照',
  `visibility` VARCHAR(16) NOT NULL DEFAULT 'PRIVATE' COMMENT 'P0办公附件固定私有',
  `status` VARCHAR(16) NOT NULL COMMENT 'UPLOADING/READY/QUARANTINED/DELETED',
  `scan_status` VARCHAR(16) NOT NULL COMMENT 'PENDING/PASSED/REJECTED',
  `expires_at` DATETIME(3) NULL COMMENT '未绑定文件清理期限，非授权期限',
  `created_by_user_id` BIGINT NOT NULL COMMENT '创建者身份',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`file_id`),
  UNIQUE `uk_file_object` (
    `storage_provider`,
    `bucket`,
    `object_key`
  ),
  UNIQUE `uk_file_upload` (
    `owner_user_id`,
    `upload_key`
  ),
  INDEX `idx_file_owner` (`owner_user_id`, `status`, `created_at`),
  INDEX `idx_file_expiry` (`status`, `expires_at`),
  INDEX `idx_file_hash` (`sha256`),
  CONSTRAINT `fk_ref_014` FOREIGN KEY (`owner_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_015` FOREIGN KEY (`owner_dept_id`) REFERENCES `sys_dept` (
    `dept_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_016` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_file';
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

**sys_notice_recipient**

```sql
CREATE TABLE `sys_notice_recipient` (
  `recipient_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '收件记录',
  `notice_id` INT NOT NULL COMMENT '通知',
  `user_id` BIGINT NOT NULL COMMENT '发布时解析的具体收件人',
  `delivered_at` DATETIME(3) NOT NULL COMMENT '进入收件箱，不等于短信已送达',
  `read_at` DATETIME(3) NULL COMMENT '阅读时间',
  `acknowledged_at` DATETIME(3) NULL COMMENT '明确回执时间，阅读不等于回执',
  `ack_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '本人的回执要求快照',
  `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' COMMENT 'ACTIVE/WITHDRAWN',
  `source_event_id` BIGINT NULL COMMENT '来源事件',
  `created_at` DATETIME(3) NOT NULL COMMENT '建立时间',
  PRIMARY KEY (`recipient_id`),
  UNIQUE `uk_notice_recipient` (
    `notice_id`,
    `user_id`
  ),
  INDEX `idx_recipient_inbox` (`user_id`, `status`, `read_at`, `notice_id`),
  INDEX `idx_recipient_ack` (`notice_id`, `acknowledged_at`),
  INDEX `idx_recipient_event` (`source_event_id`),
  CONSTRAINT `fk_ref_080` FOREIGN KEY (`notice_id`) REFERENCES `sys_notice` (
    `notice_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_081` FOREIGN KEY (`source_event_id`) REFERENCES `sys_outbox_event` (
    `event_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_notice_recipient';
```

**edu_material_record_item**

```sql
CREATE TABLE `edu_material_record_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `record_id` BIGINT NOT NULL COMMENT '主记录ID',
  `goods_id` BIGINT NOT NULL COMMENT '物资ID',
  `goods_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '物资名称',
  `spec` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '规格型号',
  `unit` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '计量单位',
  `quantity` BIGINT NOT NULL DEFAULT '1' COMMENT '数量',
  `item_status` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '完好' COMMENT '物品状态(完好/轻微磨损/损坏报损)',
  `remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  PRIMARY KEY (`item_id`),
  INDEX `idx_record_id` (`record_id`),
  INDEX `idx_goods_id` (`goods_id`),
  `request_item_id` BIGINT NULL COMMENT '新增，获准申请明细',
  `original_issue_item_id` BIGINT NULL COMMENT '新增，归还必须指向原发放明细',
  `base_qty` BIGINT NOT NULL COMMENT '新增，基础数量',
  `conversion_rate` INT NOT NULL DEFAULT 1 COMMENT '新增，换算快照',
  `condition_code` VARCHAR(16) NOT NULL COMMENT '新增，GOOD/REUSABLE/DAMAGED/LOST',
  `usable_return_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，本次验收可用归还量',
  `liability_status` VARCHAR(16) NOT NULL DEFAULT 'NONE' COMMENT '新增，NONE/PENDING/RESOLVED，物归还不代表责任结清',
  `liability_decided_by` BIGINT NULL COMMENT '新增，有权处置人',
  `liability_decided_at` DATETIME(3) NULL COMMENT '新增',
  `liability_comment` VARCHAR(1000) NULL COMMENT '新增，处置意见',
  `movement_id` BIGINT NULL COMMENT '新增，损坏归还为NULL，不产生可用正流水',
  INDEX `idx_material_request_item` (`request_item_id`),
  INDEX `idx_material_original` (`original_issue_item_id`),
  UNIQUE `uk_material_item_movement` (
    `movement_id`
  ),
  CONSTRAINT `fk_ref_066` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_067` FOREIGN KEY (`movement_id`) REFERENCES `stock_movement` (
    `movement_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_112` FOREIGN KEY (`record_id`) REFERENCES `edu_material_record` (
    `record_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_113` FOREIGN KEY (`request_item_id`) REFERENCES `edu_material_request_item` (
    `request_item_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_114` FOREIGN KEY (`original_issue_item_id`) REFERENCES `edu_material_record_item` (
    `item_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  liability_qty BIGINT NOT NULL DEFAULT 0 COMMENT '原发放行本轮遗失申报量，不作实物归还',
  written_off_qty BIGINT NOT NULL DEFAULT 0 COMMENT '有权核准免追还数量，不增可用库存',
  CONSTRAINT chk_material_disposal CHECK (liability_qty >= 0 AND written_off_qty >= 0 AND written_off_qty <= base_qty)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教务日常物资领退明细表';
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

**app/Workbench.uvue**

```vue
<template>
  <view class="page">
    <text class="title">移动办公工作台</text>
    <button :disabled="loading" @click="reload">刷新我的事项与待办</button>
    <text v-if="loading">正在读取</text>
    <text v-if="error.length > 0">{{ error }}</text>
    <text class="body">{{ requestText }}</text>
    <text class="body">{{ taskText }}</text>
  </view>
</template>
<script setup lang="uts">
import { ref } from 'vue'
import { workbench, tasks } from './office-api.uts'
const loading = ref(false)
const error = ref('')
const requestText = ref('')
const taskText = ref('')
function reload(): void {
  if (loading.value) return
  loading.value = true
  error.value = ''
  workbench().then((data: UTSJSONObject): Promise<UTSJSONObject> => {
    requestText.value = JSON.stringify(data)
    return tasks()
  }).then((data: UTSJSONObject): void => {
    taskText.value = JSON.stringify(data)
    loading.value = false
  }).catch((failure: Error): void => {
    error.value = failure.message
    loading.value = false
  })
}
</script>
<style>
.page { padding: 20px; }
.title { font-size: 22px; margin-bottom: 16px; }
.body { margin-top: 16px; font-size: 14px; }
</style>
```

**backend/src/test/java/com/doupi/planref/files/DocumentInspectorTest.java**

```java
package com.doupi.planref.files;
import com.doupi.planref.*;
import java.io.*;
import java.util.zip.*;
import org.apache.pdfbox.pdmodel.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class DocumentInspectorTest {
    private final DocumentInspector inspector=new DocumentInspector();
    @Test void countsRealPdfPagesWithoutGuessing() throws Exception {
        byte[] bytes;try(PDDocument doc=new PDDocument();ByteArrayOutputStream out=new ByteArrayOutputStream()) {doc.addPage(new PDPage());doc.addPage(new PDPage());doc.save(out);bytes=out.toByteArray();}
        var result=inspector.inspect(bytes,"final.pdf");assertEquals(2,result.get("pageCount"));assertEquals(true,result.get("manualConfirmationRequired"));
    }
    @Test void rejectsRenamedTextAndTraversalZip() throws Exception {
        assertThrows(Problem.class,()->inspector.inspect("not a pdf".getBytes(),"fake.pdf"));
        ByteArrayOutputStream out=new ByteArrayOutputStream();try(ZipOutputStream zip=new ZipOutputStream(out)) {zip.putNextEntry(new ZipEntry("../word/document.xml"));zip.write("x".getBytes());zip.closeEntry();}
        assertThrows(Problem.class,()->inspector.inspect(out.toByteArray(),"attack.docx"));
    }
    @Test void docxDoesNotInventPageCount() throws Exception {
        ByteArrayOutputStream out=new ByteArrayOutputStream();try(ZipOutputStream zip=new ZipOutputStream(out)) {for(String name:new String[]{"word/document.xml","[Content_Types].xml"}) {zip.putNextEntry(new ZipEntry(name));zip.write("<x/>".getBytes());zip.closeEntry();}}
        var result=inspector.inspect(out.toByteArray(),"valid.docx");assertNull(result.get("pageCount"));assertEquals("MANUAL_REQUIRED",result.get("confidence"));
    }
}
```



## 6. 边界与异常场景处理

- 401清员工会话后重新登录；403显示岗位不允许；对象不可见404；409刷新正式事实并让用户重新核对，新决定用新ticket，原载荷重试用旧ticket。
- 网络失败/超时不显示成功，不本地模拟审批/签收/扣库；返回前进程退出须通过事项列表核对，不按最后点击状态推断提交结果。
- 私有文件无权限不显示临时地址；原稿、照片、学生联系资料和JWT不打印日志或写普通公共缓存；退出清理临时预览。
- 参考UTS需在APP-01锁定的HBuilderX/Android工具链实编译并真机验收，当前Java/H2/TS验证不代表原生平台已验证。
