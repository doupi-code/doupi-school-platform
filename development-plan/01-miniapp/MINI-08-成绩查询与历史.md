# MINI-08 成绩查询与历史

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#mini-08)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，2 人日，依赖 MINI-07；当前仅计划，尚未实现和运行。** 家长选择一个有效孩子后，读取学校按考试+考试当时班级发布的本人各科分数、满分、合计及历史。无排名、等级、评语、班级其他学生数据；无导入、计算、发布权限。成绩写入、应计总分计算和快照由ADM-20负责，不在两端重复计算或估工。

未来路径：`backend/src/main/java/com/doupi/planref/parent/{ParentScoreController,ParentScoreService,ParentScoreRepository}.java`；`miniapp/pages/parent/scores.{js,wxml,wxss,json}`、`miniapp/pages/parent/score-detail.{js,wxml,wxss,json}`；仅路径规划，无实现文件创建。

- [ ] D1：已发布历史分页与本人快照详情、实时关联授权；验收跨孩、停用/离校/毕业、撤回快照统一不可见；考试转班历史仍按当时班级展示。
- [ ] D2：小程序列表/详情、0/缺考/免考/未录入与NULL总分展示、联调；验收decimal精度、空结果与明确分页、学校更正显示新版本、页面无其他学生数据。

## 2. 接口设计清单

Authorization必填，全部只读，不需要Idempotency-Key。BIGINT均十进制string；score/fullScore/totalScore/totalFullScore是保留两位的decimal字符串或NULL，不能用JS浮点重新求和。响应Cache-Control:no-store，时间UTC ISO字符串、显示Asia/Shanghai。

| 名称 | 方法 | 绝对路径 | 完整参数类型、必填及含义 | 返回字段类型及含义 | 权限 |
|---|---|---|---|---|---|
| 本人考试历史 | GET | `/api/v1/parent/students/{studentId}/scores` | path.studentId:string/是/当前选择孩子；query.academicYear:string(YYYY-YYYY连续两年)/否/学年筛选，不推断默认；semester:integer1或2/否/学期筛选，不推断默认；beforeReleaseId:string/否/上一页末releaseId，缺省从最新开始；limit:integer1..50/是/页大小 | student:object(student_id/student_no/student_name/campus_id/class_id/class_name:string)；items:array(releaseId:string发布ID,releaseNo:integer更正版次,examId:string,examName:string,examDate:string YYYY-MM-DD,academicYear:string YYYY-YYYY,semester:integer1或2,examClassId:string考试班级根,classId:string当时班级,className:string当时班名,totalScore:string或null,totalFullScore:string或null,publishedAt:string UTC)；nextBeforeReleaseId:string或null | ParentAccess.requireStudent(studentId)，只本人当前有效关系 |
| 本人成绩详情 | GET | `/api/v1/parent/students/{studentId}/scores/{releaseId}` | 两path ID:string/是/孩子与历史项发布ID | releaseId:string；releaseNo:integer；examId/examName/examDate/academicYear/examClassId/classId/className/publishedAt同历史；semester:integer1或2；studentId:string；subjects:array(subjectCode:string,subjectName:string,scoreStatus:SCORE/ABSENT/EXEMPT,score:string或null,fullScore:string,countsTotal:boolean)；totalScore:string或null；totalFullScore:string或null | 当前有效关系且快照student_id等于path；仅当前PUBLISHED版本 |

## 3. 数据流转细节

