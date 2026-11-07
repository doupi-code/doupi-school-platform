# MINI-10 开放日送物预约

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#mini-10)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，4个工作日；依赖MINI-09在校家长/学生关联、MINI-07家长端身份工作台。** 估时按一名单人Java开发者结合AI，包含后端、小程序、联调和人工验收。本文于2026-11-05编写，只交付Markdown开发计划；下文DDL及Java尚未实现、未落源码、未运行。既有[公共契约](../00-shared/公共契约.md)只读引用。

供在校家长在学校开放日入校当面送物。有名额且学生资格有效即预约成功，无逐单审核。独立于招生访校、游园；不借用招生配额、状态、预约号、凭证。范围为查看本人孩子适用活动、选择时段和实名到访人员、多孩合单、本人查询、逐人凭证、取消整单、可靠站内通知。同行人不获得学生权限；不包含物流签收、门禁/人脸硬件、强制出校。

一场活动=单校区、单个上海日历日期的一次开放安排，可含多个时段；跨校区/跨日分别建活动。同家长同活动只有一个有效预约；多孩跨时段也不能另建第二单。首次可多孩合并，也可向原单追加孩子，但必须沿用原时段、原实名访客，带原单版本且不另占容量。一个孩子同活动只能在一个有效预约中，另一监护人仅看到自己孩子“已预约”，不能看到订单ID、其它孩子、预约人或同行联系方式。整个订单仅创建监护人管理。P1才考虑改单/改期；首批时段、同行人修改均须符合取消条件后取消重约，页面明确“原名额释放，新名额不保证”。

未来文件任务（此轮不创建下列源码）：

- [ ] `backend/src/main/java/com/doupi/planref/openday/{OpenDayBookingController,OpenDayBookingService,OpenDayRepository,OpenDayKernel,OpenDayTickets}.java`：独立预约域、幂等、名额、资格、脱敏视图、逐人签名凭证；共享类只落一份。
- [ ] `doupi-miniApp/pages/parent/open-day/{list,booking,detail,tickets,notices}/`：活动与时段、适用孩子、实名访客、本人订单、可靠通知；凭证不进入分享卡或埋点。
- [ ] `doupi-miniApp/services/openDay.js`：Authorization、随机幂等键、弱网同键重试、409刷新、UTC传输与上海日期显示、票据内存显示；不缓存授权结论。
- [ ] `development-plan/05-parent-specs/03-开放日预约契约.md`：公共DDL、锁序、命令和票据约定；本模块第4/5节已完整展开。

分日任务与验收：

- [ ] D1：读MINI-09/07身份契约；核对ACTIVE身份/VERIFIED关系/ACTIVE学生；实现活动目录与范围快照过滤；造两个监护人、跨校区、非在校学生的人工样例。
- [ ] D2：预约事务、时段容量锁、唯一有效孩子/预约人、创建/追加合单、固定动作幂等；模拟最后一名额并发及不同监护人抢同孩子。
- [ ] D3：本人列表详情、逐人票据、取消释放占位、站内通知页；完成小程序表单、名额风险文案、本人权限及敏感字段检查。
- [ ] D4：弱网超时同键重放、版本变化、停止新约/停办、取消与入校竞争；检查日志/缓存/响应不泄露票据种子或摘要，整理人工验收证据。

交付验收：一单2个孩子2位访客只占2名额；追加第3个孩子仍占2；同孩子被两个监护人同时预约仅一单成功；另一监护人只得`child_booked=1`。同键相同正文重试返回原单，相同键换正文409；取消与核验竞争不能同时成功。取消截止前且0人入校才整单释放；有1人入校也不能取消整单。停办后未入校凭证失效，已入校事实保留；站内通知在同事务可查询。

## 2. 接口设计清单

响应外层固定`code:int/msg:string/traceId:string/replayed:boolean/data:object`。下列字段均在data；输出ID为十进制字符串，输入ID接受十进制字符串或精确整数，HTTP时间必须ISO8601带Z或offset，输入归一UTC、输出UTC Z；visit_date单独表示Asia/Shanghai日历日期。所有接口必填`Authorization:Bearer string`，来自服务端认证Actor，禁止body传identityId/guardianId/角色；写操作必填`Idempotency-Key:string(8..64,字母数字_-随机值)`。分页after是排他ID游标，默认0、每批扫描100条；本人订单列表以scanned_through_id继续、has_more判定是否继续，其余列表下一页取末项ID；不可据第1页当全量统计。票据响应`Cache-Control:no-store`，客户端不持久化原始token。

