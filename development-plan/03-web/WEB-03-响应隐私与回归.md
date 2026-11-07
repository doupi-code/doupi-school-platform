# WEB-03 响应式、隐私和跨端回归

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#web-03)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，2个工作日。** 一名单人Java开发者结合AI负责Java、React页面、联调与自测；不假设独立前端或QA团队。保留React19、TypeScript6、Vite8、AntD6、Tailwind4、Router7和Zustand5既有工程，不为此次预约统一规则整体重建门户。App仍为P1。

完成门户和预约窄屏适配、可访问表单、正式隐私说明、会话退出与敏感数据清理，逐场景回归跨端事实。不重建视觉系统，不把响应式或本地清理宣称为完整法规合规认证。业务回归覆盖真实身份、发布态、预约规则、幂等和取消／核销竞争。

文件路径与任务：

- [ ] `doupi-web-client-react/src/`共享布局、预约/查询表单与隐私页：320/375/768/1280宽度、键盘焦点、错误区域role=alert、按钮最小触达区。
- [ ] `web/src/style.css`：双列到单列、长文本换行、焦点可见、44px控件。
- [ ] `web/src/{main.tsx,api.ts}`：隐私缺失禁提交、用户确认、no-store、无敏感URL、退出只清本项目存储。
- [ ] `backend/src/test/.../auth/{AuthBoundaryTest,ExternalCommandsTest}.java`、`recruit/BookingPolicyTest.java`：身份和幂等边界自动测试；浏览器/真机结果另作真实记录。

依赖：WEB-01/02、MINI-04/05完成后统一回归；CMS正式隐私说明及学校人工核实联系渠道；隔离测试库、Redis、正常与停用员工、两位访客测试身份。

验收：小屏无横向溢出且所有控件可操作；未发布隐私说明不能提交；退出原token不可用；公开响应/URL/日志无凭证与未授权个人信息；下面每个场景有实际结果与traceId；未跑场景明确待验。

## 2. 接口设计清单

接口统一`/api/v1`，响应`{code:int,msg:string,traceId:string,replayed:boolean,data:object}`；BIGINT标识字符串。鉴权接口的受控访客JWT为Authorization:string必填，写命令Idempotency-Key:string(8..64)必填。Web访客会话独立签发，不能继承后台员工JWT；客户端身份和手机号不授权。

| 接口名称 | 请求方式 | 路径 | 请求参数(字段名/类型/必填/含义) | 返回参数(字段名/类型/含义) | 权限要求 |
|---|---|---|---|---|---|
| 站点公开配置 | GET | `/api/v1/public/site` | 无 | config:object（公开键值集合）；config.site_name/site_name_en:string或缺省（学校中英文名称）；config.slogan/subtitle:string或缺省（标语/副标题）；config.address/hotlines/office_hours:string或缺省（地址/热线配置字符串/咨询时间）；config.icp:string或缺省（备案）；config.privacy_policy/privacy_version:string或缺省（正式隐私说明/版本） | 匿名，正式白名单 |
| 本人会话信息 | GET | `/api/v1/auth/me` | Authorization:string／是／会话 | userId:string（员工ID，访客为0）；identityId:string（外部身份ID，纯密码员工可为0）；deptId:string（学校部门ID，访客为0）；kind:string（STAFF员工/VISITOR访客）；permissions:string[]（实时动作权限）；scopeDeptIds:string[]（实时部门数据范围）；bindingStatus:string或null（外部身份VISITOR/PENDING/VERIFIED/REVOKED，纯密码会话为空） | 仅当前本人 |
| 退出当前会话 | POST | `/api/v1/auth/logout` | Authorization:string／是；无body | revoked:boolean（true表示当前会话已从服务端撤销） | 仅撤销当前会话 |
| 凭证查询本人预约 | POST | `/api/v1/public/appointments/query` | Authorization:string／是；appointmentNo:string(1..32)／是；querySecret:base64url string43..128／是 | appointmentId:string（预约ID）；appointmentNo:string（预约编号）；status:string（PENDING待确认/APPROVED已确认/CANCELLED已取消/VERIFIED已到校）；studentName/studentGrade:string（学生姓名/意向年级）；campusId/campusName:string（校区ID/名称）；visitDate:string YYYY-MM-DD（访校日期）；timeSlot:string（访校时段）；parentPhoneMasked:string（脱敏联系电话）；assignedTeacherName:string或null（已分配接待人姓名）；verifiedAt:string ISO8601或null（真实到校时间）；version:int>=0（并发版本）；checkInCode:string或null（仅本人APPROVED时的有效到校凭证） | 原identity+秘密证明，响应no-store |



