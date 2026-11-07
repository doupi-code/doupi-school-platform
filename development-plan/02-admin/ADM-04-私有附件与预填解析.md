# ADM-04 私有附件与预填解析

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-04)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

优先级：P0；工期：4个单人工作日；依赖：ADM-03。按1名Java开发+AI辅助估算，工期包括页面、接口、自测和联调。

包含私有上传、内容结构校验、页数候选/聊天文本候选、按事项/印品绑定及逐次鉴权下载。支持PDF、DOCX、PNG/JPEG；DOCX页数不可靠则人工确认，不造默认页数。PASSED仅指已实现的结构/类型校验，不宣称已接杀毒引擎。

- [ ] 第1日：实现`sys_file`元数据与私有目录，旧`/profile`URL梳理及分批迁移；未迁移文件保留历史路径但不能继续用于新私有原稿。
- [ ] 第2日：完成FileService上传幂等、内容校验、下载范围和绑定事务；页面`src/components/OfficeFileUpload`。
- [ ] 第3日：接入现有微信提取/文件识别的候选确认，参考`DocumentInspector`和文本prefill；页面显示缺失/歧义字段，不自动审批或登记库存。
- [ ] 第4日：联调加密PDF、改扩展名、ZIP炸弹/路径、超时重放、跨用户hash和事项附件权限；验证文件与DB失败补偿。

验收：上传未绑定可恢复、同键不同文件409；原稿版本可追溯；无公共原稿URL；未确定的份数/页数/纸张要求不能形成正式文印记录。

## 2. 接口设计清单

统一外层`code:int,msg:string,traceId:string,replayed:boolean,data:object`；下表为data。ID为十进制字符串，数据库BIGINT；版本为非负整数。业务写命令头`Idempotency-Key:string(1..64)`必填；私有上传和ExternalCommands动作另限8..64个字母数字或_.:-字符；登录、分析和文本候选不要求该头；JWT认证派生操作者和部门。接口不得接受客户端权限、角色和操作者作为授权依据。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 私有上传 | POST multipart | `/api/v1/staff/files` | file/binary/是/≤100MiB且允许格式；Idempotency-Key头/string/是 | fileId/string；originalName,mimeType,sha256,status/string；byteSize/long | file:upload，内部员工 |
| 文件分析 | POST | `/api/v1/staff/files/{id}/analysis` | id/string/是；无body | fileId/string；mimeType/string；pageCount/int或null；confidence/STRUCTURE、IMAGE或MANUAL_REQUIRED；manualConfirmationRequired/boolean=true；图片可含width,height/int | file:read，上传者或可见绑定事项 |
| 文本候选 | POST | `/api/v1/staff/files/prefill/text` | text/string(1..20000)/是/用户主动提供的聊天文字 | candidate/{printCount?:long,pageCount?:long,printSide?:1或2,source:string}；missingOrAmbiguous/string[]；manualConfirmationRequired/true；persisted/false | file:upload |
| 绑定附件 | POST | `/api/v1/office/requests/{requestId}/files` | requestId/string/是；expectedVersion/long/是；fileId/string/是；purpose/ORIGINAL、RESULT、RECEIPT或CHECK_EVIDENCE/是；recordScopeId/string/否默认0 | linkId,fileId,requestId/string；version/long；status/string | file:bind，事项可见且当前上传者 |
| 授权下载 | GET | `/api/v1/staff/files/{id}/content` | id/string/是；Authorization头/是 | 原始二进制；Content-Type、attachment文件名、Cache-Control:no-store | file:read且当前可见事项或上传者 |

## 3. 数据流转细节

