# ADM-21 家校通知发布与回执

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-21)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

P0；3个单人工作日，依赖ADM-04、ADM-19、ADM-20、MINI-09。本轮仅写Markdown；以下文件路径、DDL与Java都是待开发方案，不创建或修改源码、参考工程、独立SQL或脚本。按1名Java开发+AI，包含本端页面、服务接入和自测；不重复计算另一端工作量。

包含家校通知草稿、学校/年级/班级/指定学生范围、正式发布/撤回、逐学生回执及授权附件；与员工内部通知并列，不复用员工收件人。

- [ ] 第1日：未来doupi-web-admin-react/src/pages/family/notices与src/api/family-notice.ts完成列表/草稿/范围/私有上传，后端按本文分层。
- [ ] 第2日：发布范围快照、状态与版本、撤回/更正链、班主任范围及站内正式收件联调。
- [ ] 第3日：逐学生至少一家长确认、展开个人回执、失效关系、转班/后激活和失败回滚验收。

验收：不存在用职工userId0批量代替家长；普通班主任不能选其它班；发布后不原位变正文，统计口径可解释。

## 2. 接口设计清单

统一外层code:int、msg:string、traceId:string、replayed:boolean、data:object。ID为十进制字符串，版本非负整数，新时间UTC、展示上海。写动作Idempotency-Key:string(8..64)必填；header Authorization:Bearer必填。学生来自当前正式监护关系，客户端userId/role/手机号不构成授权。只读接口不写阅读；READ和ACK必须显式调用。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/是否必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 通知管理列表 | GET | `/api/v1/office/family-notices` | afterId:string/否默认0 | items:[{noticeId:string,title:string,status:string,version:long,publishedAt:datetime或null}]；scannedThroughId:string/续查边界 | family:notice:list，负责范围 |
| 通知管理详情 | GET | `/api/v1/office/family-notices/{id}` | id:string/是 | notice:完整通知字段及files元数据，字段见第4节，不返回object_key | family:notice:read，负责范围 |
| 创建草稿 | POST | `/api/v1/office/family-notices` | title:string1..100/是；content:string1..20000/是/纯文本；audience:对象/是；ackRequired:boolean/否默认false；fileIds:string[]/否默认空且不重复；correctionOfNoticeId:string/否/更正来源 | noticeId:string；version:long=0；status:DRAFT | family:notice:edit；学校/年级范围另需family:notice:school |
| 修改草稿 | PUT | `/api/v1/office/family-notices/{id}` | id:string/是；expectedVersion:long/是；title/content/audience/ackRequired/fileIds同创建；更正来源创建后不变 | noticeId:string；version:long+1；status:DRAFT | family:notice:edit，普通班主任只能本人创建且负责班级 |
| 确认发布 | POST | `/api/v1/office/family-notices/{id}/publish` | id:string/是；expectedVersion:long/是 | noticeId:string；version:long+1；status:PUBLISHED | family:notice:publish及负责范围 |
| 撤回通知 | POST | `/api/v1/office/family-notices/{id}/withdraw` | id:string/是；expectedVersion:long/是；reason:string1..500/是 | noticeId:string；version:long+1；status:WITHDRAWN | family:notice:withdraw及负责范围 |
| 学生与家长回执 | GET | `/api/v1/office/family-notices/{id}/receipts` | id:string/是 | noticeId:string；students:[{studentId:string,confirmed:boolean,guardians:[{guardian_id:string,guardian_name:string,read_at:datetime或null,acknowledged_at:datetime或null,currentEffective:boolean=true}],historicalReceipts:[{guardian_id:string,guardian_name:string,guardian_status:string,relation_status:string或null,read_at:datetime或null,acknowledged_at:datetime或null,currentEffective:boolean=false}]}] | family:notice:receipts及负责范围 |

audience完整结构：`type:SCHOOL/GRADE/CLASS/STUDENT`必填；GRADE时`campusId:string1..32,grade:string1..20`必填；CLASS时`classIds:正ID字符串数组1..500`必填；STUDENT时`studentIds:正ID字符串数组1..500`必填；SCHOOL无额外目标字段。服务端解析去重，并以发布时结果固化收件学生。

## 3. 数据流转细节

