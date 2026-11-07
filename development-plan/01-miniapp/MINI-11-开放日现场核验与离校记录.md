# MINI-11 开放日现场核验与离校记录

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#mini-11)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，3个工作日；依赖MINI-10逐人预约与凭证。** 按单人Java开发者结合AI，覆盖员工小程序、家长自报入口、后端与人工验收。2026-11-05文档计划；DDL、Java均未落业务源码、参考工程或数据库，未编译、未运行。公共基础仅只读引用[公共契约](../00-shared/公共契约.md)。

学校开放日供在校家长入校当面送物，一活动为单校区、单上海日期的一次安排，可含多时段；与招生访校核销分离。员工扫描每位实名访客独立凭证，先看最少必要核验资料再确认该人入校；同单可分批到访，扫码1人绝不能把预约2人全标入校。重复确认同人返回原事实，不叠加人次。同行人不能获得任何学生权限。

离校记录可选，提供员工现场登记STAFF、预约创建家长自报PARENT_SELF、员工核实补录MANUAL_VERIFIED。所有来源与操作身份可审计，自报不得冒充已核实事实；unknown actual_exit_at必须NULL，用exit_recorded_at标何时录入。核实可把已有自报升级为MANUAL_VERIFIED，保留原EXIT与新EXIT_VERIFIED事件。未登记不代表仍在校，结束不自动标离校，不强制人人出校扫码；不包含门禁硬件、人脸或强制离校。预约容量是累计预约来访人数，离校不释放名额。

未来文件任务（本轮只写Markdown）：

- [ ] `backend/src/main/java/com/doupi/planref/openday/{OpenDayVisitController,OpenDayVisitService}.java`：预览、逐人入校、三来源离校、现场台账；共享Repository/Kernel/Tickets复用MINI-10，不重复实现。
- [ ] `doupi-miniApp/pages/staff/open-day/{scan,visitor,ledger}/`：只扫描开放日票据；显示姓名、活动日期、预约时段、该单学生最小核对信息、交接区及单人状态；当前访客确认后才提交。
- [ ] `doupi-miniApp/pages/parent/open-day/detail/`：每人“自报离校”按钮、明确非学校核验标签；订单仅创建人能操作。
- [ ] `doupi-miniApp/services/openDay.js`：预览不修改、写动作固定键重试、401重新认证、409刷新；扫码授权与相机权限不互相替代。

分日任务与验收：

- [ ] D1：实现员工权限+校区范围、票据摘要恒时校验、单人预览和入校锁序；人工核查错校区、停办、过期、错visitorId不能入校。
- [ ] D2：实现三种离校来源、未知时间NULL、家长自报及员工核实升级、不覆盖原事件；完成小程序逐人按钮、状态和台账。
- [ ] D3：分批/重复扫描、同键超时、同人不同键重复入校、取消竞争、停办后既有事实、活动结束无离校的人工回归；检查审计与脱敏日志。

验收：一单2访客扫第1人的码，只有其entered_at写入且仅1条ENTER事件；第2人后到可独立登记。同码重复不同键不会写第2条ENTER；同键先重放后验版本。0人已入校可被家长取消，任意1人已入校阻止整单取消。只有当前创建家长能自报，另一监护人/同行无权。自报actual_exit_at=NULL，员工核实补录仍保留原自报事件。台账写“已入校未登记离校人数”，不显示“实时在校人数”。

## 2. 接口设计清单

通用外层`code:int,msg:string,traceId:string,replayed:boolean,data:object`；所有API必填`Authorization:Bearer string`，操作者只取Actors.current。输出ID十进制字符串；输入ID为正long或十进制字符串；version为整数。新增DATETIME在UTC连接会话存UTC；输入时间必须带Z或offset，输出UTC Z，visit_date为上海日历日期。写接口必填`Idempotency-Key:string8..64随机字母数字_-`；body禁止userId/guardianId/identityId。预览是只读，不需要幂等键。

| 接口名称 | 请求方式 | 绝对路径 | 完整请求字段：类型/必填/含义 | 返回字段：类型/含义 | 权限要求 |
|---|---|---|---|---|---|
| 扫码只读预览单人 | POST | `/api/v1/staff/open-day-visitors/preview` | Authorization:string/是；token:string1..200/是/body家长出示的该位实名人员凭证；无Idempotency-Key | visitor_id/booking_id/event_id:string人员/订单/活动；visitor_name:string实名姓名；entered_at:UTC datetime或null；exit_source:string STAFF/PARENT_SELF/MANUAL_VERIFIED或null；actual_exit_at/exit_recorded_at:UTC datetime或null；version:long；event_title:string活动标题；visit_date:date上海活动日；slot_id:string预约时段；starts_at/ends_at:UTC datetime预约起止；students:object[]仅本单student_id:string、student_no:string、student_name:string预约时姓名快照、class_name:string当前班名；handover_area:string交接区域；credential_active:boolean当前预约/活动/有效期是否允许凭证使用。仅返回本单孩子核对信息，不返回其它订单孩子、其它访客、手机号或token_hash | 员工认证+`open-day:verify`+活动校区范围；token本身不授予员工权限；失效票据只可显示授权员工最少必要历史事实 |
| 确认单人入校 | POST | `/api/v1/staff/open-day-visitors/{id}/enter` | id:long>0/是/path具体visitor；Authorization:string/是；Idempotency-Key:string/是；token:string1..200/是/body须指向id；expectedVersion:long>=0/是/预览中的该访客版本 | visitor_id/booking_id:string；visitor_name:string；entered_at:UTC datetime该人实际登记时间；exit_source:string或null；actual_exit_at/exit_recorded_at:UTC datetime或null；version:long。已入校重复调用回原entered_at，不增加事件或改变他人 | `open-day:verify`+校区范围；活动PUBLISHED/STOPPED、预约BOOKED、凭证有效、当前在预约时段；再核实学生/创建家长关系仍有效 |
| 员工离校登记或核实补录 | POST | `/api/v1/staff/open-day-visitors/{id}/exit` | id:long>0/是/path；Authorization:string/是；Idempotency-Key:string/是；expectedVersion:long>=0/是/访客版本；source:string STAFF或MANUAL_VERIFIED/是/body服务端仅接受两类员工来源；actualExitAt:ISO8601带offset datetime/否/明确获知实际离校时间，未知必须不传或null；reason:string1..500/核实补录是、现场登记否/核实依据或说明 | visitor_id/booking_id:string；visitor_name:string；entered_at:UTC datetime；exit_source:string STAFF或MANUAL_VERIFIED；actual_exit_at:UTC datetime或null；exit_recorded_at:UTC datetime当前登记时间；version:long；已有记录的无变化重试返回现有来源事实，不能冒充本次已修改 | 员工+`open-day:exit`+活动校区范围；必须已有入校事实；停办或结束后也可补登记历史，不重新开放凭证 |
| 预约创建人自报某位同行已离校 | POST | `/api/v1/parent/open-day-visitors/{id}/exit` | id:long>0/是/path该单具体visitor；Authorization:string/是；Idempotency-Key:string/是；expectedVersion:long>=0/是；reason:string0..500/否/body补充说明；禁止source、actualExitAt、操作者字段 | visitor_id/booking_id:string；visitor_name:string；entered_at:UTC datetime；exit_source:string PARENT_SELF（若已有其它更强登记则回已有来源）；actual_exit_at:固定null或已有核实事实；exit_recorded_at:UTC datetime登记时间；version:long | 当前ACTIVE家长身份映射必须为订单creator_guardian_id；VERIFIED关系不让另一监护人取得整单操作权；同行无权 |
| 活动逐人现场台账 | GET | `/api/v1/staff/open-days/{eventId}/visitors` | eventId:long>0/是/path；Authorization:string/是；after:long>=0/否/query默认0、排他访客ID游标、每页100 | items:object[]每项visitor_id/booking_id/slot_id:string、visitor_name:string、phone_masked:string、entered_at:datetime或null、exit_source:string或null、actual_exit_at/exit_recorded_at:datetime或null、version:long、booking_status:string BOOKED/CANCELLED/VOID；count_semantics:string固定提示非实时在校 | 员工+`open-day:ledger`+活动校区范围；不因拥有配置菜单自动取得逐人敏感台账权限 |