1. 上传：Multipart大小上限100MiB；取安全basename校验长度/控制字符，原字节由DocumentInspector检查扩展名和内容。PDFBox真实解析页数并拒绝加密/损坏；图片读取格式及尺寸上限8000万像素；DOCX检查主结构、宏、ZIP条目≤2000、总展开≤200MiB及路径，不执行宏/外部链接。sha256取原字节；upload_payload_hash=hash(name,sha256,bytes)。
2. 先查`sys_file(owner_user_id=Actor.userId,upload_key)`：同hash且READY返回原file，异hash409。私有文件名使用随机UUID，路径必须在配置root内；CREATE_NEW不覆盖；落盘后事务插`storage_provider=LOCAL,bucket=private,object_key,original_name,mime_type,byte_size,sha256,owner_user_id,owner_dept_id,upload_key,upload_payload_hash,visibility=PRIVATE,status=READY,scan_status=PASSED,expires_at=now+24h,created_by_user_id,created_at,updated_at`。DB失败删除本次新文件；并发UK失败先删除本次独有文件再查已提交file重放，不删别人的内容。崩溃遗留由后续受限清理任务核对无元数据且超过TTL后清理，不能声称文件系统与DB具备共同ACID。
3. 分析/下载：查`sys_file.file_id,status=READY,scan_status=PASSED`，验证owner本人；否则`office_request_file.file_id→office_request`校验申请人/经办/部门或显式受派任务范围。逐次检查权限，不因知道sha256、object_key、旧URL而授权。analysis读私有字节重算候选；download以受控路径返回流，attachment+no-store，查询无业务写库。
4. 文本prefill：只从请求text匹配唯一的“正整数份”“正整数页”和单/双面；重复/缺失均进入missingOrAmbiguous；不创建表行、不写stock、不自动选人，返回persisted=false。正式保存时ADM-05重新验证全部字段，不信任confidence。
5. 绑定：Commands.run锁`office_request`先幂等再version；校file上传者、状态、用途；ORIGINAL仅DRAFT/RETURNED，正recordScopeId必须是该根printId。插`office_request_file(request_id,file_id,purpose,record_scope_id,revision,sort_order,linked_by,linked_at)`；`sys_file.expires_at=NULL,updated_at=now`；action FILE_BIND target FILE及根version在同事务提交。新修订增加新绑定，不覆盖已审批版本。
6. 文件字节不放Redis，下载不缓存授权结果；无文件hash跨用户共享。上传使用sys_file自己的owner/key唯一约束，因为此时可能尚无office_request。所有错误无敏感正文日志。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

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

## 5. 代码实现骨架

命名采用Java驼峰、类PascalCase、SQL snake_case和REST资源路径。Controller负责HTTP适配，Service负责校验、权限、事务与业务，Repository经MyBatis参数绑定访问数据库；公共ApiErrors/SecurityConfig输出脱敏异常和traceId日志。公共组件定义及运行依赖见[公共契约与内嵌实现](../00-shared/公共契约.md)。



**backend/src/main/java/com/doupi/planref/files/FileController.java**

```java
package com.doupi.planref.files;
import com.doupi.planref.*;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
@RestController @RequestMapping("/api/v1")
public class FileController {
    private final FileService service;public FileController(FileService service) {this.service=service;}
    @PostMapping(value="/staff/files",consumes=MediaType.MULTIPART_FORM_DATA_VALUE) public ResponseEntity<?> upload(@RequestPart MultipartFile file,@RequestHeader("Idempotency-Key") String key) {return ApiReply.of(service.upload(file,key),201);}
    @PostMapping("/staff/files/{id}/analysis") public ResponseEntity<?> analyze(@PathVariable long id) {return ApiReply.of(service.analyze(id),200);}
    @PostMapping("/staff/files/prefill/text") public ResponseEntity<?> prefill(@RequestBody Map<String,Object> b) {return ApiReply.of(service.prefill(b),200);}
    @GetMapping("/staff/files/{id}/content") public ResponseEntity<FileSystemResource> download(@PathVariable long id) {var file=service.download(id);return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(file.name(),StandardCharsets.UTF_8).build().toString()).contentType(MediaType.parseMediaType(file.mime())).body(new FileSystemResource(file.path()));}
    @PostMapping("/office/requests/{requestId}/files") public ResponseEntity<?> bind(@PathVariable long requestId,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.bind(requestId,key,b),200);}
}
```

**backend/src/main/java/com/doupi/planref/files/FileService.java**