1. 列表/详情：a.require校验动作权限，教务全校范围额外要求family:notice:school；普通班主任只能维护自己创建且edu_class.head_teacher_id=Actor.userId的负责班级。列表先按创建人/明确全校权限过滤，再逐条范围核验，scannedThroughId取扫描边界，不能因越权行导致整页失败或跳页。详情读取family_notice及family_notice_file→sys_file元数据。
2. save：先要求family:notice:edit；固定动作FAMILY_NOTICE_SAVE，scope=STAFF:Actor.userId（密码员工identity可以为0），摘要含noticeId和完整正文。事务内修改锁notice比expectedVersion，仅DRAFT可改；校title/content长度，解析audience并确认非空有效学生。SCHOOL全校ACTIVE；GRADE按campus_id+edu_class.grade；CLASS按classIds；STUDENT按studentIds；班主任仅本人负责班级。创建version0，修改+1。
3. 附件：fileIds逐个锁sys_file校owner_user_id=当前职工、READY/PASSED/PRIVATE，插family_notice_file并清expires_at，失败整批回滚。草稿替换的是草稿附件链接；已发布不原位替换，正文不包含可执行HTML。更正来源须同范围授权。
4. publish：锁notice，先幂等重放再比版本，必须DRAFT；再次校附件当前状态，按此时正式名册把范围解析去重为student_id。逐行插family_notice_student(notice_id,student_id,class_id,campus_id,created_at)，写PUBLISHED/published_by_user_id/published_at/version+1。学生收件快照、动作审计及channel幂等响应同事务；无有效学生或部分插入失败则全部回滚。
5. withdraw：需PUBLISHED+正确版本+reason，写WITHDRAWN/withdrawn_at/version+1并审计。保留学生快照及所有回执，家长读取立即不可见。重新发布旧通知不开放，另建correction_of_notice_id新草稿保留更正链。
6. receipts：按发布学生快照查当前VERIFIED监护关系和ACTIVE家长，LEFT JOIN各家长回执，guardians标currentEffective=true，任一家长ack非空则confirmed=true。另从family_notice_receipt连edu_guardian并LEFT JOIN关系表查询当前不再有效的历史回执，放historicalReceipts并标currentEffective=false、保留guardian_status/relation_status；这些旧READ/ACK仅历史可查，不纳入confirmed。无有效家长仍显示未确认；家长端不获得他人手机号或回执详情。已发布/撤回通知的员工范围用family_notice_student冻结班级校验，不因学生已转班而重算原范围。统计不依赖Redis；只有可重建公开字典可缓存。
7. 事务和日志：所有写操作由ExternalCommands统一TransactionTemplate，占键、版本、业务表、audit和最小响应同提交；同key异目标/正文409，异常回滚无伪成功。日志仅动作/noticeId/traceId，不打印学生名单、手机号或通知正文；站内正式收件不依赖外部订阅服务。FamilyNoticeResponseAdvice按URI给成功及MVC异常JSON统一no-store，私有下载单独显式no-store。

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**family_notice**

```sql
CREATE TABLE family_notice (
  notice_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '家校通知ID',
  title VARCHAR(100) NOT NULL COMMENT '通知标题',
  content TEXT NOT NULL COMMENT '纯文本正文，不含可执行HTML',
  audience_type VARCHAR(16) NOT NULL COMMENT 'SCHOOL/GRADE/CLASS/STUDENT',
  audience_json JSON NOT NULL COMMENT '发布前范围配置，发布后不变',
  ack_required TINYINT NOT NULL DEFAULT 0 COMMENT '是否要求明确确认',
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' COMMENT 'DRAFT/PUBLISHED/WITHDRAWN',
  correction_of_notice_id BIGINT NULL COMMENT '新通知更正的原通知',
  version BIGINT NOT NULL DEFAULT 0 COMMENT '并发版本',
  created_by_user_id BIGINT NOT NULL COMMENT '真实创建职工',
  created_at DATETIME(3) NOT NULL COMMENT '创建UTC时间',
  updated_at DATETIME(3) NOT NULL COMMENT '更新UTC时间',
  published_by_user_id BIGINT NULL COMMENT '发布职工',
  published_at DATETIME(3) NULL COMMENT '正式发布UTC时间',
  withdrawn_at DATETIME(3) NULL COMMENT '撤回UTC时间',
  PRIMARY KEY (notice_id),
  INDEX idx_family_notice_state (status, notice_id),
  CONSTRAINT fk_fn_author FOREIGN KEY (created_by_user_id) REFERENCES sys_user (
    user_id
  ),
  CONSTRAINT fk_fn_publisher FOREIGN KEY (published_by_user_id) REFERENCES sys_user (
    user_id
  ),
  CONSTRAINT fk_fn_correction FOREIGN KEY (correction_of_notice_id) REFERENCES family_notice (
    notice_id
  ),
  CONSTRAINT ck_fn_state CHECK (status IN ('DRAFT', 'PUBLISHED', 'WITHDRAWN'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='家校通知，与员工内部通知分域';
```

**family_notice_student**

```sql
CREATE TABLE family_notice_student (
  notice_id BIGINT NOT NULL COMMENT '通知ID',
  student_id BIGINT NOT NULL COMMENT '正式接收学生快照',
  class_id BIGINT NOT NULL COMMENT '发布时班级快照',
  campus_id VARCHAR(32) NOT NULL COMMENT '发布时校区快照',
  created_at DATETIME(3) NOT NULL COMMENT '发布UTC时间',
  PRIMARY KEY (notice_id, student_id),
  INDEX idx_fns_student (student_id, notice_id),
  CONSTRAINT fk_fns_notice FOREIGN KEY (notice_id) REFERENCES family_notice (
    notice_id
  ),
  CONSTRAINT fk_fns_student FOREIGN KEY (student_id) REFERENCES edu_student (
    student_id
  ),
  CONSTRAINT fk_fns_class FOREIGN KEY (class_id) REFERENCES edu_class (
    class_id
  ),
  CONSTRAINT fk_fns_campus FOREIGN KEY (campus_id) REFERENCES doupi_recruit_campus (
    campus_id
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='学生收件范围不可随转班重算';
```