预览只给本活动校区内、有open-day:verify权限的员工本单最小核对信息；不授予成绩、监护名单或跨单搜索能力。

扫码token只能在受控body传递，不上URL、日志、埋点或原文错误消息。所有数据响应no-store。家长detail中的visitor_id是创建人整单视图提供；不能通过学生ID遍历别人的visitor。

## 3. 数据流转细节

| API与字段来源 | 字段校验、业务计算与SQL读写 | 事务、缓存与一致性 |
|---|---|---|
| 预览：body.token、认证staff | 仅解析token结构取得visitorId，不据此授权；读`school_visit_visitor.booking_id`→booking.event_id→event.campus_id，员工先明确业务权限再范围。恒时比对SHA256(token)与ticket_hash，并重建HMAC与token恒时比较；投影visitor_id/name/entered_at/exit_*/version及event标题/visit_date/交接区，按该booking.slot_id读取slot_id/starts_at/ends_at；仅WHERE booking_student.booking_id=当前单连edu_student.student_no和当前edu_class.class_name，返回本单学生ID、学号、预约姓名快照、班名，不取得别单孩子或同行手机号 | 只读不写入校。credential_active根据BOOKED、活动PUBLISHED/STOPPED、有效期计算，仅是预览提示；提交必须事务内重验。无Redis凭证授权缓存、不返回种子/摘要/其它访客或其它订单学生 |
| 入校：path.id/body.token/expectedVersion/header.key，Actor.userId/identityId | token必须解析为path.id；固定OD_STAFF_ENTER，actor_key=STAFF:userId。摘要含目标和完整body。锁活动→slot→booking→该visitor，再按student_id升序锁ACTIVE学生/VERIFIED创建家长关系及ACTIVEguardian；学生当前校区必须同活动。已有entered_at直接返回既有事实（不同键重复扫码也不加次）；否则版本匹配、BOOKED、活动可核验、starts_at<=UTC now<ends_at及未过期；只UPDATE该visitor.entered_at/version+1，写movement(kind=ENTER,source=STAFF,actual_at=now,recorded_at=now,actor_*,action_id) | 命令行先占键并重放，再业务锁/版本。与家长取消、ADM停办共用活动/时段/预约锁；任一失败连事件一起回滚。唯一(visitor_id,movement_kind)保一人一条ENTER。只修改扫描人员，绝不按booking批量标全员到校；不增减预约容量 |
| 员工离校：path.id、expectedVersion、source、actualExitAt/reason；认证staff | 固定OD_STAFF_EXIT；服务端只接受STAFF/MANUAL_VERIFIED；补录reason必填；actualExitAt带offset归UTC，entered_at<=actual<=now，未知NULL。锁同订单/访客后必须已有entered_at。首次写visitor.exit_source/actual_exit_at/exit_recorded_at/version并写movement EXIT；已有PARENT_SELF且本次MANUAL_VERIFIED才允许按版本升级并新增EXIT_VERIFIED；不删除原EXIT、不覆盖原审计 | 停办/结束仍可登记已入校人的历史。已有正式登记重复动作返回既有事实，不把重试当更改。版本/来源冲突409；actual_exit_at不能拿登记时间冒充。事务不更新slot.reserved_visitors，无强制出校概念 |
| 家长自报：path.id、expectedVersion、reason，认证identity→ACTIVE guardian | 固定OD_SELF_EXIT，actor_key=IDENTITY:identityId；根据visitor.booking_id校验creator_guardian_id并对整单全部孩子实时requireStudent，任一失效统一404、不返子女或同行，禁止客户端source/actualExitAt；服务端固定PARENT_SELF和actual_exit_at=NULL，exit_recorded_at=UTC now；写movement EXIT source=PARENT_SELF、actual_at=NULL、actor_identity_id | 与员工登记共用锁；先来的正式登记不被自报覆盖。另一监护人/同行或整单任一孩子已解绑/毕业/停用统一404，联系学校核实，首批不静默移除失效孩子，员工身份若以家长入口操作仍必须是该单创建家长。自报不释放容量，不改变booking状态 |
| 逐人台账：path.eventId/query.after，认证staff | `WHERE booking.event_id=:event AND visitor_id>:after ORDER BY visitor_id LIMIT 100`；仅选单人必要姓名、脱敏电话、入离校字段与slot/status；scope条件在读取台账前校验 | 数据库分页，目录页不能用100行结果算总人数；全量统计归ADM-22。无记录显示“未登记”，自报显示“家长自报”，结束不生成自动离校事件；无权限的管理员不因allData绕过业务权限 |

所有新DATETIME是UTC，visit_date和时段所属日期显式转Asia/Shanghai判断，禁止把上海LocalDateTime与UTC列比较。数据库/JDBC会话UTC；服务端钟差和数据库健康由部署基线监控，业务写入事实及recorded_at使用同一服务端UTC时钟。错误日志仅动作、操作身份、异常类型和trace，不含实名/手机号/token/摘要。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**school_open_day**

```sql
CREATE TABLE school_open_day (
  event_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '独立开放日活动ID',
  campus_id VARCHAR(32) NOT NULL COMMENT '校区ID，类型与既有校区一致',
  title VARCHAR(128) NOT NULL COMMENT '活动标题',
  visit_date DATE NOT NULL COMMENT '上海日历日期',
  registration_start DATETIME(3) NOT NULL COMMENT '报名开始UTC',
  registration_end DATETIME(3) NOT NULL COMMENT '报名结束UTC',
  cancel_deadline DATETIME(3) NOT NULL COMMENT '家长取消截止UTC',
  handover_area VARCHAR(255) NOT NULL COMMENT '指定交接区域；发布后不可静默修改',
  instructions VARCHAR(4000) NOT NULL COMMENT '入校须知，不存身份证号',
  scope_type VARCHAR(16) NOT NULL COMMENT 'ALL_ACTIVE全校区在校/CLASS指定班/STUDENT指定孩子',
  scope_ids_json JSON NOT NULL COMMENT '指定班级或学生ID数组；发布时解析冻结，非任意SQL',
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/PUBLISHED/STOPPED/CANCELLED/ENDED',
  scope_frozen_at DATETIME(3) NULL COMMENT '发布时适用学生名单冻结时间',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '配置与状态乐观版本',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间',
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '最后修改时间',
  PRIMARY KEY (event_id),
  UNIQUE uk_open_day_campus (
    event_id,
    campus_id
  ),
  INDEX idx_open_day_catalog (campus_id, status, visit_date),
  CONSTRAINT fk_open_day_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (
    campus_id
  ),
  CONSTRAINT fk_open_day_creator FOREIGN KEY (created_by) REFERENCES sys_user (
    user_id
  ),
  CONSTRAINT ck_open_day_state CHECK (status IN ('DRAFT', 'PUBLISHED', 'STOPPED', 'CANCELLED', 'ENDED')),
  CONSTRAINT ck_open_day_scope_type CHECK (scope_type IN ('ALL_ACTIVE', 'CLASS', 'STUDENT')
  AND JSON_TYPE(scope_ids_json) = 'ARRAY'),
  CONSTRAINT ck_open_day_windows CHECK (registration_start < registration_end AND registration_start <= cancel_deadline),
  CONSTRAINT ck_open_day_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='在校家长开放日；独立招生域';
```

