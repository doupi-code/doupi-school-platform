# ADM-19 学生档案与监护关联

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-19)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，5 人日，依赖 ADM-02、MINI-07；尚未实现或运行。** 建正式学生档案，姓名/学号/校区/班级/入学年度/ACTIVE在读、GRADUATED毕业、LEFT离校、DISABLED停用，保留转班历史。班主任收集姓名、手机号、关系，学校核实后后台录入或 Excel 导入；家长经真实微信手机号激活已核实关系，补漏与人工核实才发定向一次限时邀请。后台不得用预约自动入学，不提供按姓名合并、批量发邀请或抢绑功能。

未来路径：`backend/src/main/java/com/doupi/planref/parent/{StudentController,StudentService,StudentRepository,RosterXlsx}.java`；`admin/src/views/education/{students,guardians}/`。全部实现仍须开发，本文不创建代码、SQL或脚本文件。共同辅助类完整定义在 MINI-07 与公共契约。前后端在5日内共同交付，不重复估算。

- [ ] D1：正式档案、范围、转班历史DDL与查询；验收学号校级唯一、校区varchar32不另造ID。
- [ ] D2：Excel上传预览校验、暂存与确认；验收重复学号/手机/版本/越范围错误可定位行，0错误才可提交。
- [ ] D3：原子提交、手工维护、转班；验收并发版本冲突全批回滚、重试不重复导入。
- [ ] D4：监护关系维护、撤销微信、补漏邀请；验收手机号变更强制旧绑定失效、学校核实留痕、不抢已绑定微信。
- [ ] D5：学生/监护人页面、权限与MINI-07联调；验收毕业/离校/停用不可查、内部历史仍在、后台密码会话正常。

## 2. 接口设计清单

公共：Authorization必填；所有写操作 Idempotency-Key:string(8..64)必填；JSON BIGINT为string，expectedVersion为非负integer，时间ISO UTC。学生范围由当前/目标班级 edu_class.dept_id 与Actor.scopeDeptIds核验；allData可跨范围。不得仅按前端classId过滤授权。

| 名称 | 方法 | 绝对路径 | 完整参数类型、必填及含义 | 返回字段类型及含义 | 权限 |
|---|---|---|---|---|---|
| 学生列表 | GET | `/api/v1/office/students` | query.after:string/否/上页末student_id；limit:integer(1..100)/是/条数；classId:string/否/班级；status:enum ACTIVE/GRADUATED/LEFT/DISABLED/否 | items:array(student_id/student_no/student_name/campus_id/class_id:string,entry_year:integer,status:string,version:integer)；nextAfter:string或null | student:read+班级范围 |
| 单个学生建档 | POST | `/api/v1/office/students` | studentNo:string1..32/是/全校唯一文本学号；studentName:string1..64/是；campusId:string1..32/是；classId:string/是；entryYear:integer1900..2200/是；status:ACTIVE/GRADUATED/LEFT/DISABLED/是；reason:string1..128/是/核实依据；无需家长 | studentId:string；version:integer=0；status:string | student:maintain+目标班级范围 |
| 学生详情及关联 | GET | `/api/v1/office/students/{studentId}` | path.studentId:string/是 | student:object(student_id/student_no/student_name/campus_id/class_id:string,entry_year:integer,status:string,version:integer)；guardians:array(guardian_id:string,guardian_name:string,phoneMasked:string脱敏手机号,guardianStatus:string,guardianVersion:integer,link_id:string,relation:string,linkStatus:string,linkVersion:integer) | student:read+学生班级范围；无全家长列表 |
| 单个补录家长并核实关系 | POST | `/api/v1/office/students/{studentId}/guardians` | path.studentId:string/是；guardianName:string1..64/是；phone:string/+861规则/是/校方核实档案输入不直接授权微信；relation:FATHER/MOTHER/OTHER/是；reason:string1..128/是/核实依据；expectedVersion:integer/是/学生版本 | studentId:string；guardianId:string；guardianVersion:integer；linkId:string；linkVersion:integer=0；status:VERIFIED；不返回手机号 | guardian:maintain+学生范围；精确复用家长还须其全部关联范围 |
| 名册上传预览 | POST multipart | `/api/v1/office/students/import-preview` | file:binary.xlsx/是/10MiB、5000行；每行studentNo:string1..32、studentName:string1..64、campusId:string1..32、classId:decimal ID、entryYear:integer1900..2200、status:enum、studentVersion:非负integer或NEW、guardianName:string1..64、phone:string/+861[3-9]9位、guardianVersion:非负integer或NEW、relation:FATHER/MOTHER/OTHER、linkVersion:非负integer或NEW；允许同学号多个家长、同手机号多个孩子，同一(学号,手机号)不得重复；重复实体字段及版本必须一致 | batchId:string；version:integer；rows:integer；errors:array(row:integer,code:string)；confirmationHash:string/服务端正文摘要；expiresAt:string | student:maintain+每行班级范围 |
| 读取预览 | GET | `/api/v1/office/students/imports/{batchId}` | path.batchId:string/是 | batchId:string；status:PREVIEW/COMMITTED；version:integer；rows:array按模板字段及rowNo:integer；errors:array；confirmationHash:string；expiresAt:string | 批次创建者且student:maintain |
| 确认名册 | POST | `/api/v1/office/students/imports/{batchId}/commit` | path.batchId:string/是；body.expectedVersion:integer/是；confirmationHash:string64/是/预览摘要 | batchId:string；status:COMMITTED；rowCount:integer；version:integer | 创建者+student:maintain；再次校验每行范围和实体版本 |
| 编辑/转班/变状态 | PUT | `/api/v1/office/students/{studentId}` | path.studentId:string/是；body.studentName:string1..64/是；campusId:string1..32/是；classId:string/是；entryYear:integer1900..2200/是；status:上述enum/是；expectedVersion:integer/是；reason:string1..128/是/核实依据编号 | studentId:string；version:integer；status:string | student:maintain+原/新班级范围 |
| 维护家长 | PUT | `/api/v1/office/guardians/{guardianId}` | path.guardianId:string/是；guardianName:string1..64/是；phone:string/+861规则/是；status:ACTIVE/DISABLED/是；expectedVersion:integer/是；reason:string1..128/是 | guardianId:string；version:integer；status:string | guardian:maintain+guardian所有有效关联均在范围，或allData |
| 核实/撤销关系 | PUT | `/api/v1/office/students/{studentId}/guardians/{guardianId}` | 两path ID/是；relation:FATHER/MOTHER/OTHER/是；status:VERIFIED/REVOKED/是；expectedVersion:integer/是/新建传0；reason:string1..128/是 | linkId:string；version:integer；status:string | guardian:maintain+该学生范围；涉及既有guardian需其全部范围 |
| 补漏邀请 | POST | `/api/v1/office/guardians/{guardianId}/invitations` | path.guardianId:string/是；targetIdentityId:string/是/校方已核实微信；verificationMethod:WECHAT_PHONE/MANUAL/是；evidenceRef:string1..128/是；expectedVersion:integer/是/家长版本 | invitationId:string；targetIdentityId:string；expiresAt:string；token:string64/HMAC一次凭据，业务日志与幂等档案不保存token | guardian:maintain+所有关联范围；拒绝现有ACTIVE绑定 |
| 撤销微信绑定 | POST | `/api/v1/office/guardians/{guardianId}/identity-revocations` | path.guardianId:string/是；expectedVersion:integer/是/家长版本；reason:string1..128/是 | guardianId:string；version:integer；revoked:integer/数量 | guardian:maintain+所有关联范围 |