**family_notice_receipt**

```sql
CREATE TABLE family_notice_receipt (
  receipt_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '家长回执ID',
  notice_id BIGINT NOT NULL COMMENT '通知ID',
  student_id BIGINT NOT NULL COMMENT '当前所查看的孩子',
  guardian_id BIGINT NOT NULL COMMENT '真实家长档案',
  read_at DATETIME(3) NULL COMMENT '首次阅读UTC时间',
  acknowledged_at DATETIME(3) NULL COMMENT '首次明确确认UTC时间',
  created_at DATETIME(3) NOT NULL COMMENT '建立UTC时间',
  updated_at DATETIME(3) NOT NULL COMMENT '最后动作UTC时间',
  PRIMARY KEY (receipt_id),
  UNIQUE uk_fnr (
    notice_id,
    student_id,
    guardian_id
  ),
  INDEX idx_fnr_summary (notice_id, student_id, acknowledged_at),
  CONSTRAINT fk_fnr_target FOREIGN KEY (notice_id, student_id) REFERENCES family_notice_student (
    notice_id,
    student_id
  ),
  CONSTRAINT fk_fnr_guardian FOREIGN KEY (guardian_id) REFERENCES edu_guardian (
    guardian_id
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='逐家长逐孩子独立阅读与确认';
```

**family_notice_file**

```sql
CREATE TABLE family_notice_file (
  notice_id BIGINT NOT NULL COMMENT '通知ID',
  file_id BIGINT NOT NULL COMMENT '私有附件ID',
  sort_order INT NOT NULL DEFAULT 0 COMMENT '显示顺序',
  PRIMARY KEY (notice_id, file_id),
  CONSTRAINT fk_fnf_notice FOREIGN KEY (notice_id) REFERENCES family_notice (
    notice_id
  ),
  CONSTRAINT fk_fnf_file FOREIGN KEY (file_id) REFERENCES sys_file (
    file_id
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='通知授权下载边界，不产生公共URL';
```

**family_notice_audit**

```sql
CREATE TABLE family_notice_audit (
  audit_id BIGINT NOT NULL AUTO_INCREMENT COMMENT '不可变业务动作',
  notice_id BIGINT NOT NULL COMMENT '通知ID',
  actor_type VARCHAR(16) NOT NULL COMMENT 'STAFF/EXTERNAL',
  actor_id BIGINT NOT NULL COMMENT 'STAFF为user_id，EXTERNAL为identity_id',
  action_code VARCHAR(32) NOT NULL COMMENT 'CREATE/UPDATE/PUBLISH/WITHDRAW/READ/ACK',
  student_id BIGINT NULL COMMENT '家长动作的孩子，后台动作可空',
  reason VARCHAR(500) NULL COMMENT '撤回等说明，不存正文或手机号',
  created_at DATETIME(3) NOT NULL COMMENT '动作UTC时间',
  PRIMARY KEY (audit_id),
  INDEX idx_fna_notice (notice_id, audit_id),
  CONSTRAINT fk_fna_notice FOREIGN KEY (notice_id) REFERENCES family_notice (
    notice_id
  ),
  CONSTRAINT fk_fna_student FOREIGN KEY (student_id) REFERENCES edu_student (
    student_id
  ),
  CONSTRAINT ck_fna_actor CHECK (actor_type IN ('STAFF', 'EXTERNAL'))
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='不以actor_id冒充混合外键，按actor_type校验来源';
```

## 5. 代码实现骨架

未来包`com.doupi.planref.family`。复用现有`Db/P/Inputs/Json/Actor/Actors/ApiReply/Problem`与`auth.ExternalCommands`，不修改参考工程；后者内置TransactionTemplate、参数绑定与channel幂等。Service在调用幂等组件前检查身份/当前读取资格，在事务内锁通知并再次校验范围。新增API保留`/api/v1`前缀，ID由ApiReply转换为字符串；时间UTC、展示上海。