**school_open_day_staff_scope**

```sql
CREATE TABLE school_open_day_staff_scope (
  user_id BIGINT NOT NULL COMMENT '获开放日校区范围的员工',
  campus_id VARCHAR(32) NOT NULL COMMENT '授权校区',
  active TINYINT NOT NULL DEFAULT 1 COMMENT '1有效0撤销；不授予业务权限',
  PRIMARY KEY (user_id, campus_id),
  CONSTRAINT fk_open_day_scope_user FOREIGN KEY (user_id) REFERENCES sys_user (
    user_id
  ),
  CONSTRAINT fk_open_day_scope_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (
    campus_id
  ),
  CONSTRAINT ck_open_day_scope_active CHECK (active IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='开放日员工校区范围';
```

**school_open_day_slot**

```sql
CREATE TABLE school_open_day_slot (
  slot_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '活动时段ID',
  event_id BIGINT NOT NULL COMMENT '所属开放日活动',
  starts_at DATETIME(3) NOT NULL COMMENT '到访时段开始UTC',
  ends_at DATETIME(3) NOT NULL COMMENT '到访时段结束UTC',
  quota INT NOT NULL COMMENT '总预约实名访客容量，不是实时在场容量',
  reserved_visitors INT NOT NULL DEFAULT 0 COMMENT '当前有效预约占用的实名访客数量',
  max_visitors_per_booking INT NOT NULL COMMENT '每单实名访客上限',
  PRIMARY KEY (slot_id),
  UNIQUE uk_open_day_slot_event (
    event_id,
    slot_id
  ),
  INDEX idx_open_day_slot_time (event_id, starts_at),
  CONSTRAINT fk_open_day_slot_event FOREIGN KEY (event_id) REFERENCES school_open_day (
    event_id
  ),
  CONSTRAINT ck_open_day_slot_time CHECK (starts_at < ends_at),
  CONSTRAINT ck_open_day_slot_capacity CHECK (quota > 0
  AND reserved_visitors >= 0
  AND reserved_visitors <= quota
  AND max_visitors_per_booking BETWEEN 1 AND 20)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='开放日多时段预约容量';
```

**school_open_day_scope_student**

```sql
CREATE TABLE school_open_day_scope_student (
  event_id BIGINT NOT NULL COMMENT '开放日活动',
  student_id BIGINT NOT NULL COMMENT '适用学生快照，不因升班自动扩展',
  campus_id VARCHAR(32) NOT NULL COMMENT '冻结时校区',
  frozen_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '快照时间',
  PRIMARY KEY (event_id, student_id),
  INDEX idx_open_day_scope_student (student_id, event_id),
  CONSTRAINT fk_open_day_student_event FOREIGN KEY (event_id, campus_id) REFERENCES school_open_day (
    event_id,
    campus_id
  ),
  CONSTRAINT fk_open_day_scope_student FOREIGN KEY (student_id) REFERENCES edu_student (
    student_id
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='开放日适用在校学生范围快照';
```

**school_visit_booking**

```sql
CREATE TABLE school_visit_booking (
  booking_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '开放日预约ID',
  event_id BIGINT NOT NULL COMMENT '开放日活动',
  slot_id BIGINT NOT NULL COMMENT '时段',
  creator_guardian_id BIGINT NOT NULL COMMENT '唯一订单管理人；不把另一个监护人视作订单所有人',
  creator_identity_id BIGINT NOT NULL COMMENT '创建时身份审计',
  status VARCHAR(16) NOT NULL DEFAULT 'BOOKED' COMMENT 'BOOKED有效/CANCELLED家长取消/VOID活动停办未入校作废',
  active_guardian_id BIGINT GENERATED ALWAYS AS (CASE WHEN status = 'BOOKED' THEN creator_guardian_id ELSE NULL END) STORED COMMENT '有效预约唯一占位；无效历史允许重复',
  visitor_count INT NOT NULL COMMENT '实名到访人员数；不是孩子数',
  visitors_hash CHAR(64) NOT NULL COMMENT '服务端规范实名访客列表摘要，仅内部使用',
  version BIGINT NOT NULL DEFAULT 1 COMMENT '整单版本；添加孩子、取消更新',
  cancelled_at DATETIME(3) NULL COMMENT '取消或作废时间',
  cancel_reason VARCHAR(500) NULL COMMENT '取消原因',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '预约时间',
  PRIMARY KEY (booking_id),
  UNIQUE uk_visit_booking_event (
    event_id,
    booking_id
  ),
  UNIQUE uk_visit_guardian_active (
    event_id,
    active_guardian_id
  ),
  INDEX idx_visit_booking_slot (slot_id, status, booking_id),
  INDEX idx_visit_booking_creator (creator_guardian_id, booking_id),
  CONSTRAINT fk_visit_booking_slot FOREIGN KEY (event_id, slot_id) REFERENCES school_open_day_slot (
    event_id,
    slot_id
  ),
  CONSTRAINT fk_visit_booking_guardian FOREIGN KEY (creator_guardian_id) REFERENCES edu_guardian (
    guardian_id
  ),
  CONSTRAINT fk_visit_booking_identity FOREIGN KEY (creator_identity_id) REFERENCES sys_external_identity (
    identity_id
  ),
  CONSTRAINT ck_visit_booking_status CHECK (status IN ('BOOKED', 'CANCELLED', 'VOID')),
  CONSTRAINT ck_visit_booking_numbers CHECK (visitor_count BETWEEN 1 AND 20 AND version >= 1)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='开放日一位预约人一有效单';
```

**school_visit_booking_student**

```sql
CREATE TABLE school_visit_booking_student (
  booking_student_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '预约孩子关联ID',
  event_id BIGINT NOT NULL COMMENT '冗余活动用于物理唯一约束',
  booking_id BIGINT NOT NULL COMMENT '所属预约',
  student_id BIGINT NOT NULL COMMENT '本人有效关联学生',
  active TINYINT NOT NULL DEFAULT 1 COMMENT '1有效占位0随整单撤销释放',
  active_student_id BIGINT GENERATED ALWAYS AS (CASE WHEN active = 1 THEN student_id ELSE NULL END) STORED COMMENT '同活动同孩子有效唯一占位',
  student_name_snapshot VARCHAR(64) NOT NULL COMMENT '登记时学生姓名；只向订单所有人及授权员工展示',
  PRIMARY KEY (booking_student_id),
  UNIQUE uk_visit_student_history (
    booking_id,
    student_id
  ),
  UNIQUE uk_visit_student_active (
    event_id,
    active_student_id
  ),
  INDEX idx_visit_student_booking (booking_id, student_id),
  CONSTRAINT fk_visit_student_booking FOREIGN KEY (event_id, booking_id) REFERENCES school_visit_booking (
    event_id,
    booking_id
  ),
  CONSTRAINT fk_visit_student_scope FOREIGN KEY (event_id, student_id) REFERENCES school_open_day_scope_student (
    event_id,
    student_id
  ),
  CONSTRAINT ck_visit_student_active CHECK (active IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='预约一对多孩子及唯一有效占位';
```

**school_visit_visitor**

