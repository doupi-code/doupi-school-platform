# MINI-05 已核实员工确认、核销与接待备注

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#mini-05)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，3个工作日。** 一名单人Java开发者结合AI承担后端、客户端、联调与自测，不假定独立前端或QA团队。工期包括正常联调与人工场景检查，不含等待微信平台审核。App交付保持P1。

仅已学校核实的员工执行招生接待。提供授权列表、详情、待确认审批、接待人分配、当日凭证核验、接待备注与审计。校园数据范围和实际分派共同限制行访问；不把全量名单、邀请归属、完整排班与回访绩效计为已完成，回访排班为P1。

文件路径与任务：

- [ ] `backend/src/main/java/com/doupi/planref/recruit/RecruitService.java`：确认、核销、备注命令及岗位检查；Repository统一staffScope与脱敏视图。
- [ ] `doupi-miniApp/pages/staff/`：工作台、授权详情、现场核销、重复／取消／日期无效提示；不让客户端选role获得入口。
- [ ] `miniapp/pages/home/index.js`：staffDetail/staffAction；核销使用家长现场出示凭证，不从员工接口返回核销明码。
- [ ] `backend/src/main/java/com/doupi/planref/recruit/BookingPolicy.java`及JUnit：取消与核销状态边界。
- [ ] 将旧 `appointment.adminList`、`appointment.globalList`、`appointment.adminDetail` 切换到同一行权限检查或停用旧入口。验收同岗位、不同授权校区或接待分派的员工，列表不泄露范围外记录，详情及动作也无法越权，员工视图不返回核销明码。

依赖：MINI-02 VERIFIED员工身份；MINI-04统一预约事实；管理后台维护sys_role权限、recruit_campus_scope校区部门映射。

验收：非员工403；无动作权限403；范围外详情/动作不可操作；同一预约确认／取消版本竞争409；重复核销不多写到校事实；取消码无效；非预约当日不可核销；备注同事务写版本和审计。

## 2. 接口设计清单

统一前缀`/api/v1`。响应为`{code:int,msg:string,traceId:string,replayed:boolean,data:object}`；BIGINT标识十进制字符串，版本为非负整数。Authorization:string为服务端Bearer JWT；写操作Idempotency-Key:string(8..64)必填。访客操作者由认证identity派生，员工由服务端账号、岗位和范围派生，不接收body中的操作者或角色授权。

