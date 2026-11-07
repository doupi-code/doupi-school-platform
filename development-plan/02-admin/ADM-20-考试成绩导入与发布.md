# ADM-20 考试成绩导入与发布

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-20)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，5 人日，依赖 ADM-19、MINI-08；设计及Markdown骨架，尚未实现/运行。** 负责创建考试、冻结考试时班级名册和科目满分、Excel上传预览确认、按考试+班级发布不可变快照、撤回、更正新版本留痕。MINI-08只查询，本模块承担计算与写入，5日已包括后台前端与联调。无排名、等级、评语、自动补零或默认满分。

未来路径：`backend/src/main/java/com/doupi/planref/parent/{ExamController,ExamService,ExamRepository}.java`；`admin/src/views/education/exams/`；复用ADM-19 RosterXlsx和公共ParentCommands。考试建好后科目、满分、名册不可编辑，配置错误重建考试，避免发布时改规则。名册仅建考时ACTIVE学生，转班后仍使用冻结班级。小程序当前已离校等学生即使有历史快照也不能访问，后台留存。

- [ ] D1：考试班级目录、科目/班级名册冻结、decimal与状态约束；验收能按学年学期重新进入既有考试，显式满分和应计标志，无科目/空班拒绝。
- [ ] D2：xlsx上传预览、学号+科目精确匹配、矩阵完整校验；验收0/缺考/免考/未录入区分、超满分与重复行定位。
- [ ] D3：确认提交、版本/幂等/原子覆盖草稿；验收旧预览遇到并发更新必须重新预览，批次失败不部分入库。
- [ ] D4：发布、总分、不变快照、撤回与更正新版本；验收有异常不发、撤回后家长不可见、老快照不改。
- [ ] D5：后台页面、MINI-08联调和审计；验收跨班范围、转班后原班考试、并发发布/撤回、脱敏日志。

## 2. 接口设计清单

Authorization全部必填；写接口Idempotency-Key:string(8..64)/必填。BIGINT的path、body、返回均string；decimal用最多两位小数字符串保持精度；日期YYYY-MM-DD是学校考试日期，审计时间UTC。分页不默认页数和条数。

| 名称 | 方法 | 绝对路径 | 完整参数类型、必填及含义 | 返回字段类型及含义 | 权限 |
|---|---|---|---|---|---|
| 考试班级目录 | GET | `/api/v1/office/exams` | query.afterExamClassId:string/否/上一页末考试班级ID，缺省从头开始；limit:integer1..100/是/显式条数；academicYear:string(9,YYYY-YYYY连续两年)/否；semester:integer1或2/否，不推断默认；每项是一场考试的一个班级 | items:array(examClassId:string,examId:string,classId:string,examName:string,examDate:string YYYY-MM-DD,academicYear:string,semester:integer,className:string考试时班名,status:DRAFT/PUBLISHED/WITHDRAWN,currentReleaseNo:integer,version:integer)；nextAfterExamClassId:string或null | exam:read+每项班级范围，服务端SQL过滤 |
| 建考试 | POST | `/api/v1/office/exams` | examName:string1..128/是；examDate:string日期/是；academicYear:string(9,YYYY-YYYY且后年=前年+1)/是/显式学年；semester:integer1或2/是/显式学期；classIds:array<string>1..20/是/不重复；subjects:array<object>1..20/是，项含subjectCode:string[A-Z0-9_]{1,20}/是、subjectName:string1..64/是、fullScore:decimal(8,2)>0/是、countsTotal:boolean/是 | examId:string；version:integer=0；classes:array(examClassId:string,classId:string,studentCount:integer,version:integer=0) | exam:maintain+每班级范围 |
| 考试配置/草稿 | GET | `/api/v1/office/exams/{examId}/classes/{classId}` | 两path ID/是 | examId:string；examName/examDate/academicYear:string；semester:integer；examClassId/classId:string；status:DRAFT/PUBLISHED/WITHDRAWN；version:integer；subjects:array(subject_id:string,subject_code:string,subject_name:string,full_score:decimal(8,2),counts_total:0或1)；roster:array(roster_id:string,student_id:string,student_no:string,student_name:string)；scores:array(roster_id:string,subject_id:string,score_status:string,score:decimal(8,2)或null) | exam:read+该班级范围 |
| 上传成绩预览 | POST multipart | `/api/v1/office/exams/{examId}/classes/{classId}/import-preview` | 两path ID/是；file:xlsx/是/10MiB5000行，精确表头studentNo:string文本、subjectCode:string文本、scoreStatus:SCORE/ABSENT/EXEMPT/UNRECORDED、score:decimal(8,2)字符串或空；必须覆盖冻结名册×全部科目 | batchId:string；version:integer=0；classVersion:integer；rowCount:integer；errors:array(row:integer,code:string)；confirmationHash:string；expiresAt:string | exam:maintain+该班范围；非PUBLISHED |
| 预览详情 | GET | `/api/v1/office/exams/imports/{batchId}` | path.batchId:string/是 | batchId:string；version:integer；classVersion:integer；status:PREVIEW/COMMITTED；rows:array模板字段；errors:array；confirmationHash:string；expiresAt:string | 批次本人且exam:maintain+班级范围 |
| 确认导入 | POST | `/api/v1/office/exams/imports/{batchId}/commit` | path.batchId:string/是；expectedVersion:integer/是/批次版本；confirmationHash:string64/是 | batchId:string；status:COMMITTED；version:integer；classVersion:integer；rowCount:integer | 本人+exam:maintain+班级范围 |
| 发布 | POST | `/api/v1/office/exams/{examId}/classes/{classId}/releases` | 两path ID/是；expectedVersion:integer/是/考试班级版本；reason:string1..128/是/发布依据编号 | releaseId:string；releaseNo:integer；classVersion:integer；studentCount:integer；status:PUBLISHED | exam:publish+该班范围 |
| 撤回 | POST | `/api/v1/office/exams/{examId}/classes/{classId}/withdrawals` | 两path ID/是；expectedVersion:integer/是/考试班级版本；reason:string1..128/是/撤回依据编号 | releaseId:string；status:WITHDRAWN；classVersion:integer | exam:publish+该班范围 |

## 3. 数据流转细节

