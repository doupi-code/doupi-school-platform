# MINI-01 原生工程、统一HTTP与会话边界

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#mini-01)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

本期直接接入现有小程序和 Java 服务。公共认证及后续命令契约见[公共契约](../00-shared/公共契约.md)。

**优先级与工期：P0，2个工作日。** 以一名单人Java开发者结合AI完成后端、原生小程序或React页面、联调及自测估算，不假设另有前端或QA人员；工期含约半天人工场景核对，外部微信审核等待不算有效开发日。App完整交付仍为P1。

原生 WXML/WXSS/JS 和 TDesign 工程使用统一 HTTP 层，负责身份刷新、退出和错误恢复。旧 dispatcher 和新版本入口共用动作鉴权，匿名白名单仅包含公开校区、访校配置和预约提交。

文件路径与实施任务：

- [x] 工程根目录、npm 输入及输出目录已修正。2026-11-07 使用学校 AppID 对工程副本运行微信开发者工具 `build-npm`，生成 TDesign 产物，构建未报警告。[工程配置](../../doupi-miniApp/project.config.json)
- [x] 统一 `/api/v1`、12 秒超时、Bearer、traceId、401/403 和原键原正文重试。匿名页面继续通过 dispatcher 调用，校区和轮播字段在接入层转换。[HTTP 层](../../doupi-miniApp/utils/http.js) · [接入层](../../doupi-miniApp/utils/cloudClient.js) · [小程序专项测试](../../tests/mini-http.test.cjs)
- [x] 接入员工会话查询、退出和旧网关动作鉴权。旧模拟登录、绑定及客户端代维入口停用。旧网关的手机号查单需要身份核验，Web 查单凭证接续 WEB-02。[会话接口](../../doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/controller/MiniSessionController.java) · [会话专项测试](../../doupi-server/doupi-recruit/src/test/java/com/doupi/recruit/controller/MiniSessionControllerTest.java) · [网关专项测试](../../doupi-server/doupi-recruit/src/test/java/com/doupi/recruit/controller/MiniGatewayBoundaryTest.java)
- [ ] 完成模拟器运行检查，在学校 AppID 的真机和合法 HTTPS 域名下联调公开页、真实员工会话查询与退出，验证旧令牌不可继续访问受保护接口。

本次复用现有 JWT 和 Redis `login_tokens:` 会话。真实微信登录、访客会话和员工绑定由 MINI-02 接入。

验收：开发者工具无不存在目录；公开页可匿名读；401清除失效令牌并保留未确认命令，403不改用户身份；超时原键重试，退出后旧token无法访问员工接口。

### 本地验证记录

- 2026-11-07，微信开发者工具完成 TDesign npm 构建。微信原生编译器检查通过，覆盖 185 个 WXML/WXS 文件和 36 个页面 WXSS 文件及样式依赖。
- `node --test tests/mini-http.test.cjs` 通过 7 项用例。后端 `MiniGatewayBoundaryTest` 和 `MiniSessionControllerTest` 共通过 4 项用例。服务启动模块及依赖通过 Maven 编译。
- 模拟器自动化连接未建立，真机与真实后端会话联调待验收。后端全量测试基线已有 OCR 测试因缺少测试图片报错。

## 2. 接口设计清单

接口前缀均为 `/api/v1`。JSON 统一使用 `{code:int,msg:string,traceId:string,replayed:boolean,data}`。会话接口的 BIGINT 标识使用十进制字符串。后续业务命令使用 `Idempotency-Key:string(8..64)`，只重试原键及原正文。旧 dispatcher 的业务写操作保持单次发送，退出使用当前会话标识执行撤销。鉴权使用 `Authorization: Bearer <服务端JWT>`，仅以服务端会话、账号和权限数据为准。除明确匿名的动作外，需要有效会话。

| 接口名称 | 请求方式 | 路径 | 请求参数(字段名/类型/必填/含义) | 返回参数(字段名/类型/含义) | 权限要求 |
|---|---|---|---|---|---|
| 本人会话信息 | GET | `/api/v1/auth/me` | Authorization:string／是／当前会话；无body | userId:string（员工ID，访客为0）；identityId:string（外部身份ID，纯密码员工可为0）；deptId:string（学校部门ID，访客为0）；kind:string（STAFF员工/VISITOR访客）；permissions:string[]（实时动作权限）；scopeDeptIds:string[]（实时部门数据范围）；bindingStatus:string或null（外部身份VISITOR/PENDING/VERIFIED/REVOKED，纯密码会话为空） | 已认证本人 |
| 退出当前会话 | POST | `/api/v1/auth/logout` | Authorization:string／是／待撤销会话；无body | revoked:boolean（true表示当前会话已从服务端撤销） | 已认证本人；只撤销该token |



## 3. 数据流转细节

