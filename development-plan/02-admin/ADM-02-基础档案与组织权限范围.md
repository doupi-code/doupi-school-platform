# ADM-02 基础档案与组织权限范围

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-02)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

优先级：P0；工期：3个单人工作日；依赖：ADM-01。按1名Java开发+AI辅助估算，工期包括页面、接口、自测和联调。

包含授权基础资料查询、班级/供应商/套装维护、档案并发版本及变更审计；员工、部门、角色/菜单生命周期复用现有系统管理，核对其范围与auth_version失效机制。不新增第二份教师身份，不在本模块直接编辑库存余额、历史单据、密码或任意SQL。

- [ ] 第1日：核对`doupi-server/doupi-system`用户/角色/部门和`doupi-edu`档案映射；档案身份统一sys_user，旧edu_teacher只核对历史。配置`sys_config.office.rules`各RoleKey，提交时服务端解析为快照，不让客户端指定审核人。
- [ ] 第2日：实现目录Controller/Service/Repository、档案版本/审计与索引；管理端`src/pages/office/directory`及`src/api/office-directory.ts`。
- [ ] 第3日：联调人员/班级选择器、停用、重复、跨部门和套装快照；确认后续申请不因套装修改改变历史清单。

验收：账号禁用、角色/范围变更即时阻断；停用档案保留引用；套装修改只影响新申请；任何写档案均无库存movement。

## 2. 接口设计清单

统一外层`code:int,msg:string,traceId:string,replayed:boolean,data:object`；下表为data。ID为十进制字符串，数据库BIGINT；版本为非负整数。业务写命令头`Idempotency-Key:string(1..64)`必填；私有上传和ExternalCommands动作另限8..64个字母数字或_.:-字符；登录、分析和文本候选不要求该头；JWT认证派生操作者和部门。接口不得接受客户端权限、角色和操作者作为授权依据。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 目录查询 | GET | `/api/v1/office/directory/{kind}` | kind/string/是/staff、classes、goods或suppliers | items/array/下列字段清单 | directory:read；suppliers另需directory:maintain |
| 套装详情 | GET | `/api/v1/office/directory/kits/{id}` | id/string/是/套装主键 | kit_id/string；kit_name/string；target_type/string；status/string；version/long；items[{goods_id:string,quantity:long}] | directory:read |
| 新增班级 | POST | `/api/v1/office/directory/classes` | grade/string(1..20)/是；className/string(1..50)/是；studentNum/long(0..1000)/是；deptId/string/是；headTeacherId/string/否；status/ACTIVE或ARCHIVED/是 | class_id/string；上述档案字段按snake_case；version/long | directory:maintain且部门范围 |
| 修改班级 | PUT | `/api/v1/office/directory/classes/{id}` | id/string/是；新增班级全部字段；expectedVersion/long/是 | 同新增班级，version+1 | 同上，原/新部门均须授权 |
| 新增供应商 | POST | `/api/v1/office/directory/suppliers` | supplierName/string(1..100)/是；contact/string(≤50)/否；phone/string(3..20)/否；enabled/boolean/否默认true | supplier_id/string；supplier_name,contact,phone,del_flag/string；version/long | directory:maintain |
| 修改供应商 | PUT | `/api/v1/office/directory/suppliers/{id}` | id/string/是；上述字段；expectedVersion/long/是 | 同新增供应商 | directory:maintain |
| 新增套装 | POST | `/api/v1/office/directory/kits` | kitName/string(1..100)/是；kitCode/string≤50/否；targetType/1教师、2学生或3班级/是；grade/string≤30/否；subject/string≤50/否；enabled/boolean/否；items/array/是，每行goodsId/string与quantity/正long | kit_id/string；kit_name,target_type,status/string；version/long；items[{goods_id:string,quantity:long}] | directory:maintain |
| 修改套装 | PUT | `/api/v1/office/directory/kits/{id}` | id/string/是；上述全部字段；expectedVersion/long/是 | 同新增套装 | directory:maintain |

## 3. 数据流转细节