## 3. 数据流转细节

| 接口 | 请求／认证来源 → 明确字段 → 返回 | 事务、缓存与核验 |
|---|---|---|
| 隐私说明 | doupi_cms_config.config_key=privacy_policy/privacy_version→config_value→正式文本/版本 | 不读取非白名单配置；缺失禁用提交，不生成默认法律文本 |
| 本人身份 | JWT→sys_user.status/del_flag/auth_version与sys_external_identity.link_status；sys_role/sys_menu/sys_role_dept→kind/permissions/scopeDeptIds | 每次服务端重载，客户端不能以缓存kind绕过权限；Web检测STAFF后另签VISITOR |
| 退出 | JWT jti→Redis plan:session:{jti}删除→revoked；浏览器清理planref.token/proof/pending | 仅成功响应后显示已撤销；不修改预约或审计，不清除同域其他项目存储 |
| 查询回归 | appointmentNo→appointment.appointment_no；actor.identityId→visitor_identity_id；querySecret恒时对public_access_token_hash→脱敏view | GET不得携带proof；fetch cache=no-store；服务端认证、授权与404统一错误，反复失败限流；跨端刷新直接读DB事实 |

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

## 5. 代码实现骨架

参考Web为独立React19／TypeScript6／Vite8可运行项目：安装自身package.json依赖，配置后端环境，运行`npm run dev`，Vite将`/api/v1`代理到18080。部署由Nginx保留此前缀。Java层为Java17、Boot4.0.3、MyBatis4.0.1，依赖公共Db/Inputs/Json/Actors等契约。参考表单使用原生控件便于独立验证，正式页面沿用AntD/Tailwind与已有视觉。



**web/package.json**

```json
{
  "name": "planref-portal",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build"
  },
  "dependencies": {
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "typescript": "6.0.3",
    "vite": "8.3.1"
  }
}
```

**web/tsconfig.json**

```json
{"compilerOptions":{"target":"ES2022","lib":["ES2022","DOM"],"jsx":"react-jsx","module":"ESNext","moduleResolution":"Bundler","strict":true,"noEmit":true,"skipLibCheck":true},"include":["src"]}
```

**web/vite.config.mjs**

```text
export default { server: { proxy: { '/api/v1': 'http://127.0.0.1:18080' } } };
```

**web/index.html**

```html
<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>学校访校预约参考</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
```

**web/src/api.ts**

```typescript
export type Row = Record<string, any>;
export class ApiError extends Error { constructor(public status: number, message: string, public traceId?: string) { super(message); } }
export async function request(path: string, method = 'GET', body?: Row, key?: string): Promise<Row> {
  const token = sessionStorage.getItem('planref.token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && !['/auth/visitor','/auth/wechat','/auth/login'].includes(path)) headers.Authorization = 'Bearer ' + token;
  if (key) headers['Idempotency-Key'] = key;
  let response: Response;
  try { response = await fetch('/api/v1' + path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(12000), credentials: 'omit' }); }
  catch { throw new Error('网络未确认结果，请保留原命令重试'); }
  const envelope = await response.json();
  if (!response.ok) { if (response.status === 401) sessionStorage.removeItem('planref.token'); throw new ApiError(response.status, envelope.msg || '请求失败', envelope.traceId); }
  return envelope.data;
}
export function secret(): string { const bytes = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export async function ensureVisitor(): Promise<void> {
  const unresolvedCreate = !!sessionStorage.getItem('planref.create');
  if (sessionStorage.getItem('planref.token')) {
    try { const me=await request('/auth/me'); if(me.kind==='VISITOR') return; }
    catch(error) { if(!(error instanceof ApiError) || error.status!==401) throw error; }
    if(unresolvedCreate) throw new Error('原访客会话已失效，预约结果仍未确认，请联系学校核实后再提交');
    sessionStorage.removeItem('planref.token');
  }
  if(unresolvedCreate) throw new Error('原访客会话已失效，预约结果仍未确认，请联系学校核实后再提交');
  const session=await request('/auth/visitor','POST');
  if(session.kind!=='VISITOR') throw new Error('访客会话类型错误');
  sessionStorage.setItem('planref.token',session.token);
}
export async function command(path: string, body: Row, slot: string): Promise<Row> {
  const raw = sessionStorage.getItem(slot); const pending = raw ? JSON.parse(raw) : { key: secret(), body };
  if (!raw) sessionStorage.setItem(slot,JSON.stringify(pending));
  try { const data = await request(path,'POST',pending.body,pending.key); sessionStorage.removeItem(slot); return data; }
  catch (error) { if (error instanceof ApiError && error.status >= 400 && error.status < 500 && ![401,403].includes(error.status)) sessionStorage.removeItem(slot); throw error; }
}
```