0. 考试班级目录：认证Actor提供exam:read权限、allData及scopeDeptIds；query的afterExamClassId必须为正ID、limit显式1..100，学年仅接受连续两年YYYY-YYYY、学期仅1/2。Repository关联edu_exam_class.exam_id→edu_exam.exam_id与edu_exam_class.class_id→edu_class.class_id，按edu_class.dept_id在服务端过滤范围（allData仅放宽数据范围），排除del_flag非0班级；按exam_class_id升序、`exam_class_id>after`、显式学年学期条件取limit+1行。返回考试名称/日期/学年/学期、考试时class_name_snapshot、班级发布状态/current_release_no/version与字符串ID；多取一行只用于计算nextAfterExamClassId，不返回冻结学生名单。目录项携examId+classId进入现有配置详情，因此页面重开不依赖创建响应或本地缓存。只读事务，无Redis或浏览器持久化学生资料。
1. 创建：校验日期真实存在、显式学年YYYY-YYYY连续两年与学期1/2、不按考试日期推断学期（是否匹配由教务确认）、班级不重复且在范围、显式科目满分与countsTotal（至少一个应计科目）。锁各班级固定ID升序，读取当时ACTIVE学生；空班拒绝，不由student_num造学生。创建exam、exam_class、subject、roster快照同事务，冻结student_no/name及exam_class关联；创建动作幂等摘要含所有类与科目正文。
2. 配置GET：以examId+classId定位exam_class，再检查班级范围；只内部返回冻结名册和草稿分数。不存在404，无业务写/缓存。Excel预览用RosterXlsx静态解析，按冻结学号查roster、subjectCode查本考试科目；不按姓名、不从当前班级匹配。SCORE允许0且不得负数或大于fullScore，最多两位小数；ABSENT/EXEMPT必须空score；UNRECORDED是独立状态，作为未清异常不可确认/发布。重复组合、缺少矩阵项、未知学号科目均行级错误；缺失矩阵错误row=0。保存服务端规范rows/errors/hash、source_version=class.version、24小时有效，不修改草稿分数。
3. 确认：先重放后锁batch→exam_class，核创建者/批次版本/hash/时限与source_version，禁止PUBLISHED状态；再完整校验矩阵。删除本考试班级旧草稿score、按roster/subject插完整新score、class.version+1、batch COMMITTED/version+1，审计与幂等同事务。不能客户端送rows覆盖暂存。所有动作锁顺序同班级根优先；batch为私有根，仅本提交先锁batch，其他动作不锁batch，避免循环等待。已有批次换键重复提交返回原classVersion，不再写分数。
4. 发布：锁exam_class、校验expectedVersion，现PUBLISHED拒绝；草稿完整矩阵每格合法且无UNRECORDED、科目配置非空且有应计科目。按学生构建科目数组，不计算名次。应计科目全部SCORE时sum(score)和sum(fullScore)，任一缺考/免考/未录入则两个总值NULL。插新release(release_no=旧current_release_no+1)，每学生插独立不可变snapshot，保留当时class_id和学号姓名；更新class.status/current_release_no/version，审计+幂等一次提交。快照score/fullScore为精确两位字符串，正文不可UPDATE。
5. 撤回：先重放，再锁class、版本检查、找到当前PUBLISHED release；仅更新release状态与撤回时间/人、版本和class状态/version，不删snapshot。家长查询实时仅联PUBLISHED+current_release_no，事务提交后立即不可见。更正必须撤回后重新预览/确认，再发布release_no+1，旧快照永久留内部；仅撤回未更改再发也有新版本并保留原因。
6. 缓存与日志：成绩所有响应no-store，服务端无授权/成绩缓存。业务日志只有动作/对象ID/traceId/code，不输出Excel行、手机号、分数和邀请凭据；审计存摘要、版本、依据编号。DB时区UTC，exam_date本地教学日期不转成UTC日期。

## 4. 相关表完整 DDL

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**edu_exam**

```sql
CREATE TABLE edu_exam (
  exam_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '考试ID',
  exam_name VARCHAR(128) NOT NULL COMMENT '考试名',
  exam_date DATE NOT NULL COMMENT '上海教学考试日期',
  academic_year VARCHAR(9) NOT NULL COMMENT '显式学年YYYY-YYYY，创建后冻结',
  semester TINYINT NOT NULL COMMENT '显式学期1/2，不按日期推断',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '配置冻结版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (exam_id),
  INDEX idx_exam_date (exam_date, exam_id),
  INDEX idx_exam_term (academic_year, semester, exam_date, exam_id),
  CONSTRAINT ck_exam_version CHECK (version >= 0),
  CONSTRAINT ck_exam_term CHECK (REGEXP_LIKE(academic_year, '^[0-9]{4}-[0-9]{4}$')
  AND CAST(SUBSTRING(academic_year, 6, 4) AS UNSIGNED) = CAST(SUBSTRING(academic_year, 1, 4) AS UNSIGNED) + 1
  AND semester IN (1, 2))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='创建后配置冻结的考试'
COLLATE=utf8mb4_unicode_ci;
```

**edu_exam_class**

```sql
CREATE TABLE edu_exam_class (
  exam_class_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '考试班级根',
  exam_id BIGINT NOT NULL COMMENT '考试',
  class_id BIGINT NOT NULL COMMENT '考试当时班级',
  class_name_snapshot VARCHAR(50) NOT NULL COMMENT '冻结班名，后续改名不覆盖',
  status VARCHAR(16) NOT NULL COMMENT 'DRAFT/PUBLISHED/WITHDRAWN',
  current_release_no INT NOT NULL DEFAULT 0 COMMENT '最近发布序号，不回退',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '草稿及发布并发版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (exam_class_id),
  UNIQUE uk_exam_class (
    exam_id,
    class_id
  ),
  INDEX idx_exam_class_scope (class_id, status, exam_id),
  CONSTRAINT fk_ec_exam FOREIGN KEY (exam_id) REFERENCES edu_exam (
    exam_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_ec_class FOREIGN KEY (class_id) REFERENCES edu_class (
    class_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_ec_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'WITHDRAWN')),
  CONSTRAINT ck_ec_version CHECK (version >= 0 AND current_release_no >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='发布粒度及版本锁根'
COLLATE=utf8mb4_unicode_ci;
```

**edu_exam_subject**

