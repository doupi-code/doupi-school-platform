# ADM-09 关联原单归还与责任处理

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-09)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期3人日，P0；单Java开发者配合AI、按全计划串行估算，非多人并行压缩。前置依赖：ADM-08。

覆盖原发放明细分次归还、可再用验收入库、损坏责任、遗失申报与有权核准免追还。实物归还与责任结清分别表示；遗失核销不是实物回库，不制造一次新领用来凑历史来源。

- [ ] 第1日：完善`MaterialMapper.original/alreadyReturned`和`MaterialService.receiveReturn`的原行归属、上限及排序锁
- [ ] 第2日：完善reportLoss/liability及`admin-p1-extra.sql`新增字段
- [ ] 第3日：在`doupi-web-admin-react/src/pages/office/material/returns.tsx`（待实施）联调原行选择、状态拆行与责任任务，运行MaterialFlowIntegrationTest。验收3件发出后完好1、损坏1、遗失核准1：实物returned=2，可用库存仅+1，written_off=1，全部责任处理完才结案。

P1后端补充1人日计入APP-04的4日工期，不追加到本模块P0的3日，不重复计费；依赖本模块既有归还、ADM-03固定任务、ADM-04私有附件与ADM-08原发放签收，在App阶段与APP-04表单共同实施。补齐普通员工“选择已签收原发放行→提交归还意向→仓库当面核实→实物验收”入口：新增`MaterialReturnIntentController/Service/Repository`及`ReturnIntentIntegrationTest`；`MaterialService.receiveReturnWithin`复用既有实物归还实现，`refreshWithin`在同一事务刷新根状态；两张意向表追加在`admin-p1-extra.sql`。前端任务为APP-04本人意向提交/列表/撤销与后台`returns.tsx`待验收列表、凭证及ACCEPT/REJECT表单。验收要求：提交、拒绝和撤销均不改库存及实物归还量；ACCEPT只增一次根版本、只生成一张真实回收单，重复命令不重复入库，待办意向阻断事项结案。

## 2. 接口设计清单

所有新接口均为`/api/v1`下员工JWT接口；ID在JSON用十进制字符串，数量、金额分和版本为范围受限整数；日期为含时区ISO8601，数据库存UTC。持久化操作必填请求头`Idempotency-Key:string(1..64)`，已有事项操作必填`expectedVersion:integer>=0`；正文禁止以userId、role或clientSource冒充操作者。成功外层统一`code,msg,traceId,replayed,data`，下表列data，幂等重放保留原业务结果。Commands统一锁根、检查范围与版本、写动作结果并将根version加一，领域代码不再加根version。岗位任务先通过ADM-03的CLAIM领取。查询不依赖Redis，写成后才可失效可重建缓存。

| 接口名称 | 请求方式 | 路径 | 请求参数字段类型必填含义 | 返回参数字段类型含义 | 权限要求 |
|---|---|---|---|---|---|
| 详情查询 | GET | `/api/v1/office/material-requests/{id}` | path id:ID必填 | request:object/items:array<object>/records:array<object>/actualItems:array<object>；200，原发放item_id供归还选单 | material:request:query |
| 原单归还 | POST | `/api/v1/office/material-requests/{id}/returns` | id；expectedVersion:integer>=0必填(根版本)；`receiverName:string1..64`必填验收交接说明；`items:array1..500`必填，每项`originalIssueItemId:ID,qty:integer>0,condition:enum(GOOD,REUSABLE,DAMAGED)`均必填。不同实物状况拆行，同一原行允许拆成完好和损坏两行 | recordId:string(ID),itemIds:array<string(ID)>,requestId:string(ID),version:integer,status:string(业务状态)；201 | material:return:accept且快照仓库岗位 |
| 遗失申报 | POST | `/api/v1/office/material-requests/{id}/losses` | id；expectedVersion:integer>=0必填(根版本)；`originalIssueItemId:ID,qty:integer>0,reason:string1..1000`必填，确无实物时申报 | originalIssueItemId:string(ID),liabilityStatus=PENDING,requestId:string(ID),version:integer,status:string(业务状态)；201 | material:loss:report |
| 责任处置 | POST | `/api/v1/office/material-requests/{id}/items/{itemId}/liability` | id/itemId:ID必填；expectedVersion:integer>=0必填(根版本)；`decision:enum(WRITE_OFF,RETURN_REQUIRED,NO_FURTHER_ACTION)`必填；`comment:string1..1000`必填。遗失只允许前二者，损坏不可WRITE_OFF重复核减 | itemId:string(ID),liabilityStatus=RESOLVED,requestId:string(ID),version:integer,status:string(业务状态)；200 | material:liability:decide且固定个人已受理责任任务 |
| P1本人提交归还意向 | POST | `/api/v1/office/material-requests/{id}/return-intents` | path id:ID必填；header Idempotency-Key:string1..64必填；expectedVersion:integer>=0必填；reason:string1..1000必填；items:array1..500必填，每项originalIssueItemId:ID、qty:integer>0、condition:enum(GOOD,REUSABLE,DAMAGED)均必填，同一原行不得重复；evidenceFileIds:array<ID>可选默认空，最多500且不重复，仅本人上传且READY/PASSED的私有文件 | requestId:string(ID)、version:integer、status:string根状态、intentId:string(ID)、intentVersion:integer初始0、intentStatus:string=PENDING；201 | material:return:intent:create；仅原申请人或每条原发放单的实际签收任务assignee，原发放须已CONFIRMED |
| P1归还意向列表 | GET | `/api/v1/office/material-requests/{id}/return-intents` | path id:ID必填 | requestId:string(ID)、version:integer、intents:array<object>；每项intentId:string(ID)、intentVersion:integer、intentStatus:enum(PENDING,ACCEPTED,REJECTED,CANCELLED)、reason:string、items:array<{originalIssueItemId:string(ID),qty:integer,condition:string}>、evidenceFileIds:array<string(ID)>、createdByUserId:string(ID)、createdAt:datetime、comment:string或null、returnRecordId:string(ID)或null、resolvedByUserId:string(ID)或null、resolvedAt:datetime或null；200 | material:request:query且根可见；原申请人或有material:return:accept的快照仓库岗位可见本根全部，其他原签收人仅见本人提交记录；配置管理员不替代仓库岗位 |
| P1仓库核实归还意向 | POST | `/api/v1/office/material-requests/{id}/return-intents/{intentId}/review` | path id/intentId:ID必填；header Idempotency-Key:string1..64必填；expectedVersion:integer>=0、expectedIntentVersion:integer>=0、decision:enum(ACCEPT,REJECT)均必填；comment:string1..1000在REJECT必填，ACCEPT可选；receiverName:string1..64在ACCEPT必填，表示已当面核对交接；验收明细从已提交意向读取，不接受客户端替换 | requestId:string(ID)、version:integer、status:string根状态、intentId:string(ID)、intentVersion:integer、intentStatus:enum(ACCEPTED,REJECTED)、recordId:string(ID)或null；200 | material:return:accept且rule_snapshot.warehouseRoleId对应启用岗位；不以配置管理员或全数据范围代替岗位资格 |
| P1本人撤销待办归还意向 | POST | `/api/v1/office/material-requests/{id}/return-intents/{intentId}/cancel` | path id/intentId:ID必填；header Idempotency-Key:string1..64必填；expectedVersion:integer>=0、expectedIntentVersion:integer>=0均必填；comment:string0..1000可选 | requestId:string(ID)、version:integer、status:string根状态、intentId:string(ID)、intentVersion:integer、intentStatus:string=CANCELLED；200 | material:return:intent:cancel且created_by_user_id为当前员工；仅PENDING可撤销 |

实际明细输出item_id,record_id,request_item_id,original_issue_item_id,goods_id,goods_name,spec,unit,quantity,base_qty,conversion_rate,condition_code,usable_return_qty,liability_status,liability_qty,written_off_qty,liability_decided_by,liability_decided_at,liability_comment,movement_id；returned_qty包括已接收损坏品，written_off_qty只在原发放行表示已核准免追还量。

## 3. 数据流转细节

| 接口 | 字段级校验/SQL | 原子性与后续 |
|---|---|---|
| detail | 根授权后查record_type=1的原单item_id及所有回收original_issue_item_id，展示本次上限=原base_qty−SUM已接收base_qty−written_off_qty | 只读。最终上限在写事务根锁内重算，前端显示不是写入依据 |
| returns | 锁root→原明细→申请行，按goods_id升序处理库存；每行须属于同request原发放，qty不能超过剩余。建立record_type=2，插实际回收行并保留original_issue_item_id；同原行下一拆行会读到本事务前一行累计 | GOOD/REUSABLE：usable_return_qty=qty，调用ledger正向RETURN并回填movement_id；DAMAGED：usable=0、movement=NULL、liability=PENDING，不调ledger。申请行returned_qty+=实物接收量；损坏建独立MATERIAL_LIABILITY，MATERIAL_RETURNED事件与所有事实同提交 |
| losses | 仅原发放行，qty<=原量−实物累计归还−已核准written_off；已有PENDING责任不重复受理；保存liability_qty及PENDING，reason存audit | 创建排除申报人的MATERIAL_LIABILITY任务，MATERIAL_LOSS_REPORTED Outbox；不建回收单、不增returned_qty、不改库存 |
| liability | 根锁内检查PENDING及本人已受理任务，记录decision/comment/decided_by/at。遗失WRITE_OFF再次校验当前上限，written_off_qty+=本轮liability_qty；RETURN_REQUIRED只结本轮申报、保留追还义务。损坏NO_FURTHER_ACTION只结责任 | 关闭该责任任务；全体approved=issued+cancelled、signed=issued且应归还issued<=returned+SUM原行written_off、无PENDING责任，才COMPLETED。库存不变，免追还量与实物已还量分别显示 |

