# MINI-06 订阅选择、站内通知、隐私与真机验证

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#mini-06)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，2个工作日。** 一名单人Java开发者结合AI承担后端、客户端、联调与自测，不假定独立前端或QA团队。工期包括正常联调与人工场景检查，不含等待微信平台审核。App交付保持P1。

P0保证站内预约结果可查与明确隐私说明。微信订阅为可选适配：真实调用客户端弹窗并保存本次选择，但当前参考工程没有供应商发送worker，必须显示providerSendingEnabled=false和NOT_REQUESTED；授权弹窗成功不是已发送／已送达。缺配置不阻断预约，不伪接短信。

文件路径与任务：

- [ ] `backend/src/main/java/com/doupi/planref/recruit/{VisitorMessageController,VisitorMessageService}.java`：能力状态、本人站内通知、首次阅读与订阅选择回执。
- [ ] `doupi-miniApp/pages/privacy/`、消息入口与预约结果：展示正式privacy_policy/privacy_version、用途及学校联系渠道；提交前用户确认；拒绝订阅仍可预约。
- [ ] `miniapp/pages/home/index.js`：用户点击触发wx.requestSubscribeMessage、读取服务端白名单模板、保存accept/reject/ban。
- [ ] `miniapp/pages/home/index.wxml`与验收记录：微信真机、拒绝授权、弱网、重复提交、撤销绑定及隐私清理。

依赖：MINI-01..05；服务端plan.wechat.subscription-template-ids为学校已配置模板白名单；CMS正式隐私说明。发布前复核[微信订阅接口](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/mp-message-management/subscribe-message/sendMessage.html)与微信公众平台实际模板。

验收：拒绝订阅仍能预约／查结果；未配置模板返回空能力或503且不展示已发送；用户只看本identity消息；首次阅读时间不被重试覆盖；超时原键重放只留一条选择；真机验证与后台事实一致，不能以npm通过代替真机。

## 2. 接口设计清单

统一前缀`/api/v1`。响应为`{code:int,msg:string,traceId:string,replayed:boolean,data:object}`；BIGINT标识十进制字符串，版本为非负整数。Authorization:string为服务端Bearer JWT；写操作Idempotency-Key:string(8..64)必填。访客操作者由认证identity派生，员工由服务端账号、岗位和范围派生，不接收body中的操作者或角色授权。

| 接口名称 | 请求方式 | 路径 | 请求参数(字段名/类型/必填/含义) | 返回参数(字段名/类型/含义) | 权限要求 |
|---|---|---|---|---|---|
| 订阅能力状态 | GET | `/api/v1/public/subscription-capabilities` | 无 | templateIds:string[]（学校已配置模板白名单）；providerSendingEnabled:boolean=false（当前未启用供应商发送）；inAppMessagesEnabled:boolean=true（站内消息可用） | 匿名 |
| 本人站内通知 | GET | `/api/v1/visitor/notifications` | Authorization:string／是；无body，最近100条 | items:object[]（最近100条本人站内消息，每项notification_id:string通知ID、appointment_id:string预约ID、title:string标题、content:string最小提示、is_read:int 0或1阅读状态、provider_status:string外部发送状态、created_at:string ISO8601创建时间、read_at:string ISO8601或null首次阅读时间） | 当前identity本人 |
| 确认通知已读 | POST | `/api/v1/visitor/notifications/{id}/read` | Authorization:string／是／Bearer会话；Idempotency-Key:string(8..64)／是／本次命令键；id:long>0路径／是；无业务body | notificationId:string（通知ID）；isRead:boolean=true（本人已读） | 当前identity为接收人 |
| 记录订阅选择 | POST | `/api/v1/visitor/subscription-consents` | Authorization:string／是／Bearer会话；Idempotency-Key:string(8..64)／是／本次命令键；templateId:string(1..128)／是／服务端允许模板；decision:`accept或reject或ban`／是／本次真实弹窗结果 | HTTP201；consentId:string（本次订阅选择回执ID）；decision:string（accept/reject/ban选择）；deliveryStatus:string=NOT_REQUESTED（未请求供应商发送）；providerSendingEnabled:boolean=false（当前未启用外部发送） | 已认证WECHAT identity；配置允许的模板 |
| 站点公开配置 | GET | `/api/v1/public/site` | 无 | config:object（公开键值集合）；config.site_name/site_name_en:string或缺省（学校中英文名称）；config.slogan/subtitle:string或缺省（标语/副标题）；config.address/hotlines/office_hours:string或缺省（地址/热线配置字符串/咨询时间）；config.icp:string或缺省（备案）；config.privacy_policy/privacy_version:string或缺省（正式隐私说明/版本） | 匿名；缺隐私说明禁止客户端提交个人资料 |