| 接口名称 | 请求方式 | 绝对路径 | 完整请求字段：类型/必填/含义 | 返回字段：类型/含义 | 权限要求 |
|---|---|---|---|---|---|
| 本人学生适用活动及场次 | GET | `/api/v1/parent/open-days` | studentId:long>0/是/query本人有效关联学生；Authorization:string/是/会话；无body | items:object[]；每项event_id:string活动、title:string标题、campus_id:string校区、visit_date:date日期、registration_start/registration_end/cancel_deadline:datetime报名起止与取消截止、handover_area:string交接区、instructions:string须知、status:string PUBLISHED/STOPPED、version:long配置版本、child_booked:int0或1该孩子是否已有有效预约、slots:object[]；每时段slot_id:string、starts_at/ends_at:datetime、remaining_visitors:int可用预约人数、max_visitors_per_booking:int每单访客上限 | 当前ACTIVE监护人身份+该生VERIFIED关联+ACTIVE在校学生且在活动范围快照；仅回本人孩子占用布尔值 |
| 创建预约或原单追加孩子 | POST | `/api/v1/parent/open-days/{eventId}/bookings` | eventId:long>0/是/path；Idempotency-Key:string/是/header；studentIds:long[1..20]/是/不重复当前有效关联学生；slotId:long>0/是/所选活动时段；eventVersion:long>=0/是/已读活动版本；expectedVersion:long>=0/是/新单0，原单追加为原单version；visitors:object[1..20]/是/每项name:string1..64真实姓名、phone:string9..16 E.164；Authorization:string/是 | HTTP201；booking_id/event_id/slot_id:string预约/活动/时段；status:string BOOKED；visitor_count:int占位人数；version:long单版本；title/campus_id/handover_area/instructions/event_status:string当前活动资料；visit_date:date；starts_at/ends_at:datetime；students:object[]每项student_id:string、student_name_snapshot:string；visitors:object[]每项visitor_id:string、visitor_name:string、phone_masked:string、entered_at:datetime或null、exit_source:string或null、actual_exit_at/exit_recorded_at:datetime或null、version:long。响应不包含token、原始手机号或内部摘要 | 仅有效关联且活动快照内学生；全部订单仅创建监护人；有名额直接BOOKED，无员工逐单审批 |
| 本人订单列表 | GET | `/api/v1/parent/open-day-bookings` | after:long>=0/否/query默认0；Authorization:string/是 | scanned_through_id:string本批已扫描的末ID（下一页after），has_more:boolean仍可能有后续；items:object[]仅当前全部子女授权仍有效的订单；booking_id/event_id/slot_id:string；status:string BOOKED/CANCELLED/VOID；visitor_count:int；version:long；title:string活动名；visit_date:date | creator_guardian_id等于当前有效身份映射的监护人；另一监护人不可凭孩子关系列出整单 |
| 本人订单详情 | GET | `/api/v1/parent/open-day-bookings/{id}` | id:long>0/是/path订单；Authorization:string/是 | booking_id/event_id/slot_id:string；status:string；visitor_count:int；version:long；title/campus_id/handover_area/instructions/event_status:string；visit_date:date；starts_at/ends_at:datetime；students:object[]每项student_id:string、student_name_snapshot:string；visitors:object[]每项visitor_id:string、visitor_name:string、phone_masked:string、entered_at:datetime或null、exit_source:string或null、actual_exit_at/exit_recorded_at:datetime或null、version:long | 仅订单创建监护人且整单全部孩子当前ACTIVE+VERIFIED；非本人或任一关联失效统一404，不因知道学生或订单ID越权 |
| 取逐人到校凭证 | GET | `/api/v1/parent/open-day-bookings/{id}/tickets` | id:long>0/是/path订单；Authorization:string/是；无body | booking_id:string；tickets:object[]；每项visitor_id:string具体人员、visitor_name:string姓名、token:string高熵签名凭证、expires_at:datetime到时段结束；已取消/作废/停办/结束/过期返回空tickets；不返ticket_hash/ticket_nonce/payload_hash | 仅创建监护人；同行不获得学生或订单读权限；凭证仅供已授权员工核验 |
| 取消本人整单 | POST | `/api/v1/parent/open-day-bookings/{id}/cancel` | id:long>0/是/path；Idempotency-Key:string/是/header；expectedVersion:long>=0/是/订单版本；reason:string1..500/是/取消原因；Authorization:string/是 | HTTP200；完整订单字段同详情：booking_id/event_id/slot_id:string、status:string CANCELLED、visitor_count:int、version:long、title/campus_id/handover_area/instructions/event_status:string、visit_date:date、starts_at/ends_at:datetime、students:[student_id:string,student_name_snapshot:string]、visitors:[visitor_id:string,visitor_name:string,phone_masked:string,entered_at:datetime或null,exit_source:string或null,actual_exit_at/exit_recorded_at:datetime或null,version:long] | 创建监护人、now<cancel_deadline、整单0人已入校；不接受某位同行自称“全员未到” |
| 可靠活动变更通知 | GET | `/api/v1/parent/open-day-notices` | after:long>=0/否/query默认0；Authorization:string/是 | items:object[]；notice_id/event_id:string通知/活动；event_version:long变更版本；notice_kind:string CREATED/CANCELLED/STOPPED/ENDED/ANNOUNCED；title:string标题；content:string最多8000字符变更与处理说明；created_at:datetime站内写入时间 | 当前有效身份映射的预约创建监护人；不向另一监护人泄露订单关联或同行信息 |