本轮新增`liability_qty`、`written_off_qty`保留在原发放行，动作audit保存每次申报与核定。历史无法找到原单时转行政负责人核查，禁止通过此接口编造originalIssueItemId。所有新增/核定仍由Commands只增一次根版本。

P1归还意向流转如下：

| 接口 | 字段级校验/SQL | 原子性与后续 |
|---|---|---|
| return-intents POST | Commands锁root后逐原item_id升序锁原发放行及申请行，强制同request、record_type=1、原单CONFIRMED；真实原申请人或对应MATERIAL_RECEIPT任务assignee方可提交。qty>0且不超过base_qty−已验收实还−written_off_qty；同原行不重复，active_source_item_id唯一约束防未办重报 | 锁本人READY/PASSED文件，在同根office_request_file以RECEIPT/record_scope_id=0绑定并取消临时过期。建PENDING头和明细，建立快照仓库岗位MATERIAL_RETURN_REVIEW任务，写SUBMITTED Outbox，根状态刷新；不建回收单、不改returned_qty及库存 |
| return-intents GET | 先根授权再核验原申请人/原签收人/快照仓库资格；原签收人只返回本人意向，其他角色不能通过全数据范围绕过业务资格 | 返回提交时原行、数量、状态、凭证及验收关联单；附件内容仍走私有附件鉴权接口，意向只存fileIds快照 |
| review ACCEPT | 固定MATERIAL_RETURN_INTENT_REVIEW动作，规范payload强制包含路径intentId；根与意向版本分别校验，意向锁定PENDING，仓库权限和快照岗位分别检查。从服务端意向明细重建实物数据，再查原行归属及最新上下限 | 同一外层Commands调用receiveReturnWithin；GOOD/REUSABLE才增库存，DAMAGED只接收实物并留责任任务。intent置ACCEPTED、关联recordId、自身version+1、记录resolved_by/at/action；释放active_source、关该意向任务、再refreshWithin并写ACCEPTED Outbox。无嵌套Commands，根version只增1，全部事实失败则回滚 |
| review REJECT / cancel | 同样校验根/意向版本和PENDING；REJECT须仓库岗位及原因，CANCEL只允许created_by本人 | 仅改意向终态、自身version及办理审计，释放该原行待办唯一占位，关闭该意向任务并重算根状态，写REJECTED/CANCELLED Outbox；不改库存和实物归还量，可新键重新提交 |

原行在待验收期间可能被独立仓库实物归还或责任核销，因此PENDING不预占库存，也不能当作已还；验收时超过最新上限整单409，由仓库REJECT后重报，不静默削减申报数量。根状态汇总及人工close都通过既有`office_task.target_type=MATERIAL_RETURN_INTENT AND status IN(OPEN,CLAIMED)`阻断结案；即使独立实物归还已全部完成，待验收意向仍保持WAIT_SETTLEMENT。这样P0物资模块不硬依赖P1新表，P1停用时保留既有任务状态，不能删表绕过结案检查。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**material_return_intent**

```sql
CREATE TABLE material_return_intent (
  intent_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '员工归还意向ID，不是实物回收单',
  request_id BIGINT NOT NULL COMMENT '同一原物资申请事项根',
  status VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING待实物验收、ACCEPTED已验收、REJECTED已拒绝、CANCELLED本人撤销',
  reason VARCHAR(1000) NOT NULL COMMENT '本人归还说明',
  evidence_file_ids JSON NOT NULL COMMENT 'fileIds数组快照，仅本人READY且PASSED文件，真实授权以当前根附件绑定为准',
  return_record_id BIGINT NULL UNIQUE COMMENT 'ACCEPTED才填写实际回收record_type为2的记录',
  comment VARCHAR(1000) NULL COMMENT '仓库核实意见或本人撤销说明',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '意向自身乐观锁，与事项根版本分别校验',
  created_by_user_id BIGINT NOT NULL COMMENT '真实申报员工，须原申请人或原签收任务办理人',
  created_at DATETIME(3) NOT NULL COMMENT '申报UTC时间',
  updated_at DATETIME(3) NOT NULL COMMENT '最近更新UTC时间',
  resolved_by_user_id BIGINT NULL COMMENT '仓库验收拒绝员工或本人撤销员工',
  resolved_at DATETIME(3) NULL COMMENT '本意向办结UTC时间',
  created_action_id BIGINT NOT NULL UNIQUE COMMENT '提交归还意向真实动作',
  resolved_action_id BIGINT NULL UNIQUE COMMENT '终态对应动作，回收事实共用该动作及同一事务',
  CONSTRAINT fk_mri_request FOREIGN KEY (request_id) REFERENCES office_request (
    request_id
  ),
  CONSTRAINT fk_mri_record FOREIGN KEY (return_record_id) REFERENCES edu_material_record (
    record_id
  ),
  CONSTRAINT fk_mri_creator FOREIGN KEY (created_by_user_id) REFERENCES sys_user (
    user_id
  ),
  CONSTRAINT fk_mri_resolver FOREIGN KEY (resolved_by_user_id) REFERENCES sys_user (
    user_id
  ),
  CONSTRAINT fk_mri_create_action FOREIGN KEY (created_action_id) REFERENCES office_action_log (
    action_id
  ),
  CONSTRAINT fk_mri_resolve_action FOREIGN KEY (resolved_action_id) REFERENCES office_action_log (
    action_id
  ),
  CONSTRAINT chk_mri_state CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
  CONSTRAINT chk_mri_version CHECK (version >= 0),
  CONSTRAINT chk_mri_physical CHECK ((
    status = 'ACCEPTED' AND NOT return_record_id IS NULL
  )
  OR (
    status <> 'ACCEPTED' AND return_record_id IS NULL
  )),
  INDEX idx_mri_request_status (request_id, status, intent_id),
  INDEX idx_mri_creator_status (created_by_user_id, status, created_at)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='P1原单归还意向，申报与实物验收入库分离';
```

**material_return_intent_item**

```sql
CREATE TABLE material_return_intent_item (
  intent_item_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '归还意向明细ID',
  intent_id BIGINT NOT NULL COMMENT '意向头ID',
  original_issue_item_id BIGINT NOT NULL COMMENT '同事项实际原发放行，不接受跨单或回收行',
  qty BIGINT NOT NULL COMMENT '本次拟归还基础数量，提交和验收都重算上限',
  condition_code VARCHAR(16) NOT NULL COMMENT '拟交回实物状态GOOD完好、REUSABLE可再用、DAMAGED损坏',
  active_source_item_id BIGINT NULL UNIQUE COMMENT '待办时等于原发放行，终态置空；唯一约束防同原行重复未办意向',
  CONSTRAINT uk_mrii_source UNIQUE (
    intent_id,
    original_issue_item_id
  ),
  CONSTRAINT fk_mrii_intent FOREIGN KEY (intent_id) REFERENCES material_return_intent (
    intent_id
  ),
  CONSTRAINT fk_mrii_original FOREIGN KEY (original_issue_item_id) REFERENCES edu_material_record_item (
    item_id
  ),
  CONSTRAINT fk_mrii_active FOREIGN KEY (active_source_item_id) REFERENCES edu_material_record_item (
    item_id
  ),
  CONSTRAINT chk_mrii_qty CHECK (qty > 0),
  CONSTRAINT chk_mrii_condition CHECK (condition_code IN ('GOOD', 'REUSABLE', 'DAMAGED')),
  CONSTRAINT chk_mrii_active CHECK (active_source_item_id IS NULL OR active_source_item_id = original_issue_item_id),
  INDEX idx_mrii_original (original_issue_item_id, intent_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='P1归还意向原单明细，未验收不记实物归还和库存';
```

**edu_material_record**

