# ADM-22 开放日活动、名额与来访台账

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-22)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，4个工作日；依赖ADM-21家长与在校学生档案及MINI-10预约、MINI-11逐人核验/离校。** 单人Java开发者结合AI，包含后台表单、权限、后端、联调和人工验收。2026-11-05仅Markdown计划，本文SQL及Java未落源码/参考工程，未运行SQL、Maven、构建或服务。

面向在校家长开放日送物，独立于招生/游园。一次活动限定单校区、单个上海日历日期，可配多个互不重叠时段；跨校区、跨日期分别建活动。管理员设置报名起止、取消截止、每时段总预约访客quota及每单maxVisitors、适用学生范围快照、交接区域、须知；活动草稿、发布、停止新约、恢复新约、停办、结束。名额按实名来访人员而非孩子数、订单数或实时在场人数。家长有名额直接成功，没有管理员逐单审批。

发布时按ALL_ACTIVE全校区在校、CLASS指定班、STUDENT指定孩子解析并冻结学生快照。班级本表不假定campus_id，用其在校学生的campus_id校验归属；冻结后升班不自动新增资格，提交及入校仍检查当前学生ACTIVE和校区/关系。员工始终同时满足明确业务权限与校区数据范围，配置权限不默认授予敏感逐人台账权限。

发布后日期、时段、交接地点及适用范围不静默变更，必要调整显式停办旧活动并新建，站内通知原预约创建人自行决定；不自动搬单。标题/须知变更只能经带通知的接口同事务生效。STOPPED仅停止新约，现有预约仍可按时核验；CANCELLED停办使未入校凭证失效，0人入校的订单VOID并释放有效占位/容量，已入校的整单保留历史，余下人员不得再入；ENDED仅在最后时段结束后关闭入校，不自动登记离校。

未来文件任务（本轮不创建源码）：

- [ ] `backend/src/main/java/com/doupi/planref/openday/{OpenDayAdminController,OpenDayAdminService}.java`：活动配置/状态、快照、通知、本人范围台账和全量统计；复用公共Kernel/Repository而不借办公事项根或招生预约状态。
- [ ] `doupi-admin/src/views/school/open-day/{index,editor,bookings,statistics}.vue`：单日期多时段配置、名单范围预览、状态确认及原因、入离校来源列和口径说明。
- [ ] `doupi-admin/src/api/school/openDay.ts`：随机幂等键、完整原正文重试、UTC传输、上海日期展示、409刷新；不以前端隐藏菜单代替后端鉴权。
- [ ] `development-plan/05-parent-specs/03-开放日预约契约.md`：公共约束；本文第4/5节完整展开，实施公共类只落一份。

分日任务与验收：

- [ ] D1：权限/校区范围与活动草稿配置；校验同日不重叠时段、时间窗、quota/max；完成范围类型及发布快照，核对班级表真实字段。
- [ ] D2：状态机、全局锁序、容量物理约束、停办0人入校订单作废与已入校事实保留；并发家长提交/核验/停办人工检查。
- [ ] D3：标题须知变化+可靠站内通知同事务、台账分页脱敏、全量逐人统计、来源分列；后台页面联调。
- [ ] D4：越权/错校区、旧版本/同键换正文、通知重复/失败回滚、时区边界、结束不自动离校、统计与分批核验一致性；归档人工验收结果。

验收：设置quota=2，一个2人订单成功后另一个1人订单失败；一个3孩2人订单只占2。停止新约阻止新单但原票据有效；停办与预约/核验并发结果串行且不可漏通知。停办时0人入校订单VOID并释放，已有1人入校的事实保留且其他人不能再入。发布后不能绕过通知换时间地点；须知变化与通知同时提交。统计全量数据库聚合，分别展示STAFF/PARENT_SELF/MANUAL_VERIFIED及“已入校未登记离校人数”，绝不叫实时在校人数。

## 2. 接口设计清单

外层`code:int,msg:string,traceId:string,replayed:boolean,data:object`。所有API必填`Authorization:Bearer string`员工认证，操作者取Actor.userId；不接收body角色/操作者。写操作必填`Idempotency-Key:string8..64随机字母数字_-`；所有输出ID为十进制字符串、version整数。时间输入必须ISO8601含Z或offset，归一UTC存DATETIME并输出UTC Z；visit_date单独为Asia/Shanghai日历日期。分页after排他ID，默认0、每页100，末项ID用于下一页。响应no-store。