```java
package com.doupi.planref.family;
import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;
@Repository
public class FamilyNoticeRepository {
 private final Db db;
 public FamilyNoticeRepository(Db db){this.db=db;}
 public Db db(){return db;}
 public Map<String,Object> notice(long id,boolean lock){return db.required("SELECT * FROM family_notice WHERE notice_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));}
 public List<Map<String,Object>> recipients(long id){return db.list("SELECT student_id,class_id,campus_id FROM family_notice_student WHERE notice_id=#{p.id} ORDER BY student_id",P.of("id",id));}
 public long guardian(long student){return Inputs.number(db.required("SELECT g.guardian_id FROM edu_guardian_identity b JOIN edu_guardian g ON g.guardian_id=b.guardian_id JOIN edu_student_guardian l ON l.guardian_id=g.guardian_id JOIN edu_student s ON s.student_id=l.student_id WHERE b.identity_id=#{p.identity} AND b.status='ACTIVE' AND g.status='ACTIVE' AND l.status='VERIFIED' AND s.status='ACTIVE' AND s.student_id=#{p.student}",P.of("identity",Actors.current().identityId(),"student",student)).get("guardian_id"));}
 public Map<String,Object> target(long notice,long student){return db.required("SELECT notice_id,student_id FROM family_notice_student WHERE notice_id=#{p.notice} AND student_id=#{p.student}",P.of("notice",notice,"student",student));}
 public Map<String,Object> attachment(long notice,long file){return db.required("SELECT f.object_key,f.original_name,f.mime_type FROM family_notice_file l JOIN sys_file f ON f.file_id=l.file_id WHERE l.notice_id=#{p.notice} AND l.file_id=#{p.file} AND f.storage_provider='LOCAL' AND f.bucket='private' AND f.status='READY' AND f.scan_status='PASSED' AND f.visibility='PRIVATE'",P.of("notice",notice,"file",file));}
 public List<Map<String,Object>> inbox(long student,long guardian,long after){return db.list("SELECT n.notice_id,n.title,n.ack_required,n.published_at,r.read_at,r.acknowledged_at FROM family_notice n JOIN family_notice_student t ON t.notice_id=n.notice_id LEFT JOIN family_notice_receipt r ON r.notice_id=n.notice_id AND r.student_id=t.student_id AND r.guardian_id=#{p.guardian} WHERE t.student_id=#{p.student} AND n.status='PUBLISHED' AND n.notice_id>#{p.after} ORDER BY n.notice_id LIMIT 100",P.of("student",student,"guardian",guardian,"after",after));}
 public void audit(long id,String action,Long student,String reason,boolean external){Actor a=Actors.current();db.write("INSERT INTO family_notice_audit(notice_id,actor_type,actor_id,action_code,student_id,reason,created_at) VALUES(#{p.notice},#{p.type},#{p.actor},#{p.action},#{p.student},#{p.reason},UTC_TIMESTAMP(3))",P.of("notice",id,"type",external?"EXTERNAL":"STAFF","actor",external?a.identityId():a.userId(),"action",action,"student",student,"reason",reason));}
}
```