| 接口名称 | 请求方式 | 路径 | 请求参数(字段名/类型/必填/含义) | 返回参数(字段名/类型/含义) | 权限要求 |
|---|---|---|---|---|---|
| 授权接待列表 | GET | `/api/v1/staff/appointments` | Authorization:string／是；无query/body；最近100笔 | items:object[]（最近100笔授权接待预约，每项：appointmentId/appointmentNo:string（预约ID/编号）；status:string（当前预约状态）；studentName/studentGrade:string（学生姓名/年级）；campusId/campusName:string（校区ID/名称）；visitDate:string YYYY-MM-DD（访校日期）；timeSlot:string（时段）；version:int>=0（并发版本）；assignedTeacherName:string或null（接待人姓名）；verifiedAt:string ISO8601或null（真实到校时间）；checkInCode:null（员工接口不返回明码）；parentName/parentPhone:string（岗位授权的联系人姓名/电话）；remark:string或null（家长原诉求）；auditRemark:string或null（学校处理备注）；assignedTeacherUserId:string或null（接待员工ID）） | STAFF且recruit:appointment:query；allData、接待本人或授权校区部门范围 |
| 授权接待详情 | GET | `/api/v1/staff/appointments/{id}` | Authorization:string／是；id:long>0路径／是 | appointmentId/appointmentNo:string（预约ID/编号）；status:string（当前预约状态）；studentName/studentGrade:string（学生姓名/年级）；campusId/campusName:string（校区ID/名称）；visitDate:string YYYY-MM-DD（访校日期）；timeSlot:string（时段）；version:int>=0（并发版本）；assignedTeacherName:string或null（接待人姓名）；verifiedAt:string ISO8601或null（真实到校时间）；checkInCode:null（员工接口不返回明码）；parentName/parentPhone:string（岗位授权的联系人姓名/电话）；remark:string或null（家长原诉求）；auditRemark:string或null（学校处理备注）；assignedTeacherUserId:string或null（接待员工ID） | 同列表且行范围 |
| 确认或拒绝预约 | POST | `/api/v1/staff/appointments/{id}/confirm` | Authorization:string／是／Bearer会话；Idempotency-Key:string(8..64)／是／本次命令键；id:long>0／是；expectedVersion:int>=0／是；decision:`APPROVE或REJECT`／是；remark:string(1..500)／是；assignedTeacherUserId:long>0／APPROVE时是／有效接待人，REJECT时不需要 | appointmentId/appointmentNo:string（预约ID/编号）；status:string（当前预约状态）；studentName/studentGrade:string（学生姓名/年级）；campusId/campusName:string（校区ID/名称）；visitDate:string YYYY-MM-DD（访校日期）；timeSlot:string（时段）；version:int>=0（并发版本）；assignedTeacherName:string或null（接待人姓名）；verifiedAt:string ISO8601或null（真实到校时间）；checkInCode:null（员工接口不返回明码）；parentName/parentPhone:string（岗位授权的联系人姓名/电话）；remark:string或null（家长原诉求）；auditRemark:string或null（学校处理备注）；assignedTeacherUserId:string或null（接待员工ID）；APPROVE后APPROVED、REJECT后CANCELLED，version递增 | STAFF+recruit:appointment:confirm；指定他人还需recruit:appointment:assign；目标有query权限及该校区范围 |
| 现场到校核销 | POST | `/api/v1/staff/appointments/{id}/verify` | Authorization:string／是／Bearer会话；Idempotency-Key:string(8..64)／是／本次命令键；id:long>0／是；expectedVersion:int>=0／是；checkInCode:string(1..64)／是／家长现场凭证 | appointmentId/appointmentNo:string（预约ID/编号）；status:string（当前预约状态）；studentName/studentGrade:string（学生姓名/年级）；campusId/campusName:string（校区ID/名称）；visitDate:string YYYY-MM-DD（访校日期）；timeSlot:string（时段）；version:int>=0（并发版本）；assignedTeacherName:string或null（接待人姓名）；verifiedAt:string ISO8601或null（真实到校时间）；checkInCode:null（员工接口不返回明码）；parentName/parentPhone:string（岗位授权的联系人姓名/电话）；remark:string或null（家长原诉求）；auditRemark:string或null（学校处理备注）；assignedTeacherUserId:string或null（接待员工ID）；首次写VERIFIED/version+1；alreadyVerified:boolean（仅相同凭证再次核销时为true，可缺省） | STAFF+recruit:appointment:verify；行范围且预约当日 |
| 记录接待备注 | POST | `/api/v1/staff/appointments/{id}/remark` | Authorization:string／是／Bearer会话；Idempotency-Key:string(8..64)／是／本次命令键；id:long>0／是；expectedVersion:int>=0／是；remark:string(1..500)／是／学校接待事实 | appointmentId/appointmentNo:string（预约ID/编号）；status:string（当前预约状态）；studentName/studentGrade:string（学生姓名/年级）；campusId/campusName:string（校区ID/名称）；visitDate:string YYYY-MM-DD（访校日期）；timeSlot:string（时段）；version:int>=0（并发版本）；assignedTeacherName:string或null（接待人姓名）；verifiedAt:string ISO8601或null（真实到校时间）；checkInCode:null（员工接口不返回明码）；parentName/parentPhone:string（岗位授权的联系人姓名/电话）；remark:string或null（家长原诉求）；auditRemark:string或null（学校处理备注）；assignedTeacherUserId:string或null（接待员工ID）；auditRemark为本次学校接待备注，version递增 | STAFF+recruit:appointment:edit；行范围 |



## 3. 数据流转细节

| 接口 | 请求／认证来源 → 数据库明确字段 → 返回 | 事务、缓存与一致性 |
|---|---|---| 
| 员工列表 | actor.userId/allData/scopeDeptIds→appointment.assigned_teacher_user_id或recruit_campus_scope.campus_id/dept_id匹配；过滤后读预约与联系字段→staffView | SQL在LIMIT前落实部门范围，不能先取100再内存漏筛；数据范围来自有效角色，不采body中的dept/role；不缓存PII |
| 员工详情 | id→appointment_id；实际接待人或校区授权范围→parent_name/phone及公开业务字段；check_in_code不返回员工 | 与列表同授权检查；前端按钮不是授权依据 |
| 确认 | expectedVersion对appointment.version；decision→status；remark→audit_remark；指定人→assigned_teacher_user_id与teacher_name姓名快照；APPROVED生成check_in_code，REJECT清空；version+1/update_time；CONFIRM动作actor/previous_status/next_status/remark；定向通知→staffView | 固定APPOINTMENT_CONFIRM，STAFF作用域；路径appointmentId进入payload摘要；幂等占键→预约FOR UPDATE→校验PENDING/范围/接待人有效性；预约+审计+通知+结果同事务 |
| 核销 | id及checkInCode→appointment_id/check_in_code恒时比对；visit_on=上海当天；APPROVED→VERIFIED，写verify_time/verifier_user_id/verifier/version+1/update_time；VERIFY轨迹；通知→staffView | 固定APPOINTMENT_VERIFY；锁同一预约根，与取消串行；首次检查expectedVersion并只写一次到校事实；重复VERIFIED相同凭证只读返回alreadyVerified，绝不再次审计或通知 |
| 备注 | remark→audit_remark，不覆盖家长remark；version检查后+1；REMARK审计写前后同状态及真实actor/remark→staffView | 固定APPOINTMENT_REMARK；STAFF+key、路径ID入hash；同事务；不触发虚假状态改变或外部送达 |

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

