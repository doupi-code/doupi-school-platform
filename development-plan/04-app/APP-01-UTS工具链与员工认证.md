# APP-01 UTS工具链与员工认证

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#app-01)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

优先级：P1；工期：3个单人工作日；依赖：WEB-03。按1名Java开发+AI辅助估算，工期包括页面、接口、自测和联调。

包含uni-app x UTS/uvue工程收敛、员工登录与权限刷新、退出、网络封装及目标平台基线。使用现有reactive store/uView Ultra，不引入Vuex或并存JS/UTS请求入口。Android先作为本次排期目标；iOS准备、证书和额外平台验收单列，不假设Java开发机器可完成双平台原生发布。

- [ ] 第1日：在`doupi-app/manifest.json,main.uts,vite.config.js,package.json`记录可工作的HBuilderX版本和Android编译模式，做登录最小纵向切片；确认同名文件引用后才移除无引用JS/Vuex旧入口。
- [ ] 第2日：`utils/request.uts,utils/auth.uts,store/index.uts,api/login.uts`接入统一Bearer、HTTP状态和权限刷新；会话仅员工登录。
- [ ] 第3日：`pages/login/login.uvue,pages/mine/index.uvue`联调登录/停用/角色变化/退出，Android打包及真机截图。

验收：空权限/无待办显示真实空状态；失效令牌不能复用；无本地管理员/手机号自动映射；记录工具链与构建命令/GUI步骤和产物。

## 2. 接口设计清单

统一外层`code:int,msg:string,traceId:string,replayed:boolean,data:object`；下表为data。ID为十进制字符串，数据库BIGINT；版本为非负整数。业务写命令头`Idempotency-Key:string(1..64)`必填；私有上传和ExternalCommands动作另限8..64个字母数字或_.:-字符；登录、分析和文本候选不要求该头；JWT认证派生操作者和部门。接口不得接受客户端权限、角色和操作者作为授权依据。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 员工登录 | POST | `/api/v1/auth/login` | username/string/是；password/string/是；不接受role | token/string；kind/string=STAFF；userId,identityId/string | 匿名，服务端限流 |
| 权限刷新 | GET | `/api/v1/auth/me` | Authorization/Bearer/是 | userId,deptId,identityId/string；kind/string；permissions/string[]；scopeDeptIds/string[]；bindingStatus/string或null | 员工有效会话 |
| 退出 | POST | `/api/v1/auth/logout` | Authorization/Bearer/是；无body | revoked/boolean | 当前会话 |

## 3. 数据流转细节

所有移动写动作使用同一后端Controller→Service→Repository，不新建App专用库存/事项表。Bearer由服务端生成，clientSource=STAFF_APP仅审计。App不接收和保存学校secret；列表/权限以服务端返回为准。网络超时先展示“结果待确认”，原CommandTicket重发，禁止自动改变expectedVersion或生成新键。