**web/src/env.d.ts**

```typescript
/// <reference types="vite/client" />
```

**web/src/main.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { request, command, ensureVisitor, secret, type Row } from './api';
import './style.css';
function App() {
 const [site,setSite]=useState<Row>({}),[campuses,setCampuses]=useState<Row[]>([]),[articles,setArticles]=useState<Row[]>([]),[article,setArticle]=useState<Row|null>(null),[rules,setRules]=useState<Row|null>(null),[result,setResult]=useState<Row|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(!!sessionStorage.getItem('planref.create'));
 const [form,setForm]=useState<Row>({parentName:'',parentPhone:'',studentName:'',studentGrade:'',campusId:'',visitDate:'',timeSlot:'',remark:''}),[accepted,setAccepted]=useState(false),[no,setNo]=useState(''),[proof,setProof]=useState('');
 function fail(e: unknown) {setError(e instanceof Error?e.message:'请求失败');}
 useEffect(()=>{ Promise.all([request('/public/site'),request('/public/campuses'),request('/public/articles'),request('/public/appointment-rules')]).then(([s,c,a,r])=>{setSite(s.config);setCampuses(c.items);setArticles(a.items);setRules(r);}).catch(fail); },[]);
 async function create(e: React.FormEvent) {
  e.preventDefault();setBusy(true);setError('');
  try {
   if(!accepted) throw new Error('请阅读并确认学校隐私说明');
   await ensureVisitor();const raw=sessionStorage.getItem('planref.create');const body=raw?JSON.parse(raw).body:{...form,querySecret:secret()};
   const data=await command('/public/appointments',body,'planref.create');sessionStorage.setItem('planref.proof.'+data.appointmentId,JSON.stringify({appointmentNo:data.appointmentNo,querySecret:body.querySecret}));setResult(data);setNo(data.appointmentNo);setProof(body.querySecret);
  }catch(e){fail(e);}finally{setBusy(false);setPending(!!sessionStorage.getItem('planref.create'));}
 }
 async function query(e: React.FormEvent) { e.preventDefault();try{await ensureVisitor();setResult(await request('/public/appointments/query','POST',{appointmentNo:no,querySecret:proof}));setError('');}catch(e){fail(e);} }
 async function cancel() {if(!result)return;try{const body={appointmentNo:no,querySecret:proof,expectedVersion:result.version,reason:'联系人取消预约'};setResult(await command('/public/appointments/'+result.appointmentId+'/cancel',body,'planref.cancel.'+result.appointmentId));setError('');}catch(e){fail(e);}}
 const field=(name:string,label:string,type='text')=><label>{label}<input required={name!=='remark'} type={type} value={form[name]} disabled={pending||busy} onChange={e=>setForm({...form,[name]:e.target.value})}/></label>;
 return <main><header><h1>{site.site_name||'学校公开信息'}</h1><p>{site.slogan}</p><p>{site.address} {site.hotlines}</p></header>
  {error&&<p role="alert">{error}</p>}<section><h2>正式资讯</h2>{articles.map(a=><article key={a.articleId}><button onClick={()=>request('/public/articles/'+a.articleId).then(setArticle).catch(fail)}>{a.title}</button><p>{a.summary}</p><time>{a.publishedAt}</time></article>)}{article&&<article><h3>{article.title}</h3><p className="content">{article.content}</p></article>}</section>
  <section><h2>公开校区</h2>{campuses.map(c=><article key={c.campus_id}><h3>{c.campus_name}</h3><p>{c.summary}</p><p>{c.address} {c.contact_phone}</p></article>)}</section>
  <section><h2>访校预约</h2><p>待确认不等于已经安排接待。{rules&&`开放未来${rules.openDaysAhead}天。`}</p><form onSubmit={create}>{field('parentName','联系人')}{field('parentPhone','联系电话','tel')}{field('studentName','学生姓名')}{field('studentGrade','意向年级')}<label>校区<select required disabled={pending||busy} value={form.campusId} onChange={e=>setForm({...form,campusId:e.target.value})}><option value="">请选择</option>{campuses.map(c=><option key={c.campus_id} value={c.campus_id}>{c.campus_name}</option>)}</select></label>{field('visitDate','期望日期','date')}<label>开放时段<select required disabled={pending||busy} value={form.timeSlot} onChange={e=>setForm({...form,timeSlot:e.target.value})}><option value="">请选择</option>{rules?.timeSlots.map((s:Row)=><option key={s.name}>{s.name}</option>)}</select></label>{field('remark','咨询需求（可选）')}<p className="content">{site.privacy_policy||'学校未发布正式隐私说明，当前不能提交个人信息。'}</p><label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>我已阅读学校隐私说明</label><button disabled={busy||!site.privacy_policy}>{pending?'原键重试结果未明的预约':'提交预约'}</button></form></section>
  <section><h2>本人预约查询</h2><p>预约号、凭证和本浏览器访客会话共同核验。会话失效或凭证遗失请联系学校，不按手机号公开查单。</p><form onSubmit={query}><label>预约号<input required value={no} onChange={e=>setNo(e.target.value)}/></label><label>本次查询凭证<input required type="password" autoComplete="off" value={proof} onChange={e=>setProof(e.target.value)}/></label><button>查询本人预约</button></form>{result&&<article><p>{result.appointmentNo}：{result.status}</p><p>{result.campusName} {result.visitDate} {result.timeSlot}</p><p>接待人：{result.assignedTeacherName||'待分配'}；到校时间：{result.verifiedAt||'未到校'}</p><p>有效到校凭证：{result.checkInCode||'尚无有效凭证'}</p>{['PENDING','APPROVED'].includes(result.status)&&<button onClick={cancel}>取消该预约</button>}</article>}</section>
  <footer><p>个人信息用于学校访校接待。未经学校核实无法取得员工身份。</p><p>{site.icp}</p><button onClick={async()=>{try{if(sessionStorage.getItem('planref.create'))throw new Error('预约结果仍未确认，请先原键重试或联系学校核实');await request('/auth/logout','POST');Object.keys(sessionStorage).filter(key=>key.startsWith('planref.')).forEach(key=>sessionStorage.removeItem(key));setResult(null);setProof('');}catch(e){fail(e);}}}>退出并清除此页会话</button></footer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
```

**web/src/style.css**

```css
*{box-sizing:border-box}body{margin:0;background:#f4f7f7;color:#193333;font:16px/1.6 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:24px}header,section,footer{padding:24px;background:#fff;margin-bottom:20px;border-radius:12px}h1,h2,h3{line-height:1.25}form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}label{display:flex;flex-direction:column;gap:6px}input,select,button{font:inherit;min-height:44px;padding:8px;border:1px solid #8babab;border-radius:6px}button{cursor:pointer;background:#e4f1ed}input[type=checkbox]{width:24px;min-height:24px}.content{white-space:pre-wrap;overflow-wrap:anywhere}article{padding:12px 0;border-bottom:1px solid #dae4e4}[role=alert]{color:#9c250f;padding:12px;background:#ffebe4}button:disabled{opacity:.6;cursor:wait}:focus-visible{outline:3px solid #0a7262;outline-offset:3px}@media(max-width:640px){main{padding:12px}header,section,footer{padding:16px}form{grid-template-columns:1fr}}
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

**backend/src/test/java/com/doupi/planref/auth/AuthBoundaryTest.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthBoundaryTest {
 @Test void unconfiguredWechatDoesNotMintIdentityOrSession() {
  Db db=mock(Db.class);AuthRepository repo=mock(AuthRepository.class);SessionTokens sessions=mock(SessionTokens.class);
  AuthService service=new AuthService(db,repo,sessions,mock(ExternalCommands.class),"","");
  Problem p=assertThrows(Problem.class,()->service.wechat(P.of("code","single-use-code")));
  assertEquals(503,p.http());verifyNoInteractions(repo,sessions,db);
 }
 @Test void webVisitorCannotAcquireStaffRightsFromCurrentContext() {
  AuthRepository repo=mock(AuthRepository.class);SessionTokens sessions=mock(SessionTokens.class);
  when(repo.external(eq("WEB"),eq("PUBLIC_WEB"),anyString())).thenReturn(42L);when(sessions.issue(any())).thenReturn("opaque-session");
  AuthService service=new AuthService(mock(Db.class),repo,sessions,mock(ExternalCommands.class),"","");
  Map<String,Object> result=service.visitor();ArgumentCaptor<Actor> actor=ArgumentCaptor.forClass(Actor.class);verify(sessions).issue(actor.capture());
  assertEquals("VISITOR",actor.getValue().kind());assertEquals(0,actor.getValue().userId());assertTrue(actor.getValue().permissions().isEmpty());assertEquals("VISITOR",result.get("kind"));
 }
}
```

**backend/src/test/java/com/doupi/planref/auth/ExternalCommandsTest.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ExternalCommandsTest {
 @Test void sameActionKeyCannotBeReusedForDifferentAppointment() {
  Db db=mock(Db.class);PlatformTransactionManager tx=mock(PlatformTransactionManager.class);TransactionStatus status=mock(TransactionStatus.class);
  when(tx.getTransaction(any())).thenReturn(status);
  Map<String,Object> original=P.of("appointmentId",11,"body",P.of("expectedVersion",0));
  when(db.required(anyString(),anyMap())).thenReturn(P.of("command_id",1,"payload_hash",Json.hash(original),"http_status",200,"result_json","{\"appointmentId\":\"11\"}"));
  AtomicBoolean ran=new AtomicBoolean();ExternalCommands commands=new ExternalCommands(db,tx);
  Problem problem=assertThrows(Problem.class,()->commands.run("STAFF:7","APPOINTMENT_VERIFY","retry-key",P.of("appointmentId",12,"body",P.of("expectedVersion",0)),200,()->{ran.set(true);return Map.of();}));
  assertEquals(409,problem.http());assertFalse(ran.get());verify(tx).rollback(status);
 }
 @Test void committedResultReplaysWithoutExecutingBusinessAgain() {
  Db db=mock(Db.class);PlatformTransactionManager tx=mock(PlatformTransactionManager.class);when(tx.getTransaction(any())).thenReturn(mock(TransactionStatus.class));
  Map<String,Object> body=P.of("appointmentId",11,"body",P.of("expectedVersion",0));
  when(db.required(anyString(),anyMap())).thenReturn(P.of("command_id",1,"payload_hash",Json.hash(body),"http_status",200,"result_json","{\"appointmentId\":\"11\"}"));
  Map<String,Object> result=new ExternalCommands(db,tx).run("STAFF:7","APPOINTMENT_VERIFY","retry-key",body,200,()->{throw new AssertionError("replay executed work");});
  assertEquals(true,result.get("_replayed"));assertEquals("11",result.get("appointmentId"));
 }
}
```

**backend/src/test/java/com/doupi/planref/recruit/BookingPolicyTest.java**

```java
package com.doupi.planref.recruit;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
class BookingPolicyTest {
 @Test void onlyPendingOrApprovedCanCancel() {assertTrue(BookingPolicy.canCancel("PENDING"));assertTrue(BookingPolicy.canCancel("APPROVED"));assertFalse(BookingPolicy.canCancel("VERIFIED"));assertFalse(BookingPolicy.canCancel("CANCELLED"));}
 @Test void repeatedCheckInDoesNotChangeFact() {assertTrue(BookingPolicy.checkInChangesState("APPROVED"));assertFalse(BookingPolicy.checkInChangesState("VERIFIED"));assertThrows(IllegalArgumentException.class,()->BookingPolicy.checkInChangesState("PENDING"));assertThrows(IllegalArgumentException.class,()->BookingPolicy.checkInChangesState("CANCELLED"));}
}
```



## 6. 边界与异常场景处理

- 回归用例：匿名公开内容200、草稿404；原访客查询200、另一访客/仅手机号404；VISITOR访问员工接口403；停用账号旧员工会话401；同键同body重放、同键换目标409；最后配额并发只一成功；取消与核销竞争只一个状态提交；重复核销不改变到校时间。
- 浏览器检查：320/375/768/1280宽度、200%文本缩放、键盘Tab和Enter提交、长校区名称、错误反馈可读、隐私文本完整；真实结果必须记录，不以样例CSS推断全部通过。
- 隐私检查：开发者网络面板无秘密URL，生产日志无手机号/学生资料/查询凭证/token，页面正文用安全文本，第三方埋点不采集表单；共享设备退出后本地凭证清理。
- 后续在真实后端执行定向JUnit与整体Maven测试；Web执行npm run build。微信真机/浏览器人工回归未实际执行时标记待验，参考工程编译成功不等于已上线。
- 响应失败可重试但保留不明命令，不弹“成功”；无效输入不清空用户表单，版本冲突要求刷新再核对。