| 接口 | 请求／服务端来源 → 明确数据库字段 → 返回 | 事务、并发与缓存 |
|---|---|---|
| `/auth/me` | Bearer JWT 的 `login_user_key` → Redis 会话的 `userId` → `sys_user.user_id/dept_id/status/del_flag` → `sys_user_role.role_id`、`sys_role.role_key/status/data_scope`、`sys_role_menu.menu_id`、`sys_menu.perms`、`sys_role_dept.dept_id`、`sys_dept.dept_id/ancestors` → 员工 ID、权限、部门范围；员工密码会话返回 `kind=STAFF, identityId="0", bindingStatus=null` | 数据库只读，现有账号和权限实时重载。访客与外部身份字段随 MINI-02 实现 |
| `/auth/logout` | Bearer JWT 的 `login_user_key` → 删除 Redis `login_tokens:{会话标识}` → 清除当前安全上下文 → `revoked=true` | 删除当前会话键。续期使用 Redis 条件更新，避免并发退出后复活会话。Redis 不可用时返回 503 |

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

本期实现分层为会话 Controller → 会话 Service → 现有用户服务、部门 Mapper 和 Redis。下方保留目标契约示例，其中密码入口、访客、微信身份和绑定示例用于后续模块。当前实际入口与字段以第 2、3 节和工程源码为准。[Controller](../../doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/controller/MiniSessionController.java) · [Service](../../doupi-server/doupi-recruit/src/main/java/com/doupi/recruit/service/MiniSessionService.java) · [部门 Mapper](../../doupi-server/doupi-system/src/main/java/com/doupi/system/mapper/SysDeptMapper.java)



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

**miniapp/lib/http.js**

```javascript
function request(path, method = 'GET', body, key) {
  const token = wx.getStorageSync('planref.token');
  return new Promise((resolve, reject) => wx.request({
    url: getApp().globalData.apiBase + path, method, data: body,
    timeout: 12000, header: { 'Content-Type': 'application/json', ...(token && !['/auth/wechat', '/auth/visitor', '/auth/login'].includes(path) ? { Authorization: 'Bearer ' + token } : {}), ...(key ? { 'Idempotency-Key': key } : {}) },
    success(res) {
      if (res.statusCode >= 200 && res.statusCode < 300) return resolve(res.data.data);
      if (res.statusCode === 401) wx.removeStorageSync('planref.token');
      const error = new Error(res.data.msg || '请求失败'); error.status = res.statusCode; error.traceId = res.data.traceId; reject(error);
    }, fail() { reject(new Error('网络未确认结果，请使用原操作重试')); }
  }));
}
function randomSecret() {
  return new Promise((resolve, reject) => {
    if (!wx.getRandomValues) return reject(new Error('当前微信版本不支持安全凭证，请升级微信'));
    wx.getRandomValues({ length: 32, success: res => resolve(wx.arrayBufferToBase64(res.randomValues).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')), fail: () => reject(new Error('安全随机数生成失败')) });
  });
}
async function login() {
  const result = await new Promise((resolve, reject) => wx.login({ success: resolve, fail: reject }));
  if (!result.code) throw new Error('微信未返回登录凭证');
  const session = await request('/auth/wechat', 'POST', { code: result.code });
  wx.setStorageSync('planref.token', session.token); return request('/auth/me');
}
async function command(path, body, storageKey) {
  let pending = wx.getStorageSync(storageKey);
  if (!pending) { pending = { key: await randomSecret(), body }; wx.setStorageSync(storageKey, pending); }
  try { const result = await request(path, 'POST', pending.body, pending.key); wx.removeStorageSync(storageKey); return result; }
  catch (error) { if (error.status >= 400 && error.status < 500 && ![401, 403].includes(error.status)) wx.removeStorageSync(storageKey); throw error; }
}
module.exports = { request, randomSecret, login, command };
```

**miniapp/app.js**

```javascript
App({ globalData: { apiBase: 'https://school.example.invalid/api/v1' } });
```

**miniapp/app.json**

```json
{"pages":["pages/home/index"],"window":{"navigationBarTitleText":"访校预约参考"},"style":"v2"}
```

**miniapp/project.config.json**

```json
{"miniprogramRoot":"./","projectname":"planref-recruit","appid":"touristappid","libVersion":"3.15.0","setting":{"es6":true,"urlCheck":true,"packNpmManually":false}}
```



## 6. 边界与异常场景处理

- 网络中断／HTTP超时：保留本地pending的key及完整body；再次点击发原命令；收到确认未执行的422/404/409后释放未成功命令，401/403继续保留原键待身份恢复核对，不自动改键。
- JWT过期／撤销401：提示重新登录；微信新code再次真实交换，不能用旧openid或手机号自造会话。
- 403：提示无权限并保留输入；员工入口隐藏仅是体验，后端继续验证岗位与数据范围。
- 真机验收登记基础库及设备版本。网关和会话专项测试分别覆盖匿名动作、越权、伪造请求字段、账号停用、实时权限、当前会话撤销和服务不可用。