```java
package com.doupi.planref.files;

import com.doupi.planref.*;
import java.io.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
public class FileService {
    private final FileRepository repo;private final DocumentInspector inspector;private final Commands commands;private final TransactionTemplate tx;private final Path root;
    public FileService(FileRepository repo,DocumentInspector inspector,Commands commands,PlatformTransactionManager manager,@Value("${plan.file-root}") String folder) throws IOException {
        this.repo=repo;this.inspector=inspector;this.commands=commands;this.tx=new TransactionTemplate(manager);
        root=Path.of(folder).toAbsolutePath().normalize();Files.createDirectories(root);
    }
    public Map<String,Object> upload(MultipartFile file,String key) {
        Actor actor=Actors.current();actor.require("file:upload");
        if(key==null||!key.matches("[A-Za-z0-9_.:-]{8,64}")) throw Problem.bad("上传幂等键无效");
        String name=Optional.ofNullable(file.getOriginalFilename()).orElse("file").replace('\\','/');name=name.substring(name.lastIndexOf('/')+1);
        if(name.isBlank()||name.length()>255||name.chars().anyMatch(c->c<32)) throw Problem.bad("文件名无效");
        final byte[] bytes;try {bytes=file.getBytes();} catch(IOException ex) {throw new Problem(503,"FILE_READ_FAILED","上传内容读取失败");}
        Map<String,Object> analysis=inspector.inspect(bytes,name);String digest=Json.sha256(bytes),hash=Json.hash(P.of("name",name,"sha256",digest,"bytes",bytes.length));
        Map<String,Object> old=repo.prior(actor.userId(),key);if(!old.isEmpty()) return replay(old,hash);
        String object=UUID.randomUUID().toString();Path path=path(object);final String original=name;
        try {
            Files.write(path,bytes,StandardOpenOption.CREATE_NEW);
            try {
                return tx.execute(status->{
                    long id=repo.db().insert("INSERT INTO sys_file(storage_provider,bucket,object_key,original_name,mime_type,byte_size,sha256,owner_user_id,upload_key,upload_payload_hash,owner_dept_id,visibility,status,scan_status,expires_at,created_by_user_id,created_at,updated_at) VALUES('LOCAL','private',#{p.object},#{p.name},#{p.mime},#{p.size},#{p.digest},#{p.owner},#{p.key},#{p.hash},#{p.dept},'PRIVATE','READY','PASSED',#{p.expiry},#{p.owner},CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3))",
                        P.of("object",object,"name",original,"mime",analysis.get("mimeType"),"size",bytes.length,"digest",digest,"owner",actor.userId(),"key",key,"hash",hash,"dept",actor.deptId(),"expiry",java.sql.Timestamp.from(Instant.now().plus(Duration.ofHours(24)))));
                    return result(repo.find(id),false);
                });
            } catch(DataIntegrityViolationException ex) {Files.deleteIfExists(path);Map<String,Object> raced=repo.prior(actor.userId(),key);if(!raced.isEmpty()) return replay(raced,hash);throw Problem.conflict("文件元数据冲突");}
              catch(RuntimeException ex) {Files.deleteIfExists(path);throw ex;}
        } catch(IOException ex) {throw new Problem(503,"FILE_STORE_FAILED","文件存储暂不可用");}
    }
    private Map<String,Object> replay(Map<String,Object> row,String hash) {if(!hash.equals(row.get("upload_payload_hash"))) throw Problem.conflict("上传幂等键已用于其他文件");if(!"READY".equals(row.get("status"))) throw Problem.conflict("该上传已过期或不可用，请使用新键");return result(row,true);}
    private Map<String,Object> result(Map<String,Object> row,boolean replay) {return P.of("fileId",row.get("file_id"),"originalName",row.get("original_name"),"mimeType",row.get("mime_type"),"byteSize",row.get("byte_size"),"sha256",row.get("sha256"),"status",row.get("status"),"_replayed",replay);}
    private Map<String,Object> authorized(long id) {
        Actor a=Actors.current();a.require("file:read");Map<String,Object> row=repo.find(id);
        if(Inputs.number(row.get("owner_user_id"))==a.userId()) return row;
        for(Map<String,Object> request:repo.roots(id)) try {Access.requireRequest(a,request,repo.db());return row;} catch(Problem ex) {if(ex.http()!=404&&ex.http()!=403) throw ex;}
        throw Problem.notFound("附件不可见");
    }
    public Map<String,Object> analyze(long id) {Map<String,Object> f=authorized(id);try {Map<String,Object> analysis=inspector.inspect(Files.readAllBytes(path(f.get("object_key").toString())),f.get("original_name").toString());analysis.put("fileId",Long.toString(id));return analysis;} catch(IOException ex) {throw new Problem(503,"FILE_MISSING","附件内容暂不可用");}}
    public Map<String,Object> prefill(Map<String,Object> b) {
        Actors.current().require("file:upload");String text=Inputs.text(b,"text",1,20000);
        Map<String,Object> candidate=new LinkedHashMap<>();List<String> missing=new ArrayList<>();
        for(var entry:Map.of("printCount","(?:^|[^0-9])([1-9][0-9]{0,5})\\s*份","pageCount","(?:^|[^0-9])([1-9][0-9]{0,4})\\s*页").entrySet()) {
            var match=java.util.regex.Pattern.compile(entry.getValue()).matcher(text);
            if(match.find()) {String first=match.group(1);if(match.find()) missing.add(entry.getKey());else candidate.put(entry.getKey(),Long.parseLong(first));}
            else missing.add(entry.getKey());
        }
        boolean duplex=text.contains("双面"),simplex=text.contains("单面");
        if(duplex!=simplex) candidate.put("printSide",duplex?"2":"1");else missing.add("printSide");
        candidate.put("source","USER_CONFIRMED_TEXT");return P.of("candidate",candidate,"missingOrAmbiguous",missing,"manualConfirmationRequired",true,"persisted",false);
    }
    public Map<String,Object> bind(long requestId,String key,Map<String,Object> b) {
        Actors.current().require("file:bind");return commands.run(requestId,"FILE_BIND",key,b,200,c->{
            String purpose=Inputs.text(b,"purpose",1,24);if(!Set.of("ORIGINAL","RESULT","RECEIPT","CHECK_EVIDENCE").contains(purpose)) throw Problem.bad("附件用途无效");
            if("ORIGINAL".equals(purpose)&&!Set.of("DRAFT","RETURNED").contains(c.request().get("status"))) throw Problem.conflict("审批后的原稿必须通过新修订办理");
            long id=Inputs.id(b,"fileId"),scope=b.get("recordScopeId")==null?0:Inputs.nonNegative(b,"recordScopeId");Map<String,Object> f=repo.lock(id);
            if(Inputs.number(f.get("owner_user_id"))!=c.actor().userId()) throw Problem.forbidden("仅上传者可首次绑定其文件");
            if(scope>0) {if(!"PRINT".equals(c.request().get("biz_type"))) throw Problem.bad("非文印事项附件只使用整事项范围");repo.db().required("SELECT print_id FROM edu_print_record WHERE print_id=#{p.print} AND request_id=#{p.request}",P.of("print",scope,"request",requestId));}
            long link=repo.db().insert("INSERT INTO office_request_file(request_id,file_id,purpose,record_scope_id,revision,sort_order,linked_by,linked_at) VALUES(#{p.request},#{p.file},#{p.purpose},#{p.scope},#{p.revision},0,#{p.user},CURRENT_TIMESTAMP(3))",P.of("request",requestId,"file",id,"purpose",purpose,"scope",scope,"revision",c.request().get("revision"),"user",c.actor().userId()));
            repo.db().write("UPDATE sys_file SET expires_at=NULL,updated_at=CURRENT_TIMESTAMP(3) WHERE file_id=#{p.id}",P.of("id",id));c.target("FILE",id);return P.of("linkId",link,"fileId",id);
        });
    }
    public Download download(long id) {Map<String,Object> f=authorized(id);Path path=path(f.get("object_key").toString());if(!Files.isRegularFile(path,LinkOption.NOFOLLOW_LINKS)) throw new Problem(503,"FILE_MISSING","附件内容暂不可用");return new Download(path,f.get("original_name").toString(),f.get("mime_type").toString());}
    public int cleanExpired() {
        // A candidate is rechecked while its row is locked; bind takes the same row lock.
        int removed=0;
        for(Map<String,Object> candidate:repo.db().list("SELECT file_id FROM sys_file WHERE expires_at<CURRENT_TIMESTAMP(3) AND status IN ('READY','DELETED') ORDER BY file_id LIMIT 100",Map.of())) {
            String object=tx.execute(status->{long id=Inputs.number(candidate.get("file_id"));Map<String,Object> f=repo.db().required("SELECT * FROM sys_file WHERE file_id=#{p.id} FOR UPDATE",P.of("id",id));
                if(f.get("expires_at")==null||!repo.roots(id).isEmpty()||!Set.of("READY","DELETED").contains(f.get("status"))) return null;
                repo.db().write("UPDATE sys_file SET status='DELETED',updated_at=CURRENT_TIMESTAMP(3) WHERE file_id=#{p.id}",P.of("id",id));return f.get("object_key").toString();});
            if(object!=null) try {if(Files.deleteIfExists(path(object))) removed++;} catch(IOException ex) {throw new Problem(503,"FILE_CLEANUP_FAILED","临时文件删除失败，将按标记重试");}
        }
        try(var entries=Files.list(root)) {
            for(Path p:entries.filter(x->Files.isRegularFile(x,LinkOption.NOFOLLOW_LINKS)).toList()) {
                String object=p.getFileName().toString();if(!object.matches("[a-f0-9-]{36}")) continue;
                if(Files.getLastModifiedTime(p,LinkOption.NOFOLLOW_LINKS).toInstant().isAfter(Instant.now().minus(Duration.ofHours(24)))) continue;
                if(repo.db().one("SELECT file_id FROM sys_file WHERE storage_provider='LOCAL' AND bucket='private' AND object_key=#{p.key}",P.of("key",object)).isEmpty()&&Files.deleteIfExists(p)) removed++;
            }
        } catch(IOException ex) {throw new Problem(503,"FILE_CLEANUP_FAILED","私有文件清理未完成");}
        return removed;
    }
    private Path path(String object) {if(!object.matches("[a-f0-9-]{36}")) throw Problem.bad("非法文件定位");Path p=root.resolve(object).normalize();if(!p.startsWith(root)) throw Problem.forbidden("非法文件定位");return p;}
    public record Download(Path path,String name,String mime) {}
}
```