```sql
CREATE TABLE `edu_material_record` (
  `record_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  `record_no` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '业务流水单号',
  `record_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '业务类型(1发放领取 2退还回收)',
  `business_category` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '业务场景(教师工作武器/学生选科领书/班级领用/教师离职交接/学生退学退书/其他)',
  `target_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '对象类型(1教师 2学生 3班级)',
  `target_id` BIGINT DEFAULT NULL COMMENT '关联对象ID(如教师ID/班级ID)',
  `target_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '领用/归还人姓名(教师姓名/学生姓名)',
  `class_id` BIGINT DEFAULT NULL COMMENT '关联班级ID',
  `class_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '关联班级名称',
  `grade` VARCHAR(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属年级',
  `subject` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '所属选科/学科',
  `kit_id` BIGINT DEFAULT NULL COMMENT '引用的物资套装ID',
  `kit_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '引用的物资套装名称',
  `total_quantity` BIGINT NOT NULL DEFAULT '0' COMMENT '总件数',
  `image_url` VARCHAR(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '实物/签领拍照留存图片URL(非必填)',
  `operator` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '经办教务人员',
  `operate_time` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP() COMMENT '经办时间',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '状态(0正常 1已撤销)',
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志(0正常 2删除)',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注说明',
  PRIMARY KEY (`record_id`),
  UNIQUE `idx_record_no` (
    `record_no`
  ),
  INDEX `idx_record_type` (`record_type`),
  INDEX `idx_operate_time` (`operate_time`),
  INDEX `idx_target_name` (`target_name`),
  `request_id` BIGINT NULL COMMENT '新增，同一申请可多次领退',
  `operator_user_id` BIGINT NULL COMMENT '新增，新记录须真实身份',
  `receipt_status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT '新增，PENDING/CONFIRMED/DISPUTED',
  `confirmed_by` BIGINT NULL COMMENT '新增，领取/归还确认人',
  `confirmed_at` DATETIME(3) NULL COMMENT '新增',
  `action_id` BIGINT NULL COMMENT '新增，历史可空',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增',
  UNIQUE `uk_material_action` (
    `action_id`
  ),
  INDEX `idx_material_request` (`request_id`, `operate_time`),
  INDEX `idx_material_target` (`target_type`, `target_id`, `operate_time`),
  INDEX `idx_material_class` (`class_id`, `operate_time`),
  CONSTRAINT `fk_ref_060` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_061` FOREIGN KEY (`class_id`) REFERENCES `edu_class` (
    `class_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_062` FOREIGN KEY (`kit_id`) REFERENCES `edu_goods_kit` (
    `kit_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_063` FOREIGN KEY (`operator_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_064` FOREIGN KEY (`confirmed_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_065` FOREIGN KEY (`action_id`) REFERENCES `office_action_log` (
    `action_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教务日常物资领退记录表';
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

**edu_material_request_item**

```sql
CREATE TABLE `edu_material_request_item` (
  `request_item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '申请明细',
  `request_id` BIGINT NOT NULL COMMENT '根1:N',
  `line_no` INT NOT NULL COMMENT '申请内稳定行号',
  `goods_id` BIGINT NOT NULL COMMENT '物品',
  `kit_id` BIGINT NULL COMMENT '套装来源',
  `goods_name` VARCHAR(100) NOT NULL COMMENT '申请快照',
  `spec` VARCHAR(100) NULL COMMENT '规格快照',
  `unit` VARCHAR(20) NOT NULL COMMENT '基础单位快照',
  `requested_qty` BIGINT NOT NULL COMMENT '申请量',
  `approved_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '获准量',
  `issued_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '实发累计投影',
  `signed_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '已签收累计投影',
  `returned_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '已接收实物归还，包含接收损坏品',
  `cancelled_qty` BIGINT NOT NULL DEFAULT 0 COMMENT '取消未发量',
  `target_type` CHAR(1) NOT NULL COMMENT '教师/学生/班级',
  `target_id` BIGINT NULL COMMENT '真实对象，无学生档案不编造ID',
  `target_name` VARCHAR(64) NOT NULL COMMENT '快照',
  `class_id` BIGINT NULL COMMENT '班级',
  `return_required` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '批准时应归还快照',
  `due_back_at` DATETIME(3) NULL COMMENT '归还期限',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '并发发放/归还',
  `created_by_user_id` BIGINT NOT NULL COMMENT '创建者身份',
  `created_at` DATETIME(3) NOT NULL COMMENT '创建时间UTC',
  `updated_at` DATETIME(3) NOT NULL COMMENT '更新时间UTC',
  PRIMARY KEY (`request_item_id`),
  UNIQUE `uk_material_request_line` (
    `request_id`,
    `line_no`
  ),
  INDEX `idx_material_request_goods` (`goods_id`, `request_id`),
  CONSTRAINT `fk_ref_068` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_069` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_070` FOREIGN KEY (`kit_id`) REFERENCES `edu_goods_kit` (
    `kit_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_071` FOREIGN KEY (`class_id`) REFERENCES `edu_class` (
    `class_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_072` FOREIGN KEY (`created_by_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='edu_material_request_item';
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

**sys_outbox_event**

```sql
CREATE TABLE `sys_outbox_event` (
  `event_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '消费去重身份',
  `event_key` VARCHAR(128) NOT NULL COMMENT '稳定事件键',
  `event_type` VARCHAR(64) NOT NULL COMMENT 'REQUEST_SUBMITTED/TASK_ASSIGNED等',
  `aggregate_type` VARCHAR(32) NOT NULL COMMENT 'REQUEST/NOTICE/APPOINTMENT等',
  `aggregate_id` BIGINT NOT NULL COMMENT '根ID',
  `aggregate_version` BIGINT NOT NULL COMMENT '提交后的根版本',
  `request_id` BIGINT NULL COMMENT '办公事项可空',
  `payload` JSON NOT NULL COMMENT '最小引用，不存原稿、临时地址、令牌',
  `status` VARCHAR(16) NOT NULL DEFAULT 'PENDING' COMMENT 'PENDING/PROCESSING/SENT/DEAD',
  `attempts` INT NOT NULL DEFAULT 0 COMMENT '尝试次数',
  `next_attempt_at` DATETIME(3) NOT NULL COMMENT '下次重试',
  `locked_by` VARCHAR(64) NULL COMMENT '租约持有者',
  `locked_until` DATETIME(3) NULL COMMENT '租约到期，故障可恢复',
  `last_error` VARCHAR(1000) NULL COMMENT '脱敏错误',
  `created_at` DATETIME(3) NOT NULL COMMENT '业务事务内创建',
  `published_at` DATETIME(3) NULL COMMENT '派发成功时间',
  PRIMARY KEY (`event_id`),
  UNIQUE `uk_outbox_key` (
    `event_key`
  ),
  UNIQUE `uk_outbox_aggregate` (
    `aggregate_type`,
    `aggregate_id`,
    `aggregate_version`,
    `event_type`
  ),
  INDEX `idx_outbox_pending` (`status`, `next_attempt_at`, `event_id`),
  INDEX `idx_outbox_lease` (`status`, `locked_until`),
  INDEX `idx_outbox_request` (`request_id`),
  CONSTRAINT `fk_ref_082` FOREIGN KEY (`request_id`) REFERENCES `office_request` (
    `request_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_outbox_event';
```

## 5. 代码实现骨架

P1意向服务与仓库既有实物归还共用根事务；HTTP意向目标与动作审计目标均固定为MATERIAL_RETURN_INTENT，实物回收recordId作为结果及审计字段保留。`ReturnIntentIntegrationTest`覆盖提交不入库、ACCEPT只增一次根版本和重放、原申请人/实际签收人资格、快照仓库岗位、私有证据归属、根与意向冲突、拒绝撤销释放占位、最新数量上限和待办意向阻断结案。



**backend/src/main/java/com/doupi/planref/material/MaterialReturnIntentController.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.ApiReply;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/office/material-requests/{id}/return-intents")
public class MaterialReturnIntentController {
    private final MaterialReturnIntentService service;
    public MaterialReturnIntentController(MaterialReturnIntentService service) {this.service=service;}
    @PostMapping public ResponseEntity<Map<String,Object>> create(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> body) {return ApiReply.of(service.create(id,key,body),201);}
    @GetMapping public ResponseEntity<Map<String,Object>> list(@PathVariable long id) {return ApiReply.of(service.list(id),200);}
    @PostMapping("/{intentId}/review") public ResponseEntity<Map<String,Object>> review(@PathVariable long id,@PathVariable long intentId,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> body) {return ApiReply.of(service.review(id,intentId,key,body),200);}
    @PostMapping("/{intentId}/cancel") public ResponseEntity<Map<String,Object>> cancel(@PathVariable long id,@PathVariable long intentId,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> body) {return ApiReply.of(service.cancel(id,intentId,key,body),200);}
}
```

**backend/src/main/java/com/doupi/planref/material/MaterialReturnIntentService.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class MaterialReturnIntentService {
    private final MaterialReturnIntentRepository repo;
    private final MaterialMapper mapper;
    private final MaterialService material;
    private final Commands commands;
    private final Rules rules;
    public MaterialReturnIntentService(MaterialReturnIntentRepository repo,MaterialMapper mapper,MaterialService material,Commands commands,Rules rules) {
        this.repo=repo;this.mapper=mapper;this.material=material;this.commands=commands;this.rules=rules;
    }
    public Map<String,Object> create(long id,String key,Map<String,Object> body) {
        Actors.current().require("material:return:intent:create");
        return commands.run(id,"MATERIAL_RETURN_INTENT_CREATE",key,body,201,c->{
            requireMaterial(c.request());
            String reason=Inputs.text(body,"reason",1,1000);
            List<Map<String,Object>> items=Inputs.list(body,"items");
            if(items.isEmpty()) throw Problem.bad("归还意向明细不能为空");
            List<Long> evidence=body.containsKey("evidenceFileIds")?Inputs.ids(body,"evidenceFileIds"):List.of();
            if(new HashSet<>(evidence).size()!=evidence.size()) throw Problem.bad("归还凭证不能重复");
            Set<Long> seen=new HashSet<>();
            items.sort(Comparator.comparingLong(x->Inputs.id(x,"originalIssueItemId")));
            for(Map<String,Object> input:items) {
                long source=Inputs.id(input,"originalIssueItemId");
                if(!seen.add(source)) throw Problem.bad("同一原发放行只能申报一条归还意向明细");
                Map<String,Object> original=mapper.original(source,id);
                if(n(c.request(),"applicant_user_id")!=c.actor().userId()&&!repo.receiver(id,n(original,"record_id"),c.actor().userId())) throw Problem.forbidden("仅原申请人或该发放单实际签收任务办理人可申报");
                requireSource(original,id,Inputs.positive(input,"qty"));
                condition(input);
                if(repo.pending(source)) throw Problem.conflict("原发放行已有待验收归还意向，请先办理或撤销");
            }
            repo.bindEvidence(c,evidence);
            long intent=repo.insert(c,reason,evidence);
            for(Map<String,Object> input:items) repo.insertItem(intent,Inputs.id(input,"originalIssueItemId"),Inputs.positive(input,"qty"),condition(input));
            long role=rules.role("warehouseRoleId",Json.readMap(c.request().get("rule_snapshot")));
            c.task("MATERIAL_RETURN_REVIEW","MATERIAL_RETURN_INTENT",intent,null,role,null);
            material.refreshWithin(c);
            c.target("MATERIAL_RETURN_INTENT",intent);
            c.event("MATERIAL_RETURN_INTENT_SUBMITTED",P.of("intentId",intent,"title","归还意向待仓库实物验收"));
            return P.of("intentId",Long.toString(intent),"intentVersion",0,"intentStatus","PENDING");
        });
    }
    public Map<String,Object> list(long id) {
        Actor actor=Actors.current();actor.require("material:request:query");
        Map<String,Object> root=repo.db().required("SELECT * FROM office_request WHERE request_id=#{p.id}",P.of("id",id));
        Access.requireRequest(actor,root,repo.db());requireMaterial(root);
        boolean owner=n(root,"applicant_user_id")==actor.userId();
        boolean warehouse=actor.permissions().contains("*")||actor.permissions().contains("material:return:accept");
        warehouse=warehouse&&warehouse(actor,root);
        if(!owner&&!warehouse&&!repo.anyReceiver(id,actor.userId())) throw Problem.forbidden("仅原申请人、原签收办理人或快照仓库岗位可查看归还意向");
        List<Map<String,Object>> result=new ArrayList<>();
        for(Map<String,Object> intent:repo.db().list("SELECT * FROM material_return_intent WHERE request_id=#{p.request} AND (#{p.all}=1 OR created_by_user_id=#{p.actor}) ORDER BY intent_id",P.of("request",id,"all",owner||warehouse?1:0,"actor",actor.userId()))) {
            List<Map<String,Object>> items=new ArrayList<>();
            for(Map<String,Object> item:repo.items(n(intent,"intent_id"))) items.add(P.of("originalIssueItemId",Long.toString(n(item,"original_issue_item_id")),"qty",n(item,"qty"),"condition",item.get("condition_code")));
            List<Long> evidence=Inputs.ids(Json.readMap(intent.get("evidence_file_ids")),"fileIds");
            result.add(P.of("intentId",Long.toString(n(intent,"intent_id")),"intentVersion",n(intent,"version"),"intentStatus",intent.get("status"),"reason",intent.get("reason"),"items",items,"evidenceFileIds",evidence.stream().map(String::valueOf).toList(),"createdByUserId",Long.toString(n(intent,"created_by_user_id")),"createdAt",intent.get("created_at"),"comment",intent.get("comment"),"returnRecordId",intent.get("return_record_id")==null?null:Long.toString(n(intent,"return_record_id")),"resolvedByUserId",intent.get("resolved_by_user_id")==null?null:Long.toString(n(intent,"resolved_by_user_id")),"resolvedAt",intent.get("resolved_at")));
        }
        return P.of("requestId",Long.toString(id),"version",n(root,"version"),"intents",result);
    }
    public Map<String,Object> review(long id,long intentId,String key,Map<String,Object> body) {
        Actors.current().require("material:return:accept");
        return commands.run(id,"MATERIAL_RETURN_INTENT_REVIEW",key,target(body,intentId),200,c->{
            requireMaterial(c.request());
            if(!warehouse(c.actor(),c.request())) throw Problem.forbidden("不属于事项快照中的固定仓库验收岗位");
            Map<String,Object> intent=repo.lock(id,intentId);requirePending(intent,body);
            String decision=Inputs.text(body,"decision",1,16);
            if(!Set.of("ACCEPT","REJECT").contains(decision)) throw Problem.bad("decision只允许ACCEPT或REJECT");
            String comment="REJECT".equals(decision)?Inputs.text(body,"comment",1,1000):Inputs.optionalText(body,"comment",1000);
            Long recordId=null;
            if("ACCEPT".equals(decision)) {
                List<Map<String,Object>> physical=new ArrayList<>();
                for(Map<String,Object> item:repo.items(intentId)) {
                    long source=n(item,"original_issue_item_id"),qty=n(item,"qty");
                    requireSource(mapper.original(source,id),id,qty);
                    physical.add(P.of("originalIssueItemId",source,"qty",qty,"condition",item.get("condition_code")));
                }
                Map<String,Object> accepted=material.receiveReturnWithin(c,P.of("receiverName",Inputs.text(body,"receiverName",1,64),"items",physical));
                recordId=Inputs.number(accepted.get("recordId"));
            }
            String state="ACCEPT".equals(decision)?"ACCEPTED":"REJECTED";
            repo.finish(c,intentId,state,comment,recordId);
            c.closeTasks("MATERIAL_RETURN_REVIEW","MATERIAL_RETURN_INTENT",intentId);
            material.refreshWithin(c);
            c.audit(P.of("intentId",intentId,"decision",decision,"comment",comment,"returnRecordId",recordId));
            c.target("MATERIAL_RETURN_INTENT",intentId);
            c.event("MATERIAL_RETURN_INTENT_"+state,P.of("intentId",intentId,"recordId",recordId,"userId",intent.get("created_by_user_id"),"title","归还意向已有验收结果"));
            return P.of("intentId",Long.toString(intentId),"intentVersion",n(intent,"version")+1,"intentStatus",state,"recordId",recordId==null?null:Long.toString(recordId));
        });
    }
    public Map<String,Object> cancel(long id,long intentId,String key,Map<String,Object> body) {
        Actors.current().require("material:return:intent:cancel");
        return commands.run(id,"MATERIAL_RETURN_INTENT_CANCEL",key,target(body,intentId),200,c->{
            requireMaterial(c.request());Map<String,Object> intent=repo.lock(id,intentId);
            if(n(intent,"created_by_user_id")!=c.actor().userId()) throw Problem.forbidden("仅归还意向提交人可撤销本人意向");
            requirePending(intent,body);String comment=Inputs.optionalText(body,"comment",1000);
            repo.finish(c,intentId,"CANCELLED",comment,null);
            c.closeTasks("MATERIAL_RETURN_REVIEW","MATERIAL_RETURN_INTENT",intentId);
            material.refreshWithin(c);
            c.target("MATERIAL_RETURN_INTENT",intentId);
            c.event("MATERIAL_RETURN_INTENT_CANCELLED",P.of("intentId",intentId,"title","归还意向已由本人撤销"));
            return P.of("intentId",Long.toString(intentId),"intentVersion",n(intent,"version")+1,"intentStatus","CANCELLED");
        });
    }
    private void requireSource(Map<String,Object> original,long requestId,long qty) {
        mapper.item(n(original,"request_item_id"),requestId);
        Map<String,Object> record=mapper.record(n(original,"record_id"),requestId);
        if(!"CONFIRMED".equals(record.get("receipt_status"))) throw Problem.conflict("请先完成原发放单实际签收再申报归还");
        if(qty<=0||qty>MaterialMath.returnable(n(original,"base_qty")-n(original,"written_off_qty"),mapper.alreadyReturned(n(original,"item_id")))) throw Problem.conflict("归还意向超过原发放行当前可归还数量");
    }
    private boolean warehouse(Actor actor,Map<String,Object> root) {
        long role=rules.role("warehouseRoleId",Json.readMap(root.get("rule_snapshot")));
        return !repo.db().one("SELECT ur.user_id FROM sys_user_role ur JOIN sys_role r ON r.role_id=ur.role_id WHERE ur.user_id=#{p.user} AND ur.role_id=#{p.role} AND r.status='0' AND r.del_flag='0'",P.of("user",actor.userId(),"role",role)).isEmpty();
    }
    private static void requirePending(Map<String,Object> intent,Map<String,Object> body) {
        if(Inputs.nonNegative(body,"expectedIntentVersion")!=n(intent,"version")) throw Problem.conflict("归还意向已更新，请刷新");
        if(!"PENDING".equals(intent.get("status"))) throw Problem.conflict("归还意向已办结，不能重复办理");
    }
    private static String condition(Map<String,Object> input) {
        String value=Inputs.text(input,"condition",1,16);
        if(!Set.of("GOOD","REUSABLE","DAMAGED").contains(value)) throw Problem.bad("condition只允许GOOD、REUSABLE或DAMAGED");
        return value;
    }
    private static Map<String,Object> target(Map<String,Object> body,long intentId) {Map<String,Object> p=new LinkedHashMap<>(body);p.put("_fixedTarget",P.of("type","MATERIAL_RETURN_INTENT","id",intentId));return p;}
    private static void requireMaterial(Map<String,Object> root) {if(!"MATERIAL".equals(root.get("biz_type"))) throw Problem.bad("不是物资申请事项");}
    private static long n(Map<String,Object> row,String key) {return row.get(key)==null?0:Inputs.number(row.get(key));}
}
```

**backend/src/main/java/com/doupi/planref/material/MaterialReturnIntentRepository.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class MaterialReturnIntentRepository {
    private final Db db;
    public MaterialReturnIntentRepository(Db db) {this.db=db;}
    public Db db() {return db;}
    public Map<String,Object> lock(long requestId,long intentId) {
        return db.required("SELECT * FROM material_return_intent WHERE intent_id=#{p.id} AND request_id=#{p.request} FOR UPDATE",P.of("id",intentId,"request",requestId));
    }
    public List<Map<String,Object>> items(long intentId) {
        return db.list("SELECT * FROM material_return_intent_item WHERE intent_id=#{p.id} ORDER BY original_issue_item_id",P.of("id",intentId));
    }
    public boolean receiver(long requestId,long recordId,long userId) {
        return !db.one("SELECT task_id FROM office_task WHERE request_id=#{p.request} AND node_code='MATERIAL_RECEIPT' AND target_type='MATERIAL_RECORD' AND target_id=#{p.record} AND assignee_user_id=#{p.user} AND status IN ('OPEN','CLAIMED','COMPLETED') ORDER BY task_id DESC LIMIT 1",P.of("request",requestId,"record",recordId,"user",userId)).isEmpty();
    }
    public boolean anyReceiver(long requestId,long userId) {
        return !db.one("SELECT task_id FROM office_task WHERE request_id=#{p.request} AND node_code='MATERIAL_RECEIPT' AND target_type='MATERIAL_RECORD' AND assignee_user_id=#{p.user} AND status IN ('OPEN','CLAIMED','COMPLETED') LIMIT 1",P.of("request",requestId,"user",userId)).isEmpty();
    }
    public boolean pending(long originalId) {
        return !db.one("SELECT intent_item_id FROM material_return_intent_item WHERE active_source_item_id=#{p.id}",P.of("id",originalId)).isEmpty();
    }
    public long insert(Commands.Context c,String reason,List<Long> evidence) {
        return db.insert("INSERT INTO material_return_intent(request_id,status,reason,evidence_file_ids,created_by_user_id,created_at,updated_at,version,created_action_id) VALUES(#{p.request},'PENDING',#{p.reason},#{p.evidence},#{p.actor},CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3),0,#{p.action})",P.of("request",c.requestId(),"reason",reason,"evidence",Json.write(P.of("fileIds",evidence)),"actor",c.actor().userId(),"action",c.actionId()));
    }
    public void insertItem(long intentId,long originalId,long qty,String condition) {
        db.insert("INSERT INTO material_return_intent_item(intent_id,original_issue_item_id,qty,condition_code,active_source_item_id) VALUES(#{p.intent},#{p.original},#{p.qty},#{p.condition},#{p.original})",P.of("intent",intentId,"original",originalId,"qty",qty,"condition",condition));
    }
    public void finish(Commands.Context c,long intentId,String state,String comment,Long recordId) {
        db.write("UPDATE material_return_intent SET status=#{p.state},comment=#{p.comment},return_record_id=#{p.record},resolved_by_user_id=#{p.actor},resolved_at=CURRENT_TIMESTAMP(3),updated_at=CURRENT_TIMESTAMP(3),version=version+1,resolved_action_id=#{p.action} WHERE intent_id=#{p.id} AND status='PENDING'",P.of("id",intentId,"state",state,"comment",comment,"record",recordId,"actor",c.actor().userId(),"action",c.actionId()));
        db.write("UPDATE material_return_intent_item SET active_source_item_id=NULL WHERE intent_id=#{p.id}",P.of("id",intentId));
    }
    public void bindEvidence(Commands.Context c,List<Long> evidence) {
        for(long fileId:evidence) {
            Map<String,Object> file=db.required("SELECT * FROM sys_file WHERE file_id=#{p.id} AND status='READY' AND scan_status='PASSED' FOR UPDATE",P.of("id",fileId));
            if(Inputs.number(file.get("owner_user_id"))!=c.actor().userId()) throw Problem.forbidden("归还凭证只能使用本人上传的可用文件");
            if(db.one("SELECT link_id FROM office_request_file WHERE request_id=#{p.request} AND file_id=#{p.file} AND purpose='RECEIPT' AND record_scope_id=0",P.of("request",c.requestId(),"file",fileId)).isEmpty())
                db.insert("INSERT INTO office_request_file(request_id,file_id,purpose,record_scope_id,revision,sort_order,linked_by,linked_at) VALUES(#{p.request},#{p.file},'RECEIPT',0,#{p.revision},0,#{p.actor},CURRENT_TIMESTAMP(3))",P.of("request",c.requestId(),"file",fileId,"revision",c.request().get("revision"),"actor",c.actor().userId()));
            db.write("UPDATE sys_file SET expires_at=NULL,updated_at=CURRENT_TIMESTAMP(3) WHERE file_id=#{p.id}",P.of("id",fileId));
        }
    }
}
```



Java17、Spring Boot4.0.3、MyBatis4.0.1可运行参考实现如下，公共依赖见[公共契约](../00-shared/公共契约.md)。本轮维护开发计划、数据库结构资料与目录，不开发业务功能。



**backend/src/main/java/com/doupi/planref/material/MaterialController.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/office/material-requests")
public class MaterialController {
    private final MaterialService service;
    public MaterialController(MaterialService service){this.service=service;}
    @PostMapping public ResponseEntity<Map<String,Object>> create(@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.create(key,b),201);}
    @GetMapping("/{id}") public ResponseEntity<Map<String,Object>> detail(@PathVariable long id){return ApiReply.of(service.detail(id),200);}
    @PostMapping("/{id}/approve") public ResponseEntity<Map<String,Object>> approve(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.approve(id,key,b),200);}
    @PostMapping("/{id}/issues") public ResponseEntity<Map<String,Object>> issue(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.issue(id,key,b),201);}
    @PostMapping("/{id}/records/{recordId}/receipt") public ResponseEntity<Map<String,Object>> receipt(@PathVariable long id,@PathVariable long recordId,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.receipt(id,recordId,key,b),200);}
    @PostMapping("/{id}/cancel-remainder") public ResponseEntity<Map<String,Object>> cancel(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.cancelRemainder(id,key,b),200);}
    @PostMapping("/{id}/returns") public ResponseEntity<Map<String,Object>> returns(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.receiveReturn(id,key,b),201);}
    @PostMapping("/{id}/items/{itemId}/liability") public ResponseEntity<Map<String,Object>> liability(@PathVariable long id,@PathVariable long itemId,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.liability(id,itemId,key,b),200);}
    @PostMapping("/{id}/records/{recordId}/resolve-dispute") public ResponseEntity<Map<String,Object>> dispute(@PathVariable long id,@PathVariable long recordId,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.resolveDispute(id,recordId,key,b),200);}
    @PostMapping("/{id}/losses") public ResponseEntity<Map<String,Object>> loss(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b){return ApiReply.of(service.reportLoss(id,key,b),201);}
}
```

**backend/src/main/java/com/doupi/planref/material/MaterialService.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class MaterialService {
    private final MaterialMapper mapper;
    private final Commands commands;
    private final Roots roots;
    private final Rules rules;
    private final StockLedger ledger;
    public MaterialService(MaterialMapper mapper,Commands commands,Roots roots,Rules rules,StockLedger ledger) {
        this.mapper=mapper;this.commands=commands;this.roots=roots;this.rules=rules;this.ledger=ledger;
    }
    public Map<String,Object> create(String key,Map<String,Object> body) {
        Actors.current().require("material:request:create");
        Map<String,Object>canonical=new LinkedHashMap<>(body);canonical.put("bizType","MATERIAL");
        return commands.create("CREATE_REQUEST",key,canonical,201,()->roots.create("MATERIAL",key,canonical),c->{
            requireMaterial(c);
            List<Map<String,Object>> items=new ArrayList<>(body.containsKey("items")?Inputs.list(body,"items"):List.of());
            Long kitId=body.get("kitId")==null?null:Inputs.id(body,"kitId");
            if(kitId!=null) {
                long multiplier=Inputs.positive(body,"kitCount");
                for(Map<String,Object> line:mapper.kit(kitId)) items.add(P.of("goodsId",line.get("goods_id"),"qty",Math.multiplyExact(Inputs.number(line.get("quantity")),multiplier)));
            }
            if(items.isEmpty()) throw Problem.bad("至少选择一个单品或非空套装");
            Set<Long> seen=new HashSet<>();List<Map<String,Object>> result=new ArrayList<>();int lineNo=0;
            for(Map<String,Object> item:items) {
                long goodsId=Inputs.id(item,"goodsId"),qty=Inputs.positive(item,"qty");
                if(!seen.add(goodsId)) throw Problem.bad("同物品请合并数量，不能重复行");
                Map<String,Object> goods=mapper.goods(goodsId);
                String targetName=Inputs.text(body,"targetName",1,64);
                long id=mapper.insertLine(P.of("request",c.requestId(),"line",++lineNo,"goods",goodsId,"kit",kitId,"name",goods.get("goods_name"),"spec",goods.get("spec"),"unit",goods.get("base_unit"),"qty",qty,"type",targetType(body),"target",body.get("targetId"),"targetName",targetName,"classId",body.get("classId"),"returnRequired",goods.get("return_required"),"actor",c.actor().userId()));
                result.add(P.of("requestItemId",id,"requestedQty",qty));
            }
            mapper.db().write("UPDATE office_request SET status='SUBMITTED',current_node='REVIEW',submitted_at=CURRENT_TIMESTAMP WHERE request_id=#{p.id}",P.of("id",c.requestId()));
            Long role=rules.role("materialReviewerRoleId",Json.readMap(c.request().get("rule_snapshot")));
            c.task("REVIEW","REQUEST",c.requestId(),null,role,n(c.request(),"applicant_user_id"));
            c.event("MATERIAL_SUBMITTED",P.of("title","物资申请待审核"));
            c.target("REQUEST",c.requestId());return P.of("requestId",c.requestId(),"items",result,"status","SUBMITTED");
        });
    }
    public Map<String,Object> approve(long id,String key,Map<String,Object> body) {
        Actors.current().require("material:request:approve");
        return commands.run(id,"MATERIAL_APPROVE",key,body,200,c->{
            requireMaterial(c);
            if(!"SUBMITTED".equals(c.request().get("status"))) throw Problem.conflict("不在待审核状态");
            if(n(c.request(),"applicant_user_id")==c.actor().userId()||n(c.request(),"created_by_user_id")==c.actor().userId()) throw Problem.forbidden("不能审批本人申请");
            requireTask(c,"REVIEW","REQUEST",id);
            Set<Long> seen=new HashSet<>();
            for(Map<String,Object> decision:Inputs.list(body,"items")) {
                long lineId=Inputs.id(decision,"requestItemId"),qty=Inputs.nonNegative(decision,"approvedQty");
                if(!seen.add(lineId)) throw Problem.bad("重复审核行");
                Map<String,Object> line=mapper.item(lineId,id);
                if(qty>Inputs.number(line.get("requested_qty"))) throw Problem.bad("批准量不能超过申请量");
                mapper.db().write("UPDATE edu_material_request_item SET approved_qty=#{p.qty},version=version+1,updated_at=CURRENT_TIMESTAMP WHERE request_item_id=#{p.id}",P.of("qty",qty,"id",lineId));
            }
            if(seen.size()!=mapper.lines(id).size()) throw Problem.bad("必须逐项确认全部申请明细");
            boolean hasApproved=mapper.lines(id).stream().anyMatch(l->n(l,"approved_qty")>0);
            mapper.db().write("UPDATE office_request SET status=#{p.state},current_node=#{p.node},closed_at=CASE WHEN #{p.state}='COMPLETED' THEN CURRENT_TIMESTAMP(3) ELSE NULL END WHERE request_id=#{p.id}",P.of("state",hasApproved?"APPROVED":"COMPLETED","node",hasApproved?"MATERIAL_ISSUE":null,"id",id));
            c.closeTasks("REVIEW","REQUEST",id);
            if(hasApproved)c.task("MATERIAL_ISSUE","REQUEST",id,null,rules.role("warehouseRoleId",Json.readMap(c.request().get("rule_snapshot"))),null);
            c.event("MATERIAL_APPROVED",P.of("title","物资申请已批准"));
            return P.of("requestId",id,"status","APPROVED");
        });
    }
    public Map<String,Object> issue(long id,String key,Map<String,Object> body) {
        Actors.current().require("material:issue:confirm");
        return commands.run(id,"MATERIAL_ISSUE",key,body,201,c->{
            requireMaterial(c);
            if(!Set.of("APPROVED","PROCESSING","WAIT_RECEIPT").contains(c.request().get("status"))) throw Problem.conflict("当前事项不能发放");
            List<Map<String,Object>> inputs=Inputs.list(body,"items");if(inputs.isEmpty()) throw Problem.bad("发放明细不能为空");
            requireTask(c,"MATERIAL_ISSUE","REQUEST",id);
            long total=0;Set<Long> ids=new HashSet<>();List<Map<String,Object>> locked=new ArrayList<>();
            inputs.sort(Comparator.comparingLong(x->Inputs.id(x,"requestItemId")));
            for(Map<String,Object> input:inputs) {
                long lineId=Inputs.id(input,"requestItemId"),qty=Inputs.positive(input,"qty");if(!ids.add(lineId)) throw Problem.bad("重复发放行");
                Map<String,Object> line=mapper.item(lineId,id);
                if(qty>MaterialMath.remaining(n(line,"approved_qty"),n(line,"issued_qty"),n(line,"cancelled_qty"))) throw Problem.conflict("发放超过获准待发量");
                line.put("this_qty",qty);locked.add(line);total=Math.addExact(total,qty);
            }
            long receiver=Inputs.id(body,"receiverUserId");
            mapper.db().required("SELECT user_id FROM sys_user WHERE user_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",receiver));
            boolean direct=receiver==n(c.request(),"applicant_user_id")||locked.stream().anyMatch(l->"1".equals(l.get("target_type"))&&l.get("target_id")!=null&&n(l,"target_id")==receiver);
            if(!direct){c.actor().require("material:receiver:delegate");Inputs.text(body,"delegateReason",1,500);}
            c.audit(P.of("receiverUserId",receiver,"delegateReason",body.get("delegateReason")));
            long recordId=mapper.insertRecord(c,"1",Inputs.text(body,"receiverName",1,64),total);
            locked.sort(Comparator.comparingLong(x->n(x,"goods_id")));
            for(Map<String,Object> line:locked) {
                long qty=n(line,"this_qty"),itemId=mapper.insertActual(recordId,line,qty,null,"GOOD",c);
                long movementId=ledger.move(c,n(line,"goods_id"),-qty,"MATERIAL_RECORD",recordId,itemId,"ISSUE","物资实物发放");
                mapper.movement(itemId,movementId);
                mapper.db().write("UPDATE edu_material_request_item SET issued_qty=issued_qty+#{p.qty},version=version+1,updated_at=CURRENT_TIMESTAMP WHERE request_item_id=#{p.id}",P.of("qty",qty,"id",line.get("request_item_id")));
            }
            mapper.db().write("UPDATE office_request SET status='WAIT_RECEIPT',current_node='MATERIAL_RECEIPT' WHERE request_id=#{p.id}",P.of("id",id));
            c.target("MATERIAL_RECORD",recordId);c.task("MATERIAL_RECEIPT","MATERIAL_RECORD",recordId,Inputs.id(body,"receiverUserId"),null,null);
            c.event("MATERIAL_ISSUED",P.of("recordId",recordId,"userId",Inputs.id(body,"receiverUserId"),"title","请确认实际领取物资"));
            return P.of("requestId",id,"recordId",recordId,"receiptStatus","PENDING");
        });
    }
    public Map<String,Object> receipt(long id,long recordId,String key,Map<String,Object> body) {
        Actors.current().require("material:receipt:confirm");
        return commands.run(id,"MATERIAL_RECEIPT",key,target(body,"MATERIAL_RECORD",recordId),200,c->{
            requireMaterial(c);
            Map<String,Object> record=mapper.record(recordId,id);if(!"1".equals(record.get("record_type"))||!"PENDING".equals(record.get("receipt_status"))) throw Problem.conflict("该实发记录不能再次签收");
            requireTask(c,"MATERIAL_RECEIPT","MATERIAL_RECORD",recordId);
            if(!body.containsKey("accepted"))throw Problem.bad("accepted必填");
            boolean accepted=Inputs.bool(body,"accepted",false);
            if(Inputs.nonNegative(body,"expectedRecordVersion")!=n(record,"version"))throw Problem.conflict("实发记录已更新");
            if(accepted)MaterialMath.requireSignature(n(record,"total_quantity"),Inputs.positive(body,"receivedQty"));
            String remark=Inputs.optionalText(body,"comment",500);if(!accepted&&(remark==null||remark.isBlank())) throw Problem.bad("争议必须说明原因");
            mapper.db().write("UPDATE edu_material_record SET receipt_status=#{p.state},confirmed_by=#{p.actor},confirmed_at=CURRENT_TIMESTAMP,version=version+1 WHERE record_id=#{p.id}",P.of("state",accepted?"CONFIRMED":"DISPUTED","actor",c.actor().userId(),"id",recordId));
            if(accepted) {
                for(Map<String,Object> item:mapper.db().list("SELECT * FROM edu_material_record_item WHERE record_id=#{p.id}",P.of("id",recordId)))
                    mapper.db().write("UPDATE edu_material_request_item SET signed_qty=signed_qty+#{p.qty},version=version+1 WHERE request_item_id=#{p.id}",P.of("qty",item.get("base_qty"),"id",item.get("request_item_id")));
                c.closeTasks("MATERIAL_RECEIPT","MATERIAL_RECORD",recordId);
            }
            else {
                c.closeTasks("MATERIAL_RECEIPT","MATERIAL_RECORD",recordId);
                c.task("MATERIAL_DISPUTE","MATERIAL_RECORD",recordId,null,rules.role("materialReviewerRoleId",Json.readMap(c.request().get("rule_snapshot"))),c.actor().userId());
            }
            c.audit(P.of("receiptComment",remark,"accepted",accepted));
            refresh(c);c.target("MATERIAL_RECORD",recordId);return P.of("recordId",recordId,"receiptStatus",accepted?"CONFIRMED":"DISPUTED");
        });
    }
    public Map<String,Object> cancelRemainder(long id,String key,Map<String,Object> body) {
        Actors.current().require("material:request:cancel");
        return commands.run(id,"MATERIAL_CANCEL_REMAINDER",key,body,200,c->{
            requireMaterial(c);
            if(!Set.of("APPROVED","PROCESSING","WAIT_RECEIPT","WAIT_SETTLEMENT").contains(c.request().get("status")))throw Problem.conflict("当前不能取消剩余获准量");
            if(n(c.request(),"applicant_user_id")!=c.actor().userId()&&n(c.request(),"created_by_user_id")!=c.actor().userId())throw Problem.forbidden("仅申请人或录入人可取消未发需求");
            String reason=Inputs.text(body,"reason",1,500);c.audit(P.of("reason",reason));
            for(Map<String,Object> line:mapper.lines(id)) mapper.db().write("UPDATE edu_material_request_item SET cancelled_qty=approved_qty-issued_qty,version=version+1 WHERE request_item_id=#{p.id}",P.of("id",line.get("request_item_id")));
            refresh(c);return P.of("requestId",id,"items",mapper.lines(id));
        });
    }
    public Map<String,Object> receiveReturn(long id,String key,Map<String,Object> body) {
        Actors.current().require("material:return:accept");
        return commands.run(id,"MATERIAL_RETURN",key,body,201,c->receiveReturnWithin(c,body));
    }
    // Reuse the existing physical-return transaction without starting a nested Commands command.
    Map<String,Object> receiveReturnWithin(Commands.Context c,Map<String,Object> body) {
            c.actor().require("material:return:accept");
            long id=c.requestId();
            requireMaterial(c);
            requireWarehouse(c);
            List<Map<String,Object>> values=Inputs.list(body,"items");if(values.isEmpty()) throw Problem.bad("归还明细不能为空");
            values.sort(Comparator.comparingLong(v->Inputs.id(v,"originalIssueItemId")));
            List<Map<String,Object>> prepared=new ArrayList<>();
            for(Map<String,Object> input:values){Map<String,Object> original=mapper.original(Inputs.id(input,"originalIssueItemId"),id);Map<String,Object> line=mapper.item(n(original,"request_item_id"),id);Map<String,Object> v=new LinkedHashMap<>(input);v.put("_original",original);v.put("_line",line);prepared.add(v);}
            prepared.sort(Comparator.comparingLong(v->n(Inputs.map(v.get("_line")),"goods_id")));
            long total=0;for(Map<String,Object> v:values) total=Math.addExact(total,Inputs.positive(v,"qty"));
            long recordId=mapper.insertRecord(c,"2",Inputs.text(body,"receiverName",1,64),total);
            List<Long> results=new ArrayList<>();
            for(Map<String,Object> input:prepared) {
                long originalId=Inputs.id(input,"originalIssueItemId"),qty=Inputs.positive(input,"qty");
                Map<String,Object> original=Inputs.map(input.get("_original")),line=Inputs.map(input.get("_line"));
                if(qty>MaterialMath.returnable(n(original,"base_qty")-n(original,"written_off_qty"),mapper.alreadyReturned(originalId))) throw Problem.conflict("超过原单可归还数量");
                String condition=Inputs.text(input,"condition",1,16);
                if(!Set.of("GOOD","REUSABLE","DAMAGED").contains(condition)) throw Problem.bad("实际接收只允许完好、可再用或损坏；遗失须责任处置");
                long usable=MaterialMath.usable(qty,condition),itemId=mapper.insertActual(recordId,line,qty,originalId,condition,c);results.add(itemId);
                if(usable>0) mapper.movement(itemId,ledger.move(c,n(line,"goods_id"),usable,"MATERIAL_RECORD",recordId,itemId,"RETURN","原单可用实物归还"));
                mapper.db().write("UPDATE edu_material_request_item SET returned_qty=returned_qty+#{p.qty},version=version+1 WHERE request_item_id=#{p.id}",P.of("qty",qty,"id",line.get("request_item_id")));
                if("DAMAGED".equals(condition)) c.task("MATERIAL_LIABILITY","MATERIAL_ITEM",itemId,null,rules.role("materialReviewerRoleId",Json.readMap(c.request().get("rule_snapshot"))),c.actor().userId());
            }
            refresh(c);c.target("MATERIAL_RECORD",recordId);c.event("MATERIAL_RETURNED",P.of("recordId",recordId,"title","物资归还已验收"));return P.of("recordId",recordId,"itemIds",results);
    }
    public Map<String,Object> liability(long id,long itemId,String key,Map<String,Object> body) {
        Actors.current().require("material:liability:decide");
        return commands.run(id,"MATERIAL_LIABILITY",key,target(body,"MATERIAL_ITEM",itemId),200,c->{
            requireMaterial(c);
            Map<String,Object> item=mapper.db().required("SELECT i.* FROM edu_material_record_item i JOIN edu_material_record r ON r.record_id=i.record_id WHERE i.item_id=#{p.id} AND r.request_id=#{p.request} FOR UPDATE",P.of("id",itemId,"request",id));
            if(!"PENDING".equals(item.get("liability_status"))) throw Problem.conflict("责任不是待处置状态");
            requireTask(c,"MATERIAL_LIABILITY","MATERIAL_ITEM",itemId);
            String decision=Inputs.text(body,"decision",1,24),comment=Inputs.text(body,"comment",1,1000);
            if(!Set.of("WRITE_OFF","RETURN_REQUIRED","NO_FURTHER_ACTION").contains(decision))throw Problem.bad("责任决定不合法");
            boolean loss=item.get("original_issue_item_id")==null&&n(item,"liability_qty")>0;
            if(!loss&&"WRITE_OFF".equals(decision))throw Problem.bad("已接收损坏物品不再次核减原单实物归还量");
            if(loss&&"NO_FURTHER_ACTION".equals(decision))throw Problem.bad("遗失须明确核准核销或继续追还");
            long writtenOff=loss&&"WRITE_OFF".equals(decision)?n(item,"liability_qty"):0;
            if(writtenOff>MaterialMath.returnable(n(item,"base_qty")-n(item,"written_off_qty"),mapper.alreadyReturned(itemId)))throw Problem.conflict("遗失申报后发生归还，请重新核对责任数量");
            mapper.db().write("UPDATE edu_material_record_item SET liability_status='RESOLVED',written_off_qty=written_off_qty+#{p.written},liability_decided_by=#{p.actor},liability_decided_at=CURRENT_TIMESTAMP,liability_comment=#{p.comment} WHERE item_id=#{p.id}",P.of("written",writtenOff,"actor",c.actor().userId(),"comment",comment,"id",itemId));
            c.audit(P.of("decision",decision,"comment",comment,"writtenOffQty",writtenOff));
            c.closeTasks("MATERIAL_LIABILITY","MATERIAL_ITEM",itemId);refresh(c);c.target("MATERIAL_ITEM",itemId);return P.of("itemId",itemId,"liabilityStatus","RESOLVED");
        });
    }
    public Map<String,Object> resolveDispute(long id,long recordId,String key,Map<String,Object>body){
        Actors.current().require("material:dispute:resolve");
        return commands.run(id,"MATERIAL_DISPUTE_RESOLVE",key,target(body,"MATERIAL_RECORD",recordId),200,c->{
            requireMaterial(c);Map<String,Object>r=mapper.record(recordId,id);if(!"DISPUTED".equals(r.get("receipt_status")))throw Problem.conflict("不是待核定争议");
            if(Inputs.nonNegative(body,"expectedRecordVersion")!=n(r,"version"))throw Problem.conflict("实发记录已变更");
            requireTask(c,"MATERIAL_DISPUTE","MATERIAL_RECORD",recordId);String comment=Inputs.text(body,"comment",1,1000);
            Map<String,Object>previous=mapper.db().required("SELECT assignee_user_id FROM office_task WHERE request_id=#{p.request} AND node_code='MATERIAL_RECEIPT' AND target_type='MATERIAL_RECORD' AND target_id=#{p.record} ORDER BY task_id DESC LIMIT 1",P.of("request",id,"record",recordId));
            long receiver=n(previous,"assignee_user_id");mapper.db().write("UPDATE edu_material_record SET receipt_status='PENDING',confirmed_by=NULL,confirmed_at=NULL,version=version+1 WHERE record_id=#{p.id}",P.of("id",recordId));
            c.closeTasks("MATERIAL_DISPUTE","MATERIAL_RECORD",recordId);c.task("MATERIAL_RECEIPT","MATERIAL_RECORD",recordId,receiver,null,null);c.audit(P.of("resolution",comment,"result","RECONFIRM"));refresh(c);c.target("MATERIAL_RECORD",recordId);c.event("MATERIAL_DISPUTE_RESOLVED",P.of("title","交接争议已核定，请重新确认","userId",receiver));return P.of("recordId",recordId,"receiptStatus","PENDING");
        });
    }
    public Map<String,Object> reportLoss(long id,String key,Map<String,Object>body){
        Actors.current().require("material:loss:report");return commands.run(id,"MATERIAL_LOSS_REPORT",key,body,201,c->{requireMaterial(c);long originalId=Inputs.id(body,"originalIssueItemId"),qty=Inputs.positive(body,"qty");Map<String,Object>original=mapper.original(originalId,id);if("PENDING".equals(original.get("liability_status")))throw Problem.conflict("原发放行尚有未结责任申报");if(qty>MaterialMath.returnable(n(original,"base_qty")-n(original,"written_off_qty"),mapper.alreadyReturned(originalId)))throw Problem.conflict("遗失数量超过原行在外数量");String reason=Inputs.text(body,"reason",1,1000);mapper.db().write("UPDATE edu_material_record_item SET liability_status='PENDING',liability_qty=#{p.qty},liability_decided_by=NULL,liability_decided_at=NULL,liability_comment=NULL WHERE item_id=#{p.id}",P.of("qty",qty,"id",originalId));c.task("MATERIAL_LIABILITY","MATERIAL_ITEM",originalId,null,rules.role("materialReviewerRoleId",Json.readMap(c.request().get("rule_snapshot"))),c.actor().userId());c.audit(P.of("reason",reason,"reportedLostQty",qty));refresh(c);c.target("MATERIAL_ITEM",originalId);c.event("MATERIAL_LOSS_REPORTED",P.of("title","原单遗失责任待核定"));return P.of("originalIssueItemId",originalId,"liabilityStatus","PENDING");});
    }
    public Map<String,Object> detail(long id) {
        Actor actor=Actors.current();actor.require("material:request:query");Map<String,Object> row=mapper.db().required("SELECT * FROM office_request WHERE request_id=#{p.id} AND biz_type='MATERIAL'",P.of("id",id));Access.requireRequest(actor,row,mapper.db());
        return P.of("request",row,"items",mapper.lines(id),"records",mapper.db().list("SELECT * FROM edu_material_record WHERE request_id=#{p.id} ORDER BY record_id",P.of("id",id)),"actualItems",mapper.db().list("SELECT i.* FROM edu_material_record_item i JOIN edu_material_record r ON r.record_id=i.record_id WHERE r.request_id=#{p.id} ORDER BY i.item_id",P.of("id",id)));
    }
    private void refresh(Commands.Context c) {refreshWithin(c);}
    public void refreshWithin(Commands.Context c) {
        List<Map<String,Object>> lines=mapper.lines(c.requestId());boolean pending=false,returnPending=false;
        for(Map<String,Object> line:lines) {pending|=MaterialMath.remaining(n(line,"approved_qty"),n(line,"issued_qty"),n(line,"cancelled_qty"))>0||n(line,"signed_qty")<n(line,"issued_qty");returnPending|=n(line,"return_required")==1&&n(line,"returned_qty")+writtenOff(n(line,"request_item_id"))<n(line,"issued_qty");}
        long unresolved=Inputs.number(mapper.db().required("SELECT COUNT(*) AS n FROM edu_material_record_item i JOIN edu_material_record r ON r.record_id=i.record_id WHERE r.request_id=#{p.id} AND i.liability_status='PENDING'",P.of("id",c.requestId())).get("n"));
        long returnIntents=n(mapper.db().required("SELECT COUNT(*) AS n FROM office_task WHERE request_id=#{p.id} AND target_type='MATERIAL_RETURN_INTENT' AND status IN ('OPEN','CLAIMED')",P.of("id",c.requestId())),"n");
        String status=pending?"PROCESSING":returnPending||unresolved>0||returnIntents>0?"WAIT_SETTLEMENT":"COMPLETED";
        mapper.db().write("UPDATE office_request SET status=#{p.state},current_node=CASE WHEN #{p.state}='COMPLETED' THEN NULL ELSE 'MATERIAL_FOLLOWUP' END,closed_at=CASE WHEN #{p.state}='COMPLETED' THEN CURRENT_TIMESTAMP ELSE NULL END WHERE request_id=#{p.id}",P.of("state",status,"id",c.requestId()));
        if(!pending)c.closeTasks("MATERIAL_ISSUE","REQUEST",c.requestId());
    }
    private void requireTask(Commands.Context c,String node,String type,long target) {
        List<Map<String,Object>> tasks=mapper.db().list("SELECT * FROM office_task WHERE request_id=#{p.request} AND node_code=#{p.node} AND target_type=#{p.type} AND target_id=#{p.target} AND status IN('OPEN','CLAIMED') FOR UPDATE",P.of("request",c.requestId(),"node",node,"type",type,"target",target));
        boolean allowed=false;for(Map<String,Object> t:tasks){
            if(t.get("excluded_user_id")!=null&&n(t,"excluded_user_id")==c.actor().userId())continue;
            if(t.get("assignee_user_id")!=null){if(n(t,"assignee_user_id")==c.actor().userId())allowed=true;}
            else if(t.get("assignee_role_id")!=null&&!mapper.db().one("SELECT user_id FROM sys_user_role WHERE user_id=#{p.user} AND role_id=#{p.role}",P.of("user",c.actor().userId(),"role",t.get("assignee_role_id"))).isEmpty())throw Problem.conflict("请先在固定任务入口受理岗位任务");
        }if(!allowed)throw Problem.forbidden("不属于当前固定办理任务");
    }
    private long writtenOff(long line){return n(mapper.db().required("SELECT COALESCE(SUM(written_off_qty),0) AS n FROM edu_material_record_item WHERE request_item_id=#{p.id} AND original_issue_item_id IS NULL",P.of("id",line)),"n");}
    private void requireWarehouse(Commands.Context c){long role=rules.role("warehouseRoleId",Json.readMap(c.request().get("rule_snapshot")));if(mapper.db().one("SELECT ur.user_id FROM sys_user_role ur JOIN sys_role r ON r.role_id=ur.role_id WHERE ur.user_id=#{p.user} AND ur.role_id=#{p.role} AND r.status='0' AND r.del_flag='0'",P.of("user",c.actor().userId(),"role",role)).isEmpty())throw Problem.forbidden("不属于固定仓库验收岗位");}
    private void requireMaterial(Commands.Context c){if(!"MATERIAL".equals(c.request().get("biz_type")))throw Problem.bad("不是物资申请事项");}
    private static Map<String,Object> target(Map<String,Object>body,String type,long id){Map<String,Object>p=new LinkedHashMap<>(body);p.put("_fixedTarget",P.of("type",type,"id",id));return p;}
    private String targetType(Map<String,Object>body){String type=Inputs.text(body,"targetType",1,1);if(!Set.of("1","2","3").contains(type))throw Problem.bad("targetType须为教师1、学生2或班级3");return type;}
    private static long n(Map<String,Object> m,String key){return m.get(key)==null?0:Inputs.number(m.get(key));}
}
```