1. 列表：studentId来自path，仅用于定位，Actor.identityId来自认证上下文。ParentAccess.student实时连接student/guardian/link/identity四表，要求学生ACTIVE、家长ACTIVE、关系VERIFIED、绑定ACTIVE；没有资格统一404，不依据员工kind自动授权。academicYear/semester按显式输入筛选，不给默认学期；limit必填1..50，before缺省最新，不设默认页；Repository按release_id倒序取limit+1，固定游标不按日期偏移。读取snapshot.student_id=studentId、release.status=PUBLISHED、class.status=PUBLISHED、release_no=current_release_no，返回每次考试当前发布版本，不暴露撤回旧版。无业务写、无授权或成绩缓存。
2. 详情：同样先实时授权，单条SQL再按student_id+release_id及可见状态定位；SQL只取该学生快照subjects_json、total和考试字段，不查整班分数，不从客户端字段拼SQL。不从edu_exam_score草稿读取；快照JSON由发布时构建，API固定白名单投影再次拒绝未知科目状态，decimal按两位字符串输出；NULL保留。撤回/不存在/跨孩统一404，不泄露别人考试是否存在。发布元数据与快照一次联表读，无拼接跨版本。
3. 页面：切换孩子先清除上一孩子列表和详情，以studentId+请求序列号丢弃迟到旧响应；列表无数据明确“暂无已发布成绩”；SCORE的0.00显示0，ABSENT显示缺考，EXEMPT显示免考，UNRECORDED不会出现在合法发布快照，若遇到返回服务端502固定错误码而不猜0。总分NULL显示“应计科目未全部取得有效分数，暂不显示合计”，不自行剔除免考分母。后台更正撤回后下一查询清除旧数据并提示学校正在更正，详情不保存在永久本地缓存。
4. 时间：考试日期是学校教学日期，按原YYYY-MM-DD显示；publishedAt按UTC转上海。考试班名显示快照在ADM-20创建时冻结值，转班不会改历史。日志只记studentId/releaseId/traceId/code，禁打印分数和响应正文。接口网关及Controller需统一设置no-store。

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