```sql
CREATE TABLE school_visit_visitor (
  visitor_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '一位实名到访人；独立核验',
  booking_id BIGINT NOT NULL COMMENT '所属预约',
  visitor_name VARCHAR(64) NOT NULL COMMENT '实名到访姓名；不收身份证号',
  phone_e164 VARCHAR(16) NOT NULL COMMENT '联系手机号+及8至15位数字；仅必要岗位可读',
  ticket_nonce BINARY(32) NOT NULL COMMENT '凭证随机种子；永不返回或记录日志',
  ticket_hash CHAR(64) NOT NULL COMMENT '完整凭证SHA256；仅内部匹配',
  ticket_key_version VARCHAR(16) NOT NULL COMMENT '服务端签名密钥版本，密钥不落业务库',
  ticket_expires_at DATETIME(3) NOT NULL COMMENT '有效到时段结束，UTC',
  entered_at DATETIME(3) NULL COMMENT '员工真实登记入校时间；一人一份事实',
  exit_source VARCHAR(24) NULL COMMENT 'STAFF/PARENT_SELF/MANUAL_VERIFIED；无记录NULL',
  actual_exit_at DATETIME(3) NULL COMMENT '明确获知的真实离校时间；未知必须NULL',
  exit_recorded_at DATETIME(3) NULL COMMENT '登记离校记录时间，不能冒充真实离校时间',
  version BIGINT NOT NULL DEFAULT 1 COMMENT '访客并发版本',
  PRIMARY KEY (visitor_id),
  UNIQUE uk_visit_ticket_hash (
    ticket_hash
  ),
  INDEX idx_visit_visitor_booking (booking_id, visitor_id),
  CONSTRAINT fk_visit_visitor_booking FOREIGN KEY (booking_id) REFERENCES school_visit_booking (
    booking_id
  ),
  CONSTRAINT ck_visit_visitor_version CHECK (version >= 1),
  CONSTRAINT ck_visit_exit_source CHECK (exit_source IS NULL OR exit_source IN ('STAFF', 'PARENT_SELF', 'MANUAL_VERIFIED')),
  CONSTRAINT ck_visit_exit_fact CHECK ((
    exit_source IS NULL AND exit_recorded_at IS NULL AND actual_exit_at IS NULL
  )
  OR (
    NOT exit_source IS NULL
    AND NOT exit_recorded_at IS NULL
    AND NOT entered_at IS NULL
  )),
  CONSTRAINT ck_visit_exit_time CHECK (actual_exit_at IS NULL
  OR (
    actual_exit_at >= entered_at AND actual_exit_at <= exit_recorded_at
  )),
  CONSTRAINT ck_visit_exit_self CHECK (exit_source <> 'PARENT_SELF' OR actual_exit_at IS NULL)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='逐个实名访客凭证与入离校登记';
```

**school_visit_action**

```sql
CREATE TABLE school_visit_action (
  action_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '事务幂等命令ID',
  action_code VARCHAR(40) NOT NULL COMMENT '服务端固定动作',
  actor_key VARCHAR(96) NOT NULL COMMENT 'STAFF:userId或IDENTITY:identityId，服务端派生',
  actor_identity_id BIGINT NULL COMMENT '外部身份审计；后台原生员工可空',
  actor_user_id BIGINT NULL COMMENT '员工账号审计；家长可空',
  idempotency_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL COMMENT '调用方随机重试键',
  payload_hash CHAR(64) NOT NULL COMMENT '规范目标加正文摘要，永不返回',
  result_json JSON NULL COMMENT '最终脱敏业务响应，用于同键重放，不含token或内部摘要',
  result_http INT NULL COMMENT '最终HTTP码',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '命令写入时间',
  PRIMARY KEY (action_id),
  UNIQUE uk_visit_action (
    action_code,
    actor_key,
    idempotency_key
  ),
  CONSTRAINT fk_visit_action_identity FOREIGN KEY (actor_identity_id) REFERENCES sys_external_identity (
    identity_id
  ),
  CONSTRAINT fk_visit_action_user FOREIGN KEY (actor_user_id) REFERENCES sys_user (
    user_id
  ),
  CONSTRAINT ck_visit_action_actor CHECK (NOT actor_identity_id IS NULL OR NOT actor_user_id IS NULL),
  CONSTRAINT ck_visit_action_http CHECK (result_http IS NULL OR result_http IN (200, 201))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='开放日独立命令幂等；不借用办公申请根';
```

**school_visit_movement**

```sql
CREATE TABLE school_visit_movement (
  movement_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '入离校不可覆盖审计事件',
  visitor_id BIGINT NOT NULL COMMENT '具体实名到访人',
  action_id BIGINT NOT NULL COMMENT '产生此事件的幂等动作',
  movement_kind VARCHAR(24) NOT NULL COMMENT 'ENTER/EXIT/EXIT_VERIFIED',
  source VARCHAR(24) NOT NULL COMMENT 'STAFF/PARENT_SELF/MANUAL_VERIFIED',
  actor_identity_id BIGINT NULL COMMENT '操作外部身份，后台原生员工可空',
  actor_user_id BIGINT NULL COMMENT '操作员工；家长自报可空',
  actual_at DATETIME(3) NULL COMMENT '明确获知的事实时间；自报或未知NULL',
  recorded_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '记录时间',
  reason VARCHAR(500) NULL COMMENT '补录或核实原因，不填证件原文',
  PRIMARY KEY (movement_id),
  UNIQUE uk_visit_movement_once (
    visitor_id,
    movement_kind
  ),
  INDEX idx_visit_movement_recorded (recorded_at, movement_id),
  CONSTRAINT fk_visit_movement_visitor FOREIGN KEY (visitor_id) REFERENCES school_visit_visitor (
    visitor_id
  ),
  CONSTRAINT fk_visit_movement_action FOREIGN KEY (action_id) REFERENCES school_visit_action (
    action_id
  ),
  CONSTRAINT fk_visit_movement_actor FOREIGN KEY (actor_identity_id) REFERENCES sys_external_identity (
    identity_id
  ),
  CONSTRAINT fk_visit_movement_user FOREIGN KEY (actor_user_id) REFERENCES sys_user (
    user_id
  ),
  CONSTRAINT ck_visit_movement_actor CHECK (NOT actor_identity_id IS NULL OR NOT actor_user_id IS NULL),
  CONSTRAINT ck_visit_movement_kind CHECK (movement_kind IN ('ENTER', 'EXIT', 'EXIT_VERIFIED')),
  CONSTRAINT ck_visit_movement_source CHECK (source IN ('STAFF', 'PARENT_SELF', 'MANUAL_VERIFIED')),
  CONSTRAINT ck_visit_movement_self CHECK (source <> 'PARENT_SELF' OR actual_at IS NULL),
  CONSTRAINT ck_visit_movement_time CHECK (actual_at IS NULL OR actual_at <= recorded_at)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='逐人入离校与核实补录日志';
```

**school_open_day_notice**

```sql
CREATE TABLE school_open_day_notice (
  notice_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '可靠站内通知ID',
  event_id BIGINT NOT NULL COMMENT '变更活动',
  guardian_id BIGINT NOT NULL COMMENT '预约创建监护人；其他监护人不收订单隐私',
  event_version BIGINT NOT NULL COMMENT '触发变更的活动版本',
  notice_kind VARCHAR(24) NOT NULL COMMENT 'CREATED/CANCELLED/STOPPED/ENDED/ANNOUNCED',
  title VARCHAR(128) NOT NULL COMMENT '通知标题',
  content VARCHAR(8000) NOT NULL COMMENT '变更内容与操作说明；不含同行联系方式',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '业务事务内持久化时间即站内可见时间',
  PRIMARY KEY (notice_id),
  UNIQUE uk_open_day_notice (
    event_id,
    guardian_id,
    event_version,
    notice_kind
  ),
  INDEX idx_open_day_notice_inbox (guardian_id, notice_id),
  CONSTRAINT fk_open_day_notice_event FOREIGN KEY (event_id) REFERENCES school_open_day (
    event_id
  ),
  CONSTRAINT fk_open_day_notice_guardian FOREIGN KEY (guardian_id) REFERENCES edu_guardian (
    guardian_id
  ),
  CONSTRAINT ck_open_day_notice_kind CHECK (notice_kind IN ('CREATED', 'CANCELLED', 'STOPPED', 'ENDED', 'ANNOUNCED'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='无需外部推送成功的可靠家长站内通知';
```