## 3. 数据流转细节

1. 列表：校验limit显式输入，不默认页；after缺省从开始读取，固定student_id升序，Repository带范围条件限制，取limit+1计算nextAfter，学号姓名筛选P1不造模糊检索默认。只读，无缓存、无手机号批量公开。
2. 上传：服务端校验文件长度、扩展名、ZIP安全、单sheet、精确表头、无公式/合并/隐藏sheet。字符串学号/手机号必须文本单元格，防Excel吞前导0。校验每行班级校区存在且范围内、入学年度、状态、版本；按studentNo分组学生、phone分组家长，重复实体全部字段与版本须一致；同一(学号,手机号)重复报错，同学号多个家长、同手机多个孩子合法。已有学号必须显式studentVersion、已有手机必须guardianVersion；新记录必须NEW，不根据姓名猜同人；已有学号姓名不一致允许学校明确版本更新，审计留痕。错误仅输出行号/固定码，预览本身仅创建者读取正文。保存JSON暂存于edu_roster_import，errors非空可预览不可commit。完整规范化rows摘要参与幂等，服务端不接受客户端回写rows。
3. 预览读取：按created_by核对，不靠批次ID；已到期不再返回正文410。commit先重放、锁batch、检查owner/24小时/confirmationHash/批次版本，重新校验实体版本与范围，按studentNo排序锁并写一次学生、按phone排序锁并写一次家长、最后按唯一关系键逐条锁并写；同批新建ID保存在Map供多条关系复用。更新学生学号不可改，转班插edu_student_class_history，所有已有实体version只递增一次并填写审计列。导入不能修改已存在家长的姓名或号码，已有手机姓名不同要求单独核实编辑。实体冲突全批回滚，成功 batch COMMITTED/version+1，留hash和计数，同事务写审计与幂等。任何未知版本不做覆盖。
4. 学生编辑：锁学生，先检查旧班与新班范围，版本相符才更新；campus_id查字典，class_id要求ACTIVE未删。转班同时写旧/新班及校区历史，旧考试名册和快照不更新。状态变毕业/离校/停用立刻由实时授权阻断，无需删成绩。
5. 家长编辑：锁家长、检查所有关联班级范围；号码变更或status变DISABLED同事务撤销ACTIVE绑定和ISSUED邀请，防旧微信继续访问；新号唯一冲突整事务回滚。姓名变更也必须reason核实依据，手机号不进响应。关系维护锁学生再家长，新增必须expectedVersion=0，已有关系逐版本更新verified_by/at，撤销不删历史。
6. 邀请：锁家长、校验版本和有效学生关系、target identity存在；guardian或identity已有绑定拒绝409；撤销该家长旧ISSUED邀请，再插24小时指定identity邀请并递增家长version；幂等只存invitationId等无凭据字段，命令执行或重放后均重新检查当前家长数据范围，再从数据库固定字段派生同一个HMAC token，重放也一致；范围撤销后不得靠旧幂等键取凭据。人工模式须学校先核实手机号/微信归属，evidenceRef只存档案编号。撤销绑定先重放再锁家长/校验版本，一并撤销未使用邀请；审计actor区分STAFF与EXTERNAL。
7. 单个建档同样校验学校校区、ACTIVE目标班级与范围，学号唯一，仅创建学生version=0，无需先有家长。GET详情按学生范围取字段白名单和该学生关联列表，phoneMasked在SQL中脱敏，不取全量家长或明文手机号。POST补录先重放再锁学生核版本/范围，按校方输入的规范手机号精确查家长并锁；不存在则新增，存在则要求ACTIVE、核实姓名精确一致且所有既有学生关系均在操作人范围，禁止默改姓名号码或按姓名合并；已有关系拒绝409转显式关系维护。创建VERIFIED关系、核实人时间、审计和幂等原子提交；之后走微信真实手机号激活或补漏邀请，输入手机号本身不授权。

## 4. 相关表完整 DDL

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**edu_student**

```sql
CREATE TABLE edu_student (
  student_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '正式学生ID',
  student_no VARCHAR(32) COLLATE utf8mb4_bin NOT NULL COMMENT '全校唯一学号，禁止改名匹配',
  student_name VARCHAR(64) NOT NULL COMMENT '学校核实的学生姓名',
  campus_id VARCHAR(32) NOT NULL COMMENT '复用现校区标识',
  class_id BIGINT NOT NULL COMMENT '当前班级',
  entry_year SMALLINT NOT NULL COMMENT '入学年度',
  status VARCHAR(16) NOT NULL COMMENT 'ACTIVE/GRADUATED/LEFT/DISABLED',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工ID',
  updated_by BIGINT NOT NULL COMMENT '更新员工ID',
  PRIMARY KEY (student_id),
  UNIQUE uk_student_no (
    student_no
  ),
  INDEX idx_student_class (class_id, status, student_id),
  INDEX idx_student_campus (campus_id, status),
  CONSTRAINT fk_student_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (
    campus_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_student_class FOREIGN KEY (class_id) REFERENCES edu_class (
    class_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_student_status CHECK (status IN ('ACTIVE', 'GRADUATED', 'LEFT', 'DISABLED')),
  CONSTRAINT ck_student_year CHECK (entry_year BETWEEN 1900 AND 2200),
  CONSTRAINT ck_student_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='正式学籍，不从招生预约推导'
COLLATE=utf8mb4_unicode_ci;
```

**edu_guardian**

```sql
CREATE TABLE edu_guardian (
  guardian_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '家长档案',
  guardian_name VARCHAR(64) NOT NULL COMMENT '核实姓名',
  phone_e164 VARCHAR(16) NOT NULL COMMENT '规范手机号，仅学校维护',
  status VARCHAR(16) NOT NULL COMMENT 'ACTIVE/DISABLED',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (guardian_id),
  UNIQUE uk_guardian_phone (
    phone_e164
  ),
  INDEX idx_guardian_status (status, guardian_id),
  CONSTRAINT ck_guardian_phone CHECK (REGEXP_LIKE(phone_e164, '^\\+861[3-9][0-9]{9}$')),
  CONSTRAINT ck_guardian_status CHECK (status IN ('ACTIVE', 'DISABLED')),
  CONSTRAINT ck_guardian_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='学校核实的家长，手机号不作为前端授权输入'
COLLATE=utf8mb4_unicode_ci;
```

**edu_student_guardian**