1. 登录页输入username/password→AuthService长度与BCrypt校验→`sys_user.user_id/password/status/del_flag/auth_version/dept_id`及role/menu/dept关联→JWT及Redis jti→仅kind=STAFF才写App员工token。密码不落本地业务缓存。
2. 每次页面唤醒拉me；SessionTokens检查签名/期限/Redis及数据库状态与范围，写reactive store的本人ID、权限和范围，不把本地“管理员”常量当事实。
3. 退出先请求服务端删除Redis jti，再清本地token/store/私有预览。网络失败可清本地，但提示服务端撤销未确认，不伪报。
4. 只读接口不写业务表；登录会话无办公事务。所有新时间UTC显示上海时区；所有ID保持string进入路径/JSON，禁止Number转换。原生API类型与平台能力依据[uni-app x官方文档](https://doc.dcloud.net.cn/uni-app-x/)。

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

## 5. 代码实现骨架

命名采用Java驼峰、类PascalCase、SQL snake_case和REST资源路径。Controller负责HTTP适配，Service负责校验、权限、事务与业务，Repository经MyBatis参数绑定访问数据库；公共ApiErrors/SecurityConfig输出脱敏异常和traceId日志。公共组件定义及运行依赖见[公共契约与内嵌实现](../00-shared/公共契约.md)。



**backend/src/main/java/com/doupi/planref/auth/AuthController.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AuthController {
    private final AuthService service;
    public AuthController(AuthService service) {this.service=service;}
    @PostMapping("/auth/login") public ResponseEntity<Map<String,Object>> login(@RequestBody Map<String,Object> body) {return ApiReply.of(service.password(body),200);}
    @PostMapping("/auth/visitor") public ResponseEntity<Map<String,Object>> visitor() {return ApiReply.of(service.visitor(),201);}
    @PostMapping("/auth/wechat") public ResponseEntity<Map<String,Object>> wechat(@RequestBody Map<String,Object> body) {return ApiReply.of(service.wechat(body),200);}
    @GetMapping("/auth/me") public ResponseEntity<Map<String,Object>> me() {return ApiReply.of(service.me(),200);}
    @PostMapping("/auth/logout") public ResponseEntity<Map<String,Object>> logout(@RequestHeader("Authorization") String token) {return ApiReply.of(service.logout(token),200);}
    @PostMapping("/auth/employee-bindings") public ResponseEntity<Map<String,Object>> binding(@RequestBody Map<String,Object> body,@RequestHeader("Idempotency-Key") String key) {return ApiReply.of(service.applyBinding(body,key),201);}
    @PostMapping("/staff/employee-bindings/{id}/review") public ResponseEntity<Map<String,Object>> approve(@PathVariable long id,@RequestBody Map<String,Object> body,@RequestHeader("Idempotency-Key") String key) {return ApiReply.of(service.approveBinding(id,body,key),200);}
}
```

**backend/src/main/java/com/doupi/planref/auth/AuthService.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.net.*;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final Db db; private final AuthRepository repo; private final SessionTokens sessions; private final ExternalCommands commands;
    private final String appId,secret;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    public AuthService(Db db,AuthRepository repo,SessionTokens sessions,ExternalCommands commands,
        @Value("${plan.wechat.app-id:}") String appId,@Value("${plan.wechat.secret:}") String secret) {
        this.db=db;this.repo=repo;this.sessions=sessions;this.commands=commands;this.appId=appId;this.secret=secret;
    }
    public Map<String,Object> password(Map<String,Object> b) {
        String name=Inputs.text(b,"username",1,30),password=Inputs.text(b,"password",8,128);
        Map<String,Object> u=repo.username(name);
        boolean matches=false;
        if(!u.isEmpty()) try { matches=new BCryptPasswordEncoder().matches(password,String.valueOf(u.get("password"))); } catch(IllegalArgumentException ignored) { matches=false; }
        if(!matches) throw new Problem(401,"LOGIN_FAILED","Invalid account or password");
        return issued(repo.staff(Inputs.number(u.get("user_id")),0));
    }
    @Transactional
    public Map<String,Object> visitor() {
        long id=repo.external("WEB","PUBLIC_WEB",UUID.randomUUID().toString());
        return issued(visitorActor(id));
    }
    @Transactional
    public Map<String,Object> wechat(Map<String,Object> b) {
        String code=Inputs.text(b,"code",1,128);
        if(appId.isBlank()||secret.isBlank()) throw new Problem(503,"WX_NOT_CONFIGURED","WeChat identity exchange is not configured");
        Map<String,Object> wx;
        try {
            String url="https://api.weixin.qq.com/sns/jscode2session?appid="+enc(appId)+"&secret="+enc(secret)+"&js_code="+enc(code)+"&grant_type=authorization_code";
            HttpRequest req=HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(8)).GET().build();
            HttpResponse<String> res=http.send(req,HttpResponse.BodyHandlers.ofString());
            if(res.statusCode()!=200) throw new Problem(503,"WX_UNAVAILABLE","WeChat exchange unavailable");
            wx=Json.readMap(res.body());
        } catch(InterruptedException ex) { Thread.currentThread().interrupt();throw new Problem(503,"WX_UNAVAILABLE","WeChat exchange interrupted"); }
          catch(java.io.IOException ex) { throw new Problem(503,"WX_UNAVAILABLE","WeChat exchange unavailable"); }
          catch(Problem ex) { if(ex.http()==503) throw ex;throw new Problem(503,"WX_INVALID_RESPONSE","WeChat returned invalid identity data"); }
        if(wx.get("errcode")!=null) {
            long error;try {error=Inputs.number(wx.get("errcode"));}catch(Problem ex){throw new Problem(503,"WX_INVALID_RESPONSE","WeChat returned invalid identity data");}
            if(error!=0) throw new Problem(401,"WX_CODE_REJECTED","WeChat login code is invalid or expired");
        }
        String openid=wx.get("openid")==null?"":wx.get("openid").toString();
        if(openid.isBlank()||openid.length()>128) throw new Problem(503,"WX_INVALID_RESPONSE","WeChat identity was not returned");
        long id=repo.external("WECHAT",appId,openid); Map<String,Object> identity=repo.identity(id,false);
        Actor actor="VERIFIED".equals(identity.get("link_status")) && identity.get("user_id")!=null
            ?repo.staff(Inputs.number(identity.get("user_id")),id):visitorActor(id);
        return issued(actor);
    }
    private static String enc(String s) {return URLEncoder.encode(s,StandardCharsets.UTF_8);}
    private Actor visitorActor(long id) {return new Actor(0,0,id,"VISITOR",Set.of(),Set.of(),false);}
    private Map<String,Object> issued(Actor a) { return P.of("token",sessions.issue(a),"kind",a.kind(),"userId",Long.toString(a.userId()),"identityId",Long.toString(a.identityId())); }
    public Map<String,Object> me() {
        Actor a=Actors.current();
        Map<String,Object> identity=a.identityId()>0?repo.identity(a.identityId(),false):Map.of();
        return P.of("userId",Long.toString(a.userId()),"identityId",Long.toString(a.identityId()),"deptId",Long.toString(a.deptId()),"kind",a.kind(),"permissions",a.permissions(),"scopeDeptIds",a.scopeDeptIds().stream().map(String::valueOf).toList(),"bindingStatus",identity.get("link_status"));
    }
    public Map<String,Object> logout(String token) {
        sessions.revoke(token.startsWith("Bearer ")?token.substring(7):token);
        return P.of("revoked",true);
    }
    public Map<String,Object> applyBinding(Map<String,Object> b,String key) {
        Actor a=Actors.current(); if(a.identityId()<=0) throw Problem.forbidden("External identity required");
        String username=Inputs.text(b,"username",1,30),reason=Inputs.text(b,"reason",5,300);
        return commands.run("IDENTITY:"+a.identityId(),"BINDING_APPLY",key,b,201,()->{
            Map<String,Object> identity=repo.identity(a.identityId(),true);
            if(!"WECHAT".equals(identity.get("provider"))) throw Problem.forbidden("WeChat identity required");
            if("VERIFIED".equals(identity.get("link_status"))) throw Problem.conflict("Identity already verified");
            Map<String,Object> u=repo.username(username); if(u.isEmpty()) throw Problem.notFound("School account not found");
            long staffId=Inputs.number(u.get("user_id"));repo.staff(staffId,0);
            if(!db.one("SELECT binding_request_id FROM auth_binding_request WHERE identity_id=#{p.id} AND status='PENDING'",P.of("id",a.identityId())).isEmpty()) throw Problem.conflict("A binding request is already pending");
            long id=db.insert("INSERT INTO auth_binding_request(identity_id,staff_user_id,status,reason,version,created_at) "
                + "VALUES(#{p.identity},#{p.user},'PENDING',#{p.reason},0,CURRENT_TIMESTAMP(3))",P.of("identity",a.identityId(),"user",staffId,"reason",reason));
            db.write("UPDATE sys_external_identity SET link_status='PENDING' WHERE identity_id=#{p.id}",P.of("id",a.identityId()));
            return P.of("bindingRequestId",Long.toString(id),"status","PENDING","version",0);
        });
    }
    public Map<String,Object> approveBinding(long id,Map<String,Object> b,String key) {
        Actor a=Actors.current();a.requireStaff();a.require("identity:binding:approve");
        return commands.run("STAFF:"+a.userId(),"BINDING_APPROVE",key,P.of("bindingRequestId",id,"body",b),200,()->{
            Map<String,Object> row=db.required("SELECT * FROM auth_binding_request WHERE binding_request_id=#{p.id} FOR UPDATE",P.of("id",id));
            long version=Inputs.nonNegative(b,"expectedVersion"),target=Inputs.number(row.get("staff_user_id"));
            if(version!=Inputs.number(row.get("version"))) throw Problem.conflict("Binding version changed");
            if(!"PENDING".equals(row.get("status"))) throw Problem.conflict("Binding is no longer pending");
            if(a.userId()==target) throw Problem.forbidden("Binding must be verified by a different school officer");
            Actor targetActor=repo.staff(target,0);
            if(!a.allData()&&!a.scopeDeptIds().contains(targetActor.deptId())) throw Problem.forbidden("Account outside binding approval scope");
            String decision=Inputs.text(b,"decision",6,8),remark=Inputs.text(b,"remark",1,300);
            if(!Set.of("APPROVE","REJECT").contains(decision)) throw Problem.bad("Invalid binding decision");
            long identity=Inputs.number(row.get("identity_id"));Map<String,Object> external=repo.identity(identity,true);
            if(!"PENDING".equals(external.get("link_status"))) throw Problem.conflict("External identity binding state changed");
            String status=decision.equals("APPROVE")?"VERIFIED":"REJECTED";
            db.write("UPDATE auth_binding_request SET status=#{p.status},reviewed_by=#{p.by},review_remark=#{p.remark},reviewed_at=CURRENT_TIMESTAMP(3),version=version+1 WHERE binding_request_id=#{p.id}",P.of("status",status,"by",a.userId(),"remark",remark,"id",id));
            db.write("UPDATE sys_external_identity SET user_id=#{p.user},link_status=#{p.status},verified_by=#{p.by},verified_at=CURRENT_TIMESTAMP(3) WHERE identity_id=#{p.id}",P.of("user",decision.equals("APPROVE")?target:null,"status",decision.equals("APPROVE")?"VERIFIED":"VISITOR","by",a.userId(),"id",identity));
            return P.of("bindingRequestId",Long.toString(id),"status",status,"version",version+1,"loginAgainRequired",true);
        });
    }
}
```

**backend/src/main/java/com/doupi/planref/auth/AuthRepository.java**

```java
package com.doupi.planref.auth;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class AuthRepository {
    private final Db db;
    public AuthRepository(Db db) { this.db=db; }
    public Map<String,Object> username(String name) {
        return db.one("SELECT user_id,dept_id,password,status,del_flag FROM sys_user WHERE user_name=#{p.name}",P.of("name",name));
    }
    public Map<String,Object> identity(long id, boolean lock) {
        return db.required("SELECT * FROM sys_external_identity WHERE identity_id=#{p.id}"+(lock?" FOR UPDATE":""),P.of("id",id));
    }
    public long external(String provider,String appId,String subject) {
        Map<String,Object> p=P.of("provider",provider,"app",appId,"subject",subject);
        db.write("INSERT INTO sys_external_identity(provider,app_id,subject_id,link_status,created_at) "
            + "VALUES(#{p.provider},#{p.app},#{p.subject},'VISITOR',CURRENT_TIMESTAMP(3)) "
            + "ON DUPLICATE KEY UPDATE identity_id=identity_id",p);
        return Inputs.number(db.required("SELECT identity_id FROM sys_external_identity WHERE provider=#{p.provider} "
            + "AND app_id=#{p.app} AND subject_id=#{p.subject}",p).get("identity_id"));
    }
    public Actor staff(long userId,long identityId) {
        Map<String,Object> u=db.required("SELECT user_id,dept_id,status,del_flag FROM sys_user WHERE user_id=#{p.id}",P.of("id",userId));
        if (!"0".equals(String.valueOf(u.get("status"))) || !"0".equals(String.valueOf(u.get("del_flag"))))
            throw new Problem(401,"ACCOUNT_DISABLED","Account is disabled");
        long dept=u.get("dept_id")==null?0:Inputs.number(u.get("dept_id"));
        List<Map<String,Object>> roles=db.list("SELECT r.role_id,r.data_scope FROM sys_role r JOIN sys_user_role ur ON ur.role_id=r.role_id "
            + "WHERE ur.user_id=#{p.id} AND r.status='0' AND r.del_flag='0'",P.of("id",userId));
        Set<String> permissions=new HashSet<>();
        for (Map<String,Object> m:db.list("SELECT DISTINCT m.perms FROM sys_menu m JOIN sys_role_menu rm ON rm.menu_id=m.menu_id "
            + "JOIN sys_user_role ur ON ur.role_id=rm.role_id JOIN sys_role r ON r.role_id=ur.role_id "
            + "WHERE ur.user_id=#{p.id} AND r.status='0' AND r.del_flag='0' AND m.status='0'",P.of("id",userId))) {
            if(m.get("perms")!=null && !m.get("perms").toString().isBlank()) permissions.add(m.get("perms").toString());
        }
        Set<Long> scopes=new HashSet<>(); boolean all=false;
        for(Map<String,Object> r:roles) {
            String scope=String.valueOf(r.get("data_scope"));
            if("1".equals(scope)) all=true;
            if("2".equals(scope)) for(Map<String,Object> d:db.list("SELECT dept_id FROM sys_role_dept WHERE role_id=#{p.id}",P.of("id",r.get("role_id")))) scopes.add(Inputs.number(d.get("dept_id")));
            if("3".equals(scope)&&dept>0) scopes.add(dept);
            if("4".equals(scope)&&dept>0) {
                Set<Long> branch=new HashSet<>();branch.add(dept);
                List<Map<String,Object>> depts=db.list("SELECT dept_id,parent_id FROM sys_dept WHERE status='0' AND del_flag='0'",Map.of());
                boolean changed=true;
                while(changed) { changed=false; for(Map<String,Object> d:depts) if(d.get("parent_id")!=null && branch.contains(Inputs.number(d.get("parent_id")))) changed |= branch.add(Inputs.number(d.get("dept_id"))); }
                scopes.addAll(branch);
            }
        }
        return new Actor(userId,dept,identityId,"STAFF",Set.copyOf(permissions),Set.copyOf(scopes),all);
    }
}
```

**backend/src/main/java/com/doupi/planref/SessionTokens.java**

```java
package com.doupi.planref;

import com.doupi.planref.auth.AuthRepository;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

/** 签名会话只携带主体，不缓存角色；每次请求重新检查员工状态和范围。 */
@Service
public class SessionTokens {
    private final Db db;
    private final AuthRepository users;
    private final StringRedisTemplate redis;
    private final JwtEncoder encoder;
    private final JwtDecoder decoder;
    private final Duration ttl;
    public SessionTokens(Db db,AuthRepository users,StringRedisTemplate redis,
        @Value("${plan.jwt-secret}") String secret,@Value("${plan.session-minutes:30}") long minutes) {
        byte[] key=secret.getBytes(StandardCharsets.UTF_8);
        if(key.length<32 || minutes<5 || minutes>120) throw new IllegalStateException("PLAN_JWT_SECRET至少32字节，会话期限5至120分钟");
        var secretKey=new SecretKeySpec(key,"HmacSHA256");
        this.db=db;this.users=users;this.redis=redis;this.ttl=Duration.ofMinutes(minutes);
        this.encoder=new NimbusJwtEncoder(new com.nimbusds.jose.jwk.source.ImmutableSecret<>(secretKey));
        NimbusJwtDecoder jwt= NimbusJwtDecoder.withSecretKey(secretKey).macAlgorithm(MacAlgorithm.HS256).build();
        jwt.setJwtValidator(JwtValidators.createDefaultWithIssuer("doupi-plan-reference"));this.decoder=jwt;
    }
    public String issue(Actor actor) {
        Instant now=Instant.now();String jti=UUID.randomUUID().toString();
        long version=actor.userId()>0?Inputs.number(db.required("SELECT auth_version FROM sys_user WHERE user_id=#{p.id}",P.of("id",actor.userId())).get("auth_version")):0;
        JwtClaimsSet claims=JwtClaimsSet.builder().issuer("doupi-plan-reference").issuedAt(now).expiresAt(now.plus(ttl))
            .subject(actor.kind()+":"+(actor.userId()>0?actor.userId():actor.identityId())).id(jti)
            .claim("kind",actor.kind()).claim("uid",actor.userId()).claim("identity",actor.identityId()).claim("av",version).build();
        String token=encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
        redis.opsForValue().set("plan:session:"+jti,Json.hash(P.of("uid",actor.userId(),"identity",actor.identityId(),"kind",actor.kind())),ttl);
        return token;
    }
    public Actor authenticate(String token) {
        final Jwt jwt;
        try {jwt=decoder.decode(token);} catch(JwtException ex) {throw new Problem(401,"TOKEN_INVALID","会话无效或已过期");}
        String kind=jwt.getClaimAsString("kind");long uid=Inputs.number(jwt.getClaims().get("uid")),identity=Inputs.number(jwt.getClaims().get("identity"));
        String expected=Json.hash(P.of("uid",uid,"identity",identity,"kind",kind));
        if(!expected.equals(redis.opsForValue().get("plan:session:"+jwt.getId()))) throw new Problem(401,"SESSION_REVOKED","会话已撤销，请重新登录");
        if("STAFF".equals(kind)) {
            Map<String,Object> u=db.required("SELECT auth_version FROM sys_user WHERE user_id=#{p.id}",P.of("id",uid));
            if(Inputs.number(u.get("auth_version"))!=Inputs.number(jwt.getClaims().get("av"))) throw new Problem(401,"AUTH_CHANGED","权限已变更，请重新登录");
            if(identity>0) {
                Map<String,Object> link=users.identity(identity,false);
                if(!"VERIFIED".equals(link.get("link_status"))||link.get("user_id")==null||Inputs.number(link.get("user_id"))!=uid) throw new Problem(401,"BINDING_CHANGED","员工绑定已变更");
            }
            return users.staff(uid,identity);
        }
        if(!"VISITOR".equals(kind)||uid!=0||identity<=0) throw new Problem(401,"TOKEN_INVALID","会话主体无效");
        users.identity(identity,false);
        return new Actor(0,0,identity,"VISITOR",Set.of(),Set.of(),false);
    }
    public void revoke(String token) {
        try {Jwt jwt=decoder.decode(token);redis.delete("plan:session:"+jwt.getId());}
        catch(JwtException ex) {throw new Problem(401,"TOKEN_INVALID","会话无效或已过期");}
    }
}
```

**backend/src/main/java/com/doupi/planref/SecurityConfig.java**

```java
package com.doupi.planref;

import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.*;
import org.slf4j.*;
import org.springframework.context.annotation.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.OncePerRequestFilter;

@Configuration
public class SecurityConfig {
    @Bean
    SecurityFilterChain security(HttpSecurity http,SessionTokens tokens) throws Exception {
        http.csrf(c->c.disable()).sessionManagement(s->s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(a->a.requestMatchers("/api/v1/auth/login","/api/v1/auth/visitor","/api/v1/auth/wechat","/api/v1/public/**").permitAll().anyRequest().authenticated())
            .exceptionHandling(e->e.authenticationEntryPoint((req,res,ex)->failure(req,res,401,"AUTH_REQUIRED","请先登录")))
            .addFilterBefore(new BearerFilter(tokens),UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
    static void failure(HttpServletRequest req,HttpServletResponse res,int status,String code,String message) throws IOException {
        res.setStatus(status);res.setContentType("application/json;charset=UTF-8");
        res.getWriter().write(Json.write(P.of("code",status,"errorCode",code,"msg",message,"traceId",req.getAttribute("traceId"))));
    }
    static final class BearerFilter extends OncePerRequestFilter {
        private final SessionTokens tokens;private final Logger log=LoggerFactory.getLogger(BearerFilter.class);
        BearerFilter(SessionTokens tokens) {this.tokens=tokens;}
        @Override protected void doFilterInternal(HttpServletRequest req,HttpServletResponse res,FilterChain chain) throws ServletException,IOException {
            String trace=UUID.randomUUID().toString();req.setAttribute("traceId",trace);res.setHeader("X-Trace-Id",trace);long start=System.nanoTime();
            try {
                String header=req.getHeader("Authorization");
                if(header!=null) {
                    if(!header.startsWith("Bearer ")) throw new Problem(401,"TOKEN_INVALID","认证头格式无效");
                    Actor actor=tokens.authenticate(header.substring(7));
                    SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(actor,null,List.of()));
                }
                chain.doFilter(req,res);
            } catch(Problem e) {failure(req,res,e.http(),e.code(),e.getMessage());}
              catch(org.springframework.data.redis.RedisConnectionFailureException e) {failure(req,res,503,"SESSION_STORE_UNAVAILABLE","会话服务暂不可用");}
            finally {SecurityContextHolder.clearContext();log.info("trace={} method={} status={} elapsedMs={}",trace,req.getMethod(),res.getStatus(),(System.nanoTime()-start)/1_000_000);}
        }
    }
}
```





**app/office-api.uts**

```typescript
// Copy into doupi-app/api/office-plan.uts after APP-01 toolchain verification.
// Set the reviewed HTTPS origin in a build environment; never put server secrets here.
const apiOrigin = 'https://replace-with-test-domain.invalid/api/v1'
const tokenKey = 'office_employee_token'

export type CommandTicket = { key: string, body: UTSJSONObject }
export function newTicket(body: UTSJSONObject): CommandTicket {
  return { key: 'app-' + Date.now().toString() + '-' + Math.random().toString(36).substring(2, 14), body: body }
}
export function setEmployeeToken(token: string): void { uni.setStorageSync(tokenKey, token) }
export function clearEmployeeToken(): void { uni.removeStorageSync(tokenKey) }
export function callOffice(path: string, method: string, body: UTSJSONObject | null = null, key: string = ''): Promise<UTSJSONObject> {
  return new Promise<UTSJSONObject>((resolve, reject) => {
    const headers: UTSJSONObject = { 'Content-Type': 'application/json' }
    const token = uni.getStorageSync(tokenKey) as string
    if (token != null && token.length > 0) headers['Authorization'] = 'Bearer ' + token
    if (key.length > 0) headers['Idempotency-Key'] = key
    uni.request<UTSJSONObject>({
      url: apiOrigin + path,
      method: method as RequestMethod,
      data: body,
      header: headers,
      timeout: 15000,
      success: (res) => {
        if (res.statusCode == 401) clearEmployeeToken()
        const reply = res.data
        if (res.statusCode < 200 || res.statusCode >= 300 || reply == null) {
          reject(new Error('HTTP_' + res.statusCode.toString() + ': ' + (reply?.getString('msg') ?? '请求失败')))
          return
        }
        const data = reply.getJSON('data')
        if (data == null) { reject(new Error('INVALID_RESPONSE')); return }
        resolve(data)
      },
      fail: (error) => { reject(new Error('NETWORK_UNKNOWN_OUTCOME: ' + error.errMsg)) }
    })
  })
}
export function login(username: string, password: string): Promise<UTSJSONObject> {
  return callOffice('/auth/login', 'POST', { username: username, password: password }).then((data: UTSJSONObject): UTSJSONObject => {
    if (data.getString('kind') != 'STAFF') throw new Error('STAFF_IDENTITY_REQUIRED')
    const token = data.getString('token')
    if (token == null) throw new Error('TOKEN_MISSING')
    setEmployeeToken(token)
    return data
  })
}
export function command(path: string, ticket: CommandTicket): Promise<UTSJSONObject> {
  // Retry the same ticket after an uncertain timeout; a changed payload needs explicit reconfirmation and a new ticket.
  return callOffice(path, 'POST', ticket.body, ticket.key)
}
export function workbench(): Promise<UTSJSONObject> { return callOffice('/office/requests?afterId=0', 'GET') }
export function tasks(): Promise<UTSJSONObject> { return callOffice('/office/tasks', 'GET') }
export function inbox(): Promise<UTSJSONObject> { return callOffice('/office/notices?after=0', 'GET') }
export function printDetail(id: string): Promise<UTSJSONObject> { return callOffice('/office/print-requests/' + encodeURIComponent(id), 'GET') }
export function materialDetail(id: string): Promise<UTSJSONObject> { return callOffice('/office/material-requests/' + encodeURIComponent(id), 'GET') }
export function readNotice(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/notices/' + encodeURIComponent(id) + '/read', ticket) }
export function acknowledgeNotice(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/notices/' + encodeURIComponent(id) + '/ack', ticket) }
export function createPrint(ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/print-requests', ticket) }
export function taskAction(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/tasks/' + encodeURIComponent(id) + '/actions', ticket) }
export function confirmPrint(id: string, delivery: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/print-requests/' + encodeURIComponent(id) + '/deliveries/' + encodeURIComponent(delivery) + '/confirm', ticket) }
export function disputePrint(id: string, delivery: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/print-requests/' + encodeURIComponent(id) + '/deliveries/' + encodeURIComponent(delivery) + '/dispute', ticket) }
export function createMaterial(ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests', ticket) }
export function receiveMaterial(id: string, record: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/records/' + encodeURIComponent(record) + '/receipt', ticket) }
export function returnMaterial(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/returns', ticket) }
export function returnIntents(id: string): Promise<UTSJSONObject> { return callOffice('/office/material-requests/' + encodeURIComponent(id) + '/return-intents', 'GET') }
export function proposeReturn(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/return-intents', ticket) }
export function reviewReturn(id: string, intent: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/return-intents/' + encodeURIComponent(intent) + '/review', ticket) }
export function cancelReturn(id: string, intent: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/office/material-requests/' + encodeURIComponent(id) + '/return-intents/' + encodeURIComponent(intent) + '/cancel', ticket) }
export function verifyAppointment(id: string, ticket: CommandTicket): Promise<UTSJSONObject> { return command('/staff/appointments/' + encodeURIComponent(id) + '/verify', ticket) }
export function uploadPrivate(filePath: string, key: string): Promise<UTSJSONObject> {
  return new Promise<UTSJSONObject>((resolve, reject) => {
    const token = uni.getStorageSync(tokenKey) as string
    if (token == null || token.length == 0) { reject(new Error('AUTH_REQUIRED')); return }
    uni.uploadFile({ url: apiOrigin + '/staff/files', filePath: filePath, name: 'file', header: { 'Authorization': 'Bearer ' + token, 'Idempotency-Key': key },
      success: (res) => {
        if (res.statusCode == 401) clearEmployeeToken()
        const reply = JSON.parseObject(res.data)
        if (res.statusCode < 200 || res.statusCode >= 300 || reply == null) { reject(new Error('UPLOAD_FAILED')); return }
        const data = reply.getJSON('data')
        if (data == null) { reject(new Error('INVALID_RESPONSE')); return }
        resolve(data)
      }, fail: (error) => { reject(new Error('UPLOAD_UNKNOWN_OUTCOME: ' + error.errMsg)) }
    })
  })
}
```



## 6. 边界与异常场景处理

- 401清员工会话后重新登录；403显示岗位不允许；对象不可见404；409刷新正式事实并让用户重新核对，新决定用新ticket，原载荷重试用旧ticket。
- 网络失败/超时不显示成功，不本地模拟审批/签收/扣库；返回前进程退出须通过事项列表核对，不按最后点击状态推断提交结果。
- 私有文件无权限不显示临时地址；原稿、照片、学生联系资料和JWT不打印日志或写普通公共缓存；退出清理临时预览。
- 参考UTS需在APP-01锁定的HBuilderX/Android工具链实编译并真机验收，当前Java/H2/TS验证不代表原生平台已验证。