共享ParentAccess完整实现见公共契约。以下均为完整新类，SQL值参数化，Java17，无隐式数据访问函数或伪成功。业务异常由公共处理器输出固定码/traceId，日志不得记录响应正文。

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;import org.springframework.web.bind.annotation.*;import java.util.*;
@RestController @RequestMapping("/api/v1/parent/students/{studentId}/scores")
public class ParentScoreController {
 private final ParentScoreService s;public ParentScoreController(ParentScoreService s){this.s=s;}
 @GetMapping public Object history(@PathVariable long studentId,@RequestParam(required=false)Long beforeReleaseId,@RequestParam int limit,@RequestParam(required=false)String academicYear,@RequestParam(required=false)Integer semester){return ApiReply.of(s.history(studentId,beforeReleaseId,limit,academicYear,semester),200);}
 @GetMapping("/{releaseId}")public Object detail(@PathVariable long studentId,@PathVariable long releaseId){return ApiReply.of(s.detail(studentId,releaseId),200);}
}
```

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;import java.util.*;import java.math.*;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;
@Service
public class ParentScoreService {
 private final ParentAccess access;private final ParentScoreRepository r;
 public ParentScoreService(ParentAccess access,ParentScoreRepository r){this.access=access;this.r=r;}
 private boolean requiredCount(Map<String,Object>s){if(!(s.get("countsTotal") instanceof Boolean value))throw new Problem(502,"SCORE_SNAPSHOT_INVALID","成绩暂不可用，请联系学校");return value;}
 private String amount(Object v){if(v==null)return null;try{return new BigDecimal(v.toString()).setScale(2,RoundingMode.UNNECESSARY).toPlainString();}catch(ArithmeticException|NumberFormatException e){throw new Problem(502,"SCORE_SNAPSHOT_INVALID","成绩暂不可用，请联系学校");}}
 private Map<String,Object>metadata(Map<String,Object>row){return P.of("releaseId",row.get("release_id").toString(),"releaseNo",row.get("release_no"),"examId",row.get("exam_id").toString(),"examName",row.get("exam_name"),"examDate",row.get("exam_date").toString(),"academicYear",row.get("academic_year"),"semester",row.get("semester"),"examClassId",row.get("exam_class_id").toString(),"classId",row.get("class_id").toString(),"className",row.get("class_name"),"totalScore",amount(row.get("total_score")),"totalFullScore",amount(row.get("total_full_score")),"publishedAt",utc(row.get("published_at")));}
 private String utc(Object value){if(value instanceof java.sql.Timestamp t)return t.toLocalDateTime().toInstant(java.time.ZoneOffset.UTC).toString();if(value instanceof java.time.LocalDateTime t)return t.toInstant(java.time.ZoneOffset.UTC).toString();throw new Problem(502,"SCORE_TIME_INVALID","成绩时间暂不可用");}
 @Transactional(readOnly=true)public Map<String,Object>history(long student,Long before,int limit,String academicYear,Integer semester){Map<String,Object>child=access.student(student);if(academicYear!=null&&(!academicYear.matches("[0-9]{4}-[0-9]{4}")||Integer.parseInt(academicYear.substring(5))!=Integer.parseInt(academicYear.substring(0,4))+1)||semester!=null&&(semester<1||semester>2))throw Problem.bad("学年学期筛选错误");if(limit<1||limit>50||before!=null&&before<=0)throw Problem.bad("分页参数错误");List<Map<String,Object>>rows=r.history(student,before,limit+1,academicYear,semester);boolean more=rows.size()>limit;if(more)rows.remove(rows.size()-1);List<Map<String,Object>>items=rows.stream().map(this::metadata).toList();return P.of("student",child,"items",items,"nextBeforeReleaseId",more?items.get(items.size()-1).get("releaseId"):null);}
 @Transactional(readOnly=true)public Map<String,Object>detail(long student,long release){access.requireStudent(student);if(release<=0)throw Problem.bad("发布ID错误");Map<String,Object>row=r.detail(student,release),out=metadata(row);List<Map<String,Object>>raw=Inputs.list(Json.readMap("{\"subjects\":"+row.get("subjects_json")+"}"),"subjects");List<Map<String,Object>>subjects=new ArrayList<>();for(Map<String,Object>s:raw){String state=Inputs.text(s,"scoreStatus",1,16);if(!Set.of("SCORE","ABSENT","EXEMPT").contains(state))throw new Problem(502,"SCORE_SNAPSHOT_INVALID","成绩暂不可用，请联系学校");String value=amount(s.get("score"));if(state.equals("SCORE")&&value==null||!state.equals("SCORE")&&value!=null)throw new Problem(502,"SCORE_SNAPSHOT_INVALID","成绩暂不可用，请联系学校");subjects.add(P.of("subjectCode",Inputs.text(s,"subjectCode",1,20),"subjectName",Inputs.text(s,"subjectName",1,64),"scoreStatus",state,"score",value,"fullScore",amount(s.get("fullScore")),"countsTotal",requiredCount(s)));}out.put("studentId",Long.toString(student));out.put("subjects",subjects);return out;}
}
```

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;import java.util.*;import org.springframework.stereotype.Repository;
@Repository
public class ParentScoreRepository {
 private final Db db;public ParentScoreRepository(Db db){this.db=db;}
 private static final String BASE="SELECT rel.release_id,rel.release_no,rel.published_at,ec.exam_class_id,ec.class_id,ec.class_name_snapshot AS class_name,e.exam_id,e.exam_name,e.exam_date,e.academic_year,e.semester,s.total_score,s.total_full_score,s.subjects_json FROM edu_score_snapshot s JOIN edu_score_release rel ON rel.release_id=s.release_id JOIN edu_exam_class ec ON ec.exam_class_id=rel.exam_class_id JOIN edu_exam e ON e.exam_id=ec.exam_id WHERE s.student_id=#{p.student} AND rel.status='PUBLISHED' AND ec.status='PUBLISHED' AND rel.release_no=ec.current_release_no";
 public List<Map<String,Object>>history(long student,Long before,int limit,String academic,Integer semester){return new ArrayList<>(db.list(BASE+" AND (#{p.before} IS NULL OR rel.release_id<#{p.before}) AND (#{p.academic} IS NULL OR e.academic_year=#{p.academic}) AND (#{p.semester} IS NULL OR e.semester=#{p.semester}) ORDER BY rel.release_id DESC LIMIT #{p.limit}",P.of("student",student,"before",before,"limit",limit,"academic",academic,"semester",semester)));}
 public Map<String,Object>detail(long student,long release){Map<String,Object>row=db.one(BASE+" AND rel.release_id=#{p.release}",P.of("student",student,"release",release));if(row.isEmpty())throw new Problem(404,"SCORE_NOT_VISIBLE","成绩不存在或已撤回");return row;}
}
```

## 6. 边界与异常场景处理

401会话失效；404不存在/无资格/撤回/旧发布版/跨学生；400分页错误；502快照非法，不猜默认分数。多个家长均可读本人关系覆盖的孩子，不因一个家长读取影响另一家长。员工无监护关系不得进入家长接口；关系撤销、学生离校/毕业/停用后历史亦不可再查。网络失败保留页面错误态但不跨孩子显示旧数据，重试当前请求；过期缓存不能作为离线成绩凭据。验收至少含两孩并行请求迟到、单孩两家长、0.00、decimal 0.10+0.20由后端0.30快照、缺考/免考总分NULL、应计科目全有效才有合计、撤回即404、更正版本递增、转班当时班名保留、无排序排名字段。DDL和代码未执行，不宣称已通过真机或自动化测试。