```sql
CREATE TABLE edu_student_guardian (
  link_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '监护关系',
  student_id BIGINT NOT NULL COMMENT '正式学生',
  guardian_id BIGINT NOT NULL COMMENT '家长',
  relation VARCHAR(8) NOT NULL COMMENT 'FATHER/MOTHER/OTHER',
  status VARCHAR(16) NOT NULL COMMENT 'VERIFIED/REVOKED',
  verified_by BIGINT NOT NULL COMMENT '学校核实员工',
  verified_at DATETIME(3) NOT NULL COMMENT 'UTC核实时间',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (link_id),
  UNIQUE uk_student_guardian (
    student_id,
    guardian_id
  ),
  INDEX idx_link_guardian (guardian_id, status, student_id),
  CONSTRAINT fk_link_student FOREIGN KEY (student_id) REFERENCES edu_student (
    student_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_link_guardian FOREIGN KEY (guardian_id) REFERENCES edu_guardian (
    guardian_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_link_relation CHECK (relation IN ('FATHER', 'MOTHER', 'OTHER')),
  CONSTRAINT ck_link_status CHECK (status IN ('VERIFIED', 'REVOKED')),
  CONSTRAINT ck_link_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='核实关系独立于微信和员工资格'
COLLATE=utf8mb4_unicode_ci;
```

**edu_guardian_identity**

```sql
CREATE TABLE edu_guardian_identity (
  identity_binding_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '微信家长绑定',
  guardian_id BIGINT NOT NULL COMMENT '家长',
  identity_id BIGINT NOT NULL COMMENT '外部身份',
  status VARCHAR(16) NOT NULL COMMENT 'ACTIVE/REVOKED',
  phone_verified_at DATETIME(3) NOT NULL COMMENT '真实号码核实时间',
  verification_method VARCHAR(16) NOT NULL COMMENT 'WECHAT_PHONE/MANUAL',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  active_guardian BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN guardian_id END) STORED COMMENT '有效家长唯一槽',
  active_identity BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'ACTIVE' THEN identity_id END) STORED COMMENT '有效微信唯一槽',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建主体ID，类型见edu_parent_audit.actor_type，禁止用于鉴权',
  updated_by BIGINT NOT NULL COMMENT '更新主体ID，类型见edu_parent_audit.actor_type，禁止用于鉴权',
  PRIMARY KEY (identity_binding_id),
  UNIQUE uk_active_guardian (
    active_guardian
  ),
  UNIQUE uk_active_identity (
    active_identity
  ),
  INDEX idx_binding_history (guardian_id, created_at),
  CONSTRAINT fk_gi_guardian FOREIGN KEY (guardian_id) REFERENCES edu_guardian (
    guardian_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_gi_identity FOREIGN KEY (identity_id) REFERENCES sys_external_identity (
    identity_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_gi_status CHECK (status IN ('ACTIVE', 'REVOKED')),
  CONSTRAINT ck_gi_method CHECK (verification_method IN ('WECHAT_PHONE', 'MANUAL')),
  CONSTRAINT ck_gi_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='不改变JWT kind的家长资格'
COLLATE=utf8mb4_unicode_ci;
```

**edu_guardian_invitation**

```sql
CREATE TABLE edu_guardian_invitation (
  invitation_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '一次邀请',
  guardian_id BIGINT NOT NULL COMMENT '已核实家长',
  target_identity_id BIGINT NOT NULL COMMENT '定向微信',
  verification_method VARCHAR(16) NOT NULL COMMENT 'WECHAT_PHONE/MANUAL',
  evidence_ref VARCHAR(128) NOT NULL COMMENT '校方核实依据编号，不放正文',
  expires_at DATETIME(3) NOT NULL COMMENT 'UTC截止，创建后24小时',
  status VARCHAR(16) NOT NULL COMMENT 'ISSUED/CONSUMED/REVOKED',
  consumed_binding_id BIGINT NULL COMMENT '消费后绑定',
  verified_by BIGINT NOT NULL COMMENT '核实员工',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新身份',
  PRIMARY KEY (invitation_id),
  INDEX idx_invitation_target (target_identity_id, status, expires_at),
  INDEX idx_invitation_guardian (guardian_id, status),
  CONSTRAINT fk_inv_guardian FOREIGN KEY (guardian_id) REFERENCES edu_guardian (
    guardian_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_inv_identity FOREIGN KEY (target_identity_id) REFERENCES sys_external_identity (
    identity_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_inv_binding FOREIGN KEY (consumed_binding_id) REFERENCES edu_guardian_identity (
    identity_binding_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_inv_status CHECK (status IN ('ISSUED', 'CONSUMED', 'REVOKED')),
  CONSTRAINT ck_inv_method CHECK (verification_method IN ('WECHAT_PHONE', 'MANUAL')),
  CONSTRAINT ck_inv_consumed CHECK ((
    status = 'CONSUMED' AND NOT consumed_binding_id IS NULL
  )
  OR (
    status <> 'CONSUMED' AND consumed_binding_id IS NULL
  )),
  CONSTRAINT ck_inv_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='定向单次限时邀请，不存明文token'
COLLATE=utf8mb4_unicode_ci;
```

**edu_parent_audit**

```sql
CREATE TABLE edu_parent_audit (
  audit_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '审计ID',
  actor_type VARCHAR(8) NOT NULL COMMENT 'STAFF/EXTERNAL',
  actor_id BIGINT NOT NULL COMMENT 'user_id或identity_id，由actor_type解释',
  action_code VARCHAR(64) NOT NULL COMMENT '固定动作',
  target_type VARCHAR(32) NOT NULL COMMENT '对象类型',
  target_id BIGINT NOT NULL COMMENT '对象ID，多态故无外键',
  before_version BIGINT NOT NULL COMMENT '操作前版本，新增为0',
  after_version BIGINT NOT NULL COMMENT '操作后版本',
  reason_ref VARCHAR(128) NOT NULL COMMENT '核实依据或原因编号',
  payload_hash CHAR(64) NOT NULL COMMENT '规范正文摘要',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC发生时间',
  PRIMARY KEY (audit_id),
  INDEX idx_parent_audit (target_type, target_id, audit_id),
  INDEX idx_audit_actor (actor_type, actor_id, created_at),
  CONSTRAINT ck_audit_actor CHECK (actor_type IN ('STAFF', 'EXTERNAL') AND actor_id > 0),
  CONSTRAINT ck_audit_versions CHECK (before_version >= 0 AND after_version >= before_version)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='只增审计，不写手机号分数正文'
COLLATE=utf8mb4_unicode_ci;
```

**edu_student_class_history**

