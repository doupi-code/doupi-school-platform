# MINI-02 真实微信登录与学校核实员工绑定

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#mini-02)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**优先级与工期：P0，4个工作日。** 以一名单人Java开发者结合AI完成后端、原生小程序或React页面、联调及自测估算，不假设另有前端或QA人员；工期含约半天人工场景核对，外部微信审核等待不算有效开发日。App完整交付仍为P1。

微信登录与学校员工核实分开。服务端用code换openid；未核实只签发VISITOR。绑定申请定位学校账号，另一位有授权核实人核对后生效；无短信、无手机号自动匹配、无模拟openid。密码登录是管理后台已有学校核实入口，员工小程序仍须外部身份VERIFIED。

文件路径与实施任务：

- [ ] `backend/src/main/java/com/doupi/planref/auth/{AuthController,AuthService,AuthRepository,ExternalCommands}.java`：真实官方交换、绑定事务、独立幂等。
- [ ] `doupi-miniApp/pages/login/`、员工绑定页：wx.login、绑定进度、重新登录；`utils/http.js`接入统一会话。
- [ ] `miniapp/pages/home/index.js`：signIn、applyBinding及身份展示；学校核实界面复用管理后台授权入口。

依赖：MINI-01 HTTP；sys_user/sys_role授权与部门数据范围；plan.wechat.app-id、plan.wechat.secret环境配置；学校核实人账号及核实依据。官方接口发布前复核[code2Session](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html)，本次工具无法抓取该官方页，不宣称已验证最新微信审核规则。

验收：缺配置503且无身份/会话写入；无效code401；访客填写任何手机号/角色都无员工权限；同键同正文重放；同键跨绑定目标409；自核实403；范围外核实403；通过后重新登录得到实时岗位范围，停用和撤销立即阻止旧员工会话。

## 2. 接口设计清单

接口前缀均为`/api/v1`。JSON统一`{code:int,msg:string,traceId:string,replayed:boolean,data:object}`；BIGINT标识使用十进制字符串，版本为非负整数。写操作的`Idempotency-Key:string(8..64)`必填，只重试原键及原正文。Authorization为`Bearer <服务端JWT>`；客户端角色、openid、userId、手机号不作为授权来源。除明确匿名接口外需要有效会话，返回401/403不降级为匿名员工。

| 接口名称 | 请求方式 | 路径 | 请求参数(字段名/类型/必填/含义) | 返回参数(字段名/类型/含义) | 权限要求 |
|---|---|---|---|---|---|
| 微信身份登录 | POST | `/api/v1/auth/wechat` | body.code:string(1..128)／是／wx.login一次性code；不接受openid、phone、role授权 | token:string（服务端签发会话，不含微信secret/session_key）；kind:string（STAFF或VISITOR）；userId:string（员工ID，访客为0）；identityId:string（经微信验证的外部身份ID） | 匿名登录，限流 |
| 申请员工身份绑定 | POST | `/api/v1/auth/employee-bindings` | Authorization:string／是；Idempotency-Key:string(8..64)／是；body.username:string(1..30)／是／学校账号；reason:string(5..300)／是／核实依据 | bindingRequestId:string（学校核实申请ID）；status:string（PENDING待核实）；version:int（初始为0） | 已认证WECHAT外部身份，未VERIFIED |
| 学校核实员工绑定 | POST | `/api/v1/staff/employee-bindings/{id}/review` | id:long路径／是／绑定申请；Authorization:string／是／Bearer会话；Idempotency-Key:string(8..64)／是／本次命令键；expectedVersion:int>=0／是；decision:`APPROVE或REJECT`／是；remark:string(1..300)／是 | bindingRequestId:string（核实申请ID）；status:string（VERIFIED通过/REJECTED拒绝）；version:int（本次处理后版本）；loginAgainRequired:boolean（true表示需重新登录才可取得新身份） | STAFF且identity:binding:approve；部门范围内；不得核实自己 |
| 本人会话信息 | GET | `/api/v1/auth/me` | Authorization:string／是 | userId:string（员工ID，访客为0）；identityId:string（外部身份ID，纯密码员工可为0）；deptId:string（学校部门ID，访客为0）；kind:string（STAFF员工/VISITOR访客）；permissions:string[]（实时动作权限）；scopeDeptIds:string[]（实时部门数据范围）；bindingStatus:string或null（外部身份VISITOR/PENDING/VERIFIED/REVOKED，纯密码会话为空） | 已认证本人 |