| 接口名称 | 请求方式 | 绝对路径 | 完整请求字段：类型/必填/含义 | 返回字段：类型/含义 | 权限要求 |
|---|---|---|---|---|---|
| 校区活动列表 | GET | `/api/v1/admin/open-days` | Authorization:string/是；campusId:string1..32/是/query校区；after:long>=0/否/query默认0 | items:object[]每项event_id:string活动、title:string标题、campus_id:string校区、visit_date:date上海日期、status:string DRAFT/PUBLISHED/STOPPED/CANCELLED/ENDED、version:long | 员工`open-day:manage`+指定校区范围；allData不代替权限 |
| 活动配置详情 | GET | `/api/v1/admin/open-days/{id}` | id:long>0/是/path活动；Authorization:string/是 | event_id/campus_id:string；title:string；visit_date:date；registration_start/registration_end/cancel_deadline:UTC datetime；handover_area:string；instructions:string；scope_type:string ALL_ACTIVE/CLASS/STUDENT；scope_ids:string[]范围配置ID；scope_student_count:long冻结快照人数（草稿未冻结为0）；status:string；scope_frozen_at:datetime或null；version:long；slots:object[]每项slot_id:string、starts_at/ends_at:UTC datetime、quota/reserved_visitors/max_visitors_per_booking:int | `open-day:manage`+活动校区范围；不返回原始访客凭证和手机号 |
| 新建活动草稿 | POST | `/api/v1/admin/open-days` | Authorization:string/是；Idempotency-Key:string/是；campusId:string1..32/是/body校区；title:string1..128/是；visitDate:YYYY-MM-DD/是/上海日期；registrationStart/registrationEnd/cancelDeadline:带offset ISO datetime/是；handoverArea:string1..255/是；instructions:string1..4000/是；scopeType:string ALL_ACTIVE/CLASS/STUDENT/是；scopeIds:long[0..500]/是/ALL_ACTIVE空，其它非空不重复；slots:object[1..20]/是/每项startsAt/endsAt:带offset ISO datetime、quota:int1..10000、maxVisitors:int1..20且<=quota均必填 | HTTP201；event_id/campus_id:string；title:string；visit_date:date；registration_start/registration_end/cancel_deadline:UTC datetime；handover_area/instructions/scope_type:string；scope_ids:string[]；scope_student_count:long；status:string DRAFT；scope_frozen_at:null；version:long；slots:[slot_id:string,starts_at/ends_at:datetime,quota/reserved_visitors/max_visitors_per_booking:int] | 员工`open-day:manage`+目标校区；仅建草稿不自动开放预约 |
| 完整替换草稿配置 | PUT | `/api/v1/admin/open-days/{id}` | id:long>0/是/path；Authorization:string/是；Idempotency-Key:string/是；expectedVersion:long>=0/是/body；campusId:string1..32/是/须等原校区；title:string1..128/是；visitDate:date/是；registrationStart/registrationEnd/cancelDeadline:带offset datetime/是；handoverArea:string1..255/是；instructions:string1..4000/是；scopeType:string枚举/是；scopeIds:long[0..500]/是；slots:object[1..20]/是/每项startsAt/endsAt:带offset datetime、quota:int1..10000、maxVisitors:int1..20均必填 | HTTP200；完整活动配置：event_id/campus_id:string、title:string、visit_date:date、registration_start/end/cancel_deadline:UTC datetime、handover_area/instructions/scope_type:string、scope_ids:string[]、scope_student_count:long、status:DRAFT、scope_frozen_at:null、version:long、slots:[slot_id:string,starts_at/ends_at:datetime,quota/reserved_visitors/max_visitors_per_booking:int] | `open-day:manage`+原校区；仅DRAFT，不能换校区，不能PUT修改已发布活动 |
| 发布/停新约/恢复/停办/结束 | POST | `/api/v1/admin/open-days/{id}/state` | id:long>0/是；Authorization:string/是；Idempotency-Key:string/是；expectedVersion:long>=0/是；status:string PUBLISHED/STOPPED/CANCELLED/ENDED/是/body目标；reason:string1..500/是/操作原因 | HTTP200；完整活动配置event_id/campus_id:string、title:string、visit_date:date、registration_start/registration_end/cancel_deadline:UTC datetime、handover_area/instructions/scope_type:string、scope_ids:string[]、scope_student_count:long、status:string最终状态、scope_frozen_at:datetime或null、version:long、slots:[slot_id:string,starts_at/ends_at:datetime,quota/reserved_visitors/max_visitors_per_booking:int] | `open-day:manage`+校区；严格状态机和版本；停办不是批量伪造出校 |
| 发布标题须知变更及可靠通知 | POST | `/api/v1/admin/open-days/{id}/announcements` | id:long>0/是；Authorization:string/是；Idempotency-Key:string/是；expectedVersion:long>=0/是；title:string1..128/是/body最新标题；instructions:string1..4000/是/最新须知；message:string1..3000/是/明确变更内容和家长处理方式；禁止visitDate/slots/handoverArea | HTTP200；完整活动配置event_id/campus_id:string、title:string、visit_date:date、registration_start/registration_end/cancel_deadline:datetime、handover_area/instructions/scope_type:string、scope_ids:string[]、scope_student_count:long、status:string、scope_frozen_at:datetime、version:long、slots:[slot_id:string,starts_at/ends_at:datetime,quota/reserved_visitors/max_visitors_per_booking:int]；通知事务内写库无需等待外部推送 | `open-day:manage`+校区，状态PUBLISHED/STOPPED；无静默日期地点变更或自动搬单 |
| 活动预约与人员台账 | GET | `/api/v1/admin/open-days/{id}/bookings` | id:long>0/是/path；Authorization:string/是；after:long>=0/否/query默认0、booking ID排他游标 | items:object[]；每项booking_id/event_id/slot_id:string、status:string BOOKED/CANCELLED/VOID、visitor_count:int、version:long、title/campus_id/handover_area/instructions/event_status:string、visit_date:date、starts_at/ends_at:datetime；students:[student_id:string,student_name_snapshot:string]；visitors:[visitor_id:string,visitor_name:string,phone_masked:string,entered_at:datetime或null,exit_source:string或null,actual_exit_at/exit_recorded_at:datetime或null,version:long] | `open-day:ledger`+活动校区；配置权限不自动赋予台账权限，默认无原手机号导出 |
| 全活动人数与来源统计 | GET | `/api/v1/admin/open-days/{id}/statistics` | id:long>0/是/path；Authorization:string/是；无分页或body | event_id:string；reserved_persons:long当前有效预约到访人数含已入事实；entered_persons:long已入校人数；staff_exit_records/parent_self_exit_records/manual_verified_exit_records:long当前离校登记来源人数；entered_without_exit_record:long已入校且未登记离校人数；count_label/capacity_semantics:string口径提示；slots:[slot_id:string,quota/reserved_visitors/max_visitors_per_booking:int] | `open-day:ledger`+活动校区；数据库全量聚合，不能拿某页台账当全活动总数 |