```sql
CREATE TABLE edu_student_class_history (
  history_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '转班历史ID',
  student_id BIGINT NOT NULL COMMENT '学生',
  from_class_id BIGINT NOT NULL COMMENT '旧班',
  to_class_id BIGINT NOT NULL COMMENT '新班',
  from_campus_id VARCHAR(32) NOT NULL COMMENT '旧校区',
  to_campus_id VARCHAR(32) NOT NULL COMMENT '新校区',
  reason_ref VARCHAR(128) NOT NULL COMMENT '核实依据编号',
  effective_at DATETIME(3) NOT NULL COMMENT 'UTC生效时间',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  created_by BIGINT NOT NULL COMMENT '操作员工',
  PRIMARY KEY (history_id),
  INDEX idx_student_history (student_id, effective_at, history_id),
  CONSTRAINT fk_hist_student FOREIGN KEY (student_id) REFERENCES edu_student (
    student_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_hist_old_class FOREIGN KEY (from_class_id) REFERENCES edu_class (
    class_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_hist_new_class FOREIGN KEY (to_class_id) REFERENCES edu_class (
    class_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_hist_old_campus FOREIGN KEY (from_campus_id) REFERENCES doupi_recruit_campus (
    campus_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_hist_new_campus FOREIGN KEY (to_campus_id) REFERENCES doupi_recruit_campus (
    campus_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_history_change CHECK (from_class_id <> to_class_id OR from_campus_id <> to_campus_id)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='只增转班历史'
COLLATE=utf8mb4_unicode_ci;
```

**edu_roster_import**

```sql
CREATE TABLE edu_roster_import (
  batch_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '名册预览批次',
  status VARCHAR(16) NOT NULL COMMENT 'PREVIEW/COMMITTED',
  payload_json JSON NOT NULL COMMENT '服务端解析的规范名册，30日清理后空数组',
  errors_json JSON NOT NULL COMMENT '行级固定错误码',
  confirmation_hash CHAR(64) NOT NULL COMMENT '完整名册摘要',
  row_count INT NOT NULL COMMENT '数据行数',
  expires_at DATETIME(3) NOT NULL COMMENT 'UTC提交截止',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '仅创建员工能读正文',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (batch_id),
  INDEX idx_roster_owner (created_by, created_at, batch_id),
  INDEX idx_roster_expiry (status, expires_at),
  CONSTRAINT ck_roster_status CHECK (status IN ('PREVIEW', 'COMMITTED')),
  CONSTRAINT ck_roster_count CHECK (row_count BETWEEN 1 AND 5000),
  CONSTRAINT ck_roster_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='名册上传后预览确认，不接受前端替换暂存行'
COLLATE=utf8mb4_unicode_ci;
```

## 5. Controller → Service → Repository 完整骨架