## 3. 数据流转细节

| 接口 | 请求／服务端来源 → 明确数据库字段 → 返回 | 事务、并发与缓存 |
|---|---|---|
| `/auth/wechat` | code+服务端appId/secret→HTTPS官方jscode2session→openid；provider=`WECHAT`/app_id/subject_id→sys_external_identity身份唯一键；user_id/link_status→有效sys_user及授权或VISITOR→token/kind | 外部交换成功才写库；超时503，无伪身份。外部身份UPSERT依唯一键并发收敛；微信session信息不持久化不日志输出。Redis签会话，角色每次重载 |
| `/auth/employee-bindings` | username→sys_user.user_name/user_id/status；reason→auth_binding_request.reason；服务端identity_id/staff_user_id/status=PENDING/version=0/created_at；sys_external_identity.link_status=PENDING→申请ID/状态 | channel_idempotency以IDENTITY、固定BINDING_APPLY、key/hash占键；锁identity；单pending唯一约束；申请、状态、真实响应同事务，无成功前占位提交 |
| `/staff/employee-bindings/{id}/review` | id和完整body入hash；expectedVersion→binding.version；decision/remark→status/review_remark/reviewed_by/reviewed_at/version+1；APPROVE写identity.user_id/link_status/verified_by/verified_at，REJECT恢复VISITOR→version/loginAgainRequired | 固定BINDING_APPROVE不拼ID后缀；锁申请及外部身份；检查真实核实人、目标staff有效与部门范围；事务失败全回滚。现有VISITOR会话不自动升级 |
| `/auth/me` | 当前actor.identity_id→identity.link_status；员工角色与部门范围→返回bindingStatus/permissions/scopeDeptIds | 只读、不缓存客户端选择的角色 |

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

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

**sys_dept**

