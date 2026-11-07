# ADM-05 文印申请、计划与接单

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-05)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期3人日。负责同一事项下多个印品的录入、草稿修订、原稿私有绑定、提交、计划用纸和受派执行人接单；实际领纸、核销、退纸属于ADM-06，分次交付属于ADM-07。排期前置为ADM-04；复用ADM-02认证/规则和ADM-03固定审批。基础纸张及余额写入契约随ADM-03预定义，完整库存界面在ADM-10联调，不作为本模块后置排期依赖。

- [ ] 第1日：落`print/PrintRepository.java`的1:N主从与来源锁、`PrintService.definition/create/revise`字段校验
- [ ] 第2日：落`PrintController.java`、接单和当前原稿资格，并在`doupi-web-admin-react/src/pages/edu/record/index.tsx`现有文印页拆出计划/实际状态
- [ ] 第3日：在`src/api/office.ts`接入新路径，验证多印品、5页双面取整、无页数候选不转正式记录、超时重放及历史已扣纸隔离。新后台细页待实施在`src/pages/office/print/detail.tsx`，不要求本次改生产src。

验收：100份×5页双面+1制版+1试印=302张计划；创建、修订、审批、接单库存都不变；一根下试卷/答案独立printId；每子项真实页数/纸张/份数/单双面不可猜1；同来源消息重复录入409；重印走新根和关联字段。

## 2. 接口设计清单

前缀`/api/v1/office/print-requests`。写请求都需员工JWT与`Idempotency-Key`，ID字符串、数量整数，操作者由Actor生成。公共根创建可传`applicantUserId`正ID（默认本人，代录需权限及部门范围）、`title`≤200、`clientSource`枚举ADMIN_WEB/STAFF_APP/WECHAT_MINI/PUBLIC_WEB（默认ADMIN_WEB）、`dueAt`含偏移ISO8601可空。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/是否必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 办理 print-requests | POST | `/api/v1/office/print-requests` | 公共创建字段；`submit`布尔默认true；`records`1—500个印品对象（见下） | `requestId,status,version,records[{clientItemId,printId,plannedSheets}]`；201 | `print:request:create` |
| 更新 {id} | PUT | `/api/v1/office/print-requests/{id}` | path requestId；`expectedVersion`；`records`须包含原全部印品，各对象额外`printId`，无clientItemId要求，其余字段同创建 | `requestId,status,version,revision,records[{printId,plannedSheets}]`；200 | `print:request:update` |
| 查询 {id} | GET | `/api/v1/office/print-requests/{id}` | path id | `request,records,issues,settlements,deliveries,files`；200 | `print:request:read` |
| 办理 accept | POST | `/api/v1/office/print-requests/{id}/accept` | path id；body `expectedVersion` | `requestId,status,version,handlerUserId`；200 | `print:execute:accept` |
| 办理 submit | POST | `/api/v1/office/requests/{id}/submit` | `expectedVersion` | `submitted,requestId,status,version`；200，详ADM-03 | `office:request:submit` |

印品完整字段：创建必填`clientItemId`1—64唯一；`printName`1—100、`teacherId`、`classId`、`paperGoodsId`正ID；`paperType`1—10；`printCount,pageCount`正long；`printSide`只能1/2；`colorCategory`1—20；`printPurpose`1—500；`templatePaperQty,previewPaperQty`可省略默认0，否则非负；`sourceConversationId`≤64与`sourceMessageId`≤255同时有或同时无；`files`非空数组，每项`fileId`正ID，purpose由服务器固定ORIGINAL，revision由服务器决定，客户端传purpose/revision不授予越权能力。

GET字段：request为ADM-03根；records为edu_print_record当前结构全部业务列；issues为纸张事件；settlements经print_id反查归属；deliveries为交付；files只含`link_id,file_id,purpose,record_scope_id,revision,original_name,mime_type,byte_size`，不含object_key/磁盘路径。API不把planned_qty或total_pages显示成实耗。


## 3. 数据流转细节