```java
package com.doupi.planref.family;
import com.doupi.planref.*;
import com.doupi.planref.parent.ParentAccess;
import com.doupi.planref.auth.ExternalCommands;
import java.util.*;
import org.slf4j.*;
import org.springframework.stereotype.Service;
@Service
public class FamilyNoticeService {
 private final FamilyNoticeRepository repo;private final ParentAccess access;private final ExternalCommands commands;
 private final Logger log=LoggerFactory.getLogger(FamilyNoticeService.class);
 public FamilyNoticeService(FamilyNoticeRepository repo,ParentAccess access,ExternalCommands commands){this.repo=repo;this.access=access;this.commands=commands;}
 private Db db(){return repo.db();}
 private static long n(Map<String,Object> r,String k){return Inputs.number(r.get(k));}
 private static boolean yes(Object v){return Boolean.TRUE.equals(v)||(v instanceof Number q&&q.intValue()==1);}
 private boolean school(){Actor a=Actors.current();return a.permissions().contains("*")||a.permissions().contains("family:notice:school");}
 private void classScope(long id){Map<String,Object> c=db().required("SELECT class_id,head_teacher_id FROM edu_class WHERE class_id=#{p.id} AND status='ACTIVE'",P.of("id",id));if(!school()&&(c.get("head_teacher_id")==null||n(c,"head_teacher_id")!=Actors.current().userId()))throw Problem.forbidden("不在负责班级范围");}
 private void staffScope(Map<String,Object> notice){if(school())return;if(Inputs.number(notice.get("created_by_user_id"))!=Actors.current().userId())throw Problem.forbidden("仅负责班级的创建人可维护通知");List<Map<String,Object>> rows="DRAFT".equals(notice.get("status"))?resolve(Json.readMap(notice.get("audience_json"))):repo.recipients(n(notice,"notice_id"));for(Map<String,Object> row:rows)classScope(n(row,"class_id"));}
 private List<Map<String,Object>> resolve(Map<String,Object> audience){String type=Inputs.text(audience,"type",1,16);List<Map<String,Object>> out=new ArrayList<>();
  switch(type){
   case "SCHOOL":if(!school())throw Problem.forbidden("需要全校发布权限");out.addAll(db().list("SELECT student_id,class_id,campus_id FROM edu_student WHERE status='ACTIVE' ORDER BY student_id",Map.of()));break;
   case "GRADE":if(!school())throw Problem.forbidden("年级发布需要教务全校范围");out.addAll(db().list("SELECT s.student_id,s.class_id,s.campus_id FROM edu_student s JOIN edu_class c ON c.class_id=s.class_id WHERE s.status='ACTIVE' AND s.campus_id=#{p.campus} AND c.grade=#{p.grade} ORDER BY s.student_id",P.of("campus",Inputs.text(audience,"campusId",1,32),"grade",Inputs.text(audience,"grade",1,20))));break;
   case "CLASS":for(long id:Inputs.ids(audience,"classIds")){classScope(id);out.addAll(db().list("SELECT student_id,class_id,campus_id FROM edu_student WHERE class_id=#{p.id} AND status='ACTIVE' ORDER BY student_id",P.of("id",id)));}break;
   case "STUDENT":for(long id:Inputs.ids(audience,"studentIds")){Map<String,Object> s=db().required("SELECT student_id,class_id,campus_id FROM edu_student WHERE student_id=#{p.id} AND status='ACTIVE'",P.of("id",id));classScope(n(s,"class_id"));out.add(s);}break;
   default:throw Problem.bad("接收范围类型无效");
  }
  if(out.isEmpty())throw Problem.bad("接收学生范围不能为空");Map<Long,Map<String,Object>> unique=new TreeMap<>();for(var row:out)unique.put(n(row,"student_id"),row);return new ArrayList<>(unique.values());
 }
 public Map<String,Object> save(long id,String key,Map<String,Object> body){Actors.current().require("family:notice:edit");return commands.run("STAFF:"+Actors.current().userId(),"FAMILY_NOTICE_SAVE",key,P.of("noticeId",id,"body",body),id==0?201:200,()->{
  Map<String,Object> old=id==0?Map.of():repo.notice(id,true);if(id>0){staffScope(old);if(!"DRAFT".equals(old.get("status")))throw Problem.conflict("正式通知不能原位编辑");if(Inputs.nonNegative(body,"expectedVersion")!=n(old,"version"))throw Problem.conflict("通知已更新");}
  Map<String,Object> audience=Inputs.map(body.get("audience"));resolve(audience);List<Long> files=body.get("fileIds")==null?List.of():Inputs.ids(body,"fileIds");if(new HashSet<>(files).size()!=files.size())throw Problem.bad("附件重复");
  Map<String,Object> p=P.of("id",id,"title",Inputs.text(body,"title",1,100),"content",Inputs.text(body,"content",1,20000),"type",Inputs.text(audience,"type",1,16),"audience",Json.write(audience),"ack",Inputs.bool(body,"ackRequired",false),"actor",Actors.current().userId(),"correction",Inputs.optionalId(body,"correctionOfNoticeId"));
  if(p.get("correction")!=null)staffScope(repo.notice(Inputs.number(p.get("correction")),false));long saved=id;
  if(id==0)saved=db().insert("INSERT INTO family_notice(title,content,audience_type,audience_json,ack_required,correction_of_notice_id,status,version,created_by_user_id,created_at,updated_at) VALUES(#{p.title},#{p.content},#{p.type},#{p.audience},#{p.ack},#{p.correction},'DRAFT',0,#{p.actor},UTC_TIMESTAMP(3),UTC_TIMESTAMP(3))",p);
  else{db().write("UPDATE family_notice SET title=#{p.title},content=#{p.content},audience_type=#{p.type},audience_json=#{p.audience},ack_required=#{p.ack},version=version+1,updated_at=UTC_TIMESTAMP(3) WHERE notice_id=#{p.id}",p);db().write("DELETE FROM family_notice_file WHERE notice_id=#{p.id}",P.of("id",id));}
  for(long file:files){Map<String,Object> f=db().required("SELECT owner_user_id FROM sys_file WHERE file_id=#{p.id} AND status='READY' AND scan_status='PASSED' AND visibility='PRIVATE' FOR UPDATE",P.of("id",file));if(n(f,"owner_user_id")!=Actors.current().userId())throw Problem.forbidden("只能使用本人合法上传的附件");db().write("INSERT INTO family_notice_file(notice_id,file_id,sort_order) VALUES(#{p.notice},#{p.file},0)",P.of("notice",saved,"file",file));db().write("UPDATE sys_file SET expires_at=NULL WHERE file_id=#{p.id}",P.of("id",file));}
  repo.audit(saved,id==0?"CREATE":"UPDATE",null,null,false);log.info("familyNotice action=SAVE noticeId={} traceId={}",saved,ApiReply.traceId());return P.of("noticeId",Long.toString(saved),"version",id==0?0:n(old,"version")+1,"status","DRAFT");});}
 public Map<String,Object> publish(long id,String key,Map<String,Object> body,boolean withdraw){Actors.current().require(withdraw?"family:notice:withdraw":"family:notice:publish");staffScope(repo.notice(id,false));return commands.run("STAFF:"+Actors.current().userId(),withdraw?"FAMILY_NOTICE_WITHDRAW":"FAMILY_NOTICE_PUBLISH",key,P.of("noticeId",id,"body",body),200,()->{
  Map<String,Object> row=repo.notice(id,true);staffScope(row);if(Inputs.nonNegative(body,"expectedVersion")!=n(row,"version"))throw Problem.conflict("通知版本已变化");if(!(withdraw?"PUBLISHED":"DRAFT").equals(row.get("status")))throw Problem.conflict("通知状态不允许本操作");String reason=withdraw?Inputs.text(body,"reason",1,500):null;
  if(!withdraw){for(var file:db().list("SELECT f.status,f.scan_status,f.visibility FROM family_notice_file l JOIN sys_file f ON f.file_id=l.file_id WHERE l.notice_id=#{p.id} FOR UPDATE",P.of("id",id)))if(!"READY".equals(file.get("status"))||!"PASSED".equals(file.get("scan_status"))||!"PRIVATE".equals(file.get("visibility")))throw Problem.conflict("附件已失效或未通过检查");for(var target:resolve(Json.readMap(row.get("audience_json"))))db().write("INSERT INTO family_notice_student(notice_id,student_id,class_id,campus_id,created_at) VALUES(#{p.notice},#{p.student},#{p.class},#{p.campus},UTC_TIMESTAMP(3))",P.of("notice",id,"student",target.get("student_id"),"class",target.get("class_id"),"campus",target.get("campus_id")));}
  db().write(withdraw?"UPDATE family_notice SET status='WITHDRAWN',withdrawn_at=UTC_TIMESTAMP(3),version=version+1,updated_at=UTC_TIMESTAMP(3) WHERE notice_id=#{p.id}":"UPDATE family_notice SET status='PUBLISHED',published_at=UTC_TIMESTAMP(3),published_by_user_id=#{p.actor},version=version+1,updated_at=UTC_TIMESTAMP(3) WHERE notice_id=#{p.id}",P.of("id",id,"actor",Actors.current().userId()));repo.audit(id,withdraw?"WITHDRAW":"PUBLISH",null,reason,false);log.info("familyNotice action={} noticeId={} traceId={}",withdraw?"WITHDRAW":"PUBLISH",id,ApiReply.traceId());return P.of("noticeId",Long.toString(id),"version",n(row,"version")+1,"status",withdraw?"WITHDRAWN":"PUBLISHED");});}
 public Map<String,Object> list(long student,long after){access.requireStudent(student);if(after<0)throw Problem.bad("分页游标无效");return P.of("studentId",Long.toString(student),"items",repo.inbox(student,repo.guardian(student),after));}
 public Map<String,Object> detail(long id,long student){access.requireStudent(student);repo.target(id,student);Map<String,Object> n=repo.notice(id,false);if(!"PUBLISHED".equals(n.get("status")))throw Problem.notFound("通知不存在或已撤回");return P.of("noticeId",Long.toString(id),"studentId",Long.toString(student),"title",n.get("title"),"content",n.get("content"),"ackRequired",yes(n.get("ack_required")),"publishedAt",n.get("published_at"),"files",db().list("SELECT f.file_id,f.original_name,f.mime_type,f.byte_size FROM family_notice_file l JOIN sys_file f ON f.file_id=l.file_id WHERE l.notice_id=#{p.id} AND f.status='READY' AND f.scan_status='PASSED' ORDER BY l.sort_order,f.file_id",P.of("id",id)));}
 public Map<String,Object> act(long id,String key,Map<String,Object> body,boolean ack){long student=Inputs.id(body,"studentId");access.requireStudent(student);long guardian=repo.guardian(student);return commands.run("IDENTITY:"+Actors.current().identityId(),ack?"FAMILY_NOTICE_ACK":"FAMILY_NOTICE_READ",key,P.of("noticeId",id,"body",body),200,()->{
  access.requireStudent(student);Map<String,Object> notice=repo.notice(id,true);repo.target(id,student);if(!"PUBLISHED".equals(notice.get("status")))throw Problem.notFound("通知不存在或已撤回");if(ack&&(!Inputs.bool(body,"acknowledged",false)||!yes(notice.get("ack_required"))))throw Problem.bad("该通知需明确确认且acknowledged必须为true");Map<String,Object> p=P.of("notice",id,"student",student,"guardian",guardian);
  db().write("INSERT INTO family_notice_receipt(notice_id,student_id,guardian_id,created_at,updated_at) VALUES(#{p.notice},#{p.student},#{p.guardian},UTC_TIMESTAMP(3),UTC_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE receipt_id=receipt_id",p);
  db().write(ack?"UPDATE family_notice_receipt SET read_at=COALESCE(read_at,UTC_TIMESTAMP(3)),acknowledged_at=COALESCE(acknowledged_at,UTC_TIMESTAMP(3)),updated_at=UTC_TIMESTAMP(3) WHERE notice_id=#{p.notice} AND student_id=#{p.student} AND guardian_id=#{p.guardian}":"UPDATE family_notice_receipt SET read_at=COALESCE(read_at,UTC_TIMESTAMP(3)),updated_at=UTC_TIMESTAMP(3) WHERE notice_id=#{p.notice} AND student_id=#{p.student} AND guardian_id=#{p.guardian}",p);repo.audit(id,ack?"ACK":"READ",student,null,true);return db().required("SELECT notice_id,student_id,read_at,acknowledged_at FROM family_notice_receipt WHERE notice_id=#{p.notice} AND student_id=#{p.student} AND guardian_id=#{p.guardian}",p);});}
 public Map<String,Object> staffList(long after){Actors.current().require("family:notice:list");if(after<0)throw Problem.bad("分页游标无效");List<Map<String,Object>> result=new ArrayList<>();long cursor=after;for(var row:db().list("SELECT * FROM family_notice WHERE notice_id>#{p.after} AND (created_by_user_id=#{p.actor} OR #{p.all}=1) ORDER BY notice_id LIMIT 100",P.of("after",after,"actor",Actors.current().userId(),"all",school()?1:0))){cursor=n(row,"notice_id");try{staffScope(row);result.add(P.of("noticeId",Long.toString(cursor),"title",row.get("title"),"status",row.get("status"),"version",row.get("version"),"publishedAt",row.get("published_at")));}catch(Problem e){if(e.http()!=403&&e.http()!=404)throw e;}}return P.of("items",result,"scannedThroughId",Long.toString(cursor));}
 public Map<String,Object> staffDetail(long id){Actors.current().require("family:notice:read");Map<String,Object> row=repo.notice(id,false);staffScope(row);row.put("files",db().list("SELECT f.file_id,f.original_name,f.mime_type,f.byte_size FROM family_notice_file l JOIN sys_file f ON f.file_id=l.file_id WHERE l.notice_id=#{p.id} ORDER BY l.sort_order,f.file_id",P.of("id",id)));return P.of("notice",row);}
 public Map<String,Object> receipts(long id){
  Actors.current().require("family:notice:receipts");Map<String,Object> row=repo.notice(id,false);staffScope(row);List<Map<String,Object>> result=new ArrayList<>();
  for(var target:repo.recipients(id)){
   long student=n(target,"student_id");Map<String,Object> p=P.of("notice",id,"student",student);
   List<Map<String,Object>> guardians=db().list("SELECT g.guardian_id,g.guardian_name,r.read_at,r.acknowledged_at FROM edu_student_guardian l JOIN edu_guardian g ON g.guardian_id=l.guardian_id LEFT JOIN family_notice_receipt r ON r.guardian_id=g.guardian_id AND r.student_id=l.student_id AND r.notice_id=#{p.notice} WHERE l.student_id=#{p.student} AND l.status='VERIFIED' AND g.status='ACTIVE' ORDER BY g.guardian_id",p);
   for(var guardian:guardians)guardian.put("currentEffective",true);
   boolean confirmed=guardians.stream().anyMatch(x->x.get("acknowledged_at")!=null);
   List<Map<String,Object>> history=db().list("SELECT g.guardian_id,g.guardian_name,g.status AS guardian_status,l.status AS relation_status,r.read_at,r.acknowledged_at FROM family_notice_receipt r JOIN edu_guardian g ON g.guardian_id=r.guardian_id LEFT JOIN edu_student_guardian l ON l.student_id=r.student_id AND l.guardian_id=r.guardian_id WHERE r.notice_id=#{p.notice} AND r.student_id=#{p.student} AND NOT EXISTS(SELECT 1 FROM edu_student_guardian current_link JOIN edu_guardian current_guardian ON current_guardian.guardian_id=current_link.guardian_id WHERE current_link.student_id=r.student_id AND current_link.guardian_id=r.guardian_id AND current_link.status='VERIFIED' AND current_guardian.status='ACTIVE') ORDER BY g.guardian_id",p);
   for(var receipt:history)receipt.put("currentEffective",false);
   result.add(P.of("studentId",Long.toString(student),"confirmed",confirmed,"guardians",guardians,"historicalReceipts",history));
  }
  return P.of("noticeId",Long.toString(id),"students",result);
 }
}
```