```sql
CREATE TABLE edu_exam_subject (
  subject_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '考试科目',
  exam_id BIGINT NOT NULL COMMENT '考试',
  subject_code VARCHAR(20) COLLATE utf8mb4_bin NOT NULL COMMENT '精确科目代码',
  subject_name VARCHAR(64) NOT NULL COMMENT '科目名快照',
  full_score DECIMAL(8, 2) NOT NULL COMMENT '显式满分，不默认100',
  counts_total TINYINT NOT NULL COMMENT '是否计总分，必须显式',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  PRIMARY KEY (subject_id),
  UNIQUE uk_exam_subject (
    exam_id,
    subject_code
  ),
  CONSTRAINT fk_subject_exam FOREIGN KEY (exam_id) REFERENCES edu_exam (
    exam_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_subject_full CHECK (full_score > 0),
  CONSTRAINT ck_subject_count CHECK (counts_total IN (0, 1))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='只增冻结考试规则'
COLLATE=utf8mb4_unicode_ci;
```

**edu_exam_roster**

```sql
CREATE TABLE edu_exam_roster (
  roster_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '考试冻结学生项',
  exam_class_id BIGINT NOT NULL COMMENT '考试时班级根',
  student_id BIGINT NOT NULL COMMENT '正式学生',
  student_no VARCHAR(32) COLLATE utf8mb4_bin NOT NULL COMMENT '冻结学号',
  student_name VARCHAR(64) NOT NULL COMMENT '冻结姓名',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  PRIMARY KEY (roster_id),
  UNIQUE uk_roster_student (
    exam_class_id,
    student_id
  ),
  UNIQUE uk_roster_no (
    exam_class_id,
    student_no
  ),
  INDEX idx_exam_student (student_id, exam_class_id),
  CONSTRAINT fk_er_class FOREIGN KEY (exam_class_id) REFERENCES edu_exam_class (
    exam_class_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_er_student FOREIGN KEY (student_id) REFERENCES edu_student (
    student_id
  ) ON DELETE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='转班不改考试名册'
COLLATE=utf8mb4_unicode_ci;
```

**edu_exam_score**

```sql
CREATE TABLE edu_exam_score (
  score_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '草稿成绩格',
  roster_id BIGINT NOT NULL COMMENT '冻结学生',
  subject_id BIGINT NOT NULL COMMENT '考试科目',
  score_status VARCHAR(16) NOT NULL COMMENT 'SCORE/ABSENT/EXEMPT/UNRECORDED',
  score DECIMAL(8, 2) NULL COMMENT 'SCORE才有值，含0',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '记录版本，整班根控制写并发',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (score_id),
  UNIQUE uk_score_cell (
    roster_id,
    subject_id
  ),
  INDEX idx_score_subject (subject_id, score_status),
  CONSTRAINT fk_score_roster FOREIGN KEY (roster_id) REFERENCES edu_exam_roster (
    roster_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_score_subject FOREIGN KEY (subject_id) REFERENCES edu_exam_subject (
    subject_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_score_state CHECK ((
    score_status = 'SCORE' AND NOT score IS NULL AND score >= 0
  )
  OR (
    score_status IN ('ABSENT', 'EXEMPT', 'UNRECORDED') AND score IS NULL
  )),
  CONSTRAINT ck_score_version CHECK (version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='待发布草稿，跨考试科目及满分由同事务业务校验'
COLLATE=utf8mb4_unicode_ci;
```

**edu_score_import**

```sql
CREATE TABLE edu_score_import (
  batch_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '成绩预览批次',
  exam_class_id BIGINT NOT NULL COMMENT '班级根',
  source_version BIGINT NOT NULL COMMENT '预览时班级版本',
  status VARCHAR(16) NOT NULL COMMENT 'PREVIEW/COMMITTED',
  payload_json JSON NOT NULL COMMENT '服务端解析行，30日后清空',
  errors_json JSON NOT NULL COMMENT '行错误码',
  confirmation_hash CHAR(64) NOT NULL COMMENT '全部规范行摘要',
  row_count INT NOT NULL COMMENT '行数',
  expires_at DATETIME(3) NOT NULL COMMENT 'UTC24小时截止',
  committed_class_version BIGINT NULL COMMENT '成功提交的班级版本',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '批次版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC更新',
  created_by BIGINT NOT NULL COMMENT '创建员工',
  updated_by BIGINT NOT NULL COMMENT '更新员工',
  PRIMARY KEY (batch_id),
  INDEX idx_score_batch_owner (created_by, created_at),
  INDEX idx_score_batch_root (exam_class_id, status),
  CONSTRAINT fk_si_class FOREIGN KEY (exam_class_id) REFERENCES edu_exam_class (
    exam_class_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_si_status CHECK (status IN ('PREVIEW', 'COMMITTED')),
  CONSTRAINT ck_si_count CHECK (row_count BETWEEN 1 AND 5000),
  CONSTRAINT ck_si_versions CHECK (version >= 0
  AND source_version >= 0
  AND (
    committed_class_version IS NULL OR committed_class_version > source_version
  ))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='成绩上传预览确认'
COLLATE=utf8mb4_unicode_ci;
```

**edu_score_release**

```sql
CREATE TABLE edu_score_release (
  release_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '不可变发布版本标识',
  exam_class_id BIGINT NOT NULL COMMENT '考试班级',
  release_no INT NOT NULL COMMENT '递增发布号',
  status VARCHAR(16) NOT NULL COMMENT 'PUBLISHED/WITHDRAWN',
  reason_ref VARCHAR(128) NOT NULL COMMENT '发布依据编号',
  withdrawn_reason_ref VARCHAR(128) NULL COMMENT '撤回依据编号',
  published_at DATETIME(3) NOT NULL COMMENT 'UTC发布时间',
  withdrawn_at DATETIME(3) NULL COMMENT 'UTC撤回时间',
  withdrawn_by BIGINT NULL COMMENT '撤回员工',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '仅撤回状态版本',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  updated_at DATETIME(3) NOT NULL COMMENT 'UTC状态更新',
  created_by BIGINT NOT NULL COMMENT '发布员工',
  updated_by BIGINT NOT NULL COMMENT '最后状态员工',
  PRIMARY KEY (release_id),
  UNIQUE uk_release_no (
    exam_class_id,
    release_no
  ),
  INDEX idx_release_visible (exam_class_id, status, release_no),
  CONSTRAINT fk_release_class FOREIGN KEY (exam_class_id) REFERENCES edu_exam_class (
    exam_class_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_release_status CHECK (status IN ('PUBLISHED', 'WITHDRAWN')),
  CONSTRAINT ck_release_withdraw CHECK ((
    status = 'PUBLISHED'
    AND withdrawn_at IS NULL
    AND withdrawn_by IS NULL
    AND withdrawn_reason_ref IS NULL
  )
  OR (
    status = 'WITHDRAWN'
    AND NOT withdrawn_at IS NULL
    AND NOT withdrawn_by IS NULL
    AND NOT withdrawn_reason_ref IS NULL
  )),
  CONSTRAINT ck_release_version CHECK (release_no > 0 AND version >= 0)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='发布正文只增，状态可撤回'
COLLATE=utf8mb4_unicode_ci;
```

