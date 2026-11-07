# ADM-18 门户内容审核与发布

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-18)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

工期2人日，P1；单Java开发者配合AI、按全计划串行估算，非多人并行压缩。前置依赖：ADM-17。

P1覆盖公开文章独立草稿修订、退回修改、固定内容审核、作者回避、免审规则留痕、发布及撤下；不把对外公告当作内部员工通知。编辑草稿不覆盖已发布正文，审核与发布权限分别校验。

- [ ] 第1日：`cms/ContentService.java`和两张P1表，接rule_snapshot.contentReviewerRoleId/contentReviewRequired
- [ ] 第2日：`ContentController.java`及`doupi-web-admin-react/src/pages/cms/article/review.tsx`（待实施）联调。验收已发布A编辑B时公众仍见A，B退回不改变A，审核批准后发布才切B；作者/配置管理员不能跳审核。

## 2. 接口设计清单

所有新接口均为`/api/v1`下员工JWT接口；ID在JSON用十进制字符串，数量、金额分和版本为范围受限整数；日期为含时区ISO8601，数据库存UTC。持久化操作必填请求头`Idempotency-Key:string(1..64)`，已有事项操作必填`expectedVersion:integer>=0`；正文禁止以userId、role或clientSource冒充操作者。成功外层统一`code,msg,traceId,replayed,data`，下表列data，幂等重放保留原业务结果。Commands统一锁根、检查范围与版本、写动作结果并将根version加一，领域代码不再加根version。岗位任务先通过ADM-03的CLAIM领取。查询不依赖Redis，写成后才可失效可重建缓存。

创建公共字段：`title:string(1..200)`可选，缺省为业务名申请；`applicantUserId:ID`可选，缺省真实Actor，指定他人须`office:request:delegate`及部门范围；`clientSource:enum(ADMIN_WEB,STAFF_APP,WECHAT_MINI,PUBLIC_WEB)`可选默认ADMIN_WEB，只审计终端；`dueAt:ISO8601`可选，表示事项期限，不改变权限。

| 接口名称 | 请求方式 | 路径 | 请求参数字段类型必填含义 | 返回参数字段类型含义 | 权限要求 |
|---|---|---|---|---|---|
| 保存内容修订 | POST | `/api/v1/office/content-revisions` | 公共创建字段；`articleId:ID`可选，不传创建隐藏正式头；传时`expectedArticleVersion:integer>=0`必填；`articleTitle:string1..255,kind:enum(updates,notices),category:string1..64,content:string1..200000,authorName:string1..64`必填；`summary:string<=500,coverUrl:string<=512`可空，封面须HTTPS已发布公共素材 | articleId:string(ID),revisionId:string(ID),revision:integer,requestId:string(ID),version:integer,status:string(业务状态)=DRAFT；201 | cms:content:edit |
| 保存修改 | PUT | `/api/v1/office/content-revisions/{id}` | id为revision根；expectedVersion:integer>=0必填(根版本)；上述articleTitle/kind/category/content/authorName必填，summary/coverUrl可空；仅DRAFT/RETURNED | revisionId:string(ID),requestId:string(ID),version:integer,status:string(业务状态)=DRAFT；200 | cms:content:edit及根范围 |
| 详情查询 | GET | `/api/v1/office/content-revisions/{id}` | id | request:object、revision:object完整修订、review:object可空审核行；200 | cms:content:edit及根范围 |
| 送审 | POST | `/api/v1/office/content-revisions/{id}/submit` | id；expectedVersion:integer>=0必填(根版本) | revisionId:string(ID),reviewRequired:boolean,requestId:string(ID),version:integer,status:string(业务状态)=SUBMITTED/APPROVED；200 | cms:content:submit |
| 审核决定 | POST | `/api/v1/office/content-revisions/{id}/review` | id；expectedVersion:integer>=0必填(根版本)；`approved:boolean`必填；`comment:string1..1000`必填 | revisionId:string(ID),reviewStatus:string(审核状态)=APPROVED/RETURNED,requestId:string(ID),version:integer,status:string(业务状态)；200 | cms:content:review及本人已受理CONTENT_REVIEW，作者回避 |
| 正式发布 | POST | `/api/v1/office/content-revisions/{id}/publish` | id；expectedVersion:integer>=0必填(根版本) | articleId:string(ID),revisionId:string(ID),requestId:string(ID),version:integer,status:string(业务状态)=COMPLETED；200 | cms:content:publish |
| 撤下文章 | POST | `/api/v1/office/content-revisions/{id}/withdraw` | id；expectedVersion:integer>=0必填(根版本)；`reason:string1..1000`必填 | articleId:string(ID),requestId:string(ID),version:integer,status:string(业务状态)；200，修订WITHDRAWN | cms:content:publish |