| API与字段来源 | 逐字段校验与计算 | 表字段及实际写入 | 事务/缓存 |
|---|---|---|---|
| create公共字段、Actor | applicantUserId存在且有效、部门有效；代录需office:request:delegate及部门范围；clientSource只审计；dueAt解析为UTC；title可缺省业务名 | Roots插office_request biz_type=PRINT、created_by=Actor、applicant/dept、rule_snapshot由office.rules角色key解析、revision=1/version=0；Commands成功统一version=1 | action CREATE_REQUEST，先查幂等再创建根；所有子项和文件同事务；不缓存写事实 |
| records[].printName/printPurpose/colorCategory/paperType | 长度约束；不从OCR候选静默补缺 | edu_print_record.print_name/print_purpose/color_category/paper_type | 任一项失败整根回滚 |
| teacherId/classId/paperGoodsId | 读有效sys_user、ACTIVE edu_class、有效edu_goods；教师须在范围或为真实申请人；纸张base_unit必须张 | teacher_id/class_id/paper_goods_id；class_name/grade取班级快照，operator取Actor；stock余额只读 | 不扣stock、不建stock_movement |
| printCount/pageCount/printSide/templatePaperQty/previewPaperQty | 正份数正页数，side枚举；双面copies×ceil(pages/2)，单面copies×pages，加制版及预览；所有计算Math精确溢出检查 | print_count/page_count/print_side/template_paper_count/preview_paper_count/planned_qty/total_pages；issued/returned/consumed/delivered/signed=0；production_status=PLANNED/settlement_status=PENDING/legacy_stock_mode=NEW_ISSUE | 计划不是预占，不减少库存；预警只提示真实库存不足风险 |
| clientItemId/记录顺序 | 子项clientItemId在请求内唯一；item_no从1；服务端INSERT得printId | UK(request_id,item_no)；clientItemId仅响应映射，不作主键 | 成功响应存动作，可同键重放相同映射 |
| sourceConversationId/sourceMessageId | 成对；先固定source_lock行加写锁，再查有效且非作废重复消息；修订排除self | edu_print_source_lock.source_conversation_id；print.source_conversation_id/source_message_id | 同来源并发最多一次；来源不是身份或授权 |
| files[].fileId、服务端purpose/revision | 文件行锁；READY且scan PASSED；仅上传者或已绑定本根附件可用；至少一个原稿；同文件同作用域绑定去重 | office_request_file(request_id,file_id,purpose=ORIGINAL,record_scope_id=printId,revision,linked_by,linked_at)；sys_file所有权状态检查 | 绑定与清理互斥；不复制公开URL；新原稿另建绑定，旧原稿保留 |
| create.submit | true则OfficeService.submitWithin仅从DRAFT建REVIEW任务，禁止自审；false保留DRAFT但基本计量必须完整 | 根SUBMITTED/submitted_at和REVIEW任务；Outbox REQUEST_SUBMITTED；false无审核任务 | 一次创建只递增一次根版本 |
| revise：expectedVersion、全部records[].printId和字段 | 仅DRAFT/RETURNED且所有子项未领纸；每ID在本根且不重复，数量等于原子项数；保持item_no；必须明确非空原稿列表 | 覆盖当前计划字段，print.version+1；根revision+1；原文件绑定历史不删，同一原稿复用其原始revision，新文件记新revision；audit存新revision及计划 | action PRINT_REQUEST_REVISE；根version只由Commands+1；不得修改实际领纸或已审批事实 |
| detail：path id、Actor | 根先授权并检查biz_type PRINT，再按根读取所有子项和关联事实；settlement没有request_id列须JOIN归属 | SELECT office_request/print/paper_issue/settlement/delivery/request_file/sys_file | 只读实时，私有文件下载仍逐次独立授权 |
| accept：expectedVersion、Actor | 根APPROVED；PRINT_EXECUTE/REQUEST固定任务受派人或岗位，非前端自报executor | office_request.handler_user_id=Actor,status=PROCESSING/current_node=PRINT_EXECUTE；关闭本EXECUTE任务，每print建PRINT_SETTLE任务给Actor；PRINT_ACCEPTED事件聚合taskIds | action PRINT_EXECUTION_ACCEPT；无库存写入；根/任务/事件同事务 |

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

**edu_print_source_lock**

```sql
CREATE TABLE `edu_print_source_lock` (
  `source_conversation_id` VARCHAR(64) COLLATE utf8mb4_bin NOT NULL,
  PRIMARY KEY (`source_conversation_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_bin
COMMENT='微信来源登记事务锁；由数据库持有到提交或回滚';
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

页数未知保留辅助录入候选，不INSERT正式print；工作表数不当打印页数。400拒绝缺必填、负数、未知单双面、来源字段不成对、空原稿和整数溢出；403拒绝他人私有附件和无受派资格接单；404处理越范围根/子项；409处理重复来源、状态/根版本冲突、已领纸改计划；503处理缺规则或岗位。超时使用原键原正文，不因页面重开重复建单。印刷完成和交付完成分开；不允许通过修改旧单实现换纸、增印或重印。