## 3. 数据流转细节

| API与字段来源 | 校验及SQL读写对应表字段 | 事务、缓存和返回 |
|---|---|---|
| 活动目录：认证Actor.identityId→当前guardian；query.studentId→学生 | `edu_guardian_identity.identity_id/status`+`edu_guardian.status`判ACTIVE；ParentAccess检查`edu_student_guardian.status=VERIFIED`及`edu_student.status=ACTIVE`；`school_open_day_scope_student(event_id,student_id,campus_id)`与当前学生校区一致；读活动title/campus/date/registration/cancel/area/instructions/status/version；slot读quota-reserved_visitors与max；EXISTS读取`school_visit_booking_student(event_id,active_student_id)`只映射child_booked | 只读数据库；不按手机号或客户端openid授权，不按关联孩子返回他人booking_id；不缓存授权或可售容量；目录剩余人数仅提示，提交在事务内重验 |
| 创建/追加：path.eventId，body.slotId/studentIds/eventVersion/expectedVersion/visitors[].name/phone，header.key，当前guardian/identity | 固定OD_BOOK；规范目标+正文→`school_visit_action.payload_hash`。活动锁查PUBLISHED及registration_start<=now<end、eventVersion；时段锁确认同活动、max、quota。按guardian查BOOKED原单；新单expectedVersion=0，写`school_visit_booking.event_id/slot_id/creator_guardian_id/creator_identity_id/visitor_count/visitors_hash/version`；原单核slot与规范visitor摘要完全相同、版本匹配，只version+1。学生ID排序再次锁ACTIVE学生、VERIFIED关系与ACTIVE身份；插`school_visit_booking_student(event_id,booking_id,student_id,name_snapshot,active)`；其UK(event,active_student_id)阻止不同监护人抢同孩。新单逐人写visitor_name/phone_e164/随机ticket_nonce/key_version/expires；生成签名后仅落ticket_hash；slot.reserved_visitors+=访客数，追加孩子不增加 | 同一事务先幂等行、再活动→时段→预约→学生升序锁；两个物理UK分别保同活动一孩子一有效单、一监护人一有效单。动作result_json只存脱敏详情，无token/种子/原手机号；失败全回滚含容量和占位。同键重放前仍对归档响应booking_id执行整单当前授权，任一孩子关联失效不重放敏感内容；通过授权后先重放再检查旧业务版本；client不得为超时重试换键。Redis不分配名额 |
| 本人列表：after+当前guardian | `WHERE b.creator_guardian_id=:guardian AND booking_id>:after ORDER BY booking_id LIMIT 100`；只选订单ID、活动ID、时段ID、状态、人数、版本、活动标题日期 | 数据库先过滤再分页；逐单owner对全部孩子实时requireStudent，解绑/毕业订单整笔过滤；返回scanned_through_id/has_more避免过滤空页漏后续。不返回其它孩子、任何同行敏感字段；无共享用户缓存 |
| 本人详情：path.id+当前guardian | 读booking后owner检查creator_guardian_id且对整单全部孩子requireStudent，任一失效统一404、不返回部分孩子；投影关联event/slot及booking_student、visitor，但只取脱敏手机号与入离校事实；不SELECT*作HTTP返回 | 非本人、不存在、整单任一孩子关联失效同404；详情显示“自报离校/现场登记/核实补录”来源，不能把null离校当仍在校；无可继承的另一监护人权限 |
| 取凭证：path.id+当前guardian；签名密钥来自服务端配置 | owner及整单全部孩子当前ACTIVE+VERIFIED校验后同锁序读BOOKED及活动PUBLISHED/STOPPED、ticket_expires_at；`visitor_id/booking_id/ticket_nonce/ticket_key_version/expires`生成HMAC原始token。数据库仅ticket_hash、随机种子及密钥版本，无原始token。输出仅visitor_id/name/token/expires | 短事务锁活动/时段/预约，避免与停办读写交叉；HTTP no-store，不进URL、日志、埋点、消息内容。票据不是任何学生/订单查询授权。工作人员再查当前状态，截图/旧二维码无法绕过停办 |
| 取消：path.id/body.expectedVersion/reason+认证owner | 固定OD_CANCEL；幂等重放后锁活动/时段/预约，验版本、BOOKED、截止、`NOT EXISTS visitor.entered_at`；学生有序锁；slot.reserved_visitors减visitor_count且不许负；booking_student.active=0释放UK；booking.status=CANCELLED/cancelled_at/cancel_reason/version+1 | 与MINI-11入校共享活动/时段/订单锁。容量扣减、学生/guardian占位释放和命令响应同事务，失败一项全回滚；不靠Redis先删二维码；取消后动态校验使凭证失效 |
| 通知：after+当前guardian | `school_open_day_notice WHERE guardian_id=:current AND notice_id>:after`，读id/event/version/kind/title/content/created_at | ADM-22状态或须知变化与站内通知同事务；不以微信订阅消息成功为可靠交付条件。持久化列表可补读，外部推送以后独立重试，不把外部失败回滚为“活动未停办” |