## 5. 完整分层代码

完整Controller、Service、Repository及共用事务/票据代码如下；每个public类未来独立同名Java文件，公共部分只实施一次。Java17、Boot4、MyBatis4；只读沿用reference基础组件、ParentAccess公用授权契约。代码含核心校验、范围、固定SQL、幂等、异常及脱敏日志；没有在源码中实施，也未编译、测试或运行。配置密钥由服务端注入，原始密钥和票据不会进入源代码。

```java
package com.doupi.planref.openday;

import com.doupi.planref.*;
import com.doupi.planref.parent.ParentAccess;
import java.time.*;
import java.util.*;
import java.util.function.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Repository
public class OpenDayRepository {
 final Db db; private final ParentAccess parents;
 public OpenDayRepository(Db db,ParentAccess parents){this.db=db;this.parents=parents;}
 public Map<String,Object> event(long id,boolean lock){return db.required("SELECT * FROM school_open_day WHERE event_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));}
 public Map<String,Object> slot(long event,long slot,boolean lock){return db.required("SELECT * FROM school_open_day_slot WHERE event_id=#{p.event} AND slot_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("event",event,"id",slot));}
 public Map<String,Object> booking(long id,boolean lock){return db.required("SELECT * FROM school_visit_booking WHERE booking_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));}
 public Map<String,Object> visitor(long id,boolean lock){return db.required("SELECT * FROM school_visit_visitor WHERE visitor_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));}
 public long guardian(){return Inputs.number(db.required("SELECT g.guardian_id FROM edu_guardian_identity i JOIN edu_guardian g ON g.guardian_id=i.guardian_id WHERE i.identity_id=#{p.identity} AND i.status='ACTIVE' AND g.status='ACTIVE'",P.of("identity",Actors.current().identityId())).get("guardian_id"));}
 public void owner(Map<String,Object>b){if(guardian()!=Inputs.number(b.get("creator_guardian_id")))throw Problem.notFound("记录不存在或不可见");for(Map<String,Object>s:db.list("SELECT student_id FROM school_visit_booking_student WHERE booking_id=#{p.id} ORDER BY student_id",P.of("id",b.get("booking_id"))))try{parents.requireStudent(Inputs.number(s.get("student_id")));}catch(Problem denied){if(denied.http()==403||denied.http()==404)throw Problem.notFound("记录不存在或不可见，请联系学校核实关联");throw denied;}}
 public void staff(String permission,String campus){Actor a=Actors.current();a.requireStaff();a.require(permission);if(!a.allData()&&db.one("SELECT user_id FROM school_open_day_staff_scope WHERE user_id=#{p.user} AND campus_id=#{p.campus} AND active=1",P.of("user",a.userId(),"campus",campus)).isEmpty())throw Problem.forbidden("超出开放日校区范围");}
 public Map<String,Object> bookingView(long id){
  Map<String,Object>b=db.required("SELECT b.booking_id,b.event_id,b.slot_id,b.status,b.visitor_count,b.version,e.title,e.campus_id,e.visit_date,e.handover_area,e.instructions,e.status AS event_status,s.starts_at,s.ends_at FROM school_visit_booking b JOIN school_open_day e ON e.event_id=b.event_id JOIN school_open_day_slot s ON s.slot_id=b.slot_id WHERE b.booking_id=#{p.id}",P.of("id",id));
  b.put("students",db.list("SELECT student_id,student_name_snapshot FROM school_visit_booking_student WHERE booking_id=#{p.id} ORDER BY student_id",P.of("id",id)));
  b.put("visitors",db.list("SELECT visitor_id,visitor_name,CONCAT(LEFT(phone_e164,3),'****',RIGHT(phone_e164,4)) AS phone_masked,entered_at,exit_source,actual_exit_at,exit_recorded_at,version FROM school_visit_visitor WHERE booking_id=#{p.id} ORDER BY visitor_id",P.of("id",id)));
  return b;
 }
 public Map<String,Object> visitorView(long id){return db.required("SELECT visitor_id,booking_id,visitor_name,entered_at,exit_source,actual_exit_at,exit_recorded_at,version FROM school_visit_visitor WHERE visitor_id=#{p.id}",P.of("id",id));}
 public void notice(long event,String kind,String content){db.write("INSERT INTO school_open_day_notice(event_id,guardian_id,event_version,notice_kind,title,content) SELECT e.event_id,b.creator_guardian_id,e.version,#{p.kind},e.title,#{p.content} FROM school_open_day e JOIN school_visit_booking b ON b.event_id=e.event_id WHERE e.event_id=#{p.event} GROUP BY e.event_id,b.creator_guardian_id,e.version,e.title ON DUPLICATE KEY UPDATE notice_id=notice_id",P.of("event",event,"kind",kind,"content",content));}
}

@Service
public class OpenDayKernel {
 private static final Logger log=LoggerFactory.getLogger(OpenDayKernel.class);
 final OpenDayRepository r; final TransactionTemplate tx; final ParentAccess parents;
 public OpenDayKernel(OpenDayRepository r,PlatformTransactionManager manager,ParentAccess parents){this.r=r;this.tx=new TransactionTemplate(manager);this.parents=parents;}
 public record Context(long actionId,Actor actor){}
 public Map<String,Object> command(String action,String key,Object target,Map<String,Object>body,int http,Function<Context,Map<String,Object>> work){
  Actor a=Actors.current();boolean staffAction=action.startsWith("OD_STAFF_")||action.startsWith("OD_ADMIN_");if(staffAction?a.userId()<=0:a.identityId()<=0)throw Problem.forbidden("缺少本动作所需的已认证身份");
  if(key==null||!key.matches("[A-Za-z0-9_-]{8,64}"))throw Problem.bad("Idempotency-Key必须8至64位随机标识");
  String hash=Json.hash(P.of("target",target,"body",body));
  try{Map<String,Object> result=tx.execute(s->{
   String actor=staffAction?"STAFF:"+a.userId():"IDENTITY:"+a.identityId();
   Map<String,Object>p=P.of("action",action,"actor",actor,"identity",a.identityId()>0?a.identityId():null,"user",a.userId()>0?a.userId():null,"key",key,"hash",hash);
   r.db.write("INSERT INTO school_visit_action(action_code,actor_key,actor_identity_id,actor_user_id,idempotency_key,payload_hash) VALUES(#{p.action},#{p.actor},#{p.identity},#{p.user},#{p.key},#{p.hash}) ON DUPLICATE KEY UPDATE action_id=action_id",p);
   Map<String,Object>c=r.db.required("SELECT * FROM school_visit_action WHERE action_code=#{p.action} AND actor_key=#{p.actor} AND idempotency_key=#{p.key} FOR UPDATE",p);
   if(!hash.equals(c.get("payload_hash")))throw Problem.conflict("同键的目标或正文不同");
   if(c.get("result_json")!=null){Map<String,Object>out=Json.readMap(c.get("result_json").toString());if(!staffAction&&out.get("booking_id")!=null)r.owner(r.booking(Inputs.number(out.get("booking_id")),false));out.put("_replayed",true);out.put("_httpStatus",c.get("result_http"));return out;}
   Map<String,Object>out=work.apply(new Context(Inputs.number(c.get("action_id")),a));
   r.db.write("UPDATE school_visit_action SET result_json=#{p.result},result_http=#{p.http} WHERE action_id=#{p.id}",P.of("result",Json.write(out),"http",http,"id",c.get("action_id")));
   return out;
  });log.info("open_day action={} identity={} user={} committed",action,a.identityId(),a.userId());return result;
  }catch(RuntimeException ex){log.warn("open_day action={} identity={} failure={}",action,a.identityId(),ex.getClass().getSimpleName());throw ex;}
 }
 public static LocalDateTime time(Object value){if(value instanceof LocalDateTime t)return t;if(value instanceof java.sql.Timestamp t)return t.toLocalDateTime();try{return OffsetDateTime.parse(String.valueOf(value)).withOffsetSameInstant(ZoneOffset.UTC).toLocalDateTime();}catch(RuntimeException e){throw Problem.bad("时间必须ISO8601并包含Z或时区偏移");}}
 public static LocalDate date(Object value){if(value instanceof LocalDate d)return d;if(value instanceof java.sql.Date d)return d.toLocalDate();try{return LocalDate.parse(String.valueOf(value));}catch(RuntimeException e){throw Problem.bad("日期必须YYYY-MM-DD");}}
 public static LocalDateTime now(){return LocalDateTime.now(ZoneOffset.UTC);}
 public static LocalDate shanghaiDate(LocalDateTime utc){return utc.atOffset(ZoneOffset.UTC).atZoneSameInstant(ZoneId.of("Asia/Shanghai")).toLocalDate();}
 public static void version(Map<String,Object>body,Map<String,Object>row){if(Inputs.nonNegative(body,"expectedVersion")!=Inputs.number(row.get("version")))throw Problem.conflict("版本已变化，请刷新");}
 public static List<Long> ids(Map<String,Object>b){List<Long>ids=Inputs.ids(b,"studentIds");if(ids.isEmpty()||ids.size()>20||new HashSet<>(ids).size()!=ids.size())throw Problem.bad("studentIds必须1至20个且不重复");return ids.stream().sorted().toList();}
 public void eligible(long event,List<Long>ids){
  long guardian=r.guardian();
  for(long id:ids){parents.requireStudent(id);
   if(r.db.one("SELECT s.student_id FROM edu_student s JOIN school_open_day_scope_student x ON x.student_id=s.student_id AND x.event_id=#{p.event} WHERE s.student_id=#{p.student} AND s.status='ACTIVE' AND s.campus_id=x.campus_id FOR SHARE",P.of("event",event,"student",id)).isEmpty())throw Problem.forbidden("学生不在活动适用范围或状态已变化");
   if(r.db.one("SELECT g.student_id FROM edu_student_guardian g JOIN edu_guardian_identity i ON i.guardian_id=g.guardian_id JOIN edu_guardian p ON p.guardian_id=g.guardian_id WHERE g.student_id=#{p.student} AND g.guardian_id=#{p.guardian} AND g.status='VERIFIED' AND i.identity_id=#{p.identity} AND i.status='ACTIVE' AND p.status='ACTIVE' FOR SHARE",P.of("student",id,"guardian",guardian,"identity",Actors.current().identityId())).isEmpty())throw Problem.forbidden("有效家长关联已撤销");
  }
 }
 public Map<String,Object> lockBooking(long id){Map<String,Object>hint=r.booking(id,false);r.event(Inputs.number(hint.get("event_id")),true);r.slot(Inputs.number(hint.get("event_id")),Inputs.number(hint.get("slot_id")),true);return r.booking(id,true);}
 public void release(Map<String,Object>b,String state,String reason){
  long id=Inputs.number(b.get("booking_id"));
  for(Map<String,Object>s:r.db.list("SELECT student_id FROM school_visit_booking_student WHERE booking_id=#{p.id} ORDER BY student_id",P.of("id",id)))r.db.required("SELECT student_id FROM edu_student WHERE student_id=#{p.id} FOR UPDATE",P.of("id",s.get("student_id")));
  int n=r.db.write("UPDATE school_open_day_slot SET reserved_visitors=reserved_visitors-#{p.count} WHERE slot_id=#{p.slot} AND reserved_visitors>=#{p.count}",P.of("count",b.get("visitor_count"),"slot",b.get("slot_id")));if(n!=1)throw Problem.conflict("容量账异常，事务已撤销");
  r.db.write("UPDATE school_visit_booking_student SET active=0 WHERE booking_id=#{p.id}",P.of("id",id));
  r.db.write("UPDATE school_visit_booking SET status=#{p.state},cancel_reason=#{p.reason},cancelled_at=CURRENT_TIMESTAMP(3),version=version+1 WHERE booking_id=#{p.id}",P.of("state",state,"reason",reason,"id",id));
 }
 public void movement(Context c,long visitor,String kind,String source,LocalDateTime actual,String reason){r.db.write("INSERT INTO school_visit_movement(visitor_id,action_id,movement_kind,source,actor_identity_id,actor_user_id,actual_at,recorded_at,reason) VALUES(#{p.visitor},#{p.action},#{p.kind},#{p.source},#{p.identity},#{p.user},#{p.actual},#{p.recorded},#{p.reason})",P.of("visitor",visitor,"action",c.actionId(),"kind",kind,"source",source,"identity",c.actor().identityId()>0?c.actor().identityId():null,"user",c.actor().userId()>0?c.actor().userId():null,"actual",actual,"recorded",now(),"reason",reason));}
 public static Map<String,Object> response(Map<String,Object>data){Map<String,Object>out=new LinkedHashMap<>();data.forEach((key,value)->out.put(key,wire(key,value)));return out;}
 private static Object wire(String key,Object value){if(value instanceof Map<?,?>m)return response(Inputs.map(m));if(value instanceof List<?>l)return l.stream().map(v->key.endsWith("_ids")?v.toString():wire("",v)).toList();if(value!=null&&key.endsWith("_id"))return value.toString();if(value instanceof java.sql.Timestamp t)return t.toLocalDateTime().atOffset(ZoneOffset.UTC).toString();if(value instanceof LocalDateTime t)return t.atOffset(ZoneOffset.UTC).toString();if(value instanceof java.sql.Date d)return d.toLocalDate().toString();return value;}
}
```