## 3. 数据流转细节

| API与字段来源 | 字段级校验及SQL表字段对应 | 事务、缓存、通知与统计 |
|---|---|---|
| 列表/详情：query.campusId/after或path.id，Actor | `Actor.requireStaff()+require(open-day:manage)`，非allData须`school_open_day_staff_scope(user_id,campus_id,active=1)`；列表WHERE campus/ID先过滤，详情仅投影配置字段，scope_ids_json解析为scope_ids；关联slot返回quota/reserved/max并COUNT(scope_student) | 只读无共享个人缓存；不存在404，超范围403；配置视图不顺带返回访客资料 |
| 草稿创建：body完整配置+Actor.userId/header.key | 校区存在；title/area/instructions长度；visitDate单上海日期；各时间含offset→UTC；registrationStart<End、start<=cancel，End/cancel<=最早slot；slot转上海后起止都在visitDate、start<end、互不重叠；1..20时段、quota1..10000、max1..20且<=quota。scopeType白名单，scopeIds精确long、不重复且类型对应空/非空；CLASS查edu_class存在及ACTIVE学生校园归属，STUDENT查ACTIVE学生本校区。写`school_open_day.*scope_type/scope_ids_json/status=DRAFT/created_by/version=1`及slot.event/start/end/quota/max | 固定OD_ADMIN_CREATE，actor_key=STAFF:userId；完整body摘要，幂等行→新活动→时段事务写，失败全回滚。草稿不建立可预约范围、不返回伪成功；无名额缓存分配 |
| 草稿替换：path.id/body.expectedVersion及完整配置 | 先权限、幂等再锁event，验version、DRAFT及campus不变；有序锁原slot；固定参数化UPDATE配置/version+1，删草稿scope/slot并插新slot。原班级没有campus_id，不得拼不存在列；班级校区通过在校学生EXISTS | 仅DRAFT允许替换，发布后PUT409。没有预约时才可能删除草稿时段；外键保护阻止误删历史。跨校区须创建新活动，不在URL/JSON靠前端猜归属 |
| 状态：path.id/body.status/expectedVersion/reason+认证员工 | 固定OD_ADMIN_STATE。DRAFT→PUBLISHED；PUBLISHED→STOPPED/CANCELLED/ENDED；STOPPED→PUBLISHED/CANCELLED/ENDED；终态不可恢复。锁event→全部slot升序；发布检查未过registrationEnd、按scope_type/JSON_TABLE固定过滤ACTIVE学生INSERT scope_student快照，空范围拒绝，scope_frozen_at写一次。结束须now>=最后slot.end。停办再锁全部BOOKED booking升序→全部涉及学生升序；0人入校整单release：slot.reserved减少visitor_count、booking_student.active=0、booking.status=VOID/version+1；已入校订单保持事实。最后event.status/version/update_time更新 | 活动、容量、学生/guardian占位释放、可靠notice均同事务。STOPPED不作废票据；CANCELLED/ENDED由核验动态读状态拒绝未入校；已入校不删、不补造exit。容量以slot行锁及CHECK校验，不靠Redis；与家长预约/取消/扫码共用锁序 |
| 标题须知通知：path.id/body.expectedVersion/title/instructions/message | 固定OD_ADMIN_ANNOUNCE；只PUBLISHED/STOPPED，禁止请求带visitDate/slots/handoverArea；event.title/instructions/version+1；`INSERT school_open_day_notice SELECT 所有预约creator_guardian_id`，写event_id/event_version/kind/title/content/created_at；UK(event,guardian,version,kind)防重复 | 修改与站内通知同事务；notice直接持久化即站内可读，外部微信推送不作为成功条件。变更必须说清内容与处理方式，不静默迁移时段地点；消息内容不包含其它孩子、同行电话或token |
| 预约台账：path.id/query.after | `open-day:ledger`+campus scope；booking WHERE event_id且booking_id>after ORDER LIMIT100；逐笔仅投影booking/event/slot、booking_student及visitor必要脱敏字段 | 数据库按授权过滤再分页；不暴露ticket_nonce/hash/visitors_hash/action.payload_hash，也不返回原始联系电话。页总数不能冒充全量，未来导出另行授权、脱敏、审计，本P0未提供 |
| 全量统计：path.id+员工范围 | event行短锁与写业务串行，聚合该event所有BOOKED访客或已有entered_at事实；COUNT reserved、SUM entered、按visitor.exit_source区分STAFF/PARENT_SELF/MANUAL_VERIFIED；`entered_at IS NOT NULL AND exit_recorded_at IS NULL`映射entered_without_exit_record；slot容量独立返回 | 全量SQL聚合、不是分页数组长度；来源人数表示当前登记来源，历史自报升级仍在movement审计可追溯。统计非实时在校，自报离校不释放容量；结束无自动离校，前后口径不变 |