**doupi_recruit_campus**

```sql
CREATE TABLE `doupi_recruit_campus` (
  `campus_id` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '校区ID',
  `campus_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '校区名称',
  `title` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT '华襄校园介绍' COMMENT '展示标题',
  `summary` TEXT COLLATE utf8mb4_unicode_ci COMMENT '简介概览',
  `intro` TEXT COLLATE utf8mb4_unicode_ci COMMENT '详细图文/介绍',
  `address` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '校区地址',
  `latitude` DECIMAL(10, 6) DEFAULT '30.550000' COMMENT '纬度',
  `longitude` DECIMAL(10, 6) DEFAULT '114.280000' COMMENT '经度',
  `contact_phone` VARCHAR(32) COLLATE utf8mb4_unicode_ci DEFAULT '027-88888888' COMMENT '联系电话',
  `nature` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '全日制寄宿' COMMENT '办学性质',
  `section` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '小初高一贯制' COMMENT '开设学段',
  `cover_image` VARCHAR(512) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '封面图片URL',
  `published` TINYINT(1) DEFAULT '1' COMMENT '是否发布(1-是 0-否)',
  `sort_order` INT DEFAULT '0' COMMENT '排序',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`campus_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='校区信息表';
```

**doupi_recruit_config**

```sql
CREATE TABLE `doupi_recruit_config` (
  `config_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_key` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键',
  `config_value` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置值(JSON或字符串)',
  `remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '说明',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`config_id`),
  UNIQUE `uk_config_key` (
    `config_key`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='招生与系统配置表';
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

**recruit_campus_scope**

```sql
CREATE TABLE recruit_campus_scope (
  campus_id VARCHAR(32) NOT NULL COMMENT '既有校区字符串ID，不等于dept_id',
  dept_id BIGINT NOT NULL COMMENT '可办理该校区的学校部门；还须动作权限及数据范围',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT 'UTC授权配置时间',
  PRIMARY KEY (campus_id, dept_id),
  INDEX idx_recruit_scope_dept (dept_id, campus_id)   COMMENT '按有效员工部门范围查询校区预约',
  CONSTRAINT fk_recruit_scope_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (
    campus_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_recruit_scope_dept FOREIGN KEY (dept_id) REFERENCES sys_dept (
    dept_id
  ) ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='招生校区与学校部门授权映射，不将校区ID强转数字';
```

## 5. 代码实现骨架

下列完整分层代码属于Java17／Spring Boot4.0.3／MyBatis4.0.1文档内骨架。公共Db、Inputs、Json、Actors、ApiReply等按[公共契约](../00-shared/公共契约.md)运行；客户端使用同一接口与状态，不维护第二份业务真相。代码明确处理外部渠道未接入和业务失败。



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

**backend/src/main/java/com/doupi/planref/recruit/BookingPolicy.java**

```java
package com.doupi.planref.recruit;

public final class BookingPolicy {
    private BookingPolicy() {}
    public static boolean canCancel(String status) {
        return "PENDING".equals(status) || "APPROVED".equals(status);
    }
    public static boolean checkInChangesState(String status) {
        if ("VERIFIED".equals(status)) return false;
        if (!"APPROVED".equals(status)) throw new IllegalArgumentException("Only approved appointments can check in");
        return true;
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

- 员工身份以VERIFIED绑定+正常学校账号+当前角色构成；家长填写教师手机号、昵称或sourceChannel不能替代。
- 确认接待人超范围、账号停用或缺查询权限：403/401；拒绝申请不强制填写接待人。
- 无效码422、待确认或已取消409、日期不符409、版本变化409；只有事务提交成功展示到校结果。重复核销提示“已到校”，不伪造新核销时间。
- 接待备注包含敏感个人资料时仅岗位范围可读；日志只记录traceId和错误码，不记录联系电话或凭证。
- 现场弱网重放原键与原body，错误后刷新状态核对；`BookingPolicyTest`验证重复和非法状态，跨对象幂等测试确保不同预约不会重放同一业务结果。