```java
package com.doupi.planref.family;
import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1")
public class FamilyNoticeController {
 private final FamilyNoticeService service;public FamilyNoticeController(FamilyNoticeService service){this.service=service;}
 @GetMapping("/parent/notices")public ResponseEntity<?> list(@RequestParam long studentId,@RequestParam(defaultValue="0")long afterId){return ApiReply.of(service.list(studentId,afterId),200);}
 @GetMapping("/parent/notices/{id}")public ResponseEntity<?> detail(@PathVariable long id,@RequestParam long studentId){return ApiReply.of(service.detail(id,studentId),200);}
 @PostMapping("/parent/notices/{id}/read")public ResponseEntity<?> read(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.act(id,key,b,false),200);}
 @PostMapping("/parent/notices/{id}/ack")public ResponseEntity<?> ack(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.act(id,key,b,true),200);}
 @GetMapping("/office/family-notices")public ResponseEntity<?> staffList(@RequestParam(defaultValue="0")long afterId){return ApiReply.of(service.staffList(afterId),200);}
 @GetMapping("/office/family-notices/{id}")public ResponseEntity<?> staffDetail(@PathVariable long id){return ApiReply.of(service.staffDetail(id),200);}
 @PostMapping("/office/family-notices")public ResponseEntity<?> create(@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.save(0,key,b),201);}
 @PutMapping("/office/family-notices/{id}")public ResponseEntity<?> update(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.save(id,key,b),200);}
 @PostMapping("/office/family-notices/{id}/publish")public ResponseEntity<?> publish(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.publish(id,key,b,false),200);}
 @PostMapping("/office/family-notices/{id}/withdraw")public ResponseEntity<?> withdraw(@PathVariable long id,@RequestHeader("Idempotency-Key")String key,@RequestBody Map<String,Object>b){return ApiReply.of(service.publish(id,key,b,true),200);}
 @GetMapping("/office/family-notices/{id}/receipts")public ResponseEntity<?> receipts(@PathVariable long id){return ApiReply.of(service.receipts(id),200);}
}
```