**edu_score_snapshot**

```sql
CREATE TABLE edu_score_snapshot (
  snapshot_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '学生成绩不可变快照',
  release_id BIGINT NOT NULL COMMENT '发布版本',
  student_id BIGINT NOT NULL COMMENT '学生',
  class_id BIGINT NOT NULL COMMENT '考试当时班级',
  student_no VARCHAR(32) COLLATE utf8mb4_bin NOT NULL COMMENT '当时学号',
  student_name VARCHAR(64) NOT NULL COMMENT '当时姓名',
  subjects_json JSON NOT NULL COMMENT '本人各科代码名称分数满分状态和应计标志，不含排名等级评语',
  total_score DECIMAL(12, 2) NULL COMMENT '应计科全SCORE才有值',
  total_full_score DECIMAL(12, 2) NULL COMMENT '总分分母，同步NULL',
  created_at DATETIME(3) NOT NULL COMMENT 'UTC创建',
  created_by BIGINT NOT NULL COMMENT '发布员工',
  PRIMARY KEY (snapshot_id),
  UNIQUE uk_snapshot_student (
    release_id,
    student_id
  ),
  INDEX idx_snapshot_history (student_id, release_id),
  CONSTRAINT fk_snapshot_release FOREIGN KEY (release_id) REFERENCES edu_score_release (
    release_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_snapshot_student FOREIGN KEY (student_id) REFERENCES edu_student (
    student_id
  ) ON DELETE RESTRICT,
  CONSTRAINT fk_snapshot_class FOREIGN KEY (class_id) REFERENCES edu_class (
    class_id
  ) ON DELETE RESTRICT,
  CONSTRAINT ck_snapshot_total CHECK ((
    total_score IS NULL AND total_full_score IS NULL
  )
  OR (
    total_score >= 0 AND total_full_score > 0 AND total_score <= total_full_score
  ))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COMMENT='只增不可更新成绩正文'
COLLATE=utf8mb4_unicode_ci;
```

## 5. Controller → Service → Repository 完整骨架