服务端固定JSON键排序做摘要，输入字段真实类型、E.164手机号、重复访客和重复孩子一律先校验。页面只按display层格式化姓名、人数；不把孩子数量代入quota。活动发布后日期时段地点不可静默改变；必要变更只能显式停办原活动并新建，通知不会自动给家长改期。

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

下列Java17/Boot4/MyBatis4为未来实现的完整Controller→Service→Repository骨架，所有业务函数均给出校验、固定参数化SQL、异常与脱敏日志；公共Db/P/Inputs/Json/Actor/Problem/ApiReply只读沿用reference契约。每个public顶层类未来独立同名文件，公共类三个模块只实施一次。`ParentAccess`按MINI-09已确认的`void requireStudent(long)`契约注入；不把家长绑定当员工权限。凭证密钥配置由部署注入版本化base64密钥表，至少32字节，历史密钥保留至既有票据到期；不得硬编码。下列内容未写源码、未编译、未运行，不可视为现有功能已实现。

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
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/parent")
public class OpenDayBookingController {
 private final OpenDayBookingService s;
 public OpenDayBookingController(OpenDayBookingService s){this.s=s;}
 private ResponseEntity<Map<String,Object>>ok(Map<String,Object>d,int http){ResponseEntity<Map<String,Object>>reply=ApiReply.of(OpenDayKernel.response(d),http);return ResponseEntity.status(reply.getStatusCode()).header("Cache-Control","no-store").body(reply.getBody());}
 @GetMapping("/open-days") public ResponseEntity<Map<String,Object>>events(@RequestParam long studentId){return ok(s.events(studentId),200);}
 @PostMapping("/open-days/{eventId}/bookings") public ResponseEntity<Map<String,Object>>create(@PathVariable long eventId,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ok(s.create(eventId,key,b),201);}
 @GetMapping("/open-day-bookings") public ResponseEntity<Map<String,Object>>list(@RequestParam(defaultValue="0")long after){return ok(s.list(after),200);}
 @GetMapping("/open-day-bookings/{id}") public ResponseEntity<Map<String,Object>>detail(@PathVariable long id){return ok(s.detail(id),200);}
 @GetMapping("/open-day-bookings/{id}/tickets") public ResponseEntity<Map<String,Object>>tickets(@PathVariable long id){return ok(s.tickets(id),200);}
 @PostMapping("/open-day-bookings/{id}/cancel") public ResponseEntity<Map<String,Object>>cancel(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ok(s.cancel(id,key,b),200);}
 @GetMapping("/open-day-notices") public ResponseEntity<Map<String,Object>>notices(@RequestParam(defaultValue="0")long after){return ok(s.notices(after),200);}
}