下列类加上MINI-07完整ParentRepository/ParentService和公共ParentCommands为完整后端骨架。RosterXlsx 需开发依赖 Apache POI `poi-ooxml`（实施时在构建基线核定兼容版本，不在此修改pom）；只读取单元格，不执行公式。

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;import java.util.*;import org.springframework.web.bind.annotation.*;import org.springframework.web.multipart.MultipartFile;
@RestController @RequestMapping("/api/v1/office")
public class StudentController {
 private final StudentService s; public StudentController(StudentService s){this.s=s;}
 @GetMapping("/students") public Object list(@RequestParam(required=false) Long after,@RequestParam int limit,@RequestParam(required=false) Long classId,@RequestParam(required=false) String status){return ApiReply.of(s.list(after,limit,classId,status),200);}
 @PostMapping("/students") public Object create(@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.create(b,k),200);}
 @GetMapping("/students/{id}") public Object detail(@PathVariable long id){return ApiReply.of(s.detail(id),200);}
 @PostMapping("/students/{id}/guardians") public Object addGuardian(@PathVariable long id,@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.addGuardian(id,b,k),200);}
 @PostMapping("/students/import-preview") public Object preview(@RequestPart MultipartFile file,@RequestHeader("Idempotency-Key") String key){return ApiReply.of(s.preview(file,key),200);}
 @GetMapping("/students/imports/{id}") public Object batch(@PathVariable long id){return ApiReply.of(s.batch(id),200);}
 @PostMapping("/students/imports/{id}/commit") public Object commit(@PathVariable long id,@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.commit(id,b,k),200);}
 @PutMapping("/students/{id}") public Object edit(@PathVariable long id,@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.edit(id,b,k),200);}
 @PutMapping("/guardians/{id}") public Object guardian(@PathVariable long id,@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.guardian(id,b,k),200);}
 @PutMapping("/students/{student}/guardians/{guardian}") public Object link(@PathVariable long student,@PathVariable long guardian,@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.link(student,guardian,b,k),200);}
 @PostMapping("/guardians/{id}/invitations") public Object invite(@PathVariable long id,@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.invite(id,b,k),200);}
 @PostMapping("/guardians/{id}/identity-revocations") public Object revoke(@PathVariable long id,@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.revoke(id,b,k),200);}
}
```

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;import java.util.*;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import org.springframework.web.multipart.MultipartFile;
@Service
public class StudentService {
 private final StudentRepository r;private final ParentRepository p;private final ParentService parent;private final ParentCommands cmd;private final RosterXlsx xlsx;
 public StudentService(StudentRepository r,ParentRepository p,ParentService parent,ParentCommands cmd,RosterXlsx xlsx){this.r=r;this.p=p;this.parent=parent;this.cmd=cmd;this.xlsx=xlsx;}
 private void permission(String code){Actors.current().requireStaff();Actors.current().require(code);}
 private String choice(Map<String,Object>b,String key,Set<String> values){String v=Inputs.text(b,key,1,32);if(!values.contains(v))throw Problem.bad(key+"枚举非法");return v;}
 private void studentFields(Map<String,Object>b){Inputs.text(b,"studentName",1,64);Inputs.text(b,"campusId",1,32);r.activeClass(Inputs.id(b,"classId"));r.campus(Inputs.text(b,"campusId",1,32));long year=Inputs.positive(b,"entryYear");if(year<1900||year>2200)throw Problem.bad("入学年度超范围");choice(b,"status",Set.of("ACTIVE","GRADUATED","LEFT","DISABLED"));}
 private void phone(Map<String,Object>b){if(!Inputs.text(b,"phone",14,14).matches("\\+861[3-9][0-9]{9}"))throw Problem.bad("手机号格式错误");}
 @Transactional public Map<String,Object> create(Map<String,Object>b,String key){permission("student:maintain");return cmd.run("STUDENT_CREATE",key,b,()->{studentFields(b);Inputs.text(b,"studentNo",1,32);String reason=Inputs.text(b,"reason",1,128);long id=r.createStudent(b);p.audit(0,"STUDENT_CREATE","STUDENT",id,0,0,reason,Json.hash(b));return P.of("studentId",Long.toString(id),"version",0,"status",b.get("status"));});}
 @Transactional(readOnly=true) public Map<String,Object> detail(long id){permission("student:read");Map<String,Object>s=r.student(id,false);r.classScope(Inputs.number(s.get("class_id")));return r.studentDetail(s);}
 @Transactional public Map<String,Object> addGuardian(long id,Map<String,Object>b,String key){permission("guardian:maintain");return cmd.run("GUARDIAN_ADD",key,ParentCommands.payload(id,b),()->{Map<String,Object>s=r.student(id,true);r.classScope(Inputs.number(s.get("class_id")));ParentCommands.version(s,b);phone(b);String name=Inputs.text(b,"guardianName",1,64),relation=choice(b,"relation",Set.of("FATHER","MOTHER","OTHER")),reason=Inputs.text(b,"reason",1,128);Map<String,Object>g=r.guardianByPhone(b.get("phone").toString());long gid,gv;if(g.isEmpty()){gid=r.createGuardian(name,b.get("phone").toString());gv=0;}else{gid=Inputs.number(g.get("guardian_id"));gv=Inputs.number(g.get("version"));r.guardianScope(gid);if(!"ACTIVE".equals(g.get("status"))||!name.equals(g.get("guardian_name")))throw Problem.conflict("已有手机号档案需教务单独核实");}if(!r.link(id,gid).isEmpty())throw Problem.conflict("关系已存在，请使用显式关系维护");long link=r.saveLink(id,gid,P.of("relation",relation,"status","VERIFIED"),Map.of());p.audit(0,"GUARDIAN_ADD","LINK",link,0,0,reason,Json.hash(b));return P.of("studentId",Long.toString(id),"guardianId",Long.toString(gid),"guardianVersion",gv,"linkId",Long.toString(link),"linkVersion",0,"status","VERIFIED");});}
 @Transactional(readOnly=true) public Map<String,Object> list(Long after,int limit,Long classId,String status){permission("student:read");if(limit<1||limit>100||after!=null&&after<=0)throw Problem.bad("分页参数错误");if(classId!=null)r.classScope(classId);if(status!=null&&!Set.of("ACTIVE","GRADUATED","LEFT","DISABLED").contains(status))throw Problem.bad("状态错误");List<Map<String,Object>>rows=r.list(after,limit+1,classId,status);boolean more=rows.size()>limit;if(more)rows.remove(rows.size()-1);return P.of("items",rows,"nextAfter",more?rows.get(rows.size()-1).get("student_id"):null);}
 @Transactional public Map<String,Object> preview(MultipartFile file,String key){permission("student:maintain");List<Map<String,Object>>rows=xlsx.read(file,RosterXlsx.ROSTER);return cmd.run("ROSTER_PREVIEW",key,P.of("rows",rows),()->{List<Map<String,Object>> errors=validate(rows);long id=r.newBatch(rows,errors);return r.preview(id,false);});}
 private Map<String,Object>part(Map<String,Object>b,List<String>keys){Map<String,Object>out=new LinkedHashMap<>();for(String k:keys)out.put(k,b.get(k));return out;}
 private List<Map<String,Object>> validate(List<Map<String,Object>>rows){List<Map<String,Object>>errors=new ArrayList<>();Map<String,String>students=new HashMap<>(),guardians=new HashMap<>();Set<String>links=new HashSet<>();for(int n=0;n<rows.size();n++){Map<String,Object>b=rows.get(n);try{studentFields(b);String no=Inputs.text(b,"studentNo",1,32);phone(b);String ph=b.get("phone").toString();Inputs.text(b,"guardianName",1,64);choice(b,"relation",Set.of("FATHER","MOTHER","OTHER"));String sh=Json.hash(part(b,List.of("studentNo","studentName","campusId","classId","entryYear","status","studentVersion"))),gh=Json.hash(part(b,List.of("phone","guardianName","guardianVersion")));String oldS=students.putIfAbsent(no,sh),oldG=guardians.putIfAbsent(ph,gh);if(oldS!=null&&!oldS.equals(sh)||oldG!=null&&!oldG.equals(gh)||!links.add(no+":"+ph))throw Problem.bad("重复实体字段不一致或关系重复");r.checkRosterVersions(b,false);}catch(Problem e){errors.add(P.of("row",n+2,"code","ROW_INVALID"));}}return errors;}
 @Transactional(readOnly=true) public Map<String,Object> batch(long id){permission("student:maintain");r.batch(id,false);return r.preview(id,true);}
 @Transactional public Map<String,Object> commit(long id,Map<String,Object>b,String key){permission("student:maintain");return cmd.run("ROSTER_COMMIT",key,ParentCommands.payload(id,b),()->{Map<String,Object>batch=r.batch(id,true);if("COMMITTED".equals(batch.get("status")))return P.of("batchId",Long.toString(id),"status","COMMITTED","rowCount",batch.get("row_count"),"version",batch.get("version"));ParentCommands.version(batch,b);if(!Inputs.text(b,"confirmationHash",64,64).equals(batch.get("confirmation_hash")))throw Problem.conflict("预览内容已变化");List<Map<String,Object>>rows=ParentCommands.rows(Json.readMap("{\"rows\":"+batch.get("payload_json")+"}"),"rows");if(!validate(rows).isEmpty())throw new Problem(422,"ROSTER_INVALID","请重新上传并处理错误");r.applyRoster(rows);r.commitBatch(id);p.audit(0,"ROSTER_COMMIT","ROSTER",id,0,1,"ROSTER",Json.hash(b));return P.of("batchId",Long.toString(id),"status","COMMITTED","rowCount",rows.size(),"version",1);});}
 @Transactional public Map<String,Object> edit(long id,Map<String,Object>b,String key){permission("student:maintain");return cmd.run("STUDENT_EDIT",key,ParentCommands.payload(id,b),()->{Map<String,Object>old=r.student(id,true);r.classScope(Inputs.number(old.get("class_id")));ParentCommands.version(old,b);studentFields(b);String reason=Inputs.text(b,"reason",1,128);r.updateStudent(id,b,reason);long v=Inputs.number(old.get("version"))+1;p.audit(0,"STUDENT_EDIT","STUDENT",id,v-1,v,reason,Json.hash(b));return P.of("studentId",Long.toString(id),"version",v,"status",b.get("status"));});}
 @Transactional public Map<String,Object> guardian(long id,Map<String,Object>b,String key){permission("guardian:maintain");return cmd.run("GUARDIAN_EDIT",key,ParentCommands.payload(id,b),()->{Map<String,Object>old=p.guardian(id);r.guardianScope(id);ParentCommands.version(old,b);phone(b);Inputs.text(b,"guardianName",1,64);String state=choice(b,"status",Set.of("ACTIVE","DISABLED")),reason=Inputs.text(b,"reason",1,128);if(!b.get("phone").equals(old.get("phone_e164"))||state.equals("DISABLED"))r.revoke(id);r.updateGuardian(id,b);long v=Inputs.number(old.get("version"))+1;p.audit(0,"GUARDIAN_EDIT","GUARDIAN",id,v-1,v,reason,Json.hash(b));return P.of("guardianId",Long.toString(id),"version",v,"status",state);});}
 @Transactional public Map<String,Object> link(long student,long guardian,Map<String,Object>b,String key){permission("guardian:maintain");Map<String,Object>payload=ParentCommands.payload(student,b);payload.put("guardianId",Long.toString(guardian));return cmd.run("GUARDIAN_LINK",key,payload,()->{Map<String,Object>s=r.student(student,true);r.classScope(Inputs.number(s.get("class_id")));p.guardian(guardian);r.guardianScope(guardian);choice(b,"relation",Set.of("FATHER","MOTHER","OTHER"));choice(b,"status",Set.of("VERIFIED","REVOKED"));String reason=Inputs.text(b,"reason",1,128);Map<String,Object>old=r.link(student,guardian);long expected=Inputs.nonNegative(b,"expectedVersion");if(old.isEmpty()&&expected!=0)throw Problem.conflict("新关系版本必须0");if(!old.isEmpty())ParentCommands.version(old,b);long id=r.saveLink(student,guardian,b,old);long v=old.isEmpty()?0:Inputs.number(old.get("version"))+1;p.audit(0,"GUARDIAN_LINK","LINK",id,old.isEmpty()?0:v-1,v,reason,Json.hash(payload));return P.of("linkId",Long.toString(id),"version",v,"status",b.get("status"));});}
 @Transactional public Map<String,Object> invite(long id,Map<String,Object>b,String key){permission("guardian:maintain");Map<String,Object>result=cmd.run("GUARDIAN_INVITE",key,ParentCommands.payload(id,b),()->{Map<String,Object>g=p.guardian(id);r.guardianScope(id);ParentCommands.version(g,b);long identity=Inputs.id(b,"targetIdentityId");String mode=choice(b,"verificationMethod",Set.of("WECHAT_PHONE","MANUAL")),evidence=Inputs.text(b,"evidenceRef",1,128);r.identity(identity);if(!"ACTIVE".equals(g.get("status"))||!p.hasChild(id))throw Problem.conflict("没有有效学生关联");if(!p.activeBindings(id,identity).isEmpty())throw Problem.conflict("已绑定，请先学校核实撤销");long invitation=r.invite(id,identity,mode,evidence);long v=Inputs.number(g.get("version"))+1;p.audit(0,"GUARDIAN_INVITE","GUARDIAN",id,v-1,v,evidence,Json.hash(b));return P.of("invitationId",Long.toString(invitation),"targetIdentityId",Long.toString(identity),"expiresAt",ParentFormats.utc(r.inviteRow(invitation).get("expires_at")));});r.guardianScope(id);Map<String,Object>i=r.inviteRow(Long.parseLong(result.get("invitationId").toString()));result.put("token",parent.token(i));return result;}
 @Transactional public Map<String,Object> revoke(long id,Map<String,Object>b,String key){permission("guardian:maintain");return cmd.run("GUARDIAN_REVOKE",key,ParentCommands.payload(id,b),()->{Map<String,Object>g=p.guardian(id);r.guardianScope(id);ParentCommands.version(g,b);String reason=Inputs.text(b,"reason",1,128);int count=r.revoke(id);r.bumpGuardian(id);long v=Inputs.number(g.get("version"))+1;p.audit(0,"GUARDIAN_REVOKE","GUARDIAN",id,v-1,v,reason,Json.hash(b));return P.of("guardianId",Long.toString(id),"version",v,"revoked",count);});}
}
```

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;import java.util.*;import org.springframework.stereotype.Repository;
@Repository
public class StudentRepository {
 private final Db db;public StudentRepository(Db db){this.db=db;}
 public void classScope(long id){Map<String,Object>c=db.required("SELECT dept_id FROM edu_class WHERE class_id=#{p.id} AND del_flag='0'",P.of("id",id));Actor a=Actors.current();if(!a.allData()&&(c.get("dept_id")==null||!a.scopeDeptIds().contains(Inputs.number(c.get("dept_id")))))throw Problem.forbidden("班级超出管理范围");}
 public void activeClass(long id){classScope(id);db.required("SELECT class_id FROM edu_class WHERE class_id=#{p.id} AND status='ACTIVE' AND del_flag='0'",P.of("id",id));}
 public void campus(String id){db.required("SELECT campus_id FROM doupi_recruit_campus WHERE campus_id=#{p.id}",P.of("id",id));}
 public void identity(long id){db.required("SELECT identity_id FROM sys_external_identity WHERE identity_id=#{p.id}",P.of("id",id));}
 public Map<String,Object>student(long id,boolean lock){return db.required("SELECT * FROM edu_student WHERE student_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));}
 public long createStudent(Map<String,Object>b){Map<String,Object>p=params(b);return db.insert("INSERT INTO edu_student(student_no,student_name,campus_id,class_id,entry_year,status,version,created_at,updated_at,created_by,updated_by) VALUES(#{p.studentNo},#{p.studentName},#{p.campusId},#{p.classId},#{p.entryYear},#{p.status},0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u},#{p.u})",p);}
 public Map<String,Object>guardianByPhone(String phone){return db.one("SELECT * FROM edu_guardian WHERE phone_e164=#{p.phone} FOR UPDATE",P.of("phone",phone));}
 public long createGuardian(String name,String phone){return db.insert("INSERT INTO edu_guardian(guardian_name,phone_e164,status,version,created_at,updated_at,created_by,updated_by) VALUES(#{p.n},#{p.phone},'ACTIVE',0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u},#{p.u})",P.of("n",name,"phone",phone,"u",Actors.current().userId()));}
 public Map<String,Object>studentDetail(Map<String,Object>s){Map<String,Object>student=P.of("student_id",s.get("student_id").toString(),"student_no",s.get("student_no"),"student_name",s.get("student_name"),"campus_id",s.get("campus_id"),"class_id",s.get("class_id").toString(),"entry_year",s.get("entry_year"),"status",s.get("status"),"version",s.get("version"));List<Map<String,Object>>guardians=db.list("SELECT CAST(g.guardian_id AS CHAR) guardian_id,g.guardian_name,CONCAT(LEFT(g.phone_e164,6),'****',RIGHT(g.phone_e164,4)) phoneMasked,g.status guardianStatus,g.version guardianVersion,CAST(l.link_id AS CHAR) link_id,l.relation,l.status linkStatus,l.version linkVersion FROM edu_student_guardian l JOIN edu_guardian g ON g.guardian_id=l.guardian_id WHERE l.student_id=#{p.id} ORDER BY l.link_id",P.of("id",s.get("student_id")));return P.of("student",student,"guardians",guardians);}
 public List<Map<String,Object>>list(Long after,int limit,Long classId,String status){Actor a=Actors.current();Map<String,Object>p=P.of("after",after,"limit",limit,"class",classId,"status",status,"all",a.allData()?1:0,"scope",Json.write(a.scopeDeptIds()));List<Map<String,Object>>rows=db.list("SELECT CAST(s.student_id AS CHAR) student_id,s.student_no,s.student_name,s.campus_id,CAST(s.class_id AS CHAR) class_id,s.entry_year,s.status,s.version FROM edu_student s JOIN edu_class c ON c.class_id=s.class_id WHERE (#{p.after} IS NULL OR s.student_id>#{p.after}) AND (#{p.class} IS NULL OR s.class_id=#{p.class}) AND (#{p.status} IS NULL OR s.status=#{p.status}) AND (#{p.all}=1 OR JSON_CONTAINS(CAST(#{p.scope} AS JSON),CAST(c.dept_id AS JSON))) ORDER BY s.student_id LIMIT #{p.limit}",p);return new ArrayList<>(rows);}
 public void guardianScope(long id){for(Map<String,Object>r:db.list("SELECT DISTINCT s.class_id FROM edu_student_guardian l JOIN edu_student s ON s.student_id=l.student_id WHERE l.guardian_id=#{p.id}",P.of("id",id)))classScope(Inputs.number(r.get("class_id")));}
 public Map<String,Object>link(long s,long g){return db.one("SELECT * FROM edu_student_guardian WHERE student_id=#{p.s} AND guardian_id=#{p.g} FOR UPDATE",P.of("s",s,"g",g));}
 private void expected(Object supplied,Map<String,Object>old){if(old.isEmpty()){if(!"NEW".equals(supplied))throw Problem.conflict("新记录须明确NEW");}else{if("NEW".equals(supplied)||Inputs.number(supplied)!=Inputs.number(old.get("version")))throw Problem.conflict("导入版本已变化");}}
 public void checkRosterVersions(Map<String,Object>b,boolean lock){String suffix=lock?" FOR UPDATE":"";Map<String,Object>s=db.one("SELECT * FROM edu_student WHERE student_no=#{p.no}"+suffix,P.of("no",b.get("studentNo")));Map<String,Object>g=db.one("SELECT * FROM edu_guardian WHERE phone_e164=#{p.phone}"+suffix,P.of("phone",b.get("phone")));expected(b.get("studentVersion"),s);expected(b.get("guardianVersion"),g);if(!s.isEmpty())classScope(Inputs.number(s.get("class_id")));if(!g.isEmpty()){guardianScope(Inputs.number(g.get("guardian_id")));if(!g.get("guardian_name").equals(b.get("guardianName")))throw Problem.conflict("已有家长姓名不一致，请单独核实");}Map<String,Object>l=s.isEmpty()||g.isEmpty()?Map.of():db.one("SELECT version FROM edu_student_guardian WHERE student_id=#{p.s} AND guardian_id=#{p.g}"+suffix,P.of("s",s.get("student_id"),"g",g.get("guardian_id")));expected(b.get("linkVersion"),l);}
 public long newBatch(List<Map<String,Object>>rows,List<Map<String,Object>>errors){return db.insert("INSERT INTO edu_roster_import(status,payload_json,errors_json,confirmation_hash,row_count,expires_at,version,created_at,updated_at,created_by,updated_by) VALUES('PREVIEW',#{p.rows},#{p.errors},#{p.hash},#{p.count},DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 24 HOUR),0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.user},#{p.user})",P.of("rows",Json.write(rows),"errors",Json.write(errors),"hash",Json.hash(rows),"count",rows.size(),"user",Actors.current().userId()));}
 public Map<String,Object>batch(long id,boolean lock){Map<String,Object>b=db.required("SELECT *,expires_at<=UTC_TIMESTAMP(3) expired FROM edu_roster_import WHERE batch_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));if(Inputs.number(b.get("created_by"))!=Actors.current().userId())throw Problem.notFound("批次不存在");if(!"COMMITTED".equals(b.get("status"))&&Inputs.number(b.get("expired"))==1)throw new Problem(410,"BATCH_EXPIRED","预览已过期");return b;}
 public Map<String,Object>preview(long id,boolean content){Map<String,Object>b=batch(id,false);Map<String,Object>r=P.of("batchId",Long.toString(id),"status",b.get("status"),"version",b.get("version"),"rowCount",b.get("row_count"),"rows",content?Json.readMap("{\"x\":"+b.get("payload_json")+"}").get("x"):b.get("row_count"),"errors",Json.readMap("{\"x\":"+b.get("errors_json")+"}").get("x"),"confirmationHash",b.get("confirmation_hash"),"expiresAt",ParentFormats.utc(b.get("expires_at")));return r;}
 public void commitBatch(long id){db.write("UPDATE edu_roster_import SET status='COMMITTED',version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.u} WHERE batch_id=#{p.id}",P.of("id",id,"u",Actors.current().userId()));}
 private Map<String,Object>params(Map<String,Object>b){Map<String,Object>p=new LinkedHashMap<>(b);p.put("u",Actors.current().userId());return p;}
 public void applyRoster(List<Map<String,Object>>rows){SortedMap<String,Map<String,Object>>studentRows=new TreeMap<>(),guardianRows=new TreeMap<>(),linkRows=new TreeMap<>();for(Map<String,Object>b:rows){studentRows.putIfAbsent(b.get("studentNo").toString(),b);guardianRows.putIfAbsent(b.get("phone").toString(),b);linkRows.put(b.get("studentNo")+":"+b.get("phone"),b);}Map<String,Long>studentIds=new HashMap<>(),guardianIds=new HashMap<>();for(Map.Entry<String,Map<String,Object>>entry:studentRows.entrySet()){Map<String,Object>b=entry.getValue(),p=params(b),old=db.one("SELECT * FROM edu_student WHERE student_no=#{p.studentNo} FOR UPDATE",p);expected(b.get("studentVersion"),old);if(!old.isEmpty())classScope(Inputs.number(old.get("class_id")));classScope(Inputs.id(b,"classId"));long id;if(old.isEmpty())id=db.insert("INSERT INTO edu_student(student_no,student_name,campus_id,class_id,entry_year,status,version,created_at,updated_at,created_by,updated_by) VALUES(#{p.studentNo},#{p.studentName},#{p.campusId},#{p.classId},#{p.entryYear},#{p.status},0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u},#{p.u})",p);else{id=Inputs.number(old.get("student_id"));updateStudent(id,b,"ROSTER_IMPORT");}studentIds.put(entry.getKey(),id);}for(Map.Entry<String,Map<String,Object>>entry:guardianRows.entrySet()){Map<String,Object>b=entry.getValue(),p=params(b),old=db.one("SELECT * FROM edu_guardian WHERE phone_e164=#{p.phone} FOR UPDATE",p);expected(b.get("guardianVersion"),old);long id;if(old.isEmpty())id=db.insert("INSERT INTO edu_guardian(guardian_name,phone_e164,status,version,created_at,updated_at,created_by,updated_by) VALUES(#{p.guardianName},#{p.phone},'ACTIVE',0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u},#{p.u})",p);else{id=Inputs.number(old.get("guardian_id"));guardianScope(id);if(!"ACTIVE".equals(old.get("status"))||!old.get("guardian_name").equals(b.get("guardianName")))throw Problem.conflict("家长需先学校单独核实");bumpGuardian(id);}guardianIds.put(entry.getKey(),id);}for(Map<String,Object>b:linkRows.values()){long sid=studentIds.get(b.get("studentNo")),gid=guardianIds.get(b.get("phone"));Map<String,Object>old=link(sid,gid);expected(b.get("linkVersion"),old);saveLink(sid,gid,P.of("relation",b.get("relation"),"status","VERIFIED"),old);}}
 public void updateStudent(long id,Map<String,Object>b,String reason){Map<String,Object>old=student(id,true),p=params(b);p.put("id",id);if(!old.get("class_id").toString().equals(b.get("classId").toString())||!old.get("campus_id").equals(b.get("campusId"))){db.insert("INSERT INTO edu_student_class_history(student_id,from_class_id,to_class_id,from_campus_id,to_campus_id,reason_ref,effective_at,created_at,created_by) VALUES(#{p.id},#{p.oldClass},#{p.newClass},#{p.oldCampus},#{p.newCampus},#{p.reason},UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u})",P.of("id",id,"oldClass",old.get("class_id"),"newClass",b.get("classId"),"oldCampus",old.get("campus_id"),"newCampus",b.get("campusId"),"reason",reason,"u",Actors.current().userId()));}db.write("UPDATE edu_student SET student_name=#{p.studentName},campus_id=#{p.campusId},class_id=#{p.classId},entry_year=#{p.entryYear},status=#{p.status},version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.u} WHERE student_id=#{p.id}",p);}
 public void updateGuardian(long id,Map<String,Object>b){Map<String,Object>p=params(b);p.put("id",id);db.write("UPDATE edu_guardian SET guardian_name=#{p.guardianName},phone_e164=#{p.phone},status=#{p.status},version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.u} WHERE guardian_id=#{p.id}",p);}
 public long saveLink(long s,long g,Map<String,Object>b,Map<String,Object>old){Map<String,Object>p=params(b);p.put("s",s);p.put("g",g);if(old.isEmpty())return db.insert("INSERT INTO edu_student_guardian(student_id,guardian_id,relation,status,verified_by,verified_at,version,created_at,updated_at,created_by,updated_by) VALUES(#{p.s},#{p.g},#{p.relation},#{p.status},#{p.u},UTC_TIMESTAMP(3),0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u},#{p.u})",p);p.put("id",old.get("link_id"));db.write("UPDATE edu_student_guardian SET relation=#{p.relation},status=#{p.status},verified_by=#{p.u},verified_at=UTC_TIMESTAMP(3),version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.u} WHERE link_id=#{p.id}",p);return Inputs.number(old.get("link_id"));}
 public void bumpGuardian(long id){db.write("UPDATE edu_guardian SET version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.u} WHERE guardian_id=#{p.id}",P.of("id",id,"u",Actors.current().userId()));}
 public int revoke(long id){int n=db.write("UPDATE edu_guardian_identity SET status='REVOKED',version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.u} WHERE guardian_id=#{p.id} AND status='ACTIVE'",P.of("id",id,"u",Actors.current().userId()));db.write("UPDATE edu_guardian_invitation SET status='REVOKED',version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.u} WHERE guardian_id=#{p.id} AND status='ISSUED'",P.of("id",id,"u",Actors.current().userId()));return n;}
 public long invite(long id,long identity,String mode,String evidence){db.write("UPDATE edu_guardian_invitation SET status='REVOKED',version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.u} WHERE guardian_id=#{p.id} AND status='ISSUED'",P.of("id",id,"u",Actors.current().userId()));long i=db.insert("INSERT INTO edu_guardian_invitation(guardian_id,target_identity_id,verification_method,evidence_ref,expires_at,status,verified_by,version,created_at,updated_at,created_by,updated_by) VALUES(#{p.g},#{p.i},#{p.m},#{p.e},DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 24 HOUR),'ISSUED',#{p.u},0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u},#{p.u})",P.of("g",id,"i",identity,"m",mode,"e",evidence,"u",Actors.current().userId()));bumpGuardian(id);return i;}
 public Map<String,Object>inviteRow(long id){return db.required("SELECT invitation_id,target_identity_id,expires_at FROM edu_guardian_invitation WHERE invitation_id=#{p.id}",P.of("id",id));}
}
```

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;import java.util.*;import java.math.BigDecimal;import org.springframework.stereotype.Component;import org.springframework.web.multipart.MultipartFile;import org.apache.poi.ss.usermodel.*;import org.apache.poi.xssf.usermodel.XSSFWorkbook;import org.apache.poi.openxml4j.util.ZipSecureFile;
@Component
public class RosterXlsx {
 public static final List<String>ROSTER=List.of("studentNo","studentName","campusId","classId","entryYear","status","studentVersion","guardianName","phone","guardianVersion","relation","linkVersion");
 public List<Map<String,Object>>read(MultipartFile file,List<String>headers){if(file.isEmpty()||file.getSize()>10*1024*1024||file.getOriginalFilename()==null||!file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx"))throw Problem.bad("仅支持10MiB内xlsx");ZipSecureFile.setMinInflateRatio(0.01);ZipSecureFile.setMaxEntrySize(20*1024*1024);try(XSSFWorkbook w=new XSSFWorkbook(file.getInputStream())){if(w.getNumberOfSheets()!=1||w.isSheetHidden(0)||w.isSheetVeryHidden(0))throw Problem.bad("必须单个可见sheet");Sheet sheet=w.getSheetAt(0);if(sheet.getNumMergedRegions()!=0||sheet.getLastRowNum()<1||sheet.getLastRowNum()>5000)throw Problem.bad("行数或合并区域不合法");Row title=sheet.getRow(0);if(title==null||title.getLastCellNum()!=headers.size())throw Problem.bad("表头不匹配");for(int c=0;c<headers.size();c++)if(!headers.get(c).equals(value(title.getCell(c),true)))throw Problem.bad("表头不匹配");List<Map<String,Object>>rows=new ArrayList<>();for(int n=1;n<=sheet.getLastRowNum();n++){Row row=sheet.getRow(n);if(row==null||row.getLastCellNum()>headers.size())throw Problem.bad("空行或额外列");Map<String,Object>m=new LinkedHashMap<>();for(int c=0;c<headers.size();c++){String h=headers.get(c);m.put(h,value(row.getCell(c),Set.of("studentNo","phone","studentName","guardianName","campusId","classId","subjectCode").contains(h)));}rows.add(m);}return rows;}catch(java.io.IOException|IllegalArgumentException e){throw new Problem(422,"XLSX_INVALID","无法读取工作簿");}}
 private String value(Cell cell,boolean text){if(cell==null||cell.getCellType()==CellType.BLANK)return "";if(cell.getCellType()==CellType.FORMULA||cell.getCellType()==CellType.ERROR||cell.getCellType()==CellType.BOOLEAN)throw Problem.bad("不接受公式/错误/布尔单元格");if(cell.getCellType()==CellType.STRING)return cell.getStringCellValue().strip();if(text||DateUtil.isCellDateFormatted(cell))throw Problem.bad("学号手机号姓名校区科目必须文本，日期不支持");return BigDecimal.valueOf(cell.getNumericCellValue()).stripTrailingZeros().toPlainString();}
}
```

## 6. 边界与异常场景处理

跨范围403，跨owner批次404，预览过期410，版本/学号/手机号冲突409，格式或行错误422；不返回手机号或SQL异常正文。批次成功后旧版本同键重放先于版本检查；并发导入相同学号的唯一键冲突全批回滚并提示重新预览。导入支持同批多孩子共享家长及同孩多家长，按学号/手机号分组去重只写实体一次，同实体字段或预期版本冲突报行错误；同一关系重复报错，绝不按姓名自动合并。校区变更与转班均保留历史。人工核实说明只记证据编号，不收证件影像。审计日志只含对象ID、动作、版本和traceId，所有响应no-store；私密预览30日清理须实施时补定时运维，不在本文声称已运行。验收至少含批量多家长/多孩子、同名学生、学号前导0、0版本创建、已绑号变更、并发撤销/激活、导入后转班保留历史、成绩发布后档案停用。