revision字段revision_id,request_id,article_id,revision,base_article_version,title,kind,category,summary,content,cover_url,author_name,status,created_by_user_id,created_at；review字段review_id,request_id,revision_id,status,reviewed_by,reviewed_at,comment。content输入为纯文本，服务端HTML转义并把换行转br；不接收客户端富文本脚本。

## 3. 数据流转细节

| 接口 | 字段/状态/SQL | 事务及公众可见性 |
|---|---|---|
| draft | existing article锁后比expectedArticleVersion；new article先创建status=1隐藏头；article内MAX(revision)+1生成稳定修订号，base_article_version保存编辑时正式版本，所有正文/标题/分类/署名写revision | 固定CMS_REVISION_CREATE，新root DRAFT；不改已公开article内容，不创建虚假审核成功 |
| edit | 根锁→revision，限DRAFT/RETURNED，校验并重新转义全文；更新本修订为DRAFT，audit保存修改前后 | 不覆盖正式article，审核冻结后不可修改 |
| submit | 读取根冻结的contentReviewRequired；true写revision.SUBMITTED及cms_content_review.SUBMITTED，创建contentReviewerRoleId的CONTENT_REVIEW，排除真实创建作者；false写revision.APPROVED、review.EXEMPT | 根SUBMITTED/APPROVED，CONTENT_SUBMITTED事件；免审是学校配置快照，不接收客户端skipReview，仍须另行发布 |
| review | 固定个人已受理任务，非作者；approved决定APPROVED/RETURNED；写reviewed_by/at/comment，revision同状态 | 关闭本轮CONTENT_REVIEW，CONTENT_REVIEWED事件，意见存audit；退回修改及再次送审保留历次动作 |
| publish | 必须revision.APPROVED；锁正式article并比较article.version==base_article_version，防止两个修订覆盖。正式表一次更新标题/分类/摘要/已转义正文/封面、status=0、revision、version+1、published_at/by/date | 本修订PUBLISHED，根COMPLETED；CONTENT_PUBLISHED同事务。公开PublicSiteService原查询表保持一致，发布后才见新内容 |
| withdraw | 本修订须PUBLISHED，锁article且其revision仍为本修订，reason留action；article.status=1/version+1，revision.WITHDRAWN | 公众查询status=0规则立即排除；不删除审核与旧修订，CONTENT_WITHDRAWN事件 |
| detail | 根范围后取revision和review，所有私有修订只在员工权限入口 | 未发布内容不进入public接口，不借办公私有文件URL作为封面 |

Rules支持contentReviewerRoleKey解析活跃role_id并把contentReviewRequired冻结进根；false时不要求配置审核岗位，true时缺岗位报503，绝不静默跳过。正式article.version与根version各自只在其职责更新。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**cms_article_revision**

```sql
CREATE TABLE cms_article_revision (
  base_article_version BIGINT NOT NULL COMMENT '编辑时正式文章版本，发布时校验',
  revision_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '内容修订ID',
  request_id BIGINT NOT NULL UNIQUE COMMENT '真实办公事项根',
  article_id BIGINT NOT NULL COMMENT '正式文章ID',
  revision INT NOT NULL COMMENT '文章内修订序号',
  title VARCHAR(255) NOT NULL COMMENT '送审标题快照',
  kind VARCHAR(32) NOT NULL COMMENT '公开内容类型',
  category VARCHAR(64) NOT NULL COMMENT '公开分类',
  summary VARCHAR(500) NULL COMMENT '摘要快照',
  content LONGTEXT NOT NULL COMMENT '已转义正文快照，不提前覆盖正式内容',
  cover_url VARCHAR(512) NULL COMMENT 'HTTPS公共封面素材地址',
  author_name VARCHAR(100) NOT NULL COMMENT '署名快照',
  status VARCHAR(16) NOT NULL COMMENT '本表办理状态',
  created_by_user_id BIGINT NOT NULL COMMENT '真实创建员工',
  created_at DATETIME(3) NOT NULL COMMENT '创建UTC时间',
  UNIQUE (
    article_id,
    revision
  ),
  CONSTRAINT fk_revision_request FOREIGN KEY (request_id) REFERENCES office_request (
    request_id
  ),
  CONSTRAINT fk_revision_article FOREIGN KEY (article_id) REFERENCES doupi_cms_article (
    article_id
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='审核草稿不可提前覆盖公众已发布正文';
```