每个public顶层类未来独立成同名Java文件；上面同一代码块是文档展示，不表示能作为单个Java文件编译。事务成功日志在TransactionTemplate返回后写入；失败日志只记录类型和身份ID，不记录正文、实名或凭证。所有Controller经response转换`*_id`为十进制字符串，DATETIME时间统一输出UTC ISO8601 Z；内部原始行不会直接响应。

JSON响应由以下URI限定Advice补全no-store，包含全局ApiErrors处理的MVC异常；Controller已显式no-store的成功响应继续保留。只处理开放日私有路径，不更改公开门户缓存。未来每个public类独立同名文件，此处仅Markdown。

```java
package com.doupi.planref.openday;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;
@RestControllerAdvice
public class OpenDayResponseAdvice implements ResponseBodyAdvice<Object> {
 @Override public boolean supports(MethodParameter method,Class<? extends HttpMessageConverter<?>> converter){return true;}
 @Override public Object beforeBodyWrite(Object body,MethodParameter method,MediaType mediaType,Class<? extends HttpMessageConverter<?>> converter,ServerHttpRequest request,ServerHttpResponse response){
  String path=request.getURI().getPath();
  for(String prefix:new String[]{"/api/v1/parent/open-days","/api/v1/parent/open-day-bookings","/api/v1/parent/open-day-visitors","/api/v1/parent/open-day-notices","/api/v1/staff/open-day-visitors","/api/v1/staff/open-days","/api/v1/admin/open-days"})if(path.equals(prefix)||path.startsWith(prefix+"/")){response.getHeaders().setCacheControl("no-store");response.getHeaders().set("Pragma","no-cache");response.getHeaders().setExpires(0);break;}
  return body;
 }
}
```