1. 目录GET：Actor.require校验权限；staff读取`sys_user.user_id,dept_id,nick_name,grade,subject`且有效未删，仅本人/授权部门；classes读取`edu_class.class_id,grade,class_name,student_num,head_teacher_id,dept_id,status,version`并过滤范围；goods只公开内部`goods_id,goods_name,category,spec,unit,base_unit,conversion_rate,stock_qty_base,warn_low_base_qty,return_required,version`；supplier另校维护权限返回` supplier_id,supplier_name,contact,phone,version`。不返回密码、联系电话人员档案全集或未授权部门。
2. 套装GET：按id读`edu_goods_kit.kit_id,kit_name,target_type,status,version`，仅未删；关联`edu_goods_kit_item.kit_id`读`goods_id,quantity`。本模块不展开成库存扣减，后续物资申请保存快照。
3. 所有POST/PUT：Service固定动作CLASS_SAVE/SUPPLIER_SAVE/KIT_SAVE，摘要加入路径目标和正文；ExternalCommands在事务内占`channel_idempotency(scope_key,action_code,idempotency_key)`并锁行，同hash先重放、异hash409。scope_key只来自`STAFF:{Actor.userId}`。
4. 班级：验证人数范围、姓名长度，读`sys_dept.dept_id/status/del_flag`并校验原、新部门；教师读`sys_user.user_id/nick_name/dept_id/status/del_flag`核实范围。修改锁class并比version；写`grade,class_name,student_num,head_teacher_id,head_teacher,dept_id,status`，新增version0、修改+1；写`directory_change_log.entity_type=CLASS,entity_id,actor_user_id,before_json,after_json,created_at`。UK grade/name冲突回滚。
5. 供应商：锁supplier比version，校验电话；写`supplier_name,contact,phone,del_flag`，enabled=false映射del_flag2作停止新选择；新增version0、修改+1；同事务审计，不物理删除被收货引用的主体。
6. 套装：锁kit比version；每行goodsId唯一、qty>0且goods有效；头写`kit_name,kit_code,target_type,grade,subject,status,del_flag,version`；替换套装当前`edu_goods_kit_item(kit_id,goods_id,quantity)`并审计。删除的是当前模板行，既有申请`edu_material_request_item`快照不变。
7. 提交全部业务/审计/幂等响应后才成功；字段校验或UK失败全部回滚。档案查询使用实时读，若正式工程增缓存，提交后按类别失效，权限仍每请求校验；库存余额不从目录缓存授权或扣减。角色/账号修改沿用既有管理事务，受影响`sys_user.auth_version+1`并撤销旧缓存后回归。

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

**edu_class**