```sql
CREATE TABLE `sys_dept` (
  `dept_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '部门id',
  `parent_id` BIGINT DEFAULT '0' COMMENT '父部门id',
  `ancestors` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '祖级列表',
  `dept_name` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '部门名称',
  `order_num` INT DEFAULT '0' COMMENT '显示顺序',
  `leader` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '负责人',
  `phone` VARCHAR(11) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '联系电话',
  `email` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '邮箱',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '部门状态（0正常 1停用）',
  `del_flag` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志（0代表存在 2代表删除）',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  PRIMARY KEY (`dept_id`),
  `leader_user_id` BIGINT NULL COMMENT '新增，负责人真实身份',
  INDEX `idx_dept_parent` (`parent_id`, `status`, `del_flag`),
  INDEX `idx_dept_leader` (`leader_user_id`),
  CONSTRAINT `fk_ref_001` FOREIGN KEY (`leader_user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='部门表';
```

**sys_role**

```sql
CREATE TABLE `sys_role` (
  `role_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '角色ID',
  `role_name` VARCHAR(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色名称',
  `role_key` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色权限字符串',
  `role_sort` INT NOT NULL COMMENT '显示顺序',
  `data_scope` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '1' COMMENT '数据范围（1：全部数据权限 2：自定数据权限 3：本部门数据权限 4：本部门及以下数据权限）',
  `menu_check_strictly` TINYINT(1) DEFAULT '1' COMMENT '菜单树选择项是否关联显示',
  `dept_check_strictly` TINYINT(1) DEFAULT '1' COMMENT '部门树选择项是否关联显示',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色状态（0正常 1停用）',
  `del_flag` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志（0代表存在 2代表删除）',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`role_id`),
  UNIQUE `uk_role_key` (
    `role_key`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='角色信息表';
```

**sys_user_role**

```sql
CREATE TABLE `sys_user_role` (
  `user_id` BIGINT NOT NULL COMMENT '用户ID',
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  PRIMARY KEY (`user_id`, `role_id`),
  INDEX `idx_user_role_role` (`role_id`, `user_id`),
  CONSTRAINT `fk_ref_092` FOREIGN KEY (`user_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_093` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (
    `role_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='用户和角色关联表';
```

**sys_menu**

```sql
CREATE TABLE `sys_menu` (
  `menu_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '菜单ID',
  `menu_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '菜单名称',
  `parent_id` BIGINT DEFAULT '0' COMMENT '父菜单ID',
  `order_num` INT DEFAULT '0' COMMENT '显示顺序',
  `path` VARCHAR(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '路由地址',
  `component` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '组件路径',
  `query` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '路由参数',
  `route_name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '路由名称',
  `is_frame` INT DEFAULT '1' COMMENT '是否为外链（0是 1否）',
  `is_cache` INT DEFAULT '0' COMMENT '是否缓存（0缓存 1不缓存）',
  `menu_type` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '菜单类型（M目录 C菜单 F按钮）',
  `visible` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '菜单状态（0显示 1隐藏）',
  `status` CHAR(1) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '菜单状态（0正常 1停用）',
  `perms` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '权限标识',
  `icon` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '#' COMMENT '菜单图标',
  `create_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT NULL COMMENT '创建时间',
  `update_by` VARCHAR(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL COMMENT '更新时间',
  `remark` VARCHAR(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注',
  PRIMARY KEY (`menu_id`),
  INDEX `idx_menu_parent` (`parent_id`, `status`),
  INDEX `idx_menu_perms` (`perms`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='菜单权限表';
```

**sys_role_menu**

```sql
CREATE TABLE `sys_role_menu` (
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `menu_id` BIGINT NOT NULL COMMENT '菜单ID',
  PRIMARY KEY (`role_id`, `menu_id`),
  INDEX `idx_role_menu_menu` (`menu_id`, `role_id`),
  CONSTRAINT `fk_ref_094` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (
    `role_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_095` FOREIGN KEY (`menu_id`) REFERENCES `sys_menu` (
    `menu_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='角色和菜单关联表';
```

**sys_role_dept**

```sql
CREATE TABLE `sys_role_dept` (
  `role_id` BIGINT NOT NULL COMMENT '角色ID',
  `dept_id` BIGINT NOT NULL COMMENT '部门ID',
  PRIMARY KEY (`role_id`, `dept_id`),
  INDEX `idx_dept_role` (`dept_id`, `role_id`),
  CONSTRAINT `fk_ref_088` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept` (
    `dept_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_096` FOREIGN KEY (`role_id`) REFERENCES `sys_role` (
    `role_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='角色和部门关联表';
```

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

**auth_binding_request**

```sql
CREATE TABLE auth_binding_request (
  binding_request_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '员工身份核实申请ID',
  identity_id BIGINT NOT NULL COMMENT '已微信认证的外部身份',
  staff_user_id BIGINT NOT NULL COMMENT '待核实学校员工账号',
  status VARCHAR(16) NOT NULL COMMENT 'PENDING、VERIFIED、REJECTED',
  reason VARCHAR(300) NOT NULL COMMENT '申请者核实依据说明',
  reviewed_by BIGINT NULL COMMENT '学校核实人，不能为目标本人',
  review_remark VARCHAR(300) NULL COMMENT '核实依据与结论，不保存密码证件原文',
  reviewed_at DATETIME(3) NULL COMMENT 'UTC核实时间',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC申请时间',
  pending_identity_id BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'PENDING' THEN identity_id ELSE NULL END) STORED COMMENT '仅待核实申请占唯一槽',
  PRIMARY KEY (binding_request_id),
  UNIQUE uk_binding_pending (
    pending_identity_id
  ) COMMENT '一个外部身份至多一份待核实申请',
  INDEX idx_binding_identity (identity_id, created_at, binding_request_id)   COMMENT '本人申请历史',
  INDEX idx_binding_staff (staff_user_id, status, binding_request_id)   COMMENT '学校核实范围筛选',
  INDEX idx_binding_reviewer (reviewed_by)   COMMENT '核实审计',
  CONSTRAINT fk_binding_identity FOREIGN KEY (identity_id) REFERENCES sys_external_identity (
    identity_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_binding_staff FOREIGN KEY (staff_user_id) REFERENCES sys_user (
    user_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_binding_reviewer FOREIGN KEY (reviewed_by) REFERENCES sys_user (
    user_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_binding_status CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  CONSTRAINT ck_binding_version CHECK (version >= 0),
  CONSTRAINT ck_binding_separation CHECK (reviewed_by IS NULL OR reviewed_by <> staff_user_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='学校核实微信员工绑定，不按手机号自动授员工权限';
```

## 5. 代码实现骨架

下面是文档内的完整分层代码，可在Java17、Spring Boot4.0.3、MyBatis4.0.1下编译。Db/Inputs/Json/Actor/SessionTokens等公共依赖见[公共契约](../00-shared/公共契约.md)与文档内公共实现；所有SQL值使用参数绑定。客户端代码为同一契约的运行示例，正式接入时按第1节路径迁移，不宣称已修改生产工程。



**backend/src/main/java/com/doupi/planref/auth/AuthController.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    private final AuthService service;
    public AuthController(AuthService service) {this.service=service;}
    @PostMapping("/auth/login") public ResponseEntity<Map<String,Object>> login(@RequestBody Map<String,Object> body) {return ApiReply.of(service.password(body),200);}
    @PostMapping("/auth/visitor") public ResponseEntity<Map<String,Object>> visitor() {return ApiReply.of(service.visitor(),201);}
    @PostMapping("/auth/wechat") public ResponseEntity<Map<String,Object>> wechat(@RequestBody Map<String,Object> body) {return ApiReply.of(service.wechat(body),200);}
    @GetMapping("/auth/me") public ResponseEntity<Map<String,Object>> me() {return ApiReply.of(service.me(),200);}
    @PostMapping("/auth/logout") public ResponseEntity<Map<String,Object>> logout(@RequestHeader("Authorization") String token) {return ApiReply.of(service.logout(token),200);}
    @PostMapping("/auth/employee-bindings") public ResponseEntity<Map<String,Object>> binding(@RequestBody Map<String,Object> body,@RequestHeader("Idempotency-Key") String key) {return ApiReply.of(service.applyBinding(body,key),201);}
    @PostMapping("/staff/employee-bindings/{id}/review") public ResponseEntity<Map<String,Object>> approve(@PathVariable long id,@RequestBody Map<String,Object> body,@RequestHeader("Idempotency-Key") String key) {return ApiReply.of(service.approveBinding(id,body,key),200);}
}
```

**backend/src/main/java/com/doupi/planref/auth/AuthService.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final Db db; private final AuthRepository repo; private final SessionTokens sessions; private final ExternalCommands commands;
    private final String appId,secret;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    public AuthService(Db db,AuthRepository repo,SessionTokens sessions,ExternalCommands commands,
        @Value("${plan.wechat.app-id:}") String appId,@Value("${plan.wechat.secret:}") String secret) {
        this.db=db;this.repo=repo;this.sessions=sessions;this.commands=commands;this.appId=appId;this.secret=secret;
    }
    public Map<String,Object> password(Map<String,Object> b) {
        String name=Inputs.text(b,"username",1,30),password=Inputs.text(b,"password",8,128);
        Map<String,Object> u=repo.username(name);
        boolean matches=false;
        if(!u.isEmpty()) try { matches=new BCryptPasswordEncoder().matches(password,String.valueOf(u.get("password"))); } catch(IllegalArgumentException ignored) { matches=false; }
        if(!matches) throw new Problem(401,"LOGIN_FAILED","Invalid account or password");
        return issued(repo.staff(Inputs.number(u.get("user_id")),0));
    }
    @Transactional
    public Map<String,Object> visitor() {
        long id=repo.external("WEB","PUBLIC_WEB",UUID.randomUUID().toString());
        return issued(visitorActor(id));
    }
    @Transactional
    public Map<String,Object> wechat(Map<String,Object> b) {
        String code=Inputs.text(b,"code",1,128);
        if(appId.isBlank()||secret.isBlank()) throw new Problem(503,"WX_NOT_CONFIGURED","WeChat identity exchange is not configured");
        Map<String,Object> wx;
        try {
            String url="https://api.weixin.qq.com/sns/jscode2session?appid="+enc(appId)+"&secret="+enc(secret)+"&js_code="+enc(code)+"&grant_type=authorization_code";
            HttpRequest req=HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(8)).GET().build();
            HttpResponse<String> res=http.send(req,HttpResponse.BodyHandlers.ofString());
            if(res.statusCode()!=200) throw new Problem(503,"WX_UNAVAILABLE","WeChat exchange unavailable");
            wx=Json.readMap(res.body());
        } catch(InterruptedException ex) { Thread.currentThread().interrupt();throw new Problem(503,"WX_UNAVAILABLE","WeChat exchange interrupted"); }
          catch(java.io.IOException ex) { throw new Problem(503,"WX_UNAVAILABLE","WeChat exchange unavailable"); }
          catch(Problem ex) { if(ex.http()==503) throw ex;throw new Problem(503,"WX_INVALID_RESPONSE","WeChat returned invalid identity data"); }
        if(wx.get("errcode")!=null) {
            long error;try {error=Inputs.number(wx.get("errcode"));}catch(Problem ex){throw new Problem(503,"WX_INVALID_RESPONSE","WeChat returned invalid identity data");}
            if(error!=0) throw new Problem(401,"WX_CODE_REJECTED","WeChat login code is invalid or expired");
        }
        String openid=wx.get("openid")==null?"":wx.get("openid").toString();
        if(openid.isBlank()||openid.length()>128) throw new Problem(503,"WX_INVALID_RESPONSE","WeChat identity was not returned");
        long id=repo.external("WECHAT",appId,openid); Map<String,Object> identity=repo.identity(id,false);
        Actor actor="VERIFIED".equals(identity.get("link_status")) && identity.get("user_id")!=null
            ?repo.staff(Inputs.number(identity.get("user_id")),id):visitorActor(id);
        return issued(actor);
    }
    private static String enc(String s) {return URLEncoder.encode(s,StandardCharsets.UTF_8);}
    private Actor visitorActor(long id) {return new Actor(0,0,id,"VISITOR",Set.of(),Set.of(),false);}
    private Map<String,Object> issued(Actor a) { return P.of("token",sessions.issue(a),"kind",a.kind(),"userId",Long.toString(a.userId()),"identityId",Long.toString(a.identityId())); }
    public Map<String,Object> me() {
        Actor a=Actors.current();
        Map<String,Object> identity=a.identityId()>0?repo.identity(a.identityId(),false):Map.of();
        return P.of("userId",Long.toString(a.userId()),"identityId",Long.toString(a.identityId()),"deptId",Long.toString(a.deptId()),"kind",a.kind(),"permissions",a.permissions(),"scopeDeptIds",a.scopeDeptIds().stream().map(String::valueOf).toList(),"bindingStatus",identity.get("link_status"));
    }
    public Map<String,Object> logout(String token) {
        sessions.revoke(token.startsWith("Bearer ")?token.substring(7):token);
        return P.of("revoked",true);
    }
    public Map<String,Object> applyBinding(Map<String,Object> b,String key) {
        Actor a=Actors.current(); if(a.identityId()<=0) throw Problem.forbidden("External identity required");
        String username=Inputs.text(b,"username",1,30),reason=Inputs.text(b,"reason",5,300);
        return commands.run("IDENTITY:"+a.identityId(),"BINDING_APPLY",key,b,201,()->{
            Map<String,Object> identity=repo.identity(a.identityId(),true);
            if(!"WECHAT".equals(identity.get("provider"))) throw Problem.forbidden("WeChat identity required");
            if("VERIFIED".equals(identity.get("link_status"))) throw Problem.conflict("Identity already verified");
            Map<String,Object> u=repo.username(username); if(u.isEmpty()) throw Problem.notFound("School account not found");
            long staffId=Inputs.number(u.get("user_id"));repo.staff(staffId,0);
            if(!db.one("SELECT binding_request_id FROM auth_binding_request WHERE identity_id=#{p.id} AND status='PENDING'",P.of("id",a.identityId())).isEmpty()) throw Problem.conflict("A binding request is already pending");
            long id=db.insert("INSERT INTO auth_binding_request(identity_id,staff_user_id,status,reason,version,created_at) "
                + "VALUES(#{p.identity},#{p.user},'PENDING',#{p.reason},0,CURRENT_TIMESTAMP(3))",P.of("identity",a.identityId(),"user",staffId,"reason",reason));
            db.write("UPDATE sys_external_identity SET link_status='PENDING' WHERE identity_id=#{p.id}",P.of("id",a.identityId()));
            return P.of("bindingRequestId",Long.toString(id),"status","PENDING","version",0);
        });
    }
    public Map<String,Object> approveBinding(long id,Map<String,Object> b,String key) {
        Actor a=Actors.current();a.requireStaff();a.require("identity:binding:approve");
        return commands.run("STAFF:"+a.userId(),"BINDING_APPROVE",key,P.of("bindingRequestId",id,"body",b),200,()->{
            Map<String,Object> row=db.required("SELECT * FROM auth_binding_request WHERE binding_request_id=#{p.id} FOR UPDATE",P.of("id",id));
            long version=Inputs.nonNegative(b,"expectedVersion"),target=Inputs.number(row.get("staff_user_id"));
            if(version!=Inputs.number(row.get("version"))) throw Problem.conflict("Binding version changed");
            if(!"PENDING".equals(row.get("status"))) throw Problem.conflict("Binding is no longer pending");
            if(a.userId()==target) throw Problem.forbidden("Binding must be verified by a different school officer");
            Actor targetActor=repo.staff(target,0);
            if(!a.allData()&&!a.scopeDeptIds().contains(targetActor.deptId())) throw Problem.forbidden("Account outside binding approval scope");
            String decision=Inputs.text(b,"decision",6,8),remark=Inputs.text(b,"remark",1,300);
            if(!Set.of("APPROVE","REJECT").contains(decision)) throw Problem.bad("Invalid binding decision");
            long identity=Inputs.number(row.get("identity_id"));Map<String,Object> external=repo.identity(identity,true);
            if(!"PENDING".equals(external.get("link_status"))) throw Problem.conflict("External identity binding state changed");
            String status=decision.equals("APPROVE")?"VERIFIED":"REJECTED";
            db.write("UPDATE auth_binding_request SET status=#{p.status},reviewed_by=#{p.by},review_remark=#{p.remark},reviewed_at=CURRENT_TIMESTAMP(3),version=version+1 WHERE binding_request_id=#{p.id}",P.of("status",status,"by",a.userId(),"remark",remark,"id",id));
            db.write("UPDATE sys_external_identity SET user_id=#{p.user},link_status=#{p.status},verified_by=#{p.by},verified_at=CURRENT_TIMESTAMP(3) WHERE identity_id=#{p.id}",P.of("user",decision.equals("APPROVE")?target:null,"status",decision.equals("APPROVE")?"VERIFIED":"VISITOR","by",a.userId(),"id",identity));
            return P.of("bindingRequestId",Long.toString(id),"status",status,"version",version+1,"loginAgainRequired",true);
        });
    }
}
```

**backend/src/main/java/com/doupi/planref/auth/AuthRepository.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class AuthRepository {
    private final Db db;
    public AuthRepository(Db db) { this.db=db; }
    public Map<String,Object> username(String name) {
        return db.one("SELECT user_id,dept_id,password,status,del_flag FROM sys_user WHERE user_name=#{p.name}",P.of("name",name));
    }
    public Map<String,Object> identity(long id, boolean lock) {
        return db.required("SELECT * FROM sys_external_identity WHERE identity_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));
    }
    public long external(String provider,String appId,String subject) {
        Map<String,Object> p=P.of("provider",provider,"app",appId,"subject",subject);
        db.write("INSERT INTO sys_external_identity(provider,app_id,subject_id,link_status,created_at) "
            + "VALUES(#{p.provider},#{p.app},#{p.subject},'VISITOR',CURRENT_TIMESTAMP(3)) "
            + "ON DUPLICATE KEY UPDATE identity_id=identity_id",p);
        return Inputs.number(db.required("SELECT identity_id FROM sys_external_identity WHERE provider=#{p.provider} "
            + "AND app_id=#{p.app} AND subject_id=#{p.subject}",p).get("identity_id"));
    }
    public Actor staff(long userId,long identityId) {
        Map<String,Object> u=db.required("SELECT user_id,dept_id,status,del_flag FROM sys_user WHERE user_id=#{p.id}",P.of("id",userId));
        if (!"0".equals(String.valueOf(u.get("status"))) || !"0".equals(String.valueOf(u.get("del_flag"))))
            throw new Problem(401,"ACCOUNT_DISABLED","Account is disabled");
        long dept=u.get("dept_id")==null?0:Inputs.number(u.get("dept_id"));
        List<Map<String,Object>> roles=db.list("SELECT r.role_id,r.data_scope FROM sys_role r JOIN sys_user_role ur ON ur.role_id=r.role_id "
            + "WHERE ur.user_id=#{p.id} AND r.status='0' AND r.del_flag='0'",P.of("id",userId));
        Set<String> permissions=new HashSet<>();
        for (Map<String,Object> m:db.list("SELECT DISTINCT m.perms FROM sys_menu m JOIN sys_role_menu rm ON rm.menu_id=m.menu_id "
            + "JOIN sys_user_role ur ON ur.role_id=rm.role_id JOIN sys_role r ON r.role_id=ur.role_id "
            + "WHERE ur.user_id=#{p.id} AND r.status='0' AND r.del_flag='0' AND m.status='0'",P.of("id",userId))) {
            if(m.get("perms")!=null && !m.get("perms").toString().isBlank()) permissions.add(m.get("perms").toString());
        }
        Set<Long> scopes=new HashSet<>(); boolean all=false;
        for(Map<String,Object> r:roles) {
            String scope=String.valueOf(r.get("data_scope"));
            if("1".equals(scope)) all=true;
            if("2".equals(scope)) for(Map<String,Object> d:db.list("SELECT dept_id FROM sys_role_dept WHERE role_id=#{p.id}",P.of("id",r.get("role_id")))) scopes.add(Inputs.number(d.get("dept_id")));
            if("3".equals(scope)&&dept>0) scopes.add(dept);
            if("4".equals(scope)&&dept>0) {
                Set<Long> branch=new HashSet<>();branch.add(dept);
                List<Map<String,Object>> depts=db.list("SELECT dept_id,parent_id FROM sys_dept WHERE status='0' AND del_flag='0'",Map.of());
                boolean changed=true;
                while(changed) { changed=false; for(Map<String,Object> d:depts) if(d.get("parent_id")!=null && branch.contains(Inputs.number(d.get("parent_id")))) changed |= branch.add(Inputs.number(d.get("dept_id"))); }
                scopes.addAll(branch);
            }
        }
        return new Actor(userId,dept,identityId,"STAFF",Set.copyOf(permissions),Set.copyOf(scopes),all);
    }
}
```

**backend/src/main/java/com/doupi/planref/auth/ExternalCommands.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;
import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/** Transactional idempotency for channel operations without an office_request root. */
@Component
public class ExternalCommands {
    private final Db db;
    private final TransactionTemplate tx;
    public ExternalCommands(Db db, PlatformTransactionManager manager) {
        this.db = db;
        this.tx = new TransactionTemplate(manager);
    }
    public Map<String,Object> run(String scope, String action, String key, Map<String,Object> payload,
                                  int status, Supplier<Map<String,Object>> work) {
        if (key == null || !key.matches("[A-Za-z0-9_.:-]{8,64}")) throw Problem.bad("Invalid Idempotency-Key");
        String hash = Json.hash(payload);
        Map<String,Object> p = P.of("scope",scope,"action",action,"key",key,"hash",hash);
        return tx.execute(ignored -> {
            db.write("INSERT INTO channel_idempotency(scope_key,action_code,idempotency_key,payload_hash,created_at) "
                + "VALUES(#{p.scope},#{p.action},#{p.key},#{p.hash},CURRENT_TIMESTAMP(3)) "
                + "ON DUPLICATE KEY UPDATE command_id=command_id",p);
            Map<String,Object> row = db.required("SELECT * FROM channel_idempotency WHERE scope_key=#{p.scope} "
                + "AND action_code=#{p.action} AND idempotency_key=#{p.key} FOR UPDATE",p);
            if (!hash.equals(row.get("payload_hash"))) throw Problem.conflict("Same key has a different payload");
            Object saved = row.get("result_json");
            if (saved != null) {
                Map<String,Object> replay = new LinkedHashMap<>(Json.readMap(saved));
                replay.put("_replayed",true);
                replay.put("_httpStatus",Inputs.number(row.get("http_status")));
                return replay;
            }
            Map<String,Object> out = new LinkedHashMap<>(work.get());
            db.write("UPDATE channel_idempotency SET result_json=#{p.result},http_status=#{p.status} "
                + "WHERE command_id=#{p.id}",P.of("result",Json.write(out),"status",status,"id",row.get("command_id")));
            out.put("_httpStatus",status);
            return out;
        });
    }
    public static String sha256(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (java.security.NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
    public static boolean matches(String value, String expectedHash) {
        return expectedHash != null && MessageDigest.isEqual(sha256(value).getBytes(StandardCharsets.US_ASCII),
            expectedHash.getBytes(StandardCharsets.US_ASCII));
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



## 6. 边界与异常场景处理

- 微信secret/AppID缺失503，供应商超时503，errcode非0或code过期401；不使用随机openid代替真实交换，不捕获异常后返回登录成功。
- username不存在404，不返回学校账号密码；申请的reason不是核实结论。每个身份仅一份PENDING。
- 审核者等于staff_user_id、自选角色和越部门均403；version变化或已处理409；REJECT保留完整历史。
- 审核通过后明确要求重新登录；VISITOR JWT仍保持访客；SessionTokens每次验证VERIFIED绑定、账号status/del_flag、auth_version及最新角色。
- `AuthBoundaryTest`覆盖无配置不签发与Web不继承员工；`ExternalCommandsTest`覆盖同键跨对象冲突及已提交重放。