**backend/src/main/java/com/doupi/planref/files/FileRepository.java**

```java
package com.doupi.planref.files;
import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;
@Repository
public class FileRepository {
    private final Db db;public FileRepository(Db db) {this.db=db;}
    public Db db() {return db;}
    public Map<String,Object> find(long id) {return db.required("SELECT * FROM sys_file WHERE file_id=#{p.id} AND status='READY' AND scan_status='PASSED'",P.of("id",id));}
    public Map<String,Object> lock(long id) {return db.required("SELECT * FROM sys_file WHERE file_id=#{p.id} AND status='READY' AND scan_status='PASSED' FOR UPDATE",P.of("id",id));}
    public Map<String,Object> prior(long owner,String key) {return db.one("SELECT * FROM sys_file WHERE owner_user_id=#{p.owner} AND upload_key=#{p.key}",P.of("owner",owner,"key",key));}
    public List<Map<String,Object>> roots(long fileId) {return db.list("SELECT r.* FROM office_request r JOIN office_request_file f ON f.request_id=r.request_id WHERE f.file_id=#{p.id}",P.of("id",fileId));}
}
```

**backend/src/main/java/com/doupi/planref/files/DocumentInspector.java**

```java
package com.doupi.planref.files;

import com.doupi.planref.*;
import java.io.*;
import java.util.*;
import java.util.zip.*;
import javax.imageio.ImageIO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.springframework.stereotype.Component;

@Component
public class DocumentInspector {
    public Map<String,Object> inspect(byte[] bytes,String filename) {
        if(bytes.length==0||bytes.length>100*1024*1024) throw Problem.bad("文件必须在1字节至100MiB之间");
        String ext=filename.contains(".")?filename.substring(filename.lastIndexOf('.')+1).toLowerCase(Locale.ROOT):"";
        try {
            if("pdf".equals(ext)) {
                if(bytes.length<5||!new String(bytes,0,5,java.nio.charset.StandardCharsets.US_ASCII).equals("%PDF-")) throw Problem.bad("PDF扩展名与内容不符");
                try(PDDocument pdf=Loader.loadPDF(bytes)) {
                    if(pdf.isEncrypted()) throw Problem.bad("请解除PDF加密后上传");
                    return P.of("mimeType","application/pdf","pageCount",pdf.getNumberOfPages(),"confidence","STRUCTURE","manualConfirmationRequired",true);
                }
            }
            if(Set.of("png","jpg","jpeg").contains(ext)) {
                try(var input=ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                    var readers=ImageIO.getImageReaders(input);if(!readers.hasNext()) throw Problem.bad("图片内容不可识别");
                    var reader=readers.next();try {reader.setInput(input,true,true);String format=reader.getFormatName().toLowerCase(Locale.ROOT);
                        if(("png".equals(ext)&&!"png".equals(format))||(!"png".equals(ext)&&!Set.of("jpeg","jpg").contains(format))) throw Problem.bad("图片扩展名与内容不符");
                        int width=reader.getWidth(0),height=reader.getHeight(0);if((long)width*height>80_000_000) throw Problem.bad("图片像素过大");
                        return P.of("mimeType","png".equals(ext)?"image/png":"image/jpeg","pageCount",1,"width",width,"height",height,"confidence","IMAGE","manualConfirmationRequired",true);
                    } finally {reader.dispose();}
                }
            }
            if("docx".equals(ext)) {
                boolean main=false,types=false;int count=0;long total=0;
                try(ZipInputStream zip=new ZipInputStream(new ByteArrayInputStream(bytes))) {ZipEntry e;byte[] buffer=new byte[8192];
                    while((e=zip.getNextEntry())!=null) {if(++count>2000||e.getName().contains("..")||e.getName().startsWith("/")||e.getName().endsWith("vbaProject.bin")) throw Problem.bad("文档包结构不安全");
                        int n;while((n=zip.read(buffer))!=-1) {total+=n;if(total>200L*1024*1024) throw Problem.bad("文档展开内容过大");}
                        main|="word/document.xml".equals(e.getName());types|="[Content_Types].xml".equals(e.getName());
                    }
                }
                if(!main||!types) throw Problem.bad("文件不是有效DOCX");
                return P.of("mimeType","application/vnd.openxmlformats-officedocument.wordprocessingml.document","pageCount",null,"confidence","MANUAL_REQUIRED","manualConfirmationRequired",true);
            }
            throw Problem.bad("支持PDF、DOCX、PNG、JPEG；其他格式先转换或人工登记");
        } catch(Problem ex) {throw ex;}
        catch(IOException ex) {throw Problem.bad("文件损坏、加密或不可识别");}
    }
}
```