**backend/src/main/java/com/doupi/planref/material/MaterialMapper.java**

```java
package com.doupi.planref.material;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class MaterialMapper {
    private final Db db;
    public MaterialMapper(Db db) { this.db = db; }
    public Map<String,Object> item(long id, long requestId) {
        return db.required("SELECT * FROM edu_material_request_item WHERE request_item_id=#{p.id} AND request_id=#{p.request} FOR UPDATE", P.of("id",id,"request",requestId));
    }
    public List<Map<String,Object>> lines(long requestId) {
        return db.list("SELECT * FROM edu_material_request_item WHERE request_id=#{p.id} ORDER BY request_item_id",P.of("id",requestId));
    }
    public Map<String,Object> record(long id,long requestId) {
        return db.required("SELECT * FROM edu_material_record WHERE record_id=#{p.id} AND request_id=#{p.request} FOR UPDATE",P.of("id",id,"request",requestId));
    }
    public Map<String,Object> original(long id,long requestId) {
        return db.required("SELECT i.*,r.request_id FROM edu_material_record_item i JOIN edu_material_record r ON r.record_id=i.record_id WHERE i.item_id=#{p.id} AND r.request_id=#{p.request} AND r.record_type='1' FOR UPDATE",P.of("id",id,"request",requestId));
    }
    public long alreadyReturned(long originalId) {
        return Inputs.number(db.required("SELECT COALESCE(SUM(base_qty),0) AS n FROM edu_material_record_item WHERE original_issue_item_id=#{p.id}",P.of("id",originalId)).get("n"));
    }
    public Map<String,Object> goods(long id) {
        return db.required("SELECT * FROM edu_goods WHERE goods_id=#{p.id} AND del_flag='0'",P.of("id",id));
    }
    public List<Map<String,Object>> kit(long id) {
        db.required("SELECT kit_id FROM edu_goods_kit WHERE kit_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",id));
        return db.list("SELECT goods_id,quantity FROM edu_goods_kit_item WHERE kit_id=#{p.id} ORDER BY goods_id",P.of("id",id));
    }
    public long insertLine(Map<String,Object> p) {
        return db.insert("INSERT INTO edu_material_request_item(request_id,line_no,goods_id,kit_id,goods_name,spec,unit,requested_qty,approved_qty,issued_qty,signed_qty,returned_qty,cancelled_qty,target_type,target_id,target_name,class_id,return_required,version,created_by_user_id,created_at,updated_at) VALUES(#{p.request},#{p.line},#{p.goods},#{p.kit},#{p.name},#{p.spec},#{p.unit},#{p.qty},0,0,0,0,0,#{p.type},#{p.target},#{p.targetName},#{p.classId},#{p.returnRequired},0,#{p.actor},CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",p);
    }
    public long insertRecord(Commands.Context c,String type,String targetName,long quantity) {
        return db.insert("INSERT INTO edu_material_record(record_no,request_id,record_type,business_category,target_type,target_name,total_quantity,operator,operator_user_id,operate_time,status,receipt_status,action_id,version) VALUES(#{p.no},#{p.request},#{p.type},'OFFICE','1',#{p.name},#{p.qty},#{p.operator},#{p.actor},CURRENT_TIMESTAMP,'0',#{p.receipt},#{p.action},0)",P.of("no","MR"+UUID.randomUUID().toString().replace("-", "").substring(0,24),"request",c.requestId(),"type",type,"name",targetName,"qty",quantity,"operator",Long.toString(c.actor().userId()),"actor",c.actor().userId(),"receipt","2".equals(type)?"CONFIRMED":"PENDING","action",c.actionId()));
    }
    public long insertActual(long recordId,Map<String,Object> line,long qty,Long originalId,String condition,Commands.Context c) {
        return db.insert("INSERT INTO edu_material_record_item(record_id,request_item_id,original_issue_item_id,goods_id,goods_name,spec,unit,quantity,base_qty,conversion_rate,condition_code,usable_return_qty,liability_status) VALUES(#{p.record},#{p.line},#{p.original},#{p.goods},#{p.name},#{p.spec},#{p.unit},#{p.qty},#{p.qty},1,#{p.condition},#{p.usable},#{p.liability})",P.of("record",recordId,"line",line.get("request_item_id"),"original",originalId,"goods",line.get("goods_id"),"name",line.get("goods_name"),"spec",line.get("spec"),"unit",line.get("unit"),"qty",qty,"condition",condition,"usable",originalId==null?0:MaterialMath.usable(qty,condition),"liability",Set.of("DAMAGED","LOST").contains(condition)?"PENDING":"NONE"));
    }
    public void movement(long itemId,long movementId) {
        db.write("UPDATE edu_material_record_item SET movement_id=#{p.movement} WHERE item_id=#{p.id} AND movement_id IS NULL",P.of("movement",movementId,"id",itemId));
    }
    public Db db() { return db; }
}
```