```java
package com.doupi.planref.family;
import com.doupi.planref.*;
import java.nio.file.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
@Service
public class FamilyNoticeFileService {
 private final FamilyNoticeService notices;private final FamilyNoticeRepository repo;private final Path root;
 public FamilyNoticeFileService(FamilyNoticeService notices,FamilyNoticeRepository repo,@Value("${plan.file-root}")String path){this.notices=notices;this.repo=repo;this.root=Path.of(path).toAbsolutePath().normalize();}
 public Download download(long id,long fileId,long studentId){
  notices.detail(id,studentId);var f=repo.attachment(id,fileId);
  String key=f.get("object_key").toString();if(!key.matches("[a-f0-9-]{36}"))throw Problem.notFound("文件不可用");Path path=root.resolve(key).normalize();if(!path.startsWith(root)||!Files.isRegularFile(path,LinkOption.NOFOLLOW_LINKS))throw new Problem(503,"FILE_UNAVAILABLE","附件暂不可用");
  return new Download(path,f.get("original_name").toString(),f.get("mime_type").toString());
 }
 public record Download(Path path,String name,String mime){}
}
```

```java
package com.doupi.planref.family;
import java.nio.charset.StandardCharsets;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/parent/notices")
public class FamilyNoticeFileController {
 private final FamilyNoticeFileService service;
 public FamilyNoticeFileController(FamilyNoticeFileService service){this.service=service;}
 @GetMapping("/{id}/files/{fileId}")public ResponseEntity<FileSystemResource> content(@PathVariable long id,@PathVariable long fileId,@RequestParam long studentId){
  var f=service.download(id,fileId,studentId);
  return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(f.name(),StandardCharsets.UTF_8).build().toString()).contentType(MediaType.parseMediaType(f.mime())).body(new FileSystemResource(f.path()));
 }
}
```