## 3. 数据流转细节

| 接口 | 请求／认证来源 → 数据库明确字段 → 返回 | 事务、缓存与一致性 |
|---|---|---| 
| 能力状态 | 环境plan.wechat.subscription-template-ids→templateIds；发送worker未实现→固定false，无DB读取/不伪写发送结果 | 只读配置；不可用不是“发送成功”，业务站内通知继续 |
| 消息列表 | actor.identityId→recruit_notification.recipient_identity_id WHERE；读取notification_id/appointment_id/title/content/is_read/provider_status/created_at/read_at→items | DB过滤后LIMIT100；ID字符串，私密数据不进入共享缓存 |
| 阅读 | id+actor.identityId→notification_id/recipient_identity_id；is_read=1/read_at=COALESCE(read_at,UTC now)→isRead | 固定RECRUIT_MESSAGE_READ，ID入hash，幂等→接收人行锁→首次时间同事务；读消息不核销预约 |
| 订阅选择 | templateId/decision→recruit_subscription_consent.template_id/decision；服务端identity_id/created_at→consentId/NOT_REQUESTED | 校验真实外部provider=WECHAT及白名单，固定RECRUIT_SUBSCRIPTION_CONSENT；回执与幂等结果同事务；只存用户选择，未消耗或捏造外部发送额度 |
| 隐私说明 | config_key=privacy_policy/privacy_version→doupi_cms_config.config_value→正式文本及版本 | 只读无草稿缓存；前端展示用途并在提交前确认，不请求通讯录、定位或身份证；不把本地点击宣称为完整合规认证 |

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**sys_external_identity**