幂等摘要包含路径目标和完整正文；相同动作/actor_key/key先重放后验版本，异正文409。server允许的固定SQL片段只由scopeType枚举选择，所有值经MyBatis参数绑定。新DATETIME统一UTC，visit_date与前端显示单独转上海；staff scope的active不是业务角色，allData不能代替明确权限。

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

以下完整Java类只存在Markdown；未来按同名public类分文件，Java17/Boot4/MyBatis4，公共Db/P/Inputs/Json/Actor/Problem/ApiReply及ParentAccess只读复用契约。公共Repository/Kernel三模块只实施一次。代码给出Controller→Service→Repository全部关键校验、参数化SQL、范围、事务、幂等、通知、统计、异常和日志；尚未写源码、编译或运行，不能当成已实现的功能证明。

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
import java.time.*;
import java.util.*;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/open-days")
public class OpenDayAdminController {
 private final OpenDayAdminService s;
 public OpenDayAdminController(OpenDayAdminService s){this.s=s;}
 private ResponseEntity<Map<String,Object>>ok(Map<String,Object>d,int http){ResponseEntity<Map<String,Object>>reply=ApiReply.of(OpenDayKernel.response(d),http);return ResponseEntity.status(reply.getStatusCode()).header("Cache-Control","no-store").body(reply.getBody());}
 @GetMapping public ResponseEntity<Map<String,Object>>list(@RequestParam String campusId,@RequestParam(defaultValue="0")long after){return ok(s.list(campusId,after),200);}
 @GetMapping("/{id}") public ResponseEntity<Map<String,Object>>detail(@PathVariable long id){return ok(s.detail(id),200);}
 @PostMapping public ResponseEntity<Map<String,Object>>create(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ok(s.create(key,b),201);}
 @PutMapping("/{id}") public ResponseEntity<Map<String,Object>>update(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ok(s.update(id,key,b),200);}
 @PostMapping("/{id}/state") public ResponseEntity<Map<String,Object>>state(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ok(s.state(id,key,b),200);}
 @PostMapping("/{id}/announcements") public ResponseEntity<Map<String,Object>>announce(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ok(s.announce(id,key,b),200);}
 @GetMapping("/{id}/bookings") public ResponseEntity<Map<String,Object>>bookings(@PathVariable long id,@RequestParam(defaultValue="0")long after){return ok(s.bookings(id,after),200);}
 @GetMapping("/{id}/statistics") public ResponseEntity<Map<String,Object>>statistics(@PathVariable long id){return ok(s.statistics(id),200);}
}