JSON成功响应和由全局异常处理器产生的MVC错误响应，都由以下URI限定Advice加`no-store`；它不依赖Controller所在包，避免全局ApiErrors的返回方法绕过限定包Advice。附件Controller本身也显式写入no-store。只在对应家校通知路径生效，不更改公开门户缓存策略。未来同名类独立文件，仅在Markdown展示。

```java
package com.doupi.planref.family;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;
@RestControllerAdvice
public class FamilyNoticeResponseAdvice implements ResponseBodyAdvice<Object> {
 @Override public boolean supports(MethodParameter method,Class<? extends HttpMessageConverter<?>> converter){return true;}
 @Override public Object beforeBodyWrite(Object body,MethodParameter method,MediaType mediaType,Class<? extends HttpMessageConverter<?>> converter,ServerHttpRequest request,ServerHttpResponse response){
  String path=request.getURI().getPath();
  for(String prefix:new String[]{"/api/v1/parent/notices","/api/v1/office/family-notices"})if(path.equals(prefix)||path.startsWith(prefix+"/")){response.getHeaders().setCacheControl("no-store");response.getHeaders().set("Pragma","no-cache");response.getHeaders().setExpires(0);break;}
  return body;
 }
}
```

## 6. 边界与异常场景处理

400结构或必填头错误；422空范围、非法类型、重复附件、非法文本；403非负责班级、无全校发布权限、他人上传附件；404不可见目标；409版本/发布状态/幂等冲突；503存储或DB不可用。发布失败不留下部分学生收件，撤回不删回执，外部订阅不可用不伪报送达。

验证用例：同键同正文重放、同键换孩子409；学生转班不重算旧通知范围；关系撤销不复用缓存；两家长分别读/确认且主口径至少一人；撤回后正文和附件都不可读；发布到多个班其中一班越权整事务失败。新代码仅文档，以上用例待实际开发时执行，既有参考工程通过记录不能证明本模块已实现。

- 待开发验收：后台当前监护人无确认、只有已撤销家长旧ACK时，confirmed=false；旧记录在historicalReceipts且currentEffective=false，不删除。成功与MVC错误JSON及私有附件均返回no-store。