以下代码全部仅为Markdown内未来开发骨架，复用ADM-19完整RosterXlsx/StudentRepository、MINI-07 ParentRepository及公共ParentCommands。没有调用不存在的生成器或运行迁移。

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;import java.util.*;import org.springframework.web.bind.annotation.*;import org.springframework.web.multipart.MultipartFile;
@RestController @RequestMapping("/api/v1/office/exams")
public class ExamController {
 private final ExamService s;public ExamController(ExamService s){this.s=s;}
 @GetMapping public Object list(@RequestParam(required=false)Long afterExamClassId,@RequestParam int limit,@RequestParam(required=false)String academicYear,@RequestParam(required=false)Integer semester){return ApiReply.of(s.list(afterExamClassId,limit,academicYear,semester),200);}
 @PostMapping public Object create(@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.create(b,k),200);}
 @GetMapping("/{exam}/classes/{clazz}")public Object detail(@PathVariable long exam,@PathVariable long clazz){return ApiReply.of(s.detail(exam,clazz),200);}
 @PostMapping("/{exam}/classes/{clazz}/import-preview")public Object preview(@PathVariable long exam,@PathVariable long clazz,@RequestPart MultipartFile file,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.preview(exam,clazz,file,k),200);}
 @GetMapping("/imports/{id}")public Object batch(@PathVariable long id){return ApiReply.of(s.batch(id),200);}
 @PostMapping("/imports/{id}/commit")public Object commit(@PathVariable long id,@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.commit(id,b,k),200);}
 @PostMapping("/{exam}/classes/{clazz}/releases")public Object publish(@PathVariable long exam,@PathVariable long clazz,@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.publish(exam,clazz,b,k),200);}
 @PostMapping("/{exam}/classes/{clazz}/withdrawals")public Object withdraw(@PathVariable long exam,@PathVariable long clazz,@RequestBody Map<String,Object>b,@RequestHeader("Idempotency-Key")String k){return ApiReply.of(s.withdraw(exam,clazz,b,k),200);}
}
```

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;import java.util.*;import java.math.*;import java.time.*;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import org.springframework.web.multipart.MultipartFile;
@Service
public class ExamService {
 private final ExamRepository r;private final StudentRepository students;private final ParentRepository audit;private final ParentCommands cmd;private final RosterXlsx xlsx;
 public ExamService(ExamRepository r,StudentRepository students,ParentRepository audit,ParentCommands cmd,RosterXlsx xlsx){this.r=r;this.students=students;this.audit=audit;this.cmd=cmd;this.xlsx=xlsx;}
 private void permit(String p){Actors.current().requireStaff();Actors.current().require(p);}
 private Map<String,Object>root(long exam,long clazz,boolean lock){Map<String,Object>ec=r.root(exam,clazz,lock);students.classScope(clazz);return ec;}
 private BigDecimal decimal(Object value){if(value==null||!value.toString().matches("[0-9]{1,6}(\\.[0-9]{1,2})?"))throw Problem.bad("分数必须非负且最多两位小数");return new BigDecimal(value.toString()).setScale(2);}
 private Map<String,Object>payload(long exam,long clazz,Map<String,Object>b){Map<String,Object>p=ParentCommands.payload(exam,b);p.put("classId",Long.toString(clazz));return p;}
 @Transactional(readOnly=true)public Map<String,Object>list(Long after,int limit,String academic,Integer semester){permit("exam:read");if(after!=null&&after<=0||limit<1||limit>100)throw Problem.bad("目录分页参数错误");if(academic!=null&&(!academic.matches("[0-9]{4}-[0-9]{4}")||Integer.parseInt(academic.substring(5))!=Integer.parseInt(academic.substring(0,4))+1)||semester!=null&&(semester<1||semester>2))throw Problem.bad("学年学期筛选错误");List<Map<String,Object>>rows=r.list(after,limit+1,academic,semester);boolean more=rows.size()>limit;if(more)rows.remove(rows.size()-1);return P.of("items",rows,"nextAfterExamClassId",more?rows.get(rows.size()-1).get("examClassId"):null);}
 @Transactional public Map<String,Object>create(Map<String,Object>b,String key){permit("exam:maintain");return cmd.run("EXAM_CREATE",key,b,()->{String name=Inputs.text(b,"examName",1,128),date=Inputs.text(b,"examDate",10,10);try{if(!LocalDate.parse(date).toString().equals(date))throw Problem.bad("考试日期格式错误");}catch(java.time.format.DateTimeParseException e){throw Problem.bad("考试日期错误");}Object raw=b.get("classIds");if(!(raw instanceof List<?> ids)||ids.isEmpty()||ids.size()>20)throw Problem.bad("班级数量须1..20");SortedSet<Long>classes=new TreeSet<>();for(Object id:ids){long value=Inputs.number(id);if(value<=0||!classes.add(value))throw Problem.bad("班级ID重复或非法");students.activeClass(value);}List<Map<String,Object>>subjects=Inputs.list(b,"subjects");if(subjects.isEmpty()||subjects.size()>20)throw Problem.bad("科目数量须1..20");Set<String>codes=new HashSet<>();boolean counts=false;for(Map<String,Object>s:subjects){String code=Inputs.text(s,"subjectCode",1,20);if(!code.matches("[A-Z0-9_]{1,20}")||!codes.add(code))throw Problem.bad("科目代码重复或非法");Inputs.text(s,"subjectName",1,64);if(decimal(s.get("fullScore")).signum()<=0)throw Problem.bad("满分须正数");if(!(s.get("countsTotal") instanceof Boolean))throw Problem.bad("countsTotal必须显式布尔");counts|=(Boolean)s.get("countsTotal");}if(!counts)throw Problem.bad("至少一个应计科目");String academic=Inputs.text(b,"academicYear",9,9);long semester=Inputs.positive(b,"semester");if(!academic.matches("[0-9]{4}-[0-9]{4}")||Integer.parseInt(academic.substring(5))!=Integer.parseInt(academic.substring(0,4))+1||semester>2)throw Problem.bad("学年学期错误");long id=r.createExam(name,date,academic,semester);for(Map<String,Object>s:subjects)r.subject(id,s);List<Map<String,Object>>result=new ArrayList<>();for(long clazz:classes){List<Map<String,Object>>roster=r.currentStudents(clazz);if(roster.isEmpty())throw Problem.bad("不能创建空班考试");if((long)roster.size()*subjects.size()>5000)throw Problem.bad("单班成绩矩阵超过5000行");long ec=r.createClass(id,clazz);for(Map<String,Object>student:roster)r.roster(ec,student);result.add(P.of("examClassId",Long.toString(ec),"classId",Long.toString(clazz),"studentCount",roster.size(),"version",0));}audit.audit(0,"EXAM_CREATE","EXAM",id,0,0,"EXAM_CREATE",Json.hash(b));return P.of("examId",Long.toString(id),"version",0,"classes",result);});}
 @Transactional(readOnly=true)public Map<String,Object>detail(long exam,long clazz){permit("exam:read");Map<String,Object>ec=root(exam,clazz,false);return r.detail(ec);}
 private List<Map<String,Object>>validate(Map<String,Object>ec,List<Map<String,Object>>rows){List<Map<String,Object>>errors=new ArrayList<>();Map<String,Map<String,Object>>roster=new HashMap<>(),subjects=new HashMap<>();for(Map<String,Object>v:r.rosterRows(Inputs.number(ec.get("exam_class_id"))))roster.put(v.get("student_no").toString(),v);for(Map<String,Object>v:r.subjects(Inputs.number(ec.get("exam_id"))))subjects.put(v.get("subject_code").toString(),v);Set<String>cells=new HashSet<>();for(int n=0;n<rows.size();n++){Map<String,Object>b=rows.get(n);try{String no=Inputs.text(b,"studentNo",1,32),subject=Inputs.text(b,"subjectCode",1,20),status=Inputs.text(b,"scoreStatus",1,16);if(!roster.containsKey(no)||!subjects.containsKey(subject))throw Problem.bad("未知学号或科目");if(!cells.add(no+":"+subject))throw Problem.bad("重复成绩");if(status.equals("SCORE")){BigDecimal score=decimal(b.get("score"));if(score.compareTo(decimal(subjects.get(subject).get("full_score")))>0)throw Problem.bad("超过满分");}else if(Set.of("ABSENT","EXEMPT").contains(status)){if(b.get("score")!=null&&!b.get("score").toString().isBlank())throw Problem.bad("非数值状态分数必须空");}else throw Problem.bad("未录入或未知状态不可提交");}catch(Problem e){errors.add(P.of("row",n+2,"code","SCORE_ROW_INVALID"));}}if(cells.size()!=(long)roster.size()*subjects.size())errors.add(P.of("row",0,"code","MATRIX_INCOMPLETE"));return errors;}
 @Transactional public Map<String,Object>preview(long exam,long clazz,MultipartFile file,String key){permit("exam:maintain");List<Map<String,Object>>rows=xlsx.read(file,List.of("studentNo","subjectCode","scoreStatus","score"));return cmd.run("SCORE_PREVIEW",key,payload(exam,clazz,P.of("rows",rows)),()->{Map<String,Object>ec=root(exam,clazz,true);if("PUBLISHED".equals(ec.get("status")))throw Problem.conflict("先撤回发布再更正");long id=r.newBatch(ec,rows,validate(ec,rows));return r.preview(r.batch(id,false),false);});}
 @Transactional(readOnly=true)public Map<String,Object>batch(long id){permit("exam:maintain");Map<String,Object>b=r.batch(id,false);Map<String,Object>ec=r.byRoot(Inputs.number(b.get("exam_class_id")),false);students.classScope(Inputs.number(ec.get("class_id")));return r.preview(b,true);}
 @Transactional public Map<String,Object>commit(long id,Map<String,Object>b,String key){permit("exam:maintain");return cmd.run("SCORE_COMMIT",key,ParentCommands.payload(id,b),()->{Map<String,Object>batch=r.batch(id,true),ec=r.byRoot(Inputs.number(batch.get("exam_class_id")),true);students.classScope(Inputs.number(ec.get("class_id")));if("COMMITTED".equals(batch.get("status")))return r.committed(batch);ParentCommands.version(batch,b);if(!Inputs.text(b,"confirmationHash",64,64).equals(batch.get("confirmation_hash")))throw Problem.conflict("确认摘要不同");if("PUBLISHED".equals(ec.get("status"))||Inputs.number(ec.get("version"))!=Inputs.number(batch.get("source_version")))throw Problem.conflict("考试班级已变化，请重新预览");List<Map<String,Object>>rows=ParentCommands.rows(Json.readMap("{\"rows\":"+batch.get("payload_json")+"}"),"rows");if(!validate(ec,rows).isEmpty())throw new Problem(422,"SCORE_INVALID","成绩异常未清");r.replaceScores(ec,rows);long next=Inputs.number(ec.get("version"))+1;r.bump(Inputs.number(ec.get("exam_class_id")),ec.get("status").toString(),Inputs.number(ec.get("current_release_no")));r.commitBatch(id,next);audit.audit(0,"SCORE_COMMIT","EXAM_CLASS",Inputs.number(ec.get("exam_class_id")),next-1,next,"SCORE_IMPORT",Json.hash(b));batch.put("version",Inputs.number(batch.get("version"))+1);batch.put("status","COMMITTED");batch.put("committed_class_version",next);return r.committed(batch);});}
 @Transactional public Map<String,Object>publish(long exam,long clazz,Map<String,Object>b,String key){permit("exam:publish");return cmd.run("SCORE_PUBLISH",key,payload(exam,clazz,b),()->{Map<String,Object>ec=root(exam,clazz,true);ParentCommands.version(ec,b);if("PUBLISHED".equals(ec.get("status")))throw Problem.conflict("该班已发布");String reason=Inputs.text(b,"reason",1,128);List<Map<String,Object>>subjects=r.subjects(exam),roster=r.rosterRows(Inputs.number(ec.get("exam_class_id"))),scores=r.scores(Inputs.number(ec.get("exam_class_id")));Map<String,Map<String,Object>>cells=new HashMap<>();for(Map<String,Object>s:scores)cells.put(s.get("roster_id")+":"+s.get("subject_id"),s);if(subjects.isEmpty()||roster.isEmpty()||scores.size()!=(long)subjects.size()*roster.size())throw Problem.conflict("成绩矩阵不完整");long number=Inputs.number(ec.get("current_release_no"))+1,release=r.release(Inputs.number(ec.get("exam_class_id")),number,reason);for(Map<String,Object>student:roster){List<Map<String,Object>>out=new ArrayList<>();BigDecimal total=BigDecimal.ZERO,full=BigDecimal.ZERO;boolean complete=true,hasCount=false;for(Map<String,Object>subject:subjects){Map<String,Object>s=cells.get(student.get("roster_id")+":"+subject.get("subject_id"));if(s==null||!Set.of("SCORE","ABSENT","EXEMPT").contains(s.get("score_status")))throw Problem.conflict("成绩异常未清");boolean count=Inputs.number(subject.get("counts_total"))==1;BigDecimal max=decimal(subject.get("full_score")),score=s.get("score")==null?null:decimal(s.get("score"));if((s.get("score_status").equals("SCORE")&&(score==null||score.compareTo(max)>0))||(!s.get("score_status").equals("SCORE")&&score!=null))throw Problem.conflict("成绩数值异常");if(count){hasCount=true;full=full.add(max);if(score==null)complete=false;else total=total.add(score);}out.add(P.of("subjectCode",subject.get("subject_code"),"subjectName",subject.get("subject_name"),"scoreStatus",s.get("score_status"),"score",score==null?null:score.toPlainString(),"fullScore",max.toPlainString(),"countsTotal",count));}if(!hasCount)throw Problem.conflict("没有应计科目");r.snapshot(release,clazz,student,out,complete?total:null,complete?full:null);}r.bump(Inputs.number(ec.get("exam_class_id")),"PUBLISHED",number);long v=Inputs.number(ec.get("version"))+1;audit.audit(0,"SCORE_PUBLISH","EXAM_CLASS",Inputs.number(ec.get("exam_class_id")),v-1,v,reason,Json.hash(b));return P.of("releaseId",Long.toString(release),"releaseNo",number,"classVersion",v,"studentCount",roster.size(),"status","PUBLISHED");});}
 @Transactional public Map<String,Object>withdraw(long exam,long clazz,Map<String,Object>b,String key){permit("exam:publish");return cmd.run("SCORE_WITHDRAW",key,payload(exam,clazz,b),()->{Map<String,Object>ec=root(exam,clazz,true);ParentCommands.version(ec,b);if(!"PUBLISHED".equals(ec.get("status")))throw Problem.conflict("当前没有可撤回发布");String reason=Inputs.text(b,"reason",1,128);long release=r.withdraw(Inputs.number(ec.get("exam_class_id")),Inputs.number(ec.get("current_release_no")),reason);r.bump(Inputs.number(ec.get("exam_class_id")),"WITHDRAWN",Inputs.number(ec.get("current_release_no")));long v=Inputs.number(ec.get("version"))+1;audit.audit(0,"SCORE_WITHDRAW","EXAM_CLASS",Inputs.number(ec.get("exam_class_id")),v-1,v,reason,Json.hash(b));return P.of("releaseId",Long.toString(release),"status","WITHDRAWN","classVersion",v);});}
}
```

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;import java.util.*;import java.math.BigDecimal;import org.springframework.stereotype.Repository;
@Repository
public class ExamRepository {
 private final Db db;public ExamRepository(Db db){this.db=db;}
 public List<Map<String,Object>>list(Long after,int limit,String academic,Integer semester){Actor a=Actors.current();Map<String,Object>p=P.of("after",after,"limit",limit,"academic",academic,"semester",semester,"all",a.allData()?1:0,"scope",Json.write(a.scopeDeptIds()));return new ArrayList<>(db.list("SELECT CAST(ec.exam_class_id AS CHAR) examClassId,CAST(e.exam_id AS CHAR) examId,CAST(ec.class_id AS CHAR) classId,e.exam_name examName,e.exam_date examDate,e.academic_year academicYear,e.semester,ec.class_name_snapshot className,ec.status,ec.current_release_no currentReleaseNo,ec.version FROM edu_exam_class ec JOIN edu_exam e ON e.exam_id=ec.exam_id JOIN edu_class c ON c.class_id=ec.class_id WHERE c.del_flag='0' AND (#{p.after} IS NULL OR ec.exam_class_id>#{p.after}) AND (#{p.academic} IS NULL OR e.academic_year=#{p.academic}) AND (#{p.semester} IS NULL OR e.semester=#{p.semester}) AND (#{p.all}=1 OR JSON_CONTAINS(CAST(#{p.scope} AS JSON),CAST(c.dept_id AS JSON))) ORDER BY ec.exam_class_id LIMIT #{p.limit}",p));}
 private long user(){return Actors.current().userId();}
 public Map<String,Object>root(long exam,long clazz,boolean lock){return db.required("SELECT * FROM edu_exam_class WHERE exam_id=#{p.e} AND class_id=#{p.c}"+(lock?" FOR UPDATE":""),P.of("e",exam,"c",clazz));}
 public Map<String,Object>byRoot(long id,boolean lock){return db.required("SELECT * FROM edu_exam_class WHERE exam_class_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));}
 public long createExam(String name,String date,String academic,long semester){return db.insert("INSERT INTO edu_exam(exam_name,exam_date,academic_year,semester,version,created_at,updated_at,created_by,updated_by) VALUES(#{p.n},#{p.d},#{p.a},#{p.s},0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u},#{p.u})",P.of("n",name,"d",date,"a",academic,"s",semester,"u",user()));}
 public void subject(long exam,Map<String,Object>s){Map<String,Object>p=new LinkedHashMap<>(s);p.put("e",exam);p.put("u",user());db.insert("INSERT INTO edu_exam_subject(exam_id,subject_code,subject_name,full_score,counts_total,created_at,created_by) VALUES(#{p.e},#{p.subjectCode},#{p.subjectName},#{p.fullScore},#{p.countsTotal},UTC_TIMESTAMP(3),#{p.u})",p);}
 public List<Map<String,Object>>currentStudents(long clazz){db.required("SELECT class_id FROM edu_class WHERE class_id=#{p.id} FOR UPDATE",P.of("id",clazz));return db.list("SELECT student_id,student_no,student_name FROM edu_student WHERE class_id=#{p.c} AND status='ACTIVE' ORDER BY student_id FOR UPDATE",P.of("c",clazz));}
 public long createClass(long exam,long clazz){return db.insert("INSERT INTO edu_exam_class(exam_id,class_id,class_name_snapshot,status,current_release_no,version,created_at,updated_at,created_by,updated_by) SELECT #{p.e},class_id,class_name,'DRAFT',0,0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u},#{p.u} FROM edu_class WHERE class_id=#{p.c}",P.of("e",exam,"c",clazz,"u",user()));}
 public void roster(long ec,Map<String,Object>s){db.insert("INSERT INTO edu_exam_roster(exam_class_id,student_id,student_no,student_name,created_at,created_by) VALUES(#{p.ec},#{p.id},#{p.no},#{p.name},UTC_TIMESTAMP(3),#{p.u})",P.of("ec",ec,"id",s.get("student_id"),"no",s.get("student_no"),"name",s.get("student_name"),"u",user()));}
 public List<Map<String,Object>>subjects(long exam){return db.list("SELECT subject_id,subject_code,subject_name,full_score,counts_total FROM edu_exam_subject WHERE exam_id=#{p.e} ORDER BY subject_id",P.of("e",exam));}
 public List<Map<String,Object>>rosterRows(long ec){return db.list("SELECT roster_id,student_id,student_no,student_name FROM edu_exam_roster WHERE exam_class_id=#{p.ec} ORDER BY roster_id",P.of("ec",ec));}
 public List<Map<String,Object>>scores(long ec){return db.list("SELECT s.roster_id,s.subject_id,s.score_status,s.score FROM edu_exam_score s JOIN edu_exam_roster r ON r.roster_id=s.roster_id WHERE r.exam_class_id=#{p.ec} ORDER BY s.roster_id,s.subject_id",P.of("ec",ec));}
 private Map<String,Object>jsonIds(Map<String,Object>input){Map<String,Object>out=new LinkedHashMap<>(input);for(String k:List.of("exam_id","exam_class_id","class_id","subject_id","roster_id","student_id"))if(out.get(k)!=null)out.put(k,out.get(k).toString());return out;}
 public Map<String,Object>detail(Map<String,Object>ec){Map<String,Object>e=db.required("SELECT exam_name,exam_date,academic_year,semester FROM edu_exam WHERE exam_id=#{p.id}",P.of("id",ec.get("exam_id")));return P.of("examId",ec.get("exam_id").toString(),"examName",e.get("exam_name"),"examDate",e.get("exam_date").toString(),"academicYear",e.get("academic_year"),"semester",e.get("semester"),"examClassId",ec.get("exam_class_id").toString(),"classId",ec.get("class_id").toString(),"status",ec.get("status"),"version",ec.get("version"),"subjects",subjects(Inputs.number(ec.get("exam_id"))).stream().map(this::jsonIds).toList(),"roster",rosterRows(Inputs.number(ec.get("exam_class_id"))).stream().map(this::jsonIds).toList(),"scores",scores(Inputs.number(ec.get("exam_class_id"))).stream().map(this::jsonIds).toList());}
 public long newBatch(Map<String,Object>ec,List<Map<String,Object>>rows,List<Map<String,Object>>errors){return db.insert("INSERT INTO edu_score_import(exam_class_id,source_version,status,payload_json,errors_json,confirmation_hash,row_count,expires_at,version,created_at,updated_at,created_by,updated_by) VALUES(#{p.ec},#{p.v},'PREVIEW',#{p.rows},#{p.errors},#{p.hash},#{p.count},DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 24 HOUR),0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u},#{p.u})",P.of("ec",ec.get("exam_class_id"),"v",ec.get("version"),"rows",Json.write(rows),"errors",Json.write(errors),"hash",Json.hash(rows),"count",rows.size(),"u",user()));}
 public Map<String,Object>batch(long id,boolean lock){Map<String,Object>b=db.required("SELECT *,expires_at<=UTC_TIMESTAMP(3) expired FROM edu_score_import WHERE batch_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));if(Inputs.number(b.get("created_by"))!=user())throw Problem.notFound("批次不存在");if(!"COMMITTED".equals(b.get("status"))&&Inputs.number(b.get("expired"))==1)throw new Problem(410,"BATCH_EXPIRED","请重新上传");return b;}
 public Map<String,Object>preview(Map<String,Object>b,boolean content){Map<String,Object>out=P.of("batchId",b.get("batch_id").toString(),"version",b.get("version"),"classVersion",b.get("source_version"),"status",b.get("status"),"rowCount",b.get("row_count"),"errors",Json.readMap("{\"x\":"+b.get("errors_json")+"}").get("x"),"confirmationHash",b.get("confirmation_hash"),"expiresAt",ParentFormats.utc(b.get("expires_at")));if(content)out.put("rows",Json.readMap("{\"x\":"+b.get("payload_json")+"}").get("x"));return out;}
 public void replaceScores(Map<String,Object>ec,List<Map<String,Object>>rows){long id=Inputs.number(ec.get("exam_class_id"));db.write("DELETE s FROM edu_exam_score s JOIN edu_exam_roster r ON r.roster_id=s.roster_id WHERE r.exam_class_id=#{p.ec}",P.of("ec",id));Map<String,Long>rosters=new HashMap<>(),subjects=new HashMap<>();for(Map<String,Object>v:rosterRows(id))rosters.put(v.get("student_no").toString(),Inputs.number(v.get("roster_id")));for(Map<String,Object>v:subjects(Inputs.number(ec.get("exam_id"))))subjects.put(v.get("subject_code").toString(),Inputs.number(v.get("subject_id")));for(Map<String,Object>b:rows)db.insert("INSERT INTO edu_exam_score(roster_id,subject_id,score_status,score,version,created_at,updated_at,created_by,updated_by) VALUES(#{p.r},#{p.s},#{p.status},#{p.score},0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u},#{p.u})",P.of("r",rosters.get(b.get("studentNo")),"s",subjects.get(b.get("subjectCode")),"status",b.get("scoreStatus"),"score","SCORE".equals(b.get("scoreStatus"))?new BigDecimal(b.get("score").toString()):null,"u",user()));}
 public void bump(long ec,String status,long number){db.write("UPDATE edu_exam_class SET status=#{p.status},current_release_no=#{p.n},version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.u} WHERE exam_class_id=#{p.ec}",P.of("ec",ec,"status",status,"n",number,"u",user()));}
 public void commitBatch(long id,long next){db.write("UPDATE edu_score_import SET status='COMMITTED',committed_class_version=#{p.v},version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.u} WHERE batch_id=#{p.id}",P.of("id",id,"v",next,"u",user()));}
 public Map<String,Object>committed(Map<String,Object>b){return P.of("batchId",b.get("batch_id").toString(),"status","COMMITTED","version",b.get("version"),"classVersion",b.get("committed_class_version"),"rowCount",b.get("row_count"));}
 public long release(long ec,long number,String reason){return db.insert("INSERT INTO edu_score_release(exam_class_id,release_no,status,reason_ref,published_at,version,created_at,updated_at,created_by,updated_by) VALUES(#{p.ec},#{p.n},'PUBLISHED',#{p.reason},UTC_TIMESTAMP(3),0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.u},#{p.u})",P.of("ec",ec,"n",number,"reason",reason,"u",user()));}
 public void snapshot(long release,long clazz,Map<String,Object>student,List<Map<String,Object>>subjects,BigDecimal total,BigDecimal full){db.insert("INSERT INTO edu_score_snapshot(release_id,student_id,class_id,student_no,student_name,subjects_json,total_score,total_full_score,created_at,created_by) VALUES(#{p.rel},#{p.s},#{p.c},#{p.no},#{p.name},#{p.subjects},#{p.total},#{p.full},UTC_TIMESTAMP(3),#{p.u})",P.of("rel",release,"s",student.get("student_id"),"c",clazz,"no",student.get("student_no"),"name",student.get("student_name"),"subjects",Json.write(subjects),"total",total,"full",full,"u",user()));}
 public long withdraw(long ec,long number,String reason){Map<String,Object>release=db.required("SELECT release_id FROM edu_score_release WHERE exam_class_id=#{p.ec} AND release_no=#{p.n} AND status='PUBLISHED' FOR UPDATE",P.of("ec",ec,"n",number));long id=Inputs.number(release.get("release_id"));db.write("UPDATE edu_score_release SET status='WITHDRAWN',withdrawn_reason_ref=#{p.reason},withdrawn_at=UTC_TIMESTAMP(3),withdrawn_by=#{p.u},version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.u} WHERE release_id=#{p.id}",P.of("id",id,"reason",reason,"u",user()));return id;}
}
```

## 6. 边界与异常场景处理

目录学年学期或分页非法400、缺少显式limit400；空范围返回空目录，跨范围班级不会出现在目录，目录不返回学生明细。格式/精度422、未知学号科目422、矩阵不全422、超范围403、跨创建者批次404、过期410、版本/状态/同键不同内容409。缺考/免考必须显式状态且空分，0是SCORE=0.00，空不是0，未录入不得发布。已有PUBLISHED不能再次发布或覆盖草稿，先撤回才可改；发布与撤回同根行锁串行，家长响应是一次查询时的已发布快照，撤回提交后的新查询不可见。旧试卷转班数据按考试时班级保留，家长资格按学生当前状态实时判断。外部身份和员工权限分开，后台密码会话不要求微信identity。验收目录按学年学期筛选、游标翻页不重复、仅返回负责班级、重新进入既有草稿/发布记录，以及相同键旧版本重放、换键已提交batch、多个班独立发布、满分decimal、应计科目缺考总分NULL、非应计科目缺考不影响总分、全科0总分0、并发导入+发布、撤回后更正新release、旧release直接URL404。本文未运行任何实现或测试。