**backend/src/main/java/com/doupi/planref/material/MaterialMath.java**

```java
package com.doupi.planref.material;

/** Pure quantity invariants; services translate invalid state to a business conflict. */
public final class MaterialMath {
    private MaterialMath() {}
    public static long remaining(long approved, long issued, long cancelled) {
        if (approved < 0 || issued < 0 || cancelled < 0) throw new IllegalArgumentException("negative quantity");
        long value = Math.subtractExact(Math.subtractExact(approved, issued), cancelled);
        if (value < 0) throw new IllegalArgumentException("issue exceeds approval");
        return value;
    }
    public static long returnable(long issued, long returned) { return remaining(issued, returned, 0); }
    public static long usable(long qty, String condition) {
        if (qty <= 0) throw new IllegalArgumentException("return quantity must be positive");
        return switch (condition) {
            case "GOOD", "REUSABLE" -> qty;
            case "DAMAGED", "LOST" -> 0;
            default -> throw new IllegalArgumentException("unknown condition");
        };
    }
    public static void requireSignature(long actual, long acknowledged) {
        if (actual <= 0 || actual != acknowledged) throw new IllegalArgumentException("receipt differs from actual handover");
    }
}
```



## 6. 边界与异常场景处理

P1新增边界：400处理空明细、重复原行、重复证据、LOST或未知condition、未知decision；403处理只有配置管理员/全数据范围却无原单申报资格、代撤销他人意向、非本人证据、缺少快照仓库岗位；404处理跨根原行、不可用文件及不可见事项；409处理原发放未签收、同原行已有PENDING意向、终态重办、根或意向版本变化、原单可还量被其他实物归还/核销消耗及同键换intentId。拒绝必须说明原因；实物数量或状态与意向不一致时先REJECT再由本人新键重报，不在ACCEPT中篡改已提交明细。任何证据或库存失败都回滚头、明细、绑定、动作、任务和Outbox；原键同目标同载荷重试只重放。待办意向未清时，不论实物是否已还完都不能COMPLETED或人工结案。

400：LOST作为实物condition、负数、未知责任决定、损坏重复核销；403：无固定仓库资格、未受理责任任务、申报人本人核定；404：原行不属于该根或不可见；409：累计超还、已核准核销量又归还、未结责任重复申报、记录或根已变更。损坏接收不增加可用量，归还完毕但PENDING责任存在仍WAIT_SETTLEMENT；RETURN_REQUIRED后未还实物义务继续保留。遗失实物后来找回且已核准免追还，应由负责人建立有审计的恢复处置，不允许原接口自动冲减written_off以规避重复库存。死锁/数据库异常回滚全部事实，原键重试。
