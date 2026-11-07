# MINI-02 真实微信登录与学校核实员工绑定

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#mini-02)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施沿用现有 Java、小程序和管理后台工程。登录、申请、核实及撤销已接通。代码规范见 [AGENTS.md](../../AGENTS.md)，公共认证及命令边界见[公共契约](../00-shared/公共契约.md)。

**优先级与工期：P0，4个工作日。** 以一名单人Java开发者结合AI完成后端、原生小程序或React页面、联调及自测估算，不假设另有前端或QA人员；工期含约半天人工场景核对，外部微信审核等待不算有效开发日。App完整交付仍为P1。

微信登录与学校员工核实分开。服务端用code换openid；未核实只签发VISITOR。绑定申请定位学校账号，另一位有授权核实人核对后生效；无短信、无手机号自动匹配、无模拟openid。密码登录是管理后台已有学校核实入口，员工小程序仍须外部身份VERIFIED。

文件路径与实施任务：

- [x] 微信交换客户端及身份、绑定、幂等 Mapper 已按 MyBatis-Plus 工程约定编写。SQL 集中在 Mapper XML。
- [x] 在 `doupi-server/doupi-recruit/` 接通登录、绑定、审核和撤销，验证审核权限、事务回滚及原键重放。
- [x] 小程序登录页使用 `wx.login`。在「我的」提交员工绑定、查看进度及重新登录，复用统一 HTTP 会话。
- [x] 学校核实界面位于管理后台「招生管理 → 教师绑定」，通过 `identity:binding:approve` 和部门范围授权。申请人和核实员通过学校认可的渠道核对同一个申请编号及学校账号。
- [ ] 签发真实员工会话后回补 MINI-01 真机验收，核对本人查询、退出和原令牌返回 401，再分别更新两模块状态。[MINI-01 补测步骤](MINI-01-工程与HTTP.md#线上复测与待补测)

依赖为 MINI-01 HTTP、系统员工与岗位权限、学校小程序 AppID 和 AppSecret，以及学校指定核实账号。[微信 code2Session](https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/user-login/code2Session.html)

### 本地验证与上线补测

- Maven 后端打包和 76 项测试通过。测试覆盖微信异常、原访客会话保持访客、自审及跨部门拒绝、同键重放、实际 Mapper 事务回滚、账号停用及撤销后旧绑定失效。一个既有 OCR 用例缺少本地图片样本，本次排除。管理后台构建和小程序登录、个人中心、设置页面的 WXML/WXSS 编译通过。
- 在隔离 MySQL 8.4 演练[增量迁移](../../database/migrations/2026-11-07-mini-02-wechat-identity.sql)，验证账号状态、部门、密码和角色分配变更触发会话版本递增。部署环境配置 `PLAN_WECHAT_APP_ID` 和 `PLAN_WECHAT_SECRET`。为核实角色配置 `identity:binding:approve`、教师绑定页权限及可核实部门范围。
- 反代部署由 Nginx 覆盖 `X-Real-IP` 为 `$remote_addr`，并用 `PLAN_WECHAT_TRUSTED_PROXIES` 填写 Java 服务直接连接的可信代理 IP，多个值以逗号分隔。确认两台客户端的限流桶独立，再进行弱网联调。
- 使用学校 AppID 真机验证微信登录、访客申请、其他员工核实、重新登录、撤销，以及 MINI-01 的退出后旧令牌 401。新增微信会话可用公开访校接口，受保护的旧预约接口由 MINI-04 和 MINI-05 按本人及岗位范围接续。

验收：缺配置503且无身份/会话写入；无效code401；访客填写任何手机号/角色都无员工权限；同键同正文重放；同键跨绑定目标409；自核实403；范围外核实403；通过后重新登录得到实时岗位范围，停用和撤销立即阻止旧员工会话。

## 2. 接口设计清单

接口前缀均为`/api/v1`。JSON统一`{code:int,msg:string,traceId:string,replayed:boolean,data:object}`；BIGINT标识使用十进制字符串，版本为非负整数。写操作的`Idempotency-Key:string(8..64)`必填，只重试原键及原正文。Authorization为`Bearer <服务端JWT>`；客户端角色、openid、userId、手机号不作为授权来源。除明确匿名接口外需要有效会话，返回401/403不降级为匿名员工。

| 接口名称 | 请求方式 | 路径 | 请求参数(字段名/类型/必填/含义) | 返回参数(字段名/类型/含义) | 权限要求 |
|---|---|---|---|---|---|
| 微信身份登录 | POST | `/api/v1/auth/wechat` | body.code:string(1..128)／是／wx.login一次性code；不接受openid、phone、role授权 | token:string（服务端签发会话，不含微信secret/session_key）；kind:string（STAFF或VISITOR）；userId:string（员工ID，访客为0）；identityId:string（经微信验证的外部身份ID） | 匿名登录，限流 |
| 申请员工身份绑定 | POST | `/api/v1/auth/employee-bindings` | Authorization:string／是；Idempotency-Key:string(8..64)／是；body.username:string(1..30)／是／学校账号；reason:string(5..300)／是／核实依据 | bindingRequestId:string（学校核实申请ID）；status:string（PENDING待核实）；version:int（初始为0） | 已认证WECHAT外部身份，未VERIFIED |
| 学校核实员工绑定 | POST | `/api/v1/staff/employee-bindings/{id}/review` | id:long路径／是／绑定申请；Authorization:string／是／Bearer会话；Idempotency-Key:string(8..64)／是／本次命令键；expectedVersion:int>=0／是；decision:`APPROVE或REJECT`／是；remark:string(1..300)／是 | bindingRequestId:string（核实申请ID）；status:string（VERIFIED通过/REJECTED拒绝）；version:int（本次处理后版本）；loginAgainRequired:boolean（true表示需重新登录才可取得新身份） | STAFF且identity:binding:approve；部门范围内；不得核实自己 |
| 核实队列 | GET | `/api/v1/staff/employee-bindings` | Authorization:string／是；before:long／否／上一页的下一页游标 | items:object[]（申请ID、账号、姓名、说明、状态、版本和本人标记）；nextBefore:string（分页游标，空字符串表示末页） | 学校后台会话，核实权限和部门范围 |
| 撤销员工绑定 | POST | `/api/v1/staff/employee-bindings/{id}/revoke` | id:long／是／申请ID；Authorization:string／是；Idempotency-Key:string／是；expectedVersion:long／是／申请版本 | bindingRequestId:string；status:string（REVOKED）；version:long；loginAgainRequired:boolean | 学校后台会话，核实权限和部门范围，不得撤销本人 |
| 本人会话信息 | GET | `/api/v1/auth/me` | Authorization:string／是 | userId:string（员工ID，访客为0）；identityId:string（外部身份ID，纯密码员工可为0）；deptId:string（学校部门ID，访客为0）；kind:string（STAFF员工/VISITOR访客）；permissions:string[]（实时动作权限）；scopeDeptIds:string[]（实时部门数据范围）；bindingStatus:string或null（外部身份状态）；nickname:string或null（员工显示名）；bindingRequestId:string、lastBindingStatus:string（访客存在申请时的最新申请编号和状态） | 已认证本人 |



## 3. 数据流转细节

| 接口 | 请求／服务端来源 → 明确数据库字段 → 返回 | 事务、并发与缓存 |
|---|---|---|
| `/auth/wechat` | code+服务端appId/secret→HTTPS官方jscode2session→openid；provider=`WECHAT`/app_id/subject_id→sys_external_identity身份唯一键；user_id/link_status→有效sys_user及授权或VISITOR→token/kind | 外部交换成功才写库；超时503，无伪身份。外部身份UPSERT依唯一键并发收敛；微信session信息不持久化不日志输出。Redis签会话，角色每次重载 |
| `/auth/employee-bindings` | username→sys_user.user_name/user_id/status；reason→auth_binding_request.reason；服务端identity_id/staff_user_id/status=PENDING/version=0/created_at；sys_external_identity.link_status=PENDING→申请ID/状态 | channel_idempotency以IDENTITY、固定BINDING_APPLY、key/hash占键；锁identity；单pending唯一约束；申请、状态、真实响应同事务，无成功前占位提交 |
| `/staff/employee-bindings/{id}/review` | id和完整body入hash；expectedVersion→binding.version；decision/remark→status/review_remark/reviewed_by/reviewed_at/version+1；APPROVE写identity.user_id/link_status/verified_by/verified_at，REJECT恢复VISITOR→version/loginAgainRequired | 固定BINDING_APPROVE不拼ID后缀；锁申请及外部身份；检查真实核实人、目标staff有效与部门范围；事务失败全回滚。现有VISITOR会话不自动升级 |
| 核实队列与撤销 | 队列由审核岗位数据范围过滤 `sys_user.dept_id`，读取有效申请；撤销匹配当前身份对应的已核实申请ID与版本，将 `sys_external_identity.user_id` 置空，`link_status` 设为 REVOKED | 撤销和 `BINDING_REVOKE` 幂等归档同事务。保留核实历史，既有员工令牌对不上当前绑定，重新核实后也无法重用 |
| `/auth/me` | 当前会话的 identityId→identity.link_status；员工对比 `sys_user.auth_version` 和当前核实申请 ID；访客读取本人最近的申请编号和状态 → 返回 bindingStatus/permissions/scopeDeptIds | 只读，角色与范围实时重载。旧员工会话在版本变化后持续失效，微信会话按签发 TTL 到期 |

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

运行时使用 Java 17、Spring Boot 4.0.3 和 MyBatis-Plus 3.5.17。以下链接指向仓库中的完整类定义及 SQL 映射。

| 分层 | 源码 | 职责 |
|---|---|---|
| Controller | [MiniWechatController](../../doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/controller/MiniWechatController.java) · [MiniSessionController](../../doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/controller/MiniSessionController.java) | 微信登录、绑定申请、审核、撤销、会话查询与退出 |
| Service | [MiniWechatService](../../doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/service/MiniWechatService.java) · [WechatIdentityClient](../../doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/service/WechatIdentityClient.java) · [MiniSessionService](../../doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/service/MiniSessionService.java) | 服务端交换身份，校验学校账号与绑定。业务 Service 负责参数、授权、事务和幂等审计 |
| Mapper | [MiniIdentityMapper.java](../../doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/mapper/MiniIdentityMapper.java) · [MiniIdentityMapper.xml](../../doupi-server/doupi-recruit/src/main/resources/mapper/recruit/MiniIdentityMapper.xml) | 管理身份、绑定、核实队列和命令幂等记录，使用 `@Param` 与 `#{...}` 绑定参数 |
| 小程序 | [统一 HTTP 层](../../doupi-miniApp/utils/http.js) | 登录页接入 `wx.login` 与 `http.request`，绑定申请复用 `http.command` 保留原键及正文 |

### Mapper 调用与事务边界

| 操作 | Service 调用顺序 | Mapper 约束 |
|---|---|---|
| 微信身份查建 | 微信交换成功 → `upsertIdentity` → `findIdentity` → 根据有效账号、当前绑定签发会话 | 以 provider、appId 和微信返回的 subjectId 唯一键收敛并发，保留已有绑定 |
| 提交员工绑定 | 校验访客和目标账号 → `upsertCommand` → `lockCommand` → `selectIdentity(id, true)` → `insertBinding` → `updateIdentity` → `selectPendingBinding` → `finishCommand` | 占键、身份锁、申请写入及响应归档使用同一事务；相同键不同请求正文返回 409 |
| 员工核实 | 校验实时权限 → 锁幂等命令 → 先锁身份，再锁申请 → 核对版本、本人禁审和部门范围 → `reviewBinding` → `updateIdentity` → `finishCommand` | 服务端确定审核人与数据范围；跨范围及冲突失败时回滚事务 |
| 核实队列与会话读取 | 服务端解析当前角色及部门 → `selectQueue` 或 `selectIdentity` → 返回本人或岗位授权字段 | 队列在 SQL 内过滤部门范围再分页，会话读取核对当前绑定申请 ID，访客会话保持访客 |

MySQL 的并发占键、锁定读取及授权联表集中维护在 Mapper XML。现有账号、角色及部门读取复用系统模块的 Mapper 和 Service。


## 6. 边界与异常场景处理

- 微信 AppSecret 或 AppID 缺失及上游超时返回 503，登录凭证无效返回 401，微信限流返回 429。只有微信交换成功才建立身份。
- username不存在404，不返回学校账号密码；申请的reason不是核实结论。每个身份仅一份PENDING。
- 审核者等于staff_user_id、自选角色和越部门均403；version变化或已处理409；REJECT保留完整历史。
- 审核通过后明确要求重新登录；VISITOR JWT仍保持访客；SessionTokens每次验证VERIFIED绑定、账号status/del_flag、auth_version及最新角色。
- `WechatIdentityClientTest` 覆盖缺配置、无效凭证、限流和异常响应。绑定与会话的本地回归覆盖自审、越权、重放、旧访客会话与撤销。真实微信和 MySQL 8.4 联调按第 1 节补测。