```sql
CREATE TABLE `edu_class` (
  `class_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '班级ID',
  `grade` VARCHAR(20) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '年级',
  `class_name` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '班级名称',
  `student_num` INT NOT NULL DEFAULT '0' COMMENT '班级人数',
  `head_teacher_id` BIGINT DEFAULT NULL COMMENT '????????D',
  `head_teacher` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT 'ç­ä¸»ä»»å§“å',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`class_id`),
  UNIQUE `uk_grade_class` (
    `grade`,
    `class_name`
  ),
  `dept_id` BIGINT NULL COMMENT '新增，管理范围',
  `status` VARCHAR(16) NOT NULL DEFAULT 'ACTIVE' COMMENT '新增，ACTIVE/ARCHIVED',
  INDEX `idx_class_head` (`head_teacher_id`),
  INDEX `idx_class_dept` (`dept_id`, `status`),
  CONSTRAINT `fk_ref_020` FOREIGN KEY (`head_teacher_id`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_021` FOREIGN KEY (`dept_id`) REFERENCES `sys_dept` (
    `dept_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  version BIGINT NOT NULL DEFAULT 0 COMMENT '档案并发版本'
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='班级档案表';
```

**edu_supplier**

```sql
CREATE TABLE `edu_supplier` (
  `supplier_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '供应商ID',
  `supplier_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '供应商名称',
  `contact` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '联系人',
  `phone` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '联系电话',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `create_time` DATETIME DEFAULT NULL,
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '',
  `update_time` DATETIME DEFAULT NULL,
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0',
  PRIMARY KEY (`supplier_id`),
  UNIQUE `uk_supplier_name` (
    `supplier_name`
  ),
  version BIGINT NOT NULL DEFAULT 0 COMMENT '供应商并发版本'
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='供应商表';
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

**edu_goods_kit**

```sql
CREATE TABLE `edu_goods_kit` (
  `kit_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '套装ID',
  `kit_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '套装名称',
  `kit_code` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '套装编码',
  `target_type` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '1' COMMENT '适用对象(1教师工作武器 2学生教材 3班级通用)',
  `grade` VARCHAR(30) COLLATE utf8mb4_unicode_ci DEFAULT '通用' COMMENT '适用年级(通用/高一/高二/高三/复读部)',
  `subject` VARCHAR(50) COLLATE utf8mb4_unicode_ci DEFAULT '通用' COMMENT '适用选科/方向(通用/物理类/历史类/物化生/历政地)',
  `description` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '套装说明/适用场景',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '0' COMMENT '状态(0正常 1停用)',
  `sort_order` INT DEFAULT '0' COMMENT '排序号',
  `del_flag` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '删除标志(0存在 2删除)',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  `remark` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '备注',
  PRIMARY KEY (`kit_id`),
  version BIGINT NOT NULL DEFAULT 0 COMMENT '套装并发版本'
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教务物资套装模版表';
```

**edu_goods_kit_item**

```sql
CREATE TABLE `edu_goods_kit_item` (
  `item_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '明细ID',
  `kit_id` BIGINT NOT NULL COMMENT '套装ID',
  `goods_id` BIGINT NOT NULL COMMENT '物资ID',
  `quantity` BIGINT NOT NULL DEFAULT '1' COMMENT '默认配发数量',
  `sort_order` INT DEFAULT '0' COMMENT '排序号',
  `remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '配发说明',
  PRIMARY KEY (`item_id`),
  INDEX `idx_kit_id` (`kit_id`),
  INDEX `idx_goods_id` (`goods_id`),
  UNIQUE `uk_kit_goods` (
    `kit_id`,
    `goods_id`
  ),
  CONSTRAINT `fk_ref_090` FOREIGN KEY (`kit_id`) REFERENCES `edu_goods_kit` (
    `kit_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_ref_091` FOREIGN KEY (`goods_id`) REFERENCES `edu_goods` (
    `goods_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='教务物资套装明细表';
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

**directory_change_log**

```sql
CREATE TABLE directory_change_log (
  change_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '档案变更事件',
  entity_type VARCHAR(24) NOT NULL COMMENT 'CLASS/SUPPLIER/KIT',
  entity_id BIGINT NOT NULL COMMENT '类型内主键，逻辑关联',
  actor_user_id BIGINT NOT NULL COMMENT '真实操作人',
  before_json JSON NOT NULL COMMENT '变更前快照',
  after_json JSON NOT NULL COMMENT '变更后快照',
  created_at DATETIME(3) NOT NULL COMMENT '变更时间UTC',
  PRIMARY KEY (change_id),
  INDEX idx_directory_entity (entity_type, entity_id, change_id),
  CONSTRAINT fk_directory_actor FOREIGN KEY (actor_user_id) REFERENCES sys_user (
    user_id
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='档案变更审计，禁止一般编辑删除';
```

## 5. 代码实现骨架

命名采用Java驼峰、类PascalCase、SQL snake_case和REST资源路径。Controller负责HTTP适配，Service负责校验、权限、事务与业务，Repository经MyBatis参数绑定访问数据库；公共ApiErrors/SecurityConfig输出脱敏异常和traceId日志。公共组件定义及运行依赖见[公共契约与内嵌实现](../00-shared/公共契约.md)。



**backend/src/main/java/com/doupi/planref/directory/DirectoryController.java**

```java
package com.doupi.planref.directory;
import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/office/directory")
public class DirectoryController {
    private final DirectoryService service;
    public DirectoryController(DirectoryService service) {this.service=service;}
    @GetMapping("/{kind}") public ResponseEntity<?> list(@PathVariable String kind) {return ApiReply.of(service.read(kind),200);}
    @GetMapping("/kits/{id}") public ResponseEntity<?> kit(@PathVariable long id) {return ApiReply.of(service.kit(id),200);}
    @PostMapping("/classes") public ResponseEntity<?> addClass(@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveClass(0,key,b),201);}
    @PutMapping("/classes/{id}") public ResponseEntity<?> editClass(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveClass(id,key,b),200);}
    @PostMapping("/suppliers") public ResponseEntity<?> addSupplier(@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveSupplier(0,key,b),201);}
    @PutMapping("/suppliers/{id}") public ResponseEntity<?> editSupplier(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveSupplier(id,key,b),200);}
    @PostMapping("/kits") public ResponseEntity<?> addKit(@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveKit(0,key,b),201);}
    @PutMapping("/kits/{id}") public ResponseEntity<?> editKit(@PathVariable long id,@RequestHeader("Idempotency-Key") String key,@RequestBody Map<String,Object> b) {return ApiReply.of(service.saveKit(id,key,b),200);}
}
```

**backend/src/main/java/com/doupi/planref/directory/DirectoryService.java**

```java
package com.doupi.planref.directory;

import com.doupi.planref.*;
import com.doupi.planref.auth.ExternalCommands;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class DirectoryService {
    private final DirectoryRepository repo;private final ExternalCommands commands;
    public DirectoryService(DirectoryRepository repo,ExternalCommands commands) {this.repo=repo;this.commands=commands;}
    private void scope(long dept) {Actor a=Actors.current();if(!a.allData()&&!a.scopeDeptIds().contains(dept)) throw Problem.notFound("资料不在可见范围");}
    public Map<String,Object> read(String kind) {
        Actor a=Actors.current();a.require("directory:read");List<Map<String,Object>> items;
        switch(kind) {
            case "staff": items=repo.staff().stream().filter(x->a.allData()||Inputs.number(x.getOrDefault("user_id",0))==a.userId()||a.scopeDeptIds().contains(Inputs.number(x.getOrDefault("dept_id",0)))).toList();break;
            case "classes": items=repo.classes().stream().filter(x->a.allData()||a.scopeDeptIds().contains(Inputs.number(x.getOrDefault("dept_id",0)))).toList();break;
            case "goods": items=repo.goods();break;
            case "suppliers": a.require("directory:maintain");items=repo.suppliers();break;
            default: throw Problem.notFound("不支持的资料类别");
        }
        return P.of("items",items);
    }
    public Map<String,Object> kit(long id) {Actors.current().require("directory:read");return repo.kit(id);}
    public Map<String,Object> saveClass(long id,String key,Map<String,Object> body) {
        Actor a=Actors.current();a.require("directory:maintain");Map<String,Object> payload=new LinkedHashMap<>(body);payload.put("classId",id);
        return commands.run("STAFF:"+a.userId(),"CLASS_SAVE",key,payload,id==0?201:200,()->{
            long dept=Inputs.id(body,"deptId");scope(dept);repo.db().required("SELECT dept_id FROM sys_dept WHERE dept_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",dept));
            Map<String,Object> old=id==0?Map.of():repo.lockClass(id);
            if(id>0) {if(old.get("dept_id")==null) throw Problem.conflict("历史班级必须先核实管理部门");scope(Inputs.number(old.get("dept_id")));if(Inputs.nonNegative(body,"expectedVersion")!=Inputs.number(old.get("version"))) throw Problem.conflict("班级已更新");}
            long count=Inputs.nonNegative(body,"studentNum");if(count>1000) throw Problem.bad("班级人数超出允许范围");
            Long teacher=Inputs.optionalId(body,"headTeacherId");String name=null;
            if(teacher!=null) {Map<String,Object> user=repo.db().required("SELECT nick_name,dept_id FROM sys_user WHERE user_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",teacher));scope(Inputs.number(user.getOrDefault("dept_id",0)));name=user.get("nick_name").toString();}
            String status=Inputs.text(body,"status",6,8);if(!Set.of("ACTIVE","ARCHIVED").contains(status)) throw Problem.bad("班级状态无效");
            Map<String,Object> p=P.of("grade",Inputs.text(body,"grade",1,20),"name",Inputs.text(body,"className",1,50),"count",count,"teacher",teacher,"teacherName",name,"dept",dept,"status",status,"id",id);
            long saved=id;
            if(id==0) saved=repo.db().insert("INSERT INTO edu_class(grade,class_name,student_num,head_teacher_id,head_teacher,dept_id,status,version) VALUES(#{p.grade},#{p.name},#{p.count},#{p.teacher},#{p.teacherName},#{p.dept},#{p.status},0)",p);
            else repo.db().write("UPDATE edu_class SET grade=#{p.grade},class_name=#{p.name},student_num=#{p.count},head_teacher_id=#{p.teacher},head_teacher=#{p.teacherName},dept_id=#{p.dept},status=#{p.status},version=version+1 WHERE class_id=#{p.id}",p);
            Map<String,Object> result=repo.lockClass(saved);repo.audit("CLASS",saved,old,result);return result;
        });
    }
    public Map<String,Object> saveSupplier(long id,String key,Map<String,Object> body) {
        Actor a=Actors.current();a.require("directory:maintain");Map<String,Object> payload=new LinkedHashMap<>(body);payload.put("supplierId",id);
        return commands.run("STAFF:"+a.userId(),"SUPPLIER_SAVE",key,payload,id==0?201:200,()->{
            Map<String,Object> old=id==0?Map.of():repo.db().required("SELECT * FROM edu_supplier WHERE supplier_id=#{p.id} FOR UPDATE",P.of("id",id));
            if(id>0&&Inputs.nonNegative(body,"expectedVersion")!=Inputs.number(old.get("version"))) throw Problem.conflict("供应商已更新");
            String phone=Inputs.optionalText(body,"phone",20);if(phone!=null&&!phone.matches("[+0-9() -]{3,20}")) throw Problem.bad("联系电话格式无效");
            Map<String,Object> p=P.of("name",Inputs.text(body,"supplierName",1,100),"contact",Inputs.optionalText(body,"contact",50),"phone",phone,"id",id,"flag",Inputs.bool(body,"enabled",true)?"0":"2");
            long saved=id;
            if(id==0) saved=repo.db().insert("INSERT INTO edu_supplier(supplier_name,contact,phone,del_flag,version) VALUES(#{p.name},#{p.contact},#{p.phone},#{p.flag},0)",p);
            else repo.db().write("UPDATE edu_supplier SET supplier_name=#{p.name},contact=#{p.contact},phone=#{p.phone},del_flag=#{p.flag},version=version+1 WHERE supplier_id=#{p.id}",p);
            Map<String,Object> result=repo.db().required("SELECT * FROM edu_supplier WHERE supplier_id=#{p.id}",P.of("id",saved));repo.audit("SUPPLIER",saved,old,result);return result;
        });
    }
    public Map<String,Object> saveKit(long id,String key,Map<String,Object> body) {
        Actor a=Actors.current();a.require("directory:maintain");Map<String,Object> payload=new LinkedHashMap<>(body);payload.put("kitId",id);
        return commands.run("STAFF:"+a.userId(),"KIT_SAVE",key,payload,id==0?201:200,()->{
            Map<String,Object> old=id==0?Map.of():repo.db().required("SELECT * FROM edu_goods_kit WHERE kit_id=#{p.id} FOR UPDATE",P.of("id",id));
            if(id>0&&Inputs.nonNegative(body,"expectedVersion")!=Inputs.number(old.get("version"))) throw Problem.conflict("套装已更新");
            String type=Inputs.text(body,"targetType",1,1);if(!Set.of("1","2","3").contains(type)) throw Problem.bad("套装对象为教师1、学生2或班级3");
            List<Map<String,Object>> items=Inputs.list(body,"items");if(items.isEmpty()) throw Problem.bad("套装不能为空");Set<Long> seen=new HashSet<>();
            for(Map<String,Object> item:items) {long gid=Inputs.id(item,"goodsId");if(!seen.add(gid)) throw Problem.bad("套装物品重复");Inputs.positive(item,"quantity");repo.db().required("SELECT goods_id FROM edu_goods WHERE goods_id=#{p.id} AND del_flag='0'",P.of("id",gid));}
            Map<String,Object> p=P.of("id",id,"name",Inputs.text(body,"kitName",1,100),"code",Inputs.optionalText(body,"kitCode",50),"type",type,"grade",Inputs.optionalText(body,"grade",30),"subject",Inputs.optionalText(body,"subject",50),"status",Inputs.bool(body,"enabled",true)?"0":"1");long saved=id;
            if(id==0) saved=repo.db().insert("INSERT INTO edu_goods_kit(kit_name,kit_code,target_type,grade,subject,status,del_flag,version) VALUES(#{p.name},#{p.code},#{p.type},#{p.grade},#{p.subject},#{p.status},'0',0)",p);
            else {repo.db().write("UPDATE edu_goods_kit SET kit_name=#{p.name},kit_code=#{p.code},target_type=#{p.type},grade=#{p.grade},subject=#{p.subject},status=#{p.status},version=version+1 WHERE kit_id=#{p.id}",p);repo.db().write("DELETE FROM edu_goods_kit_item WHERE kit_id=#{p.id}",P.of("id",id));}
            for(Map<String,Object> item:items) repo.db().write("INSERT INTO edu_goods_kit_item(kit_id,goods_id,quantity) VALUES(#{p.kit},#{p.goods},#{p.qty})",P.of("kit",saved,"goods",Inputs.id(item,"goodsId"),"qty",Inputs.positive(item,"quantity")));
            Map<String,Object> result=repo.kit(saved);repo.audit("KIT",saved,old,result);return result;
        });
    }
}
```

**backend/src/main/java/com/doupi/planref/directory/DirectoryRepository.java**

```java
package com.doupi.planref.directory;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class DirectoryRepository {
    private final Db db;
    public DirectoryRepository(Db db) {this.db=db;}
    public Db db() {return db;}
    public List<Map<String,Object>> classes() {return db.list("SELECT class_id,grade,class_name,student_num,head_teacher_id,dept_id,status,version FROM edu_class ORDER BY class_id",Map.of());}
    public List<Map<String,Object>> staff() {return db.list("SELECT user_id,dept_id,nick_name,grade,subject FROM sys_user WHERE status='0' AND del_flag='0' ORDER BY user_id",Map.of());}
    public List<Map<String,Object>> goods() {return db.list("SELECT goods_id,goods_name,category,spec,unit,base_unit,conversion_rate,stock_qty_base,warn_low_base_qty,return_required,version FROM edu_goods WHERE del_flag='0' ORDER BY goods_id",Map.of());}
    public List<Map<String,Object>> suppliers() {return db.list("SELECT supplier_id,supplier_name,contact,phone,version FROM edu_supplier WHERE del_flag='0' ORDER BY supplier_id",Map.of());}
    public Map<String,Object> kit(long id) {Map<String,Object> head=db.required("SELECT kit_id,kit_name,target_type,status,version FROM edu_goods_kit WHERE kit_id=#{p.id} AND del_flag='0'",P.of("id",id));head.put("items",db.list("SELECT goods_id,quantity FROM edu_goods_kit_item WHERE kit_id=#{p.id} ORDER BY goods_id",P.of("id",id)));return head;}
    public Map<String,Object> lockClass(long id) {return db.required("SELECT * FROM edu_class WHERE class_id=#{p.id} FOR UPDATE",P.of("id",id));}
    public void audit(String type,long id,Map<String,Object> before,Map<String,Object> after) {
        db.write("INSERT INTO directory_change_log(entity_type,entity_id,actor_user_id,before_json,after_json,created_at) VALUES(#{p.type},#{p.id},#{p.actor},#{p.before},#{p.after},CURRENT_TIMESTAMP(3))",P.of("type",type,"id",id,"actor",Actors.current().userId(),"before",Json.write(before),"after",Json.write(after)));
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



## 6. 边界与异常场景处理

- 重复年级/班级名、供应商名或重复套装物品409/422，事务回滚无部分模板；版本冲突409，刷新并重新确认后使用新命令键。
- 原/新部门或教师超范围404/403；已停用/已删教师、物品、部门不能用于新资料；历史无部门必须先核实，不猜测归属。
- quantity为正整数；学生人数0..1000；换算率由库存目录受控维护，历史有流水不任意更改。套装不允许客户端库存字段。
- 停用只影响新选择，既有单据和审计不删除；同键超时重试回放，故障不写假成功。