@Service
public class OpenDayAdminService {
 private final OpenDayRepository r;private final OpenDayKernel k;
 public OpenDayAdminService(OpenDayRepository r,OpenDayKernel k){this.r=r;this.k=k;}
 private Map<String,Object>authorized(long id,String permission){Map<String,Object>e=r.event(id,false);r.staff(permission,e.get("campus_id").toString());return e;}
 private Map<String,Object>config(Map<String,Object>b){
  String campus=Inputs.text(b,"campusId",1,32),title=Inputs.text(b,"title",1,128),area=Inputs.text(b,"handoverArea",1,255),instructions=Inputs.text(b,"instructions",1,4000),scope=Inputs.text(b,"scopeType",1,16);
  if(r.db.one("SELECT campus_id FROM doupi_recruit_campus WHERE campus_id=#{p.campus}",P.of("campus",campus)).isEmpty())throw Problem.bad("校区不存在");
  LocalDate date=OpenDayKernel.date(b.get("visitDate"));LocalDateTime start=OpenDayKernel.time(b.get("registrationStart")),end=OpenDayKernel.time(b.get("registrationEnd")),cancel=OpenDayKernel.time(b.get("cancelDeadline"));
  if(date.isBefore(OpenDayKernel.shanghaiDate(OpenDayKernel.now()))||!start.isBefore(end)||cancel.isBefore(start))throw Problem.bad("活动日期或报名取消时间不合法");
  if(!Set.of("ALL_ACTIVE","CLASS","STUDENT").contains(scope))throw Problem.bad("scopeType不合法");List<Long>ids=Inputs.ids(b,"scopeIds");if(new HashSet<>(ids).size()!=ids.size()||("ALL_ACTIVE".equals(scope)?!ids.isEmpty():ids.isEmpty()))throw Problem.bad("范围ID应与范围类型匹配且不重复");
  for(long id:ids){String sql="CLASS".equals(scope)?"SELECT c.class_id FROM edu_class c WHERE c.class_id=#{p.id} AND EXISTS(SELECT 1 FROM edu_student st WHERE st.class_id=c.class_id AND st.campus_id=#{p.campus} AND st.status='ACTIVE')":"SELECT student_id FROM edu_student WHERE student_id=#{p.id} AND campus_id=#{p.campus} AND status='ACTIVE'";if(r.db.one(sql,P.of("id",id,"campus",campus)).isEmpty())throw Problem.bad("范围包含不存在、非在校或跨校区对象");}
  List<Map<String,Object>>slots=new ArrayList<>();for(Map<String,Object>x:Inputs.list(b,"slots")){LocalDateTime from=OpenDayKernel.time(x.get("startsAt")),to=OpenDayKernel.time(x.get("endsAt"));long quota=Inputs.positive(x,"quota"),max=Inputs.positive(x,"maxVisitors");if(!OpenDayKernel.shanghaiDate(from).equals(date)||!OpenDayKernel.shanghaiDate(to).equals(date)||!from.isBefore(to)||quota>10000||max>20||max>quota)throw Problem.bad("时段日期、容量或每单上限不合法");slots.add(P.of("from",from,"to",to,"quota",quota,"max",max));}
  if(slots.isEmpty()||slots.size()>20)throw Problem.bad("应设置1至20个时段");slots.sort(Comparator.comparing(x->OpenDayKernel.time(x.get("from"))));LocalDateTime previous=null;for(Map<String,Object>x:slots){LocalDateTime from=OpenDayKernel.time(x.get("from"));if(previous!=null&&from.isBefore(previous))throw Problem.bad("同活动时段不可重叠");previous=OpenDayKernel.time(x.get("to"));}
  LocalDateTime first=OpenDayKernel.time(slots.get(0).get("from"));if(end.isAfter(first)||cancel.isAfter(first))throw Problem.bad("报名结束与取消截止不得晚于首个到访时段开始");
  return P.of("campus",campus,"title",title,"date",date,"start",start,"end",end,"cancel",cancel,"area",area,"instructions",instructions,"scope",scope,"ids",Json.write(ids),"slots",slots);
 }
 private void slots(long event,Map<String,Object>p){for(Map<String,Object>s:Inputs.list(p,"slots"))r.db.insert("INSERT INTO school_open_day_slot(event_id,starts_at,ends_at,quota,max_visitors_per_booking) VALUES(#{p.event},#{p.from},#{p.to},#{p.quota},#{p.max})",P.of("event",event,"from",s.get("from"),"to",s.get("to"),"quota",s.get("quota"),"max",s.get("max")));}
 private void snapshot(Map<String,Object>e){
  long event=Inputs.number(e.get("event_id"));String type=e.get("scope_type").toString(),ids=e.get("scope_ids_json").toString();
  Map<String,Object>p=P.of("event",event,"campus",e.get("campus_id"),"ids",ids);
  String filter=switch(type){case "CLASS"->" AND s.class_id IN(SELECT j.id FROM JSON_TABLE(#{p.ids},'$[*]' COLUMNS(id BIGINT PATH '$')) j)";case "STUDENT"->" AND s.student_id IN(SELECT j.id FROM JSON_TABLE(#{p.ids},'$[*]' COLUMNS(id BIGINT PATH '$')) j)";default->"";};
  r.db.write("DELETE FROM school_open_day_scope_student WHERE event_id=#{p.event}",p);
  r.db.write("INSERT INTO school_open_day_scope_student(event_id,student_id,campus_id) SELECT #{p.event},s.student_id,s.campus_id FROM edu_student s WHERE s.campus_id=#{p.campus} AND s.status='ACTIVE'"+filter+" ORDER BY s.student_id",p);
  if(r.db.one("SELECT student_id FROM school_open_day_scope_student WHERE event_id=#{p.event} LIMIT 1",p).isEmpty())throw Problem.bad("适用范围没有在校学生，不能发布");
 }
 private Map<String,Object>view(long id){Map<String,Object>e=r.db.required("SELECT event_id,campus_id,title,visit_date,registration_start,registration_end,cancel_deadline,handover_area,instructions,scope_type,scope_ids_json,status,scope_frozen_at,version FROM school_open_day WHERE event_id=#{p.id}",P.of("id",id));e.put("scope_ids",Json.readMap("{\"ids\":"+e.remove("scope_ids_json")+"}").get("ids"));e.put("slots",r.db.list("SELECT slot_id,starts_at,ends_at,quota,reserved_visitors,max_visitors_per_booking FROM school_open_day_slot WHERE event_id=#{p.id} ORDER BY slot_id",P.of("id",id)));e.put("scope_student_count",r.db.required("SELECT COUNT(*) AS count FROM school_open_day_scope_student WHERE event_id=#{p.id}",P.of("id",id)).get("count"));return e;}
 public Map<String,Object>list(String campus,long after){if(campus==null||campus.isBlank()||campus.length()>32||after<0)throw Problem.bad("校区或游标非法");r.staff("open-day:manage",campus);return P.of("items",r.db.list("SELECT event_id,title,campus_id,visit_date,status,version FROM school_open_day WHERE campus_id=#{p.campus} AND event_id>#{p.after} ORDER BY event_id LIMIT 100",P.of("campus",campus,"after",after)));}
 public Map<String,Object>detail(long id){authorized(id,"open-day:manage");return view(id);}
 public Map<String,Object>create(String key,Map<String,Object>b){r.staff("open-day:manage",Inputs.text(b,"campusId",1,32));Map<String,Object>p=config(b);
  return k.command("OD_ADMIN_CREATE",key,p.get("campus"),b,201,c->{p.put("user",c.actor().userId());long id=r.db.insert("INSERT INTO school_open_day(campus_id,title,visit_date,registration_start,registration_end,cancel_deadline,handover_area,instructions,scope_type,scope_ids_json,created_by,version) VALUES(#{p.campus},#{p.title},#{p.date},#{p.start},#{p.end},#{p.cancel},#{p.area},#{p.instructions},#{p.scope},#{p.ids},#{p.user},1)",p);slots(id,p);return view(id);});
 }
 public Map<String,Object>update(long id,String key,Map<String,Object>b){authorized(id,"open-day:manage");Inputs.nonNegative(b,"expectedVersion");Map<String,Object>p=config(b);
  return k.command("OD_ADMIN_UPDATE",key,id,b,200,c->{Map<String,Object>e=r.event(id,true);r.staff("open-day:manage",e.get("campus_id").toString());OpenDayKernel.version(b,e);if(!"DRAFT".equals(e.get("status"))||!p.get("campus").equals(e.get("campus_id")))throw Problem.conflict("只可编辑草稿且不能换校区；已发布的时间地点变更请显式停办后新建");for(Map<String,Object>s:r.db.list("SELECT slot_id FROM school_open_day_slot WHERE event_id=#{p.id} ORDER BY slot_id FOR UPDATE",P.of("id",id)))r.slot(id,Inputs.number(s.get("slot_id")),true);p.put("id",id);r.db.write("UPDATE school_open_day SET title=#{p.title},visit_date=#{p.date},registration_start=#{p.start},registration_end=#{p.end},cancel_deadline=#{p.cancel},handover_area=#{p.area},instructions=#{p.instructions},scope_type=#{p.scope},scope_ids_json=#{p.ids},version=version+1,updated_at=CURRENT_TIMESTAMP(3) WHERE event_id=#{p.id}",p);r.db.write("DELETE FROM school_open_day_scope_student WHERE event_id=#{p.id}",p);r.db.write("DELETE FROM school_open_day_slot WHERE event_id=#{p.id}",p);slots(id,p);return view(id);});
 }
 public Map<String,Object>state(long id,String key,Map<String,Object>b){authorized(id,"open-day:manage");Inputs.nonNegative(b,"expectedVersion");String next=Inputs.text(b,"status",1,16),reason=Inputs.text(b,"reason",1,500);if(!Set.of("PUBLISHED","STOPPED","CANCELLED","ENDED").contains(next))throw Problem.bad("目标状态不合法");
  return k.command("OD_ADMIN_STATE",key,id,b,200,c->{Map<String,Object>e=r.event(id,true);r.staff("open-day:manage",e.get("campus_id").toString());OpenDayKernel.version(b,e);String old=e.get("status").toString();boolean valid=("DRAFT".equals(old)&&"PUBLISHED".equals(next))||("PUBLISHED".equals(old)&&Set.of("STOPPED","CANCELLED","ENDED").contains(next))||("STOPPED".equals(old)&&Set.of("PUBLISHED","CANCELLED","ENDED").contains(next));if(!valid)throw Problem.conflict("活动状态流转不允许");
   List<Map<String,Object>>slots=r.db.list("SELECT * FROM school_open_day_slot WHERE event_id=#{p.id} ORDER BY slot_id FOR UPDATE",P.of("id",id));if(slots.isEmpty())throw Problem.bad("活动没有时段");
   if("PUBLISHED".equals(next)&&!OpenDayKernel.now().isBefore(OpenDayKernel.time(e.get("registration_end"))))throw Problem.conflict("报名已结束，不能发布或恢复");
   if("DRAFT".equals(old))snapshot(e);
   if("ENDED".equals(next)){LocalDateTime last=slots.stream().map(s->OpenDayKernel.time(s.get("ends_at"))).max(Comparator.naturalOrder()).orElseThrow();if(OpenDayKernel.now().isBefore(last))throw Problem.conflict("最后时段未结束；提前停止请使用停止新约或停办");}
   if("CANCELLED".equals(next)){
    List<Map<String,Object>>orders=r.db.list("SELECT * FROM school_visit_booking WHERE event_id=#{p.id} AND status='BOOKED' ORDER BY booking_id FOR UPDATE",P.of("id",id));
    TreeSet<Long>studentIds=new TreeSet<>();for(Map<String,Object>order:orders)for(Map<String,Object>s:r.db.list("SELECT student_id FROM school_visit_booking_student WHERE booking_id=#{p.id} ORDER BY student_id",P.of("id",order.get("booking_id"))))studentIds.add(Inputs.number(s.get("student_id")));for(long student:studentIds)r.db.required("SELECT student_id FROM edu_student WHERE student_id=#{p.id} FOR UPDATE",P.of("id",student));
    for(Map<String,Object>order:orders)if(r.db.one("SELECT visitor_id FROM school_visit_visitor WHERE booking_id=#{p.id} AND entered_at IS NOT NULL LIMIT 1",P.of("id",order.get("booking_id"))).isEmpty())k.release(order,"VOID",reason);
   }
   r.db.write("UPDATE school_open_day SET status=#{p.status},scope_frozen_at=CASE WHEN scope_frozen_at IS NULL AND #{p.status}='PUBLISHED' THEN CURRENT_TIMESTAMP(3) ELSE scope_frozen_at END,version=version+1,updated_at=CURRENT_TIMESTAMP(3) WHERE event_id=#{p.id}",P.of("status",next,"id",id));
   r.notice(id,"PUBLISHED".equals(next)?"CREATED":next,"活动状态变更为"+next+"。原因："+reason+"。停办后未入校凭证失效，已有入校与离校登记保留；请查看活动详情，不会自动改期。");return view(id);
  });
 }
 public Map<String,Object>announce(long id,String key,Map<String,Object>b){authorized(id,"open-day:manage");Inputs.nonNegative(b,"expectedVersion");String title=Inputs.text(b,"title",1,128),instructions=Inputs.text(b,"instructions",1,4000),message=Inputs.text(b,"message",1,3000);
  return k.command("OD_ADMIN_ANNOUNCE",key,id,b,200,c->{Map<String,Object>e=r.event(id,true);r.staff("open-day:manage",e.get("campus_id").toString());OpenDayKernel.version(b,e);if(!Set.of("PUBLISHED","STOPPED").contains(e.get("status")))throw Problem.conflict("仅已发布或停止新约活动可发变更通知");if(b.containsKey("visitDate")||b.containsKey("slots")||b.containsKey("handoverArea"))throw Problem.bad("日期时段地点不可通过须知通知静默修改");r.db.write("UPDATE school_open_day SET title=#{p.title},instructions=#{p.instructions},version=version+1,updated_at=CURRENT_TIMESTAMP(3) WHERE event_id=#{p.id}",P.of("title",title,"instructions",instructions,"id",id));r.notice(id,"ANNOUNCED",message+"；最新须知："+instructions);return view(id);});
 }
 public Map<String,Object>bookings(long id,long after){authorized(id,"open-day:ledger");if(after<0)throw Problem.bad("after不能为负");List<Map<String,Object>>items=new ArrayList<>();for(Map<String,Object>b:r.db.list("SELECT booking_id FROM school_visit_booking WHERE event_id=#{p.id} AND booking_id>#{p.after} ORDER BY booking_id LIMIT 100",P.of("id",id,"after",after)))items.add(r.bookingView(Inputs.number(b.get("booking_id"))));return P.of("items",items);}
 public Map<String,Object>statistics(long id){authorized(id,"open-day:ledger");return k.tx.execute(s->{r.event(id,true);Map<String,Object>result=r.db.required("SELECT COUNT(*) AS reserved_persons,COALESCE(SUM(v.entered_at IS NOT NULL),0) AS entered_persons,COALESCE(SUM(v.exit_source='STAFF'),0) AS staff_exit_records,COALESCE(SUM(v.exit_source='PARENT_SELF'),0) AS parent_self_exit_records,COALESCE(SUM(v.exit_source='MANUAL_VERIFIED'),0) AS manual_verified_exit_records,COALESCE(SUM(v.entered_at IS NOT NULL AND v.exit_recorded_at IS NULL),0) AS entered_without_exit_record FROM school_visit_visitor v JOIN school_visit_booking b ON b.booking_id=v.booking_id WHERE b.event_id=#{p.id} AND (b.status='BOOKED' OR v.entered_at IS NOT NULL)",P.of("id",id));result.put("event_id",id);result.put("count_label","已入校未登记离校人数；不是实时在校人数");result.put("capacity_semantics","时段累计预约到访人数；登记离校不释放预约容量");result.put("slots",r.db.list("SELECT slot_id,quota,reserved_visitors,max_visitors_per_booking FROM school_open_day_slot WHERE event_id=#{p.id} ORDER BY slot_id",P.of("id",id)));return result;});}
}
```

## 6. 边界与异常场景处理

- 400：不存在校区、非法时间/无offset、时段跨上海日期/重叠、报名或取消截止晚于首时段、quota/max非法、范围类型与ID数组不符、重复/跨校区/不存在的范围对象。空班无ACTIVE学生不当成有效范围，发布空快照拒绝。
- 403：缺open-day:manage或open-day:ledger、超出school_open_day_staff_scope；allData不能代替角色权限；学校管理员若只有配置权限不能读同行台账。前端隐藏菜单不构成服务端授权。
- 404：活动不存在；不基于传入campusId覆盖实际活动归属。client不能传userId/guardianId替他人创建开放日预约，后台此模块也不提供“代家长抢名额”。
- 409：旧版本、同键换目标/正文、发布后PUT、终态恢复、报名结束后发布/恢复、未到末时段结束却ENDED、直接通知接口带日期时段地点、容量账扣减异常。事务失败不留下半份快照/少发通知/负容量。
- 并发：最后名额由slot行锁+quota CHECK决定，按实名访客数；唯一有效学生和创建家长由物理UK决定。固定活动→全部时段→全部预约→全部学生升序锁；停办不与家长追加/取消/扫码形成反序锁。
- 停办：0人已入校订单VOID、凭证失效并释放占位；已有任意1人入校的订单保留全部历史，其他未入校人员凭event状态失效。已入者仍可登记/自报/核实补录离校；保留的预约容量是历史总预约占用，不解释为当前仍在校人数。
- 结束：只有最后时段结束后允许；不自动批量写actual_exit_at或exit_recorded_at，不把最后时段结束时间当离校事实。统计label必须“已入校未登记离校人数”，附“无记录不等于仍在校”。
- 改期与变更：P0不迁单、不提供原地改时段地点；停办并创建新活动，通知原创建家长自行决定是否报名，明确新名额不保证。标题须知可变但必须与站内notice同事务；外部订阅推送失败不能静默丢站内通知。
- 通知/隐私：每个预约创建guardian一份通知，不通知另一监护人有关该单其它孩子/访客内容。投递主键含活动版本去重；不打印原始token、种子、摘要、姓名、电话或完整body。P0不提供原手机号导出，未来必要岗位导出需单独权限、审计与脱敏口径。