```java
package com.doupi.planref.openday;

import com.doupi.planref.*;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class OpenDayTickets {
 private final Map<String,byte[]>keys=new HashMap<>(); private final String current;
 private final SecureRandom random=new SecureRandom();
 public OpenDayTickets(@Value("${school.open-day.ticket-keys}")String configured,@Value("${school.open-day.ticket-current}")String current){this.current=current;Json.readMap(configured).forEach((k,v)->{byte[]bytes=Base64.getDecoder().decode(v.toString());if(!k.matches("[A-Za-z0-9_-]{1,16}")||bytes.length<32)throw new IllegalStateException("开放日凭证密钥配置不合法");keys.put(k,bytes);});if(!keys.containsKey(current))throw new IllegalStateException("缺少当前凭证密钥");}
 public byte[] nonce(){byte[]b=new byte[32];random.nextBytes(b);return b;}
 public static String hash(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(GeneralSecurityException e){throw new IllegalStateException(e);}}
 public String mint(Map<String,Object>v){
  String version=v.get("ticket_key_version").toString();byte[]secret=keys.get(version);if(secret==null)throw new IllegalStateException("历史凭证密钥未保留");
  long expires=OpenDayKernel.time(v.get("ticket_expires_at")).atOffset(ZoneOffset.UTC).toEpochSecond();
  String head=v.get("visitor_id")+"."+expires+"."+version;
  String data=head+"|"+v.get("booking_id")+"|"+Base64.getEncoder().encodeToString((byte[])v.get("ticket_nonce"));
  try{Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret,"HmacSHA256"));return head+"."+Base64.getUrlEncoder().withoutPadding().encodeToString(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));}catch(GeneralSecurityException e){throw new IllegalStateException(e);}
 }
 public String current(){return current;}
 public long visitorId(String token){if(token==null||token.length()>200||!token.matches("[0-9]+\\.[0-9]+\\.[A-Za-z0-9_-]{1,16}\\.[A-Za-z0-9_-]{43}"))throw Problem.notFound("凭证不存在或不可用");try{long id=Long.parseLong(token.substring(0,token.indexOf('.')));if(id<=0)throw Problem.bad("无效凭证");return id;}catch(NumberFormatException e){throw Problem.notFound("凭证不存在或不可用");}}
 public void verify(String token,Map<String,Object>v){byte[]a=hash(token).getBytes(StandardCharsets.US_ASCII),b=v.get("ticket_hash").toString().getBytes(StandardCharsets.US_ASCII);if(!MessageDigest.isEqual(a,b)||!MessageDigest.isEqual(mint(v).getBytes(StandardCharsets.US_ASCII),token.getBytes(StandardCharsets.US_ASCII)))throw Problem.notFound("凭证不存在或不可用");}
}
```

