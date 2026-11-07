# MINI-07 家长关联与孩子切换

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#mini-07)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，3 人日，依赖 MINI-06、MINI-02；计划未实现、未运行。** 只承担微信身份的家长激活、有效孩子读取与切换基础。正式学生和学校核实关系由 ADM-19 维护，不把访校预约当学生档案。员工微信继续保持原 STAFF/VISITOR kind，按 identity_id 另行取得家长资格。一微信多孩子、一孩多家长；默认不自动选孩子，单孩子可由 UI 选中但每次请求仍授权。无关联显示联系班主任提示，无默认档案。共享契约见 `../05-parent-specs/01-学生家长与成绩契约.md`。

未来实现路径：`backend/src/main/java/com/doupi/planref/parent/{ParentAccess,ParentCommands,ParentController,ParentService,ParentRepository,WechatPhone}.java`，`miniapp/pages/parent/children.{js,wxml,wxss,json}` 与 `miniapp/services/parent.js`；此处仅路径规划，未创建源码或 JSON。

- [ ] D1：实现共享授权、有效孩子列表、指定孩子读取；验收员工/访客同一规则、停用与撤销实时失效。
- [ ] D2：实现指定 identity 的一次限时邀请消费、真实微信手机号校验与人工核实回退；验收无手输号码授权、并发重复消费不产生第二绑定。
- [ ] D3：孩子切换页面与真机隐私拒绝/超时联调；验收一微信两孩、一孩两家长、换微信不得抢已绑身份、跨孩404、日志无敏感正文。

## 2. 接口设计清单

参数除另注外是 JSON body；ID 均十进制 string(1..19)，服务端转正 long。请求头 Idempotency-Key:string(8..64)/写接口必填/一次用户意图的稳定键，Authorization/全部必填/微信认证会话。响应沿用 code/msg/traceId/replayed/data。

| 名称 | 方法 | 绝对路径 | 完整参数类型、必填及含义 | 返回字段类型及含义 | 权限 |
|---|---|---|---|---|---|
| 孩子列表 | GET | `/api/v1/parent/children` | 无业务参数 | items:array；每项student_id:string学生ID、student_no:string学号、student_name:string姓名、campus_id:string现校区、class_id:string现班级、class_name:string班名；identityId:string本人外部身份 | 已登录identity；只返回有效关系 |
| 切换/读取孩子 | GET | `/api/v1/parent/children/{studentId}` | path.studentId:string/是/所选孩子 | student_id、student_no、student_name、campus_id、class_id、class_name:string，同上 | ParentAccess.requireStudent |
| 激活学校关联或消费补漏邀请 | POST | `/api/v1/parent/guardian-activations` | 主路径phoneCode:string(1..128)/是/微信真实手机号code，invitationId与token缺省；邀请路径invitationId:string/是、token:string(64)/是/HMAC凭据、phoneCode:string(1..128)/WECHAT_PHONE模式必填、MANUAL缺省；不接受phone/guardianId/actorId | bindingId:string绑定ID；status:string=ACTIVE；version:integer绑定版本；不返回手机号或邀请token | 主路径手机号匹配学校已核实关系；邀请identity必须本人 |

## 3. 数据流转细节

1. GET children：identityId 仅取 Actors，不读请求角色；ParentAccess.studentIds 连查 student/guardian/link/identity 四表，要求 ACTIVE/VERIFIED/ACTIVE/ACTIVE；Repository 再按同一授权 SQL 读取最小学生字段，服务端字符串化BIGINT；只读事务一致视图，不缓存资格。GET 指定孩子相同，越权/失效统一404。UI 存 studentId 只作选择，每次后端重新授权；401退出会话，404清除选择。
2. activation：仅接受声明字段；主路径只传phoneCode，由后端换真实手机号精确定位学校已核实的ACTIVE guardian、有效孩子关系，锁家长后检查未被别的微信绑定再激活，不要求预先邀请。补漏/人工回退路径用 invitationId 定位邀请，target_identity_id 必须本人。ParentCommands 的固定 `GUARDIAN_ACTIVATE` 摘要含 invitationId、token、phoneCode，先检查幂等重放，再锁 invitation、guardian、现绑定。过期、已撤销、已用均409；重新发邀请不自动撤销仍有效绑定。WECHAT_PHONE 由 WechatPhone 在服务端交换真实号码，比对 guardian.phone_e164；拒绝 code 失败、国家码非86、号码不一致，且不持久化 code。MANUAL 必须存在学校 verified_by、evidence_ref，不要求微信能力，不允许客户端自选模式。校方已核实的至少一个 ACTIVE 学生 VERIFIED 关系存在才激活。检查 guardian 与 identity 任何一方是否已有别的 ACTIVE 绑定，有则409，须学校撤销后重发。插 identity binding、更新邀请 CONSUMED/version、写去敏审计与幂等结果同事务；唯一键阻止竞态，失败全部回滚。网络超时不占成功键，UI 同键重试。
3. 邀请仅由 ADM-19 生成，24小时、指定identity、一次性；密钥 `plan.parent.invite-secret` 至少32字节，由环境提供不入库/日志；令牌 HMAC-SHA256(id:identity:expires_at) 64位十六进制，恒时比较。换密钥前等所有邀请到期。GET结果 `Cache-Control:no-store`，HTTP日志屏蔽正文与查询凭据。

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