**cms_content_review**

```sql
CREATE TABLE cms_content_review (
  review_id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '内容审核ID',
  request_id BIGINT NOT NULL UNIQUE COMMENT '真实办公事项根',
  revision_id BIGINT NOT NULL UNIQUE COMMENT '内容修订ID',
  status VARCHAR(16) NOT NULL COMMENT '本表办理状态',
  reviewed_by BIGINT NULL COMMENT '真实审核员工',
  reviewed_at DATETIME(3) NULL COMMENT '审核UTC时间',
  comment VARCHAR(1000) NULL COMMENT '审核意见',
  CONSTRAINT fk_review_request FOREIGN KEY (request_id) REFERENCES office_request (
    request_id
  ),
  CONSTRAINT fk_review_revision FOREIGN KEY (revision_id) REFERENCES cms_article_revision (
    revision_id
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='固定内容审核，审批人与作者分离';
```

**doupi_cms_article**

```sql
CREATE TABLE `doupi_cms_article` (
  `article_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '资讯ID',
  `title` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文章标题',
  `kind` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'updates' COMMENT '类型: updates-高招资讯 notices-校园公告',
  `category` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '校园动态' COMMENT '栏目分类',
  `summary` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '摘要提炼',
  `content` LONGTEXT COLLATE utf8mb4_unicode_ci COMMENT '富文本正文',
  `cover_url` VARCHAR(512) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '封面图片URL',
  `published_date` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '发布日期(YYYY-MM-DD)',
  `author` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '汉外华襄校办' COMMENT '发布作者/署名',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态: 0-正常发布 1-草稿箱',
  `sort_order` INT DEFAULT '0' COMMENT '排序权重',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT 'admin' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`article_id`),
  INDEX `idx_kind` (`kind`),
  INDEX `idx_status` (`status`),
  `revision` INT NOT NULL DEFAULT 1 COMMENT '新增，修订',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，并发编辑发布',
  `published_at` DATETIME(3) NULL COMMENT '新增，真实发布时间',
  `published_by` BIGINT NULL COMMENT '新增，发布身份',
  INDEX `idx_article_public` (`kind`, `status`, `published_at`, `article_id`),
  CONSTRAINT `fk_ref_085` FOREIGN KEY (`published_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网公文与资讯表';
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

Java17、Spring Boot4.0.3、MyBatis4.0.1可运行参考实现如下，公共依赖见[公共契约](../00-shared/公共契约.md)。本轮维护开发计划、数据库结构资料与目录，不开发业务功能。



**backend/src/main/java/com/doupi/planref/cms/ContentController.java**

```java
package com.doupi.planref.cms;
import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
@RequestMapping("/api/v1/office/content-revisions")
public class ContentController {
 private final ContentService service;public ContentController(ContentService service){this.service=service;}
 @PostMapping public ResponseEntity<Map<String,Object>> draft(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.draft(key,b),201);}
 @GetMapping("/{id}") public ResponseEntity<Map<String,Object>> detail(@PathVariable long id){return ApiReply.of(service.detail(id),200);}
 @PostMapping("/{id}/submit") public ResponseEntity<Map<String,Object>> submit(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.submit(id,key,b),200);}
 @PostMapping("/{id}/review") public ResponseEntity<Map<String,Object>> review(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.review(id,key,b),200);}
 @PostMapping("/{id}/publish") public ResponseEntity<Map<String,Object>> publish(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.publish(id,key,b),200);}
 @PutMapping("/{id}") public ResponseEntity<Map<String,Object>> edit(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.edit(id,key,b),200);}
 @PostMapping("/{id}/withdraw") public ResponseEntity<Map<String,Object>> withdraw(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.withdraw(id,key,b),200);}
}
```

**backend/src/main/java/com/doupi/planref/cms/ContentService.java**

```java
package com.doupi.planref.cms;
import com.doupi.planref.*;
import com.doupi.planref.office.OfficeService;
import java.net.URI;
import java.util.*;
import org.springframework.stereotype.Service;
@Service
public class ContentService {
 private final Db db;private final Commands commands;private final Roots roots;private final Rules rules;private final OfficeService office;
 public ContentService(Db db,Commands commands,Roots roots,Rules rules,OfficeService office){this.db=db;this.commands=commands;this.roots=roots;this.rules=rules;this.office=office;}
 private static long n(Map<String,Object>r,String k){return Inputs.number(r.get(k));}
 public static String publicKind(Map<String,Object>b){String kind=Inputs.text(b,"kind",1,32);if(!Set.of("updates","notices").contains(kind))throw Problem.bad("公开文章kind须为updates或notices");return kind;}
 public static String safeText(String text){return text.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;").replace("\"","&quot;").replace("'","&#39;").replace("\n","<br>");}
 public static String publicCover(Map<String,Object>b){String url=Inputs.optionalText(b,"coverUrl",512);if(url==null||url.isBlank())return null;try{URI u=URI.create(url);if(!"https".equals(u.getScheme())||u.getHost()==null||u.getUserInfo()!=null)throw Problem.bad("封面须使用已发布的HTTPS公共素材地址");return url;}catch(IllegalArgumentException ex){throw Problem.bad("封面地址无效");}}
 private void state(long id,String status){db.write("UPDATE office_request SET status=#{p.status},closed_at=CASE WHEN #{p.status}='COMPLETED' THEN CURRENT_TIMESTAMP(3) ELSE NULL END WHERE request_id=#{p.id}",P.of("status",status,"id",id));}
 public Map<String,Object> draft(String key,Map<String,Object>b){Actors.current().require("cms:content:edit");return commands.create("CMS_REVISION_CREATE",key,b,201,()->roots.create("CMS_REVIEW",key,b),c->{String title=Inputs.text(b,"articleTitle",1,255),kind=publicKind(b),category=Inputs.text(b,"category",1,64),summary=Inputs.optionalText(b,"summary",500),content=safeText(Inputs.text(b,"content",1,200000)),author=Inputs.text(b,"authorName",1,64),cover=publicCover(b);long article;Map<String,Object> row;
  if(b.get("articleId")==null){article=db.insert("INSERT INTO doupi_cms_article(title,kind,category,summary,content,cover_url,status,revision,version,sort_order) VALUES(#{p.title},#{p.kind},#{p.category},#{p.summary},'',#{p.cover},'1',1,0,0)",P.of("title",title,"kind",kind,"category",category,"summary",summary,"cover",cover));row=P.of("version",0);}
  else{article=Inputs.id(b,"articleId");row=db.required("SELECT * FROM doupi_cms_article WHERE article_id=#{p.id} FOR UPDATE",P.of("id",article));if(Inputs.nonNegative(b,"expectedArticleVersion")!=n(row,"version"))throw Problem.conflict("公开文章版本已变更");}
  long revision=n(db.required("SELECT COALESCE(MAX(revision),0)+1 AS n FROM cms_article_revision WHERE article_id=#{p.id}",P.of("id",article)),"n");long rev=db.insert("INSERT INTO cms_article_revision(request_id,article_id,revision,base_article_version,title,kind,category,summary,content,cover_url,author_name,status,created_by_user_id,created_at) VALUES(#{p.request},#{p.article},#{p.revision},#{p.base},#{p.title},#{p.kind},#{p.category},#{p.summary},#{p.content},#{p.cover},#{p.author},'DRAFT',#{p.actor},CURRENT_TIMESTAMP(3))",P.of("request",c.requestId(),"article",article,"revision",revision,"base",row.get("version"),"title",title,"kind",kind,"category",category,"summary",summary,"content",content,"cover",cover,"author",author,"actor",c.actor().userId()));state(c.requestId(),"DRAFT");c.target("CMS_REVISION",rev);return P.of("articleId",article,"revisionId",rev,"revision",revision);
 });}
 public Map<String,Object> edit(long id,String key,Map<String,Object>b){Actors.current().require("cms:content:edit");return commands.run(id,"CMS_REVISION_EDIT",key,b,200,c->{Map<String,Object>r=revision(id);if(!Set.of("DRAFT","RETURNED").contains(r.get("status")))throw Problem.conflict("仅草稿及退回内容可修改");db.write("UPDATE cms_article_revision SET title=#{p.title},kind=#{p.kind},category=#{p.category},summary=#{p.summary},content=#{p.content},cover_url=#{p.cover},author_name=#{p.author},status='DRAFT' WHERE revision_id=#{p.id}",P.of("title",Inputs.text(b,"articleTitle",1,255),"kind",publicKind(b),"category",Inputs.text(b,"category",1,64),"summary",Inputs.optionalText(b,"summary",500),"content",safeText(Inputs.text(b,"content",1,200000)),"cover",publicCover(b),"author",Inputs.text(b,"authorName",1,64),"id",r.get("revision_id")));state(id,"DRAFT");c.audit(P.of("previousRevision",r,"revisedRevision",revision(id)));c.target("CMS_REVISION",n(r,"revision_id"));return P.of("revisionId",r.get("revision_id"));});}
 public Map<String,Object> withdraw(long id,String key,Map<String,Object>b){Actors.current().require("cms:content:publish");return commands.run(id,"CMS_WITHDRAW",key,b,200,c->{Map<String,Object>r=revision(id);if(!"PUBLISHED".equals(r.get("status")))throw Problem.conflict("该修订未发布");Inputs.text(b,"reason",1,1000);Map<String,Object>a=db.required("SELECT * FROM doupi_cms_article WHERE article_id=#{p.id} FOR UPDATE",P.of("id",r.get("article_id")));if(n(a,"revision")!=n(r,"revision"))throw Problem.conflict("正式文章已被其他修订替换");db.write("UPDATE doupi_cms_article SET status='1',version=version+1 WHERE article_id=#{p.id}",P.of("id",r.get("article_id")));db.write("UPDATE cms_article_revision SET status='WITHDRAWN' WHERE revision_id=#{p.id}",P.of("id",r.get("revision_id")));c.target("CMS_REVISION",n(r,"revision_id"));c.event("CONTENT_WITHDRAWN",P.of("title","门户内容已撤下"));return P.of("articleId",r.get("article_id"));});}
 public Map<String,Object> submit(long id,String key,Map<String,Object>b){Actors.current().require("cms:content:submit");return commands.run(id,"CMS_REVIEW_SUBMIT",key,b,200,c->{Map<String,Object>r=revision(id);if(!Set.of("DRAFT","RETURNED").contains(r.get("status")))throw Problem.conflict("内容不能重复送审");Map<String,Object>snapshot=Json.readMap(c.request().get("rule_snapshot"));boolean required=Inputs.bool(snapshot,"contentReviewRequired",true);db.write("UPDATE cms_article_revision SET status=#{p.status} WHERE revision_id=#{p.id}",P.of("status",required?"SUBMITTED":"APPROVED","id",r.get("revision_id")));db.write("INSERT INTO cms_content_review(request_id,revision_id,status) VALUES(#{p.request},#{p.revision},#{p.status}) ON DUPLICATE KEY UPDATE status=#{p.status},reviewed_by=NULL,reviewed_at=NULL,comment=NULL",P.of("request",id,"revision",r.get("revision_id"),"status",required?"SUBMITTED":"EXEMPT"));if(required)c.task("CONTENT_REVIEW","CMS_REVISION",n(r,"revision_id"),null,rules.role("contentReviewerRoleId",snapshot),n(c.request(),"created_by_user_id"));state(id,required?"SUBMITTED":"APPROVED");c.target("CMS_REVISION",n(r,"revision_id"));c.event("CONTENT_SUBMITTED",P.of("title",required?"门户内容待审核":"门户内容按配置免审"));return P.of("revisionId",r.get("revision_id"),"reviewRequired",required);});}
 public Map<String,Object> review(long id,String key,Map<String,Object>b){Actors.current().require("cms:content:review");return commands.run(id,"CMS_REVIEW_DECIDE",key,b,200,c->{Map<String,Object>r=revision(id);if(!"SUBMITTED".equals(r.get("status")))throw Problem.conflict("内容不在待审核状态");if(n(r,"created_by_user_id")==c.actor().userId())throw Problem.forbidden("作者不能审核本人内容");office.requireTask(c,"CONTENT_REVIEW","CMS_REVISION",n(r,"revision_id"));if(!b.containsKey("approved"))throw Problem.bad("approved必填");boolean approve=Inputs.bool(b,"approved",false);String comment=Inputs.text(b,"comment",1,1000),status=approve?"APPROVED":"RETURNED";db.write("UPDATE cms_content_review SET status=#{p.status},reviewed_by=#{p.actor},reviewed_at=CURRENT_TIMESTAMP(3),comment=#{p.comment} WHERE request_id=#{p.id}",P.of("status",status,"actor",c.actor().userId(),"comment",comment,"id",id));db.write("UPDATE cms_article_revision SET status=#{p.status} WHERE revision_id=#{p.id}",P.of("status",status,"id",r.get("revision_id")));c.closeTasks("CONTENT_REVIEW","CMS_REVISION",n(r,"revision_id"));state(id,status);c.target("CMS_REVISION",n(r,"revision_id"));c.audit(P.of("comment",comment));c.event("CONTENT_REVIEWED",P.of("title","门户内容审核结果已更新"));return P.of("revisionId",r.get("revision_id"),"reviewStatus",status);});}
 public Map<String,Object> publish(long id,String key,Map<String,Object>b){Actors.current().require("cms:content:publish");return commands.run(id,"CMS_PUBLISH",key,b,200,c->{Map<String,Object>r=revision(id);if(!"APPROVED".equals(r.get("status")))throw Problem.conflict("只有审核批准或规则免审内容可发布");Map<String,Object>a=db.required("SELECT * FROM doupi_cms_article WHERE article_id=#{p.id} FOR UPDATE",P.of("id",r.get("article_id")));if(n(a,"version")!=n(r,"base_article_version"))throw Problem.conflict("文章已有其他发布版本，请重新生成并审核修订");db.write("UPDATE doupi_cms_article SET title=#{p.title},kind=#{p.kind},category=#{p.category},summary=#{p.summary},content=#{p.content},cover_url=#{p.cover},author=#{p.author},status='0',revision=#{p.revision},version=version+1,published_at=CURRENT_TIMESTAMP(3),published_by=#{p.actor},published_date=#{p.date} WHERE article_id=#{p.id}",P.of("title",r.get("title"),"kind",r.get("kind"),"category",r.get("category"),"summary",r.get("summary"),"content",r.get("content"),"cover",r.get("cover_url"),"author",r.get("author_name"),"revision",r.get("revision"),"actor",c.actor().userId(),"date",java.time.LocalDate.now(java.time.ZoneOffset.UTC).toString(),"id",r.get("article_id")));db.write("UPDATE cms_article_revision SET status='PUBLISHED' WHERE revision_id=#{p.id}",P.of("id",r.get("revision_id")));state(id,"COMPLETED");c.target("CMS_REVISION",n(r,"revision_id"));c.event("CONTENT_PUBLISHED",P.of("title","门户内容已发布"));return P.of("articleId",r.get("article_id"),"revisionId",r.get("revision_id"));});}
 public Map<String,Object> detail(long id){Actor a=Actors.current();a.require("cms:content:edit");Map<String,Object>root=db.required("SELECT * FROM office_request WHERE request_id=#{p.id} AND biz_type='CMS_REVIEW'",P.of("id",id));Access.requireRequest(a,root,db);return P.of("request",root,"revision",db.required("SELECT * FROM cms_article_revision WHERE request_id=#{p.id}",P.of("id",id)),"review",db.one("SELECT * FROM cms_content_review WHERE request_id=#{p.id}",P.of("id",id)));}
 private Map<String,Object> revision(long id){return db.required("SELECT * FROM cms_article_revision WHERE request_id=#{p.id} FOR UPDATE",P.of("id",id));}
}
```



## 6. 边界与异常场景处理

400：纯文本/必填非法、封面非HTTPS、无时区；403：作者审核自己、未受理任务、无发布权限；404：不可见修订；409：已冻结仍编辑、未批准发布、正式文章已被另一修订发布、旧修订撤下覆盖新修订、过期根版本、同键异正文；503：需审核但固定岗位缺失。审核返回不改变公众当前版本；发布失败回滚正式文章和修订状态。不使用客户端status=0绕过审核，部署P1必须关闭旧文章直接发布写路由或改由本服务处理。