```java
package com.doupi.planref.openday;

import com.doupi.planref.*;
import java.time.*;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class OpenDayVisitController {
 private final OpenDayVisitService s;
 public OpenDayVisitController(OpenDayVisitService s){this.s=s;}
 private ResponseEntity<Map<String,Object>>ok(Map<String,Object>d){ResponseEntity<Map<String,Object>>reply=ApiReply.of(OpenDayKernel.response(d),200);return ResponseEntity.status(reply.getStatusCode()).header("Cache-Control","no-store").body(reply.getBody());}
 @PostMapping("/staff/open-day-visitors/preview") public ResponseEntity<Map<String,Object>>preview(@RequestBody Map<String,Object>b){return ok(s.preview(b));}
 @PostMapping("/staff/open-day-visitors/{id}/enter") public ResponseEntity<Map<String,Object>>enter(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ok(s.enter(id,key,b));}
 @PostMapping("/staff/open-day-visitors/{id}/exit") public ResponseEntity<Map<String,Object>>staffExit(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ok(s.exit(id,key,b,false));}
 @PostMapping("/parent/open-day-visitors/{id}/exit") public ResponseEntity<Map<String,Object>>selfExit(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ok(s.exit(id,key,b,true));}
 @GetMapping("/staff/open-days/{eventId}/visitors") public ResponseEntity<Map<String,Object>>visitors(@PathVariable long eventId,@RequestParam(defaultValue="0")long after){return ok(s.visitors(eventId,after));}
}

@Service
public class OpenDayVisitService {
 private final OpenDayRepository r;private final OpenDayKernel k;private final OpenDayTickets tickets;
 public OpenDayVisitService(OpenDayRepository r,OpenDayKernel k,OpenDayTickets tickets){this.r=r;this.k=k;this.tickets=tickets;}
 private Map<String,Object>eventOf(Map<String,Object>v){return r.event(Inputs.number(r.booking(Inputs.number(v.get("booking_id")),false).get("event_id")),false);}
 public Map<String,Object>preview(Map<String,Object>b){
  String token=Inputs.text(b,"token",1,200);Map<String,Object>v=r.visitor(tickets.visitorId(token),false),e=eventOf(v);r.staff("open-day:verify",e.get("campus_id").toString());tickets.verify(token,v);
  Map<String,Object>order=r.booking(Inputs.number(v.get("booking_id")),false),slot=r.slot(Inputs.number(order.get("event_id")),Inputs.number(order.get("slot_id")),false),out=r.visitorView(Inputs.number(v.get("visitor_id")));
  out.put("event_id",e.get("event_id"));out.put("event_title",e.get("title"));out.put("visit_date",e.get("visit_date"));out.put("handover_area",e.get("handover_area"));out.put("slot_id",slot.get("slot_id"));out.put("starts_at",slot.get("starts_at"));out.put("ends_at",slot.get("ends_at"));
  out.put("students",r.db.list("SELECT bs.student_id,s.student_no,bs.student_name_snapshot AS student_name,c.class_name FROM school_visit_booking_student bs JOIN edu_student s ON s.student_id=bs.student_id JOIN edu_class c ON c.class_id=s.class_id WHERE bs.booking_id=#{p.booking} ORDER BY bs.student_id",P.of("booking",order.get("booking_id"))));
  out.put("credential_active",active(v,order,e));return out;
 }
 private boolean active(Map<String,Object>v,Map<String,Object>b,Map<String,Object>e){return "BOOKED".equals(b.get("status"))&&Set.of("PUBLISHED","STOPPED").contains(e.get("status"))&&OpenDayKernel.now().isBefore(OpenDayKernel.time(v.get("ticket_expires_at")));}
 public Map<String,Object>enter(long id,String key,Map<String,Object>b){
  String token=Inputs.text(b,"token",1,200);if(tickets.visitorId(token)!=id)throw Problem.notFound("凭证不存在或不可用");Inputs.nonNegative(b,"expectedVersion");
  Map<String,Object>hint=r.visitor(id,false);r.staff("open-day:verify",eventOf(hint).get("campus_id").toString());tickets.verify(token,hint);
  return k.command("OD_STAFF_ENTER",key,id,b,200,c->{
   Map<String,Object>order=k.lockBooking(Inputs.number(hint.get("booking_id"))),e=r.event(Inputs.number(order.get("event_id")),false),v=r.visitor(id,true);r.staff("open-day:verify",e.get("campus_id").toString());tickets.verify(token,v);
   if(v.get("entered_at")!=null)return r.visitorView(id);
   OpenDayKernel.version(b,v);if(!active(v,order,e))throw Problem.conflict("预约或活动已失效，禁止新入校登记");
   Map<String,Object>slot=r.slot(Inputs.number(order.get("event_id")),Inputs.number(order.get("slot_id")),false);LocalDateTime now=OpenDayKernel.now();if(now.isBefore(OpenDayKernel.time(slot.get("starts_at")))||!now.isBefore(OpenDayKernel.time(slot.get("ends_at"))))throw Problem.conflict("不在预约到访时段，请联系现场负责人");
   List<Long>students=new ArrayList<>();for(Map<String,Object>s:r.db.list("SELECT student_id FROM school_visit_booking_student WHERE booking_id=#{p.id} AND active=1 ORDER BY student_id",P.of("id",order.get("booking_id"))))students.add(Inputs.number(s.get("student_id")));
   for(long student:students){if(r.db.one("SELECT st.student_id FROM edu_student st JOIN edu_student_guardian sg ON sg.student_id=st.student_id JOIN edu_guardian g ON g.guardian_id=sg.guardian_id WHERE st.student_id=#{p.id} AND st.status='ACTIVE' AND st.campus_id=#{p.campus} AND sg.guardian_id=#{p.guardian} AND sg.status='VERIFIED' AND g.status='ACTIVE' FOR SHARE",P.of("id",student,"campus",e.get("campus_id"),"guardian",order.get("creator_guardian_id"))).isEmpty())throw Problem.conflict("预约学生或家长关联状态已变化，需学校核实");}
   r.db.write("UPDATE school_visit_visitor SET entered_at=#{p.at},version=version+1 WHERE visitor_id=#{p.id}",P.of("at",now,"id",id));k.movement(c,id,"ENTER","STAFF",now,null);return r.visitorView(id);
  });
 }
 public Map<String,Object>exit(long id,String key,Map<String,Object>b,boolean parent){
  Inputs.nonNegative(b,"expectedVersion");Map<String,Object>hint=r.visitor(id,false),orderHint=r.booking(Inputs.number(hint.get("booking_id")),false),event=eventOf(hint);
  if(parent)r.owner(orderHint);else r.staff("open-day:exit",event.get("campus_id").toString());
  String source=parent?"PARENT_SELF":Inputs.text(b,"source",1,24);if(!Set.of("STAFF","PARENT_SELF","MANUAL_VERIFIED").contains(source)||(!parent&&"PARENT_SELF".equals(source)))throw Problem.bad("离校登记来源不合法");
  if(parent&&(b.containsKey("actualExitAt")||b.containsKey("source")))throw Problem.bad("自报不接受真实离校时间或冒充来源");
  String reason="MANUAL_VERIFIED".equals(source)?Inputs.text(b,"reason",1,500):Inputs.optionalText(b,"reason",500);LocalDateTime actual=b.get("actualExitAt")==null?null:OpenDayKernel.time(b.get("actualExitAt"));
  return k.command(parent?"OD_SELF_EXIT":"OD_STAFF_EXIT",key,id,b,200,c->{
   Map<String,Object>order=k.lockBooking(Inputs.number(hint.get("booking_id"))),v=r.visitor(id,true);if(parent)r.owner(order);else r.staff("open-day:exit",r.event(Inputs.number(order.get("event_id")),false).get("campus_id").toString());
   if(v.get("entered_at")==null)throw Problem.conflict("没有入校登记，不能生成离校登记");
   if(v.get("exit_recorded_at")!=null){if(!"MANUAL_VERIFIED".equals(source)||!"PARENT_SELF".equals(v.get("exit_source")))return r.visitorView(id);}
   OpenDayKernel.version(b,v);LocalDateTime now=OpenDayKernel.now();if(actual!=null&&(actual.isBefore(OpenDayKernel.time(v.get("entered_at")))||actual.isAfter(now)))throw Problem.bad("真实离校时间应在入校后且不晚于登记时间");
   boolean verified=v.get("exit_recorded_at")!=null;r.db.write("UPDATE school_visit_visitor SET exit_source=#{p.source},actual_exit_at=#{p.actual},exit_recorded_at=#{p.recorded},version=version+1 WHERE visitor_id=#{p.id}",P.of("source",source,"actual",actual,"recorded",now,"id",id));k.movement(c,id,verified?"EXIT_VERIFIED":"EXIT",source,actual,reason);return r.visitorView(id);
  });
 }
 public Map<String,Object>visitors(long event,long after){Map<String,Object>e=r.event(event,false);r.staff("open-day:ledger",e.get("campus_id").toString());if(after<0)throw Problem.bad("after不能为负");return P.of("items",r.db.list("SELECT v.visitor_id,v.booking_id,v.visitor_name,CONCAT(LEFT(v.phone_e164,3),'****',RIGHT(v.phone_e164,4)) AS phone_masked,v.entered_at,v.exit_source,v.actual_exit_at,v.exit_recorded_at,v.version,b.status AS booking_status,b.slot_id FROM school_visit_visitor v JOIN school_visit_booking b ON b.booking_id=v.booking_id WHERE b.event_id=#{p.event} AND v.visitor_id>#{p.after} ORDER BY v.visitor_id LIMIT 100",P.of("event",event,"after",after)),"count_semantics","已入校未登记离校人数不是实时在校人数");}
}
```

## 6. 边界与异常场景处理

- 400：token格式/长度非法、path与token人员不符、缺版本、非法来源、家长伪造source/actualExitAt、核实补录缺reason、未来或早于入校的actualExitAt、无offset时间；不从客户端接收操作者或“全员到校”。
- 403：没有open-day:verify/exit/ledger权限、校区范围不符、员工解绑；allData只能扩大数据范围，不能代替权限。相机权限只允许取景，不授予核验权限。
- 404：无效票据、visitor不存在、非创建家长自报；票据不支持通过猜测ID/手机号查询学生或其它同行。响应不显示存储hash、签名种子或内部payload。
- 409：尚未入校却登记离校、活动停办/结束、预约已撤销、过期/不在时段、版本过期、学生或监护关系已失效、同键异目标/正文。现场特殊情况联系负责人核实，P0不提供跳过校验强制入校按钮。
- 重复扫码：同键按已归档响应重放；不同键对同位已入校人员返原entered_at，不能生成第二次ENTER或增加整单人数。另一位同行必须出示其自己的码单独确认。已入校后离校再扫入校仍回原事实，不推导为重新入校；多次进出管理为P1。
- 取消竞争：入校事务先提交则整单不可取消；取消先提交则入校拒绝。停办与入校同样串行，已入校事实保留，未入校凭证全部失效；不能用过时预览绕过新状态。
- 自报离校：无实际时间则NULL，登记时间仅表示何时报告；核实补录保留原自报事件，新事件来源MANUAL_VERIFIED。禁止把家长点击时间写作已确认实际出校时间，禁止因自报释放时段配额。
- 活动结束无自动离校；统计口径“已入校未登记离校人数”，页面附说明“无登记不表示仍在校”。现场台账与管理统计保留来源、记录时间、实际时间三个不同字段。

- 待开发验收：仅有open-day:verify且处于活动校区范围的门岗，可通过有效凭证核对该人姓名、活动日、预约时段及本单学生学号/姓名快照/班名；不能查其他订单学生、同行联系方式、成绩或完整监护人名单。
- 待开发验收：开放日成功及全局ApiErrors生成的MVC错误JSON都含no-store；只读预览不创建入校事实。