```sql
CREATE TABLE `sys_external_identity` (
  `identity_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '外部渠道身份',
  `provider` VARCHAR(16) NOT NULL COMMENT '如WECHAT，受控渠道类型',
  `app_id` VARCHAR(64) NOT NULL COMMENT '渠道应用标识，避免跨小程序subject冲突',
  `subject_id` VARCHAR(128) NOT NULL COMMENT '经渠道服务端认证的主体，非任意客户端字符串',
  `user_id` BIGINT NULL COMMENT '已核实绑定的学校员工，访客保持NULL',
  `link_status` VARCHAR(16) NOT NULL COMMENT 'VISITOR/PENDING/VERIFIED/REVOKED',
  `verified_by` BIGINT NULL COMMENT '学校核实操作人',
  `verified_at` DATETIME(3) NULL COMMENT '核实时间',
  `created_at` DATETIME(3) NOT NULL COMMENT '建立时间',
  PRIMARY KEY (`identity_id`),
  UNIQUE `uk_external_subject` (
    `provider`,
    `app_id`,
    `subject_id`
  ),
  INDEX `idx_external_user` (`user_id`, `link_status`),
  CONSTRAINT `fk_ref_087` FOREIGN KEY (`verified_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_099` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='sys_external_identity';
```

**sys_user**

```sql
CREATE TABLE `sys_user` (
  `user_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  `dept_id` BIGINT DEFAULT NULL COMMENT '部门ID',
  `user_name` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户账号',
  `nick_name` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户昵称',
  `user_type` VARCHAR(2) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '00' COMMENT '用户类型（00系统用户）',
  `email` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '用户邮箱',
  `phonenumber` VARCHAR(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '手机号码',
  `sex` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '用户性别（0男 1女 2未知）',
  `avatar` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '头像地址',
  `password` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '密码',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '账号状态（0正常 1停用）',
  `del_flag` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志（0代表存在 2代表删除）',
  `login_ip` VARCHAR(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '最后登录IP',
  `login_date` DATETIME DEFAULT NULL COMMENT '最后登录时间',
  `pwd_update_date` DATETIME DEFAULT NULL COMMENT '密码最后更新时间',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  `grade` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '任教年级',
  `subject` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '任教科目',
  `class_ids` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '任教班级ID集合，逗号分隔',
  PRIMARY KEY (`user_id`),
  `auth_version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，停用/角色变更使旧会话失效',
  UNIQUE `uk_user_name` (
    `user_name`
  ),
  INDEX `idx_user_dept_status` (`dept_id`, `status`, `del_flag`),
  CONSTRAINT `fk_ref_000` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept` (
    `dept_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='用户信息表';
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

**doupi_cms_config**

```sql
CREATE TABLE `doupi_cms_config` (
  `config_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '参数ID',
  `config_key` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '参数键名',
  `config_value` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '参数键值(JSON或字符串)',
  `config_name` VARCHAR(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '参数中文名称',
  `remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注说明',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT 'admin' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`config_id`),
  UNIQUE `uk_config_key` (
    `config_key`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网门户参数表';
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

**recruit_notification**

```sql
CREATE TABLE recruit_notification (
  notification_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '访客站内通知ID',
  appointment_id BIGINT NOT NULL COMMENT '业务预约引用',
  recipient_identity_id BIGINT NOT NULL COMMENT '定向访客身份',
  title VARCHAR(128) NOT NULL COMMENT '不含隐私的提示标题',
  content VARCHAR(500) NOT NULL COMMENT '最小站内提示，不含核销码和手机号',
  is_read TINYINT NOT NULL DEFAULT 0 COMMENT '仅站内阅读状态，非外部送达',
  read_at DATETIME(3) NULL COMMENT 'UTC首次阅读时间',
  provider_status VARCHAR(24) NOT NULL DEFAULT 'NOT_REQUESTED' COMMENT '外部消息状态，本示例未请求供应商发送',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC生成时间',
  PRIMARY KEY (notification_id),
  INDEX idx_recruit_notice_recipient (recipient_identity_id, notification_id)   COMMENT '本人通知倒序查询',
  INDEX idx_recruit_notice_appointment (appointment_id, notification_id)   COMMENT '预约通知审计',
  CONSTRAINT fk_recruit_notice_appointment FOREIGN KEY (appointment_id) REFERENCES doupi_recruit_appointment (
    appointment_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_recruit_notice_identity FOREIGN KEY (recipient_identity_id) REFERENCES sys_external_identity (
    identity_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_recruit_notice_read CHECK (is_read IN (0, 1)),
  CONSTRAINT ck_recruit_notice_provider CHECK (provider_status IN ('NOT_REQUESTED', 'PENDING', 'ACCEPTED', 'FAILED', 'UNKNOWN'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='招生访客站内通知；未接真实微信发送不记录已发送';
```

**recruit_subscription_consent**

```sql
CREATE TABLE recruit_subscription_consent (
  consent_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '微信订阅选择回执ID',
  identity_id BIGINT NOT NULL COMMENT '真实微信外部身份',
  template_id VARCHAR(128) NOT NULL COMMENT '服务端允许的微信模板ID',
  decision VARCHAR(8) NOT NULL COMMENT 'accept、reject、ban客户端本次选择',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC接收时间',
  PRIMARY KEY (consent_id),
  INDEX idx_recruit_consent_identity (identity_id, template_id, consent_id)   COMMENT '本人模板选择历史，不视为无限发送授权',
  CONSTRAINT fk_recruit_consent_identity FOREIGN KEY (identity_id) REFERENCES sys_external_identity (
    identity_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_recruit_consent_decision CHECK (decision IN ('accept', 'reject', 'ban'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='只保存本次订阅弹窗结果，授权不等于发送或送达';
```

## 5. 代码实现骨架

下列完整分层代码属于Java17／Spring Boot4.0.3／MyBatis4.0.1文档内骨架。公共Db、Inputs、Json、Actors、ApiReply等按[公共契约](../00-shared/公共契约.md)运行；客户端使用同一接口与状态，不维护第二份业务真相。代码明确处理外部渠道未接入和业务失败。



**backend/src/main/java/com/doupi/planref/recruit/VisitorMessageController.java**

```java
package com.doupi.planref.recruit;

import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class VisitorMessageController {
    private final VisitorMessageService service;
    public VisitorMessageController(VisitorMessageService service) {this.service=service;}
    @GetMapping("/public/subscription-capabilities") public ResponseEntity<Map<String,Object>> capabilities(){return ApiReply.of(service.capabilities(),200);}
    @GetMapping("/visitor/notifications") public ResponseEntity<Map<String,Object>> messages(){return ApiReply.of(service.messages(),200);}
    @PostMapping("/visitor/notifications/{id}/read") public ResponseEntity<Map<String,Object>> read(@PathVariable long id,@RequestHeader("Idempotency-Key") String key){return ApiReply.of(service.read(id,key),200);}
    @PostMapping("/visitor/subscription-consents") public ResponseEntity<Map<String,Object>> consent(@RequestBody Map<String,Object> b,@RequestHeader("Idempotency-Key") String key){return ApiReply.of(service.consent(b,key),201);}
}
```

**backend/src/main/java/com/doupi/planref/recruit/VisitorMessageService.java**

```java
package com.doupi.planref.recruit;

import com.doupi.planref.*;
import com.doupi.planref.auth.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class VisitorMessageService {
    private final Db db;private final AuthRepository auth;private final ExternalCommands commands;private final Set<String> templates;
    public VisitorMessageService(Db db,AuthRepository auth,ExternalCommands commands,@Value("${plan.wechat.subscription-template-ids:}") String templateIds) {
        this.db=db;this.auth=auth;this.commands=commands;
        Set<String> ids=new HashSet<>();for(String id:templateIds.split(",")) if(!id.strip().isBlank()) ids.add(id.strip());templates=Set.copyOf(ids);
    }
    private long identity() {long id=Actors.current().identityId();if(id<=0) throw Problem.forbidden("Visitor identity required");return id;}
    public Map<String,Object> capabilities() {return P.of("templateIds",templates,"providerSendingEnabled",false,"inAppMessagesEnabled",true);}
    public Map<String,Object> messages() {
        List<Map<String,Object>> items=db.list("SELECT notification_id,appointment_id,title,content,is_read,provider_status,created_at,read_at FROM recruit_notification WHERE recipient_identity_id=#{p.identity} ORDER BY notification_id DESC LIMIT 100",P.of("identity",identity()));
        for(Map<String,Object> row:items) {row.put("notification_id",String.valueOf(row.get("notification_id")));row.put("appointment_id",String.valueOf(row.get("appointment_id")));}
        return P.of("items",items);
    }
    public Map<String,Object> read(long id,String key) {
        long identity=identity();
        return commands.run("IDENTITY:"+identity,"RECRUIT_MESSAGE_READ",key,P.of("notificationId",id),200,()->{
            db.required("SELECT notification_id FROM recruit_notification WHERE notification_id=#{p.id} AND recipient_identity_id=#{p.identity} FOR UPDATE",P.of("id",id,"identity",identity));
            db.write("UPDATE recruit_notification SET is_read=1,read_at=COALESCE(read_at,UTC_TIMESTAMP(3)) WHERE notification_id=#{p.id}",P.of("id",id));
            return P.of("notificationId",Long.toString(id),"isRead",true);
        });
    }
    public Map<String,Object> consent(Map<String,Object> b,String key) {
        long identity=identity();String template=Inputs.text(b,"templateId",1,128),decision=Inputs.text(b,"decision",3,6);
        if(!templates.contains(template)) throw new Problem(503,"SUBSCRIPTION_TEMPLATE_UNAVAILABLE","School subscription template is not configured");
        if(!Set.of("accept","reject","ban").contains(decision)) throw Problem.bad("Invalid subscription choice");
        Map<String,Object> external=auth.identity(identity,false);
        if(!"WECHAT".equals(external.get("provider"))) throw Problem.forbidden("WeChat identity required");
        return commands.run("IDENTITY:"+identity,"RECRUIT_SUBSCRIPTION_CONSENT",key,b,201,()->{
            long id=db.insert("INSERT INTO recruit_subscription_consent(identity_id,template_id,decision,created_at) VALUES(#{p.identity},#{p.template},#{p.decision},UTC_TIMESTAMP(3))",P.of("identity",identity,"template",template,"decision",decision));
            return P.of("consentId",Long.toString(id),"decision",decision,"deliveryStatus","NOT_REQUESTED","providerSendingEnabled",false);
        });
    }
}
```

**backend/src/main/java/com/doupi/planref/auth/ChannelRateLimitFilter.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/** Shared Redis fixed-window limits for public identity and proof endpoints. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE+10)
public class ChannelRateLimitFilter extends OncePerRequestFilter {
 private final StringRedisTemplate redis;
 private final DefaultRedisScript<Long> script=new DefaultRedisScript<>("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n",Long.class);
 public ChannelRateLimitFilter(StringRedisTemplate redis){this.redis=redis;}
 @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
  String path=req.getRequestURI();int limit=0;
  if("POST".equals(req.getMethod())) {
   if(Set.of("/api/v1/auth/login","/api/v1/auth/wechat").contains(path)) limit=20;
   else if("/api/v1/auth/visitor".equals(path)) limit=10;
   else if("/api/v1/public/appointments".equals(path)) limit=5;
   else if("/api/v1/public/appointments/query".equals(path)||path.matches("/api/v1/public/appointments/[0-9]+/cancel")) {limit=10;path="/api/v1/public/appointments/proof";}
  }
  if(limit==0){chain.doFilter(req,res);return;}
  try {
   String key="plan:channel-limit:"+ExternalCommands.sha256(req.getRemoteAddr()+":"+path)+":"+(System.currentTimeMillis()/60000);
   Long count=redis.execute(script,List.of(key),"65");
   if(count==null) {failure(res,503,"RATE_LIMIT_UNAVAILABLE","访问校验暂不可用");return;}
   if(count>limit){res.setHeader("Retry-After","60");failure(res,429,"RATE_LIMITED","操作过于频繁，请稍后重试");return;}
  } catch(RedisConnectionFailureException e){failure(res,503,"RATE_LIMIT_UNAVAILABLE","访问校验暂不可用");return;}
  chain.doFilter(req,res);
 }
 private void failure(HttpServletResponse res,int status,String code,String message)throws IOException {
  String trace=UUID.randomUUID().toString();res.setHeader("X-Trace-Id",trace);res.setStatus(status);res.setContentType("application/json;charset=UTF-8");
  res.getWriter().write(Json.write(P.of("code",status,"errorCode",code,"msg",message,"traceId",trace,"replayed",false,"data",Map.of())));
 }
}
```

**miniapp/lib/http.js**

```javascript
function request(path, method = 'GET', body, key) {
  const token = wx.getStorageSync('planref.token');
  return new Promise((resolve, reject) => wx.request({
    url: getApp().globalData.apiBase + path, method, data: body,
    timeout: 12000, header: { 'Content-Type': 'application/json', ...(token && !['/auth/wechat', '/auth/visitor', '/auth/login'].includes(path) ? { Authorization: 'Bearer ' + token } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
    success(res) {
      if (res.statusCode >= 200 && res.statusCode < 300) return resolve(res.data.data);
      if (res.statusCode === 401) wx.removeStorageSync('planref.token');
      const error = new Error(res.data.msg || '请求失败'); error.status = res.statusCode; error.traceId = res.data.traceId; reject(error);
    }, fail() { reject(new Error('网络未确认结果，请使用原操作重试')); }
  }));
}
function randomSecret() {
  return new Promise((resolve, reject) => {
    if (!wx.getRandomValues) return reject(new Error('当前微信版本不支持安全凭证，请升级微信'));
    wx.getRandomValues({ length: 32, success: res => resolve(wx.arrayBufferToBase64(res.randomValues).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')), fail: () => reject(new Error('安全随机数生成失败')) });
  });
}
async function login() {
  const result = await new Promise((resolve, reject) => wx.login({ success: resolve, fail: reject }));
  if (!result.code) throw new Error('微信未返回登录凭证');
  const session = await request('/auth/wechat', 'POST', { code: result.code });
  wx.setStorageSync('planref.token', session.token); return request('/auth/me');
}
async function command(path, body, storageKey) {
  let pending = wx.getStorageSync(storageKey);
  if (!pending) { pending = { key: await randomSecret(), body }; wx.setStorageSync(storageKey, pending); }
  try { const result = await request(path, 'POST', pending.body, pending.key); wx.removeStorageSync(storageKey); return result; }
  catch (error) { if (error.status >= 400 && error.status < 500 && ![401, 403].includes(error.status)) wx.removeStorageSync(storageKey); throw error; }
}
module.exports = { request, randomSecret, login, command };
```

**miniapp/pages/home/index.js**

```javascript
const api = require('../../lib/http');
Page({
  data: { form: { parentName: '', parentPhone: '', studentName: '', studentGrade: '', campusId: '', visitDate: '', timeSlot: '', remark: '' }, campuses: [], rules: null, items: [], staffItems: [], detail: null, me: null, error: '', busy: false, pending: false, bindingName: '', bindingReason: '', checkInCode: '', staffRemark: '', privacy: '', privacyReady: false, articles: [], article: null, messages: [] },
  onLoad() { this.loadPublic(); if (wx.getStorageSync('planref.token')) this.refresh(); },
  async loadPublic() { try { const [campuses, rules, site, articles] = await Promise.all([api.request('/public/campuses'), api.request('/public/appointment-rules'), api.request('/public/site'), api.request('/public/articles')]); this.setData({ campuses: campuses.items, rules, articles: articles.items, privacyReady: !!site.config.privacy_policy, privacy: site.config.privacy_policy || '请向学校获取正式隐私说明后再提交个人信息。' }); } catch (e) { this.fail(e); } },
  async article(e) { try { this.setData({ article: await api.request('/public/articles/' + e.currentTarget.dataset.id) }); } catch (error) { this.fail(error); } },
  fail(e) { this.setData({ error: e.message + (e.traceId ? '（追踪号 ' + e.traceId + '）' : '') }); },
  input(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }); },
  text(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  async signIn() { try { this.setData({ me: await api.login(), error: '' }); await this.refresh(); } catch (e) { this.fail(e); } },
  async refresh() { try { const me = await api.request('/auth/me'); const mine = await api.request('/visitor/appointments'); this.setData({ messages: (await api.request('/visitor/notifications')).items, me, items: mine.items, pending: !!wx.getStorageSync('planref.create') }); if (me.kind === 'STAFF' && (me.permissions.includes('*') || me.permissions.includes('recruit:appointment:query'))) this.setData({ staffItems: (await api.request('/staff/appointments')).items }); } catch (e) { this.fail(e); } },
  async create() {
    this.setData({ busy: true, error: '' });
    try {
      if (!this.data.me) throw new Error('请先微信登录');
      if (!this.data.privacyReady) throw new Error('学校尚未发布正式隐私说明，请先联系学校');
      const confirmation = await new Promise(resolve => wx.showModal({ title: '确认提交访校资料', content: '我已阅读页面隐私说明，同意学校为访校接待使用本次填写的联系人和学生信息。', success: resolve }));
      if (!confirmation.confirm) return;
      let pending = wx.getStorageSync('planref.create');
      const body = pending ? pending.body : { ...this.data.form, querySecret: await api.randomSecret() };
      const result = await api.command('/public/appointments', body, 'planref.create');
      const proofs = wx.getStorageSync('planref.proofs') || {}; proofs[result.appointmentId] = { appointmentNo: result.appointmentNo, querySecret: body.querySecret }; wx.setStorageSync('planref.proofs', proofs);
      this.setData({ detail: result, pending: false }); await this.refresh();
    } catch (e) { this.fail(e); } finally { this.setData({ busy: false, pending: !!wx.getStorageSync('planref.create') }); }
  },
  async detail(e) { try { this.setData({ detail: await api.request('/visitor/appointments/' + e.currentTarget.dataset.id), error: '' }); } catch (e) { this.fail(e); } },
  async cancel() { try { const d = this.data.detail, proof = (wx.getStorageSync('planref.proofs') || {})[d.appointmentId]; if (!proof) throw new Error('本机无查询凭证，请联系学校核实后取消'); this.setData({ detail: await api.command('/public/appointments/' + d.appointmentId + '/cancel', { ...proof, expectedVersion: d.version, reason: '家长取消预约' }, 'planref.cancel.' + d.appointmentId) }); await this.refresh(); } catch (e) { this.fail(e); } },
  async applyBinding() { try { const r = await api.command('/auth/employee-bindings', { username: this.data.bindingName, reason: this.data.bindingReason }, 'planref.binding'); this.setData({ error: '学校核实中：' + r.status }); } catch (e) { this.fail(e); } },
  async staffDetail(e) { try { this.setData({ detail: null, staffDetail: await api.request('/staff/appointments/' + e.currentTarget.dataset.id) }); } catch (e) { this.fail(e); } },
  async staffAction(e) { const d = this.data.staffDetail, action = e.currentTarget.dataset.action; try { const body = { expectedVersion: d.version, ...(action === 'verify' ? { checkInCode: this.data.checkInCode } : { remark: this.data.staffRemark }), ...(action === 'confirm' ? { decision: 'APPROVE', assignedTeacherUserId: this.data.me.userId } : {}) }; this.setData({ staffDetail: await api.command('/staff/appointments/' + d.appointmentId + '/' + action, body, 'planref.staff.' + action + '.' + d.appointmentId) }); await this.refresh(); } catch (e) { this.fail(e); } },
  async readMessage(e) { try { await api.command('/visitor/notifications/' + e.currentTarget.dataset.id + '/read', {}, 'planref.read.' + e.currentTarget.dataset.id); await this.refresh(); } catch (error) { this.fail(error); } },
  async subscribe() { try { const capabilities = await api.request('/public/subscription-capabilities'); if (!capabilities.templateIds.length) throw new Error('学校尚未配置订阅模板，预约结果可在本人预约查看'); const templateId = capabilities.templateIds[0]; const result = await new Promise((resolve, reject) => wx.requestSubscribeMessage({ tmplIds: [templateId], success: resolve, fail: reject })); if (['accept', 'reject', 'ban'].includes(result[templateId])) { await api.command('/visitor/subscription-consents', { templateId, decision: result[templateId] }, 'planref.consent'); this.setData({ error: '已记录本次选择；当前未启用外部发送，请查看站内预约结果。' }); } } catch (e) { this.fail(e); } },
  async logout() { try { if (wx.getStorageSync('planref.create')) throw new Error('预约结果仍未确认，请先原键重试或联系学校核实'); await api.request('/auth/logout', 'POST'); wx.removeStorageSync('planref.token'); wx.removeStorageSync('planref.proofs'); this.setData({ me: null, items: [], staffItems: [], detail: null, staffDetail: null }); } catch (e) { this.fail(e); } }
});
```

**miniapp/pages/home/index.wxml**

```xml
<view class="page">
  <view class="title">访校预约</view><text selectable>{{privacy}}</text>
  <view wx:if="{{error}}" role="alert">{{error}}</view>
  <button bindtap="signIn">微信登录／核实后重新登录</button><button wx:if="{{me}}" bindtap="logout">退出</button>
  <view wx:if="{{me}}">身份：{{me.kind}}；员工权限由学校核实</view>
  <view>正式资讯</view><view wx:for="{{articles}}" wx:key="articleId" data-id="{{item.articleId}}" bindtap="article">{{item.title}} {{item.publishedAt}}</view><text wx:if="{{article}}" selectable>{{article.title}}：{{article.content}}</text>
  <view>公开校区</view><view wx:for="{{campuses}}" wx:key="campus_id">{{item.campus_name}}：{{item.address}}（校区ID {{item.campus_id}}）</view>
  <view wx:if="{{rules}}">可预约未来{{rules.openDaysAhead}}天；待确认不等于已安排。<text wx:for="{{rules.timeSlots}}" wx:key="name">时段：{{item.name}} </text></view>
  <input disabled="{{pending}}" placeholder="联系人" data-field="parentName" bindinput="input"/><input disabled="{{pending}}" placeholder="联系电话" type="number" data-field="parentPhone" bindinput="input"/>
  <input disabled="{{pending}}" placeholder="学生姓名" data-field="studentName" bindinput="input"/><input disabled="{{pending}}" placeholder="意向年级" data-field="studentGrade" bindinput="input"/>
  <input disabled="{{pending}}" placeholder="以上公开校区ID" data-field="campusId" bindinput="input"/><input disabled="{{pending}}" placeholder="日期YYYY-MM-DD" data-field="visitDate" bindinput="input"/>
  <input disabled="{{pending}}" placeholder="以上开放时段名称" data-field="timeSlot" bindinput="input"/><input disabled="{{pending}}" placeholder="咨询需求（可选）" data-field="remark" bindinput="input"/>
  <button loading="{{busy}}" disabled="{{busy}}" bindtap="create">{{pending ? '原键重试结果未明的预约' : '确认隐私说明并提交预约'}}</button>
  <button bindtap="refresh">刷新本人预约</button><view wx:for="{{items}}" wx:key="appointmentId" data-id="{{item.appointmentId}}" bindtap="detail">{{item.appointmentNo}} {{item.status}} {{item.visitDate}} {{item.timeSlot}}</view>
  <view wx:if="{{detail}}"><text selectable>预约{{detail.appointmentNo}}：{{detail.status}}；接待人 {{detail.assignedTeacherName || '待分配'}}；到校时间 {{detail.verifiedAt || '未到校'}}；有效到校凭证 {{detail.checkInCode || '尚无有效凭证'}}</text><button wx:if="{{detail.status === 'PENDING' || detail.status === 'APPROVED'}}" bindtap="cancel">取消该预约</button></view>
  <view wx:for="{{messages}}" wx:key="notification_id" data-id="{{item.notification_id}}" bindtap="readMessage">{{item.title}}：{{item.content}}（{{item.is_read ? '已读' : '未读'}}）</view>
  <button bindtap="subscribe">选择订阅提醒</button>
  <view>员工绑定申请（须由另一位学校核实人审核）</view><input placeholder="学校账号" data-field="bindingName" bindinput="text"/><input placeholder="核实依据说明" data-field="bindingReason" bindinput="text"/><button bindtap="applyBinding">申请核实</button>
  <view wx:if="{{me.kind === 'STAFF'}}"><view>授权接待事项</view><view wx:for="{{staffItems}}" wx:key="appointmentId" data-id="{{item.appointmentId}}" bindtap="staffDetail">{{item.appointmentNo}} {{item.status}}</view>
  <view wx:if="{{staffDetail}}">{{staffDetail.appointmentNo}} {{staffDetail.parentName}} {{staffDetail.parentPhone}}<input placeholder="学校处理备注" data-field="staffRemark" bindinput="text"/><button wx:if="{{staffDetail.status === 'PENDING'}}" data-action="confirm" bindtap="staffAction">确认由本人接待</button><input placeholder="现场家长出示的凭证" data-field="checkInCode" bindinput="text"/><button data-action="verify" bindtap="staffAction">核验到校</button><button data-action="remark" bindtap="staffAction">保存接待备注</button></view></view>
</view>
```



## 6. 边界与异常场景处理

- template未配置：能力返回空模板；强行提交未允许模板503；非微信身份403。客户端不使用空templateId或假openid调用微信。
- decision非法422；accept只是本次选择，不作永久授权。providerSendingEnabled始终false，不展示“微信已送达”；站内消息provider_status保持NOT_REQUESTED。
- 他人通知404；重复阅读保留首次read_at。阅读不替代预约确认、核销或办公任务完成。
- 隐私说明缺失禁止提交；token、proof不入URL/日志/分享卡片；退出清理本端会话和查询凭证。已发生预约事实留存由学校记录规则与人工核实处理，不随本地清理删除。
- 真机记录：微信基础库与系统、AppID环境、合法域名、同意/拒绝/ban、登录code过期、断网重试、取消与核销竞争、账号停用；截图脱敏，未实际执行的场景标为待验而非通过。