@Service
public class OpenDayBookingService {
 private final OpenDayRepository r;private final OpenDayKernel k;private final OpenDayTickets tickets;
 public OpenDayBookingService(OpenDayRepository r,OpenDayKernel k,OpenDayTickets tickets){this.r=r;this.k=k;this.tickets=tickets;}
 private void parent(){r.guardian();}
 public Map<String,Object>events(long student){parent();if(student<=0)throw Problem.bad("studentId必须大于0");k.parents.requireStudent(student);
  List<Map<String,Object>>events=r.db.list("SELECT e.event_id,e.title,e.campus_id,e.visit_date,e.registration_start,e.registration_end,e.cancel_deadline,e.handover_area,e.instructions,e.status,e.version,EXISTS(SELECT 1 FROM school_visit_booking_student bs WHERE bs.event_id=e.event_id AND bs.student_id=#{p.student} AND bs.active=1) AS child_booked FROM school_open_day e JOIN school_open_day_scope_student x ON x.event_id=e.event_id JOIN edu_student st ON st.student_id=x.student_id AND st.status='ACTIVE' AND st.campus_id=e.campus_id WHERE x.student_id=#{p.student} AND e.status IN('PUBLISHED','STOPPED') AND e.visit_date>=#{p.today} ORDER BY e.visit_date,e.event_id LIMIT 100",P.of("student",student,"today",OpenDayKernel.shanghaiDate(OpenDayKernel.now())));
  for(Map<String,Object>e:events)e.put("slots",r.db.list("SELECT slot_id,starts_at,ends_at,quota-reserved_visitors AS remaining_visitors,max_visitors_per_booking FROM school_open_day_slot WHERE event_id=#{p.event} ORDER BY slot_id",P.of("event",e.get("event_id"))));return P.of("items",events);
 }
 private List<Map<String,Object>> visitors(Map<String,Object>b){List<Map<String,Object>>raw=Inputs.list(b,"visitors");if(raw.isEmpty()||raw.size()>20)throw Problem.bad("visitors必须1至20人");List<Map<String,Object>>out=new ArrayList<>();Set<String>seen=new HashSet<>();for(Map<String,Object>x:raw){String name=Inputs.text(x,"name",1,64),phone=Inputs.text(x,"phone",9,16);if(!phone.matches("\\+[1-9][0-9]{7,14}"))throw Problem.bad("phone必须E.164格式");if(!seen.add(name+"|"+phone))throw Problem.bad("实名访客重复");out.add(P.of("name",name,"phone",phone));}out.sort(Comparator.comparing(x->x.get("name")+"|"+x.get("phone")));return out;}
 public Map<String,Object>create(long event,String key,Map<String,Object>b){parent();List<Long>students=OpenDayKernel.ids(b);for(long id:students)k.parents.requireStudent(id);long slot=Inputs.id(b,"slotId"),eventVersion=Inputs.nonNegative(b,"eventVersion");Inputs.nonNegative(b,"expectedVersion");List<Map<String,Object>>visitors=visitors(b);long guardian=r.guardian();String hash=Json.hash(visitors);
  try{return k.command("OD_BOOK",key,event,b,201,c->{
   Map<String,Object>e=r.event(event,true),s=r.slot(event,slot,true);LocalDateTime now=OpenDayKernel.now();
   if(!"PUBLISHED".equals(e.get("status"))||now.isBefore(OpenDayKernel.time(e.get("registration_start")))||!now.isBefore(OpenDayKernel.time(e.get("registration_end"))))throw Problem.conflict("活动未开放或已停止新预约");
   if(eventVersion!=Inputs.number(e.get("version")))throw Problem.conflict("活动已变化，请阅读最新须知");
   Map<String,Object>existing=r.db.one("SELECT * FROM school_visit_booking WHERE event_id=#{p.event} AND creator_guardian_id=#{p.guardian} AND status='BOOKED' FOR UPDATE",P.of("event",event,"guardian",guardian));
   long id;if(existing.isEmpty()){
    if(Inputs.nonNegative(b,"expectedVersion")!=0)throw Problem.conflict("不存在待合并订单，请刷新");
    if(visitors.size()>Inputs.number(s.get("max_visitors_per_booking")))throw Problem.bad("超过每单实名访客上限");
    if(Inputs.number(s.get("reserved_visitors"))+visitors.size()>Inputs.number(s.get("quota")))throw Problem.conflict("剩余预约人数不足");
    id=r.db.insert("INSERT INTO school_visit_booking(event_id,slot_id,creator_guardian_id,creator_identity_id,visitor_count,visitors_hash) VALUES(#{p.event},#{p.slot},#{p.guardian},#{p.identity},#{p.count},#{p.hash})",P.of("event",event,"slot",slot,"guardian",guardian,"identity",c.actor().identityId(),"count",visitors.size(),"hash",hash));
    k.eligible(event,students);
    r.db.write("UPDATE school_open_day_slot SET reserved_visitors=reserved_visitors+#{p.count} WHERE slot_id=#{p.slot}",P.of("count",visitors.size(),"slot",slot));
    for(Map<String,Object>v:visitors){byte[]nonce=tickets.nonce();long visitor=r.db.insert("INSERT INTO school_visit_visitor(booking_id,visitor_name,phone_e164,ticket_nonce,ticket_hash,ticket_key_version,ticket_expires_at) VALUES(#{p.booking},#{p.name},#{p.phone},#{p.nonce},#{p.hash},#{p.key},#{p.expires})",P.of("booking",id,"name",v.get("name"),"phone",v.get("phone"),"nonce",nonce,"hash",OpenDayTickets.hash(Base64.getEncoder().encodeToString(nonce)),"key",tickets.current(),"expires",s.get("ends_at")));String token=tickets.mint(r.visitor(visitor,false));r.db.write("UPDATE school_visit_visitor SET ticket_hash=#{p.hash} WHERE visitor_id=#{p.id}",P.of("hash",OpenDayTickets.hash(token),"id",visitor));}
   }else{
    id=Inputs.number(existing.get("booking_id"));r.owner(existing);OpenDayKernel.version(b,existing);
    if(slot!=Inputs.number(existing.get("slot_id"))||!hash.equals(existing.get("visitors_hash")))throw Problem.conflict("合并孩子须沿用原时段和原实名同行人；改期或改同行人请截止前取消重约，名额不保留");
    k.eligible(event,students);r.db.write("UPDATE school_visit_booking SET version=version+1 WHERE booking_id=#{p.id}",P.of("id",id));
   }
   for(long student:students){Map<String,Object>occupied=r.db.one("SELECT booking_id FROM school_visit_booking_student WHERE event_id=#{p.event} AND active_student_id=#{p.student}",P.of("event",event,"student",student));if(!occupied.isEmpty()&&Inputs.number(occupied.get("booking_id"))!=id)throw Problem.conflict("所选孩子已有有效预约；不显示另一监护人或同行信息");if(occupied.isEmpty())r.db.write("INSERT INTO school_visit_booking_student(event_id,booking_id,student_id,student_name_snapshot) SELECT #{p.event},#{p.booking},student_id,student_name FROM edu_student WHERE student_id=#{p.student}",P.of("event",event,"booking",id,"student",student));}
   return r.bookingView(id);
  });}catch(DuplicateKeyException ex){throw Problem.conflict("孩子或预约人已有有效预约，请刷新后查看本人订单");}
 }
 public Map<String,Object>list(long after){parent();if(after<0)throw Problem.bad("after不能为负");List<Map<String,Object>>candidates=r.db.list("SELECT b.booking_id,b.event_id,b.slot_id,b.status,b.visitor_count,b.version,e.title,e.visit_date FROM school_visit_booking b JOIN school_open_day e ON e.event_id=b.event_id WHERE b.creator_guardian_id=#{p.guardian} AND b.booking_id>#{p.after} ORDER BY b.booking_id LIMIT 100",P.of("guardian",r.guardian(),"after",after));List<Map<String,Object>>visible=new ArrayList<>();long cursor=after;for(Map<String,Object>row:candidates){cursor=Inputs.number(row.get("booking_id"));try{r.owner(r.booking(cursor,false));visible.add(row);}catch(Problem denied){if(denied.http()!=403&&denied.http()!=404)throw denied;}}return P.of("items",visible,"scanned_through_id",cursor,"has_more",candidates.size()==100);}
 public Map<String,Object>detail(long id){parent();Map<String,Object>b=r.booking(id,false);r.owner(b);return r.bookingView(id);}
 public Map<String,Object>tickets(long id){parent();return k.tx.execute(status->{Map<String,Object>b=k.lockBooking(id);r.owner(b);Map<String,Object>e=r.event(Inputs.number(b.get("event_id")),false);List<Map<String,Object>>out=new ArrayList<>();if("BOOKED".equals(b.get("status"))&&Set.of("PUBLISHED","STOPPED").contains(e.get("status")))for(Map<String,Object>v:r.db.list("SELECT * FROM school_visit_visitor WHERE booking_id=#{p.id} ORDER BY visitor_id",P.of("id",id)))if(OpenDayKernel.now().isBefore(OpenDayKernel.time(v.get("ticket_expires_at"))))out.add(P.of("visitor_id",v.get("visitor_id"),"visitor_name",v.get("visitor_name"),"token",tickets.mint(v),"expires_at",v.get("ticket_expires_at")));return P.of("booking_id",id,"tickets",out);});}
 public Map<String,Object>cancel(long id,String key,Map<String,Object>b){parent();r.owner(r.booking(id,false));Inputs.nonNegative(b,"expectedVersion");String reason=Inputs.text(b,"reason",1,500);
  return k.command("OD_CANCEL",key,id,b,200,c->{Map<String,Object>order=k.lockBooking(id);r.owner(order);OpenDayKernel.version(b,order);Map<String,Object>e=r.event(Inputs.number(order.get("event_id")),false);if(!"BOOKED".equals(order.get("status")))throw Problem.conflict("预约已失效");if(!OpenDayKernel.now().isBefore(OpenDayKernel.time(e.get("cancel_deadline"))))throw Problem.conflict("已超过取消截止时间，请联系学校");if(!r.db.one("SELECT visitor_id FROM school_visit_visitor WHERE booking_id=#{p.id} AND entered_at IS NOT NULL LIMIT 1",P.of("id",id)).isEmpty())throw Problem.conflict("已有同行人入校，不能整单取消");k.release(order,"CANCELLED",reason);return r.bookingView(id);});
 }
 public Map<String,Object>notices(long after){parent();if(after<0)throw Problem.bad("after不能为负");return P.of("items",r.db.list("SELECT notice_id,event_id,event_version,notice_kind,title,content,created_at FROM school_open_day_notice WHERE guardian_id=#{p.guardian} AND notice_id>#{p.after} ORDER BY notice_id LIMIT 100",P.of("guardian",r.guardian(),"after",after)));}
}
```

## 6. 边界与异常场景处理

- 400：缺字段、非法ID/时间/手机号、重复学生/访客、数组人数超限、缺随机键；422由公共Inputs在不满足字段语义时返回。孩子数与来访人数分别显示。
- 403：身份失效、关系撤销、学生不ACTIVE、不在冻结适用范围或当前校区变化。停用学生或撤销关系后不能凭旧页面继续预约；既有整单详情/票据/取消/自报任一孩子失效均统一404且不返子女和同行，列表整笔过滤。请联系学校核实关联；首批不能移除失效孩子或越权取消，现场重新核实资格。
- 404：订单不存在或非创建监护人；另一监护人即使关联同一个孩子也不能获得整单信息，目录仅告诉其孩子已约；无令牌或手机号查询捷径。
- 409：名额不足、活动非PUBLISHED/报名关闭、活动/订单版本变化、同键异目标/异正文、有效孩子或预约人UK冲突、合单试图换时段/同行人、超过取消截止、任意访客已入校。异常回滚全部占位，不能留下“有订单无访客”或负容量。
- 弱网：请求键与完整正文在待重试命令中保存；超时只同键同正文重试。服务端先核摘要与重放再验旧版本；校验后重新编辑必须新键。返回409需刷新规则/订单再由家长重选，不自动换时段或减少孩子。
- 分批到访：每位visitor有独立票据和entered_at；一人已到不把另一人标已到。自报离校不释放容量，不得把孩子的放学时间写成访客真实离校时间。
- 停办使未入校凭证动态失效；有入校事实的订单和审计保留。活动结束不自动写离校，页面文案统一“已入校未登记离校人数”，并说明非实时在校人数。
- 取消重约、活动通知均有可靠站内入口；不假设家长已打开微信订阅推送。通知内容不夹带其他孩子、同行电话或原始票据；异常日志不打印正文、token、种子、摘要。