## 5. Controller → Service → Repository 完整骨架

共享 ParentAccess、ParentCommands 的完整源码在公共契约第2、3节，必须连同下列类实现；不依赖任何尚不存在的隐式方法。微信手机号适配使用环境 app-id/secret，发布前核对微信官方权限与接口；不可用时仅学校人工核实路径可用，禁止模拟成功。前端点击切换调用 GET 指定孩子，成功才替换本地 selectedStudentId；拒绝隐私/手机能力不自动产生关系。

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;
import java.util.*;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/v1/parent")
public class ParentController {
    private final ParentService service;
    public ParentController(ParentService service){this.service=service;}
    @GetMapping("/children") public Object children(){return ApiReply.of(service.children(),200);}
    @GetMapping("/children/{studentId}") public Object child(@PathVariable long studentId){return ApiReply.of(service.child(studentId),200);}
    @PostMapping("/guardian-activations") public Object activate(@RequestBody Map<String,Object> body,@RequestHeader("Idempotency-Key") String key){return ApiReply.of(service.activate(body,key),200);}
}
```

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;
import java.util.*;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
public class ParentService {
    private final ParentRepository repo; private final ParentAccess access; private final ParentCommands commands; private final WechatPhone phone; private final String secret;
    public ParentService(ParentRepository repo,ParentAccess access,ParentCommands commands,WechatPhone phone,@Value("${plan.parent.invite-secret}") String secret){
        if(secret.getBytes(StandardCharsets.UTF_8).length<32)throw new IllegalStateException("invite secret too short");
        this.repo=repo;this.access=access;this.commands=commands;this.phone=phone;this.secret=secret;
    }
    @Transactional(readOnly=true) public Map<String,Object> children(){return P.of("identityId",Long.toString(Actors.current().identityId()),"items",access.studentIds().stream().map(access::student).toList());}
    @Transactional(readOnly=true) public Map<String,Object> child(long id){return access.student(id);}
    public String token(Map<String,Object> invitation){
        try{Mac mac=Mac.getInstance("HmacSHA256");mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8),"HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((invitation.get("invitation_id")+":"+invitation.get("target_identity_id")+":"+invitation.get("expires_at")).getBytes(StandardCharsets.UTF_8)));
        }catch(java.security.GeneralSecurityException e){throw new IllegalStateException(e);}
    }
    @Transactional public Map<String,Object> activate(Map<String,Object> body,String key){
        if(!Set.of("invitationId","token","phoneCode").containsAll(body.keySet()))throw Problem.bad("包含不允许字段");
        if(Actors.current().identityId()<=0)throw new Problem(401,"IDENTITY_REQUIRED","请先微信登录");
        return commands.run("GUARDIAN_ACTIVATE",key,body,()->{
            long actor=Actors.current().identityId();
            if(!body.containsKey("invitationId")){
                if(body.containsKey("token"))throw Problem.bad("缺少邀请ID");
                String real=phone.exchange(Inputs.text(body,"phoneCode",1,128));
                Map<String,Object> g=repo.byPhone(real);long guardian=Inputs.number(g.get("guardian_id"));
                if(!"ACTIVE".equals(g.get("status"))||!repo.hasChild(guardian))throw Problem.notFound("请联系班主任核实关联");
                List<Map<String,Object>> old=repo.activeBindings(guardian,actor);
                if(!old.isEmpty())throw Problem.conflict("已有绑定，请读取孩子列表或联系学校");
                long binding=repo.bind(guardian,actor,"WECHAT_PHONE");
                repo.audit(actor,"GUARDIAN_ACTIVATE","BINDING",binding,0,0,"WECHAT_PHONE",Json.hash(body));
                return P.of("bindingId",Long.toString(binding),"status","ACTIVE","version",0);
            }
            long id=Inputs.id(body,"invitationId");String supplied=Inputs.text(body,"token",64,64);
            Map<String,Object> i=repo.invitation(id);
            if(Inputs.number(i.get("target_identity_id"))!=actor)throw Problem.notFound("邀请不可用");
            if(!"ISSUED".equals(i.get("status"))||Inputs.number(i.get("expired"))==1)throw Problem.conflict("邀请过期或已使用");
            if(!MessageDigest.isEqual(token(i).getBytes(StandardCharsets.US_ASCII),supplied.getBytes(StandardCharsets.US_ASCII)))throw Problem.forbidden("邀请凭据错误");
            Map<String,Object> g=repo.guardian(Inputs.number(i.get("guardian_id")));
            if(!"ACTIVE".equals(g.get("status"))||!repo.hasChild(Inputs.number(g.get("guardian_id"))))throw Problem.conflict("学校关联未生效");
            if(!repo.activeBindings(Inputs.number(g.get("guardian_id")),actor).isEmpty())throw Problem.conflict("已有绑定，请联系学校核实");
            String method=i.get("verification_method").toString();
            if(method.equals("WECHAT_PHONE")){
                String real=phone.exchange(Inputs.text(body,"phoneCode",1,128));
                if(!real.equals(g.get("phone_e164")))throw Problem.forbidden("手机号与学校档案不符");
            }else if(method.equals("MANUAL")){
                if(body.containsKey("phoneCode")||i.get("verified_by")==null||i.get("evidence_ref").toString().isBlank())throw Problem.bad("人工核实邀请异常");
            }else throw Problem.conflict("邀请模式不可用");
            long binding=repo.bind(Inputs.number(g.get("guardian_id")),actor,method);
            repo.consume(id,binding,actor);repo.audit(actor,"GUARDIAN_ACTIVATE","BINDING",binding,0,0,i.get("evidence_ref").toString(),Json.hash(body));
            return P.of("bindingId",Long.toString(binding),"status","ACTIVE","version",0);
        });
    }
}
```

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;
@Repository
public class ParentRepository {
    private final Db db; public ParentRepository(Db db){this.db=db;}
    public Map<String,Object> invitation(long id){return db.required("SELECT *,expires_at<=UTC_TIMESTAMP(3) AS expired FROM edu_guardian_invitation WHERE invitation_id=#{p.id} FOR UPDATE",P.of("id",id));}
    public Map<String,Object> guardian(long id){return db.required("SELECT * FROM edu_guardian WHERE guardian_id=#{p.id} FOR UPDATE",P.of("id",id));}
    public Map<String,Object> byPhone(String phone){return db.required("SELECT * FROM edu_guardian WHERE phone_e164=#{p.phone} FOR UPDATE",P.of("phone",phone));}
    public boolean hasChild(long id){return !db.one("SELECT l.link_id FROM edu_student_guardian l JOIN edu_student s ON s.student_id=l.student_id WHERE l.guardian_id=#{p.id} AND l.status='VERIFIED' AND s.status='ACTIVE' LIMIT 1",P.of("id",id)).isEmpty();}
    public List<Map<String,Object>> activeBindings(long guardian,long identity){return db.list("SELECT identity_binding_id FROM edu_guardian_identity WHERE status='ACTIVE' AND (guardian_id=#{p.g} OR identity_id=#{p.i}) FOR UPDATE",P.of("g",guardian,"i",identity));}
    public long bind(long guardian,long identity,String method){return db.insert("INSERT INTO edu_guardian_identity(guardian_id,identity_id,status,phone_verified_at,verification_method,version,created_at,updated_at,created_by,updated_by) VALUES(#{p.g},#{p.i},'ACTIVE',UTC_TIMESTAMP(3),#{p.m},0,UTC_TIMESTAMP(3),UTC_TIMESTAMP(3),#{p.i},#{p.i})",P.of("g",guardian,"i",identity,"m",method));}
    public void consume(long invitation,long binding,long identity){db.write("UPDATE edu_guardian_invitation SET status='CONSUMED',consumed_binding_id=#{p.b},version=version+1,updated_at=UTC_TIMESTAMP(3),updated_by=#{p.i} WHERE invitation_id=#{p.id}",P.of("id",invitation,"b",binding,"i",identity));}
    public void audit(long actor,String action,String type,long id,long before,long after,String reason,String hash){Actor current=Actors.current();boolean staff="STAFF".equals(current.kind());db.insert("INSERT INTO edu_parent_audit(actor_type,actor_id,action_code,target_type,target_id,before_version,after_version,reason_ref,payload_hash,created_at) VALUES(#{p.at},#{p.a},#{p.action},#{p.t},#{p.id},#{p.b},#{p.n},#{p.reason},#{p.hash},UTC_TIMESTAMP(3))",P.of("at",staff?"STAFF":"EXTERNAL","a",staff?current.userId():current.identityId(),"action",action,"t",type,"id",id,"b",before,"n",after,"reason",reason,"hash",hash));}
}
```

```java
package com.doupi.planref.parent;
import com.doupi.planref.*;
import java.net.*;
import java.net.http.*;
import java.time.Duration;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
@Component
public class WechatPhone {
    private final String app,secret; private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    public WechatPhone(@Value("${plan.wechat.app-id}") String app,@Value("${plan.wechat.secret}") String secret){this.app=app;this.secret=secret;}
    private String enc(String value){return URLEncoder.encode(value,StandardCharsets.UTF_8);}
    private Map<String,Object> send(HttpRequest request)throws java.io.IOException,InterruptedException{
        HttpResponse<String> r=http.send(request,HttpResponse.BodyHandlers.ofString());
        if(r.statusCode()!=200)throw new Problem(502,"WECHAT_UNAVAILABLE","微信手机号服务暂不可用");
        Map<String,Object> m=Json.readMap(r.body());
        if(m.containsKey("errcode")&&Inputs.number(m.get("errcode"))!=0)throw new Problem(422,"PHONE_CODE_INVALID","手机号凭据无效，请重新授权或联系学校");return m;
    }
    public String exchange(String code){
        try{
            Map<String,Object> token=send(HttpRequest.newBuilder(URI.create("https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid="+enc(app)+"&secret="+enc(secret))).timeout(Duration.ofSeconds(8)).GET().build());
            String access=Inputs.text(token,"access_token",1,512);
            Map<String,Object> result=send(HttpRequest.newBuilder(URI.create("https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token="+enc(access))).timeout(Duration.ofSeconds(8)).header("Content-Type","application/json").POST(HttpRequest.BodyPublishers.ofString(Json.write(P.of("code",code)))).build());
            Map<String,Object> p=Inputs.map(result.get("phone_info"));String number=Inputs.text(p,"purePhoneNumber",11,11);
            if(!"86".equals(String.valueOf(p.get("countryCode")))||!number.matches("1[3-9][0-9]{9}"))throw Problem.forbidden("仅支持已核实的大陆手机号");return "+86"+number;
        }catch(InterruptedException e){Thread.currentThread().interrupt();throw new Problem(503,"WECHAT_INTERRUPTED","请稍后重试");}
        catch(java.io.IOException e){throw new Problem(502,"WECHAT_UNAVAILABLE","请稍后重试或联系学校");}
    }
}
```

## 6. 边界与异常场景处理

401登录失效、404跨孩/跨邀请、409版本或已有绑定/过期/已用、422号码校验失败、502微信不可用。公共异常层输出traceId和固定code，唯一键竞态转409，死锁/锁超时可同键重试，不返回数据库正文。学校手机号变更必须先撤销旧身份绑定和旧邀请；家长无自助抢绑接口。学校人工回退必须有指定微信、核实人和依据，界面明确交由学校核实，不能由输入手机号替代微信能力。验收必须覆盖0孩子、多个孩子、同孩两个家长、员工兼家长、撤销后旧页面再次访问、停用学生、邀请过期边界、相同键异正文、成功后旧版本重放、并发抢同一身份。代码与DDL均尚未执行，本计划不声称已通过测试。