**backend/src/main/java/com/doupi/planref/files/FileCleanupWorker.java**

```java
package com.doupi.planref.files;
import org.slf4j.*;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
@Component @ConditionalOnProperty(name="plan.file-cleanup-enabled",havingValue="true")
public class FileCleanupWorker {
    private final FileService service;private final Logger log=LoggerFactory.getLogger(FileCleanupWorker.class);
    public FileCleanupWorker(FileService service) {this.service=service;}
    @Scheduled(fixedDelay=300000,initialDelay=300000) public void clean() {try {log.info("privateFileCleanup removed={}",service.cleanExpired());} catch(RuntimeException ex) {log.warn("privateFileCleanup failed={}",ex.getClass().getSimpleName());}}
}
```



## 6. 边界与异常场景处理

- 格式不符/加密/损坏/过大/宏/异常包422，非法路径403；未绑定他人文件或不可见事项404；不同上传载荷同键409；私有磁盘/DB不可用503。
- 文件已上传但申请提交失败保留临时身份，原上传键重试；FileCleanupWorker按24小时临时期限先锁元数据再检查无绑定，标DELETED后删受控路径；删除失败保留标记以便重试，文件系统孤儿亦需无元数据且超24小时才清理。plan.file-cleanup-enabled默认false，P0切换前启用并演练；不按公共目录批量删除。
- 人工确认是业务步骤；PDF结构页数不等于最终份数或获准用纸，图片1页候选也必须核对。OCR/历史提取失败允许人工输入，不让模拟识别结果自动提交。
- PASSED不表示病毒扫描；未来接入扫描引擎需新增隔离/超时策略；当前只接受受限格式并禁止公开执行内容。
