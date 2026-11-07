# ADM-01 依赖兼容与序列化基线

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#adm-01)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

优先级：P0；工期：3个单人工作日；依赖：MINI-06。按1名Java开发+AI辅助估算，工期包括页面、接口、自测和联调。

包含现有后端/管理端工程依赖兼容、统一响应、认证入口、异常日志与API前缀。保留Java17/Boot4/MyBatis4和React19/TS6/Vite8/AntD6；不重写框架，不引入微服务或Docker集群。

- [ ] 第1日：在隔离工作副本核查`doupi-server/pom.xml`、分页starter及Jackson2自定义扩展；PageHelper4.1.0作为候选验证；迁移HTTP序列化到Jackson3，Redis旧会话单独兼容或受控失效。
- [ ] 第2日：在`doupi-web-admin-react/package.json`及锁文件替换旧Pro独立子包导入为兼容AntD6的Pro3聚合包，先验证具体发布版本及peer契约再锁定；跑登录、布局、表格、表单与弹窗最小切片。若候选未通过不得强装，登记问题使用阶段缓冲。
- [ ] 第3日：接入`src/api/office.ts`、Security新路径、Nginx保留`/api/v1`前缀；验证大ID、UTC日期、错误返回与会话撤销。第5节为已内嵌参考代码，不表示生产依赖已升级。

验收：可复现依赖安装、构建、权限菜单和分页计数一致；HTTP不把BIGINT转成JS浮点；无业务数据或token进入日志；401/403/409/503区别明确。

## 2. 接口设计清单

统一外层`code:int,msg:string,traceId:string,replayed:boolean,data:object`；下表为data。ID为十进制字符串，数据库BIGINT；版本为非负整数。业务写命令头`Idempotency-Key:string(1..64)`必填；私有上传和ExternalCommands动作另限8..64个字母数字或_.:-字符；登录、分析和文本候选不要求该头；JWT认证派生操作者和部门。接口不得接受客户端权限、角色和操作者作为授权依据。

| 接口名称 | 请求方式 | 路径 | 请求参数（字段名/类型/必填/含义） | 返回参数（字段名/类型/含义） | 权限要求 |
|---|---|---|---|---|---|
| 登录 | POST | `/api/v1/auth/login` | username/string/是/学校账户；password/string(8..128)/是/原密码，仅TLS传输 | token/string/签名JWT；kind/string/STAFF；userId/string/主体；identityId/string/0或绑定 | 匿名，限流 |
| 会话与权限 | GET | `/api/v1/auth/me` | Authorization/Bearer/是/会话 | userId、deptId、identityId/string/身份；kind/string；permissions/string[]；scopeDeptIds/string[]；bindingStatus/string或null | 已认证本人 |
| 退出 | POST | `/api/v1/auth/logout` | Authorization/Bearer/是/本次会话；无body | revoked/boolean/服务端撤销成功 | 已认证本人 |

## 3. 数据流转细节

1. 登录：AuthController接收`username/password`，Inputs校验长度；AuthRepository以`sys_user.user_name`查`user_id,dept_id,password,status,del_flag`；BCrypt核对摘要，失败统一401，不泄露账户是否存在。读取`sys_user_role.role_id→sys_role.status/del_flag/data_scope→sys_role_menu.menu_id→sys_menu.perms`；scope2读`sys_role_dept.dept_id`，scope3/4含所属部门/子部门，scope5本人；权限实时生成Actor。
2. SessionTokens读取`sys_user.auth_version`写JWT的`uid,identity,kind,av,jti,iss,iat,exp`，签名secret只取环境变量；Redis写`plan:session:{jti}`主体摘要并按30分钟TTL到期。没有数据库业务写入，Redis失败不返回已登录成功。
3. `/auth/me`：Bearer签名/期限/issuer校验→Redis jti有效性→数据库员工状态/auth_version、绑定`link_status/user_id`→重新加载角色与部门范围。角色撤销/账号停用无需等本地缓存自然失效；角色变更维护流程同时递增`auth_version`。
4. `/auth/logout`：验证token并删除相同jti的Redis键，数据库身份和业务轨迹保留；Redis失败503，客户端可以清本地token但不能声称服务器已撤销。
5. 响应：ApiReply递归将`id/*_id/*Id/*Ids`数字转十进制字符串；新datetime读取按UTC转ISO时间；ApiErrors映射参数、权限、版本与DB故障，Security日志仅traceId/method/status/耗时。查询无业务事务；写命令统一Commands或ExternalCommands，不用Redis锁代替库存事务。

生产验证：分别执行后端`mvn test`与`mvn package -DskipTests`、管理端`npm ci`与`npm run build`，不接受`--legacy-peer-deps`作为兼容通过证据；测试登录与任一分页/表单接口并保存具体版本、结果。配置实现依据：[Spring Security JWT](https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html)。

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



**backend/src/main/java/com/doupi/planref/PlanReferenceApplication.java**

```java
package com.doupi.planref;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PlanReferenceApplication {
    public static void main(String[] args) { SpringApplication.run(PlanReferenceApplication.class, args); }
}
```

**backend/src/main/java/com/doupi/planref/Actor.java**

```java
package com.doupi.planref;

import java.util.Set;

public record Actor(long userId,long deptId,long identityId,String kind,Set<String> permissions,Set<Long> scopeDeptIds,boolean allData) {
    public Actor { permissions=Set.copyOf(permissions); scopeDeptIds=Set.copyOf(scopeDeptIds); }
    public void requireStaff() { if (!"STAFF".equals(kind) || userId<=0) throw Problem.forbidden("仅学校员工可办理"); }
    public void require(String permission) {
        requireStaff();
        if (!permissions.contains("*") && !permissions.contains(permission)) throw Problem.forbidden("缺少操作权限："+permission);
    }
}
```

**backend/src/main/java/com/doupi/planref/Actors.java**

```java
package com.doupi.planref;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class Actors {
    private Actors() {}
    public static Actor current() {
        Authentication authentication=SecurityContextHolder.getContext().getAuthentication();
        if (authentication==null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof Actor actor))
            throw new Problem(401,"UNAUTHENTICATED","请先登录");
        return actor;
    }
}
```

**backend/src/main/java/com/doupi/planref/Access.java**

```java
package com.doupi.planref;

import java.util.Map;

public final class Access {
    private Access() {}
    private static long number(Map<String,Object> row,String key) { return row.get(key)==null?0:Inputs.number(row.get(key)); }
    public static void requireRequest(Actor actor,Map<String,Object> row) {
        actor.requireStaff();
        if (actor.allData() || number(row,"applicant_user_id")==actor.userId() || number(row,"created_by_user_id")==actor.userId()
            || number(row,"handler_user_id")==actor.userId() || actor.scopeDeptIds().contains(number(row,"applicant_dept_id"))) return;
        throw Problem.notFound("事项不存在或不可见");
    }
    public static void requireRequest(Actor actor,Map<String,Object> row,Db db) {
        try {requireRequest(actor,row);return;} catch(Problem denied) {if(denied.http()!=404) throw denied;}
        Map<String,Object> task=db.one("SELECT task_id FROM office_task WHERE request_id=#{p.request} AND assignee_user_id=#{p.user} AND status IN ('OPEN','CLAIMED','COMPLETED') ORDER BY task_id LIMIT 1",P.of("request",row.get("request_id"),"user",actor.userId()));
        if(task.isEmpty()) throw Problem.notFound("事项不可见");
    }
}
```

**backend/src/main/java/com/doupi/planref/P.java**

```java
package com.doupi.planref;

import java.util.LinkedHashMap;
import java.util.Map;

public final class P {
    private P() {}
    public static Map<String,Object> of(Object... values) {
        if (values.length % 2 != 0) throw new IllegalArgumentException("参数必须成对");
        Map<String,Object> result = new LinkedHashMap<>();
        for (int i=0; i<values.length; i+=2) result.put((String)values[i], values[i+1]);
        return result;
    }
}
```

**backend/src/main/java/com/doupi/planref/Inputs.java**

```java
package com.doupi.planref;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class Inputs {
    private Inputs() {}
    public static String text(Map<String,Object> p,String key,int min,int max) {
        Object value=p.get(key);
        if (!(value instanceof String s) || s.strip().length()<min || s.strip().length()>max)
            throw Problem.bad(key+"长度不合法");
        return s.strip();
    }
    public static String optionalText(Map<String,Object> p,String key,int max) {
        if (p.get(key)==null) return null;
        return text(p,key,0,max);
    }
    public static long number(Object value) {
        if (value==null) throw Problem.bad("缺少整数");
        try { return new BigDecimal(value.toString()).longValueExact(); }
        catch (ArithmeticException|NumberFormatException e) { throw Problem.bad("必须为范围内整数"); }
    }
    public static long id(Map<String,Object> p,String key) { return positive(p,key); }
    public static Long optionalId(Map<String,Object> p,String key) { return p.get(key)==null?null:id(p,key); }
    public static long positive(Map<String,Object> p,String key) {
        long value=number(p.get(key));
        if (value<=0) throw Problem.bad(key+"必须大于0");
        return value;
    }
    public static long nonNegative(Map<String,Object> p,String key) {
        long value=number(p.get(key));
        if (value<0) throw Problem.bad(key+"不能为负数");
        return value;
    }
    @SuppressWarnings("unchecked")
    public static Map<String,Object> map(Object value) {
        if (!(value instanceof Map<?,?> m)) throw Problem.bad("必须为对象");
        for (Object k:m.keySet()) if (!(k instanceof String)) throw Problem.bad("对象字段名必须为字符串");
        return (Map<String,Object>)m;
    }
    public static List<Map<String,Object>> list(Map<String,Object> p,String key) {
        if (!(p.get(key) instanceof List<?> list) || list.size()>500) throw Problem.bad(key+"必须为最多500项的数组");
        List<Map<String,Object>> result=new ArrayList<>();
        for (Object item:list) result.add(map(item));
        return result;
    }
    public static List<Long> ids(Map<String,Object> p,String key) {
        if (!(p.get(key) instanceof List<?> list) || list.size()>500) throw Problem.bad(key+"必须为标识数组");
        List<Long> ids=new ArrayList<>();
        for (Object value:list) { long n=number(value); if (n<=0) throw Problem.bad(key+"包含非法标识"); ids.add(n); }
        return ids;
    }
    public static boolean bool(Map<String,Object> p,String key,boolean fallback) {
        if (p.get(key)==null) return fallback;
        if (!(p.get(key) instanceof Boolean value)) throw Problem.bad(key+"必须为布尔值");
        return value;
    }
}
```

**backend/src/main/java/com/doupi/planref/Json.java**

```java
package com.doupi.planref;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import tools.jackson.databind.json.JsonMapper;

public final class Json {
    private static final JsonMapper MAPPER=JsonMapper.builder().build();
    private Json() {}
    public static String write(Object value) {
        try { return MAPPER.writeValueAsString(normalize(value)); }
        catch (Exception e) { throw new IllegalStateException("JSON编码失败",e); }
    }
    @SuppressWarnings("unchecked")
    public static Map<String,Object> readMap(Object value) {
        if (value==null) return new LinkedHashMap<>();
        if (value instanceof Map<?,?> map) return new LinkedHashMap<>((Map<String,Object>)map);
        String text=value instanceof byte[] bytes?new String(bytes,StandardCharsets.UTF_8):value.toString();
        try {
            Object decoded=MAPPER.readValue(text,Object.class);
            if (decoded instanceof String nested) decoded=MAPPER.readValue(nested,Object.class);
            return Inputs.map(decoded);
        } catch (Problem e) { throw e; }
        catch (Exception e) { throw Problem.bad("JSON结构不合法"); }
    }
    public static String hash(Object value) { return sha256(write(value).getBytes(StandardCharsets.UTF_8)); }
    public static String sha256(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (Exception e) { throw new IllegalStateException("SHA-256不可用",e); }
    }
    private static Object normalize(Object value) {
        if (value instanceof Map<?,?> map) {
            Map<String,Object> result=new TreeMap<>();
            map.forEach((k,v)->result.put(k.toString(),normalize(v))); return result;
        }
        if (value instanceof Iterable<?> list) {
            List<Object> result=new ArrayList<>(); for (Object v:list) result.add(normalize(v)); return result;
        }
        if (value instanceof java.sql.Timestamp t) return t.toInstant().toString();
        if (value instanceof java.sql.Date d) return d.toLocalDate().toString();
        if (value instanceof java.time.temporal.TemporalAccessor) return value.toString();
        if (value instanceof byte[] bytes) return new String(bytes,StandardCharsets.UTF_8);
        return value;
    }
}
```

**backend/src/main/java/com/doupi/planref/Problem.java**

```java
package com.doupi.planref;

public class Problem extends RuntimeException {
    private final int http;
    private final String code;
    public Problem(int http, String code, String message) { super(message); this.http=http; this.code=code; }
    public int http() { return http; }
    public String code() { return code; }
    public static Problem bad(String message) { return new Problem(422,"INVALID_ARGUMENT",message); }
    public static Problem forbidden(String message) { return new Problem(403,"FORBIDDEN",message); }
    public static Problem conflict(String message) { return new Problem(409,"CONFLICT",message); }
    public static Problem notFound(String message) { return new Problem(404,"NOT_FOUND",message); }
}
```

**backend/src/main/java/com/doupi/planref/Db.java**

```java
package com.doupi.planref;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Repository;

@Repository
public class Db {
    private final SqlMapper mapper;
    public Db(SqlMapper mapper) { this.mapper=mapper; }
    public List<Map<String,Object>> list(String sql,Map<String,Object> p) {
        List<Map<String,Object>> rows=new ArrayList<>();
        for (Map<String,Object> row:mapper.select(sql,p)) {
            Map<String,Object> normalized=new LinkedHashMap<>();
            row.forEach((k,v)->normalized.put(k.toLowerCase(Locale.ROOT),v)); rows.add(normalized);
        }
        return rows;
    }
    public Map<String,Object> one(String sql,Map<String,Object> p) {
        List<Map<String,Object>> rows=list(sql,p);
        if (rows.size()>1) throw new IllegalStateException("单行查询返回多条");
        return rows.isEmpty()?new LinkedHashMap<>():rows.get(0);
    }
    public Map<String,Object> required(String sql,Map<String,Object> p) {
        Map<String,Object> row=one(sql,p); if (row.isEmpty()) throw Problem.notFound("记录不存在或不可见"); return row;
    }
    public int write(String sql,Map<String,Object> p) { return mapper.write(sql,p); }
    public long insert(String sql,Map<String,Object> p) {
        Map<String,Object> args=new LinkedHashMap<>(p);
        if (mapper.insert(sql,args)!=1 || args.get("_generatedId")==null) throw new IllegalStateException("未取得新增记录主键");
        return Inputs.number(args.get("_generatedId"));
    }
}
```

**backend/src/main/java/com/doupi/planref/SqlMapper.java**

```java
package com.doupi.planref;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface SqlMapper {
    // sql仅由仓库层常量提供；外部请求不得提交SQL，所有值经#{p.x}绑定。
    @Select("${sql}")
    List<Map<String,Object>> select(@Param("sql") String sql,@Param("p") Map<String,Object> p);
    @Update("${sql}")
    int write(@Param("sql") String sql,@Param("p") Map<String,Object> p);
    @Insert("${sql}")
    @Options(useGeneratedKeys=true,keyProperty="p._generatedId")
    int insert(@Param("sql") String sql,@Param("p") Map<String,Object> p);
}
```

**backend/src/main/java/com/doupi/planref/ApiReply.java**

```java
package com.doupi.planref;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

public final class ApiReply {
    private ApiReply() {}
    public static ResponseEntity<Map<String,Object>> of(Map<String,Object> result,int fallbackHttp) {
        Map<String,Object> data=new LinkedHashMap<>(result);
        int status=data.get("_httpStatus")==null?fallbackHttp:(int)Inputs.number(data.remove("_httpStatus"));
        boolean replayed=Boolean.TRUE.equals(data.remove("_replayed"));
        return ResponseEntity.status(status).body(P.of("code",200,"msg","操作成功","traceId",traceId(),"replayed",replayed,"data",ids(data,"")));
    }
    public static String traceId() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs) {
            Object id=attrs.getRequest().getAttribute("traceId"); if (id!=null) return id.toString();
        }
        return UUID.randomUUID().toString();
    }
    private static Object ids(Object value,String key) {
        if (value instanceof Map<?,?> map) {
            Map<String,Object> result=new LinkedHashMap<>(); map.forEach((k,v)->result.put(k.toString(),ids(v,k.toString()))); return result;
        }
        if (value instanceof Iterable<?> list) {
            List<Object> result=new ArrayList<>(); for (Object item:list) result.add(ids(item,key.endsWith("Ids")?"id":"")); return result;
        }
        if (value instanceof Number && (key.equals("id") || key.endsWith("Id") || key.endsWith("_id"))) return value.toString();
        if (value instanceof byte[] bytes) return new String(bytes,java.nio.charset.StandardCharsets.UTF_8);
        if (value instanceof java.sql.Timestamp t) return t.toInstant().toString();
        if (value instanceof java.sql.Date d) return d.toLocalDate().toString();
        if (value instanceof java.time.LocalDateTime t) return t.toInstant(java.time.ZoneOffset.UTC).toString();
        if (value instanceof java.time.temporal.TemporalAccessor t) return t.toString();
        return value;
    }
}
```

**backend/src/main/java/com/doupi/planref/ApiErrors.java**

```java
package com.doupi.planref;

import jakarta.validation.ConstraintViolationException;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.http.converter.HttpMessageNotReadableException;

@RestControllerAdvice
public class ApiErrors {
    private static final Logger LOG=LoggerFactory.getLogger(ApiErrors.class);
    @ExceptionHandler(Problem.class)
    public ResponseEntity<Map<String,Object>> problem(Problem ex) {
        LOG.info("业务拒绝 traceId={} status={} code={}",ApiReply.traceId(),ex.http(),ex.code());
        return ResponseEntity.status(ex.http()).body(P.of("code",ex.http(),"errorCode",ex.code(),"msg",ex.getMessage(),"traceId",ApiReply.traceId()));
    }
    @ExceptionHandler({MethodArgumentNotValidException.class,ConstraintViolationException.class,HttpMessageNotReadableException.class,IllegalArgumentException.class,ArithmeticException.class,org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,org.springframework.web.bind.MissingRequestHeaderException.class})
    public ResponseEntity<Map<String,Object>> bad(Exception ex) { return problem(new Problem(400,"INVALID_ARGUMENT","请求结构或字段不合法")); }
    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<Map<String,Object>> duplicate(Exception ex) { return problem(new Problem(409,"DATA_CONSTRAINT_CONFLICT","数据唯一性或关联约束冲突，未提交本次操作")); }
    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<Map<String,Object>> database(DataAccessException ex) {
        LOG.error("数据库操作失败 traceId={} exception={}",ApiReply.traceId(),ex.getClass().getSimpleName());
        return problem(new Problem(503,"DATABASE_UNAVAILABLE","持久化操作失败，请按原命令查询或重试"));
    }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String,Object>> other(Exception ex) {
        LOG.error("未处理异常 traceId={} exception={}",ApiReply.traceId(),ex.getClass().getName());
        return problem(new Problem(500,"INTERNAL_ERROR","服务处理失败"));
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

**backend/src/main/java/com/doupi/planref/Rules.java**

```java
package com.doupi.planref;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class Rules {
    private final Db db;
    public Rules(Db db) { this.db=db; }
    public Map<String,Object> snapshot(String biz) {
        Map<String,Object> row=db.one("SELECT config_value FROM sys_config WHERE config_key=#{p.key}",P.of("key","office.rules"));
        if (row.isEmpty()) throw unavailable("学校办事规则未配置");
        Map<String,Object> source=Json.readMap(row.get("config_value"));
        Map<String,Object> result=new LinkedHashMap<>(source);
        for (String name:new String[]{"printReviewer","materialReviewer","checkReviewer","executor","warehouse","contentReviewer"}) {
            Object key=source.get(name+"RoleKey");
            if (key==null) continue;
            Map<String,Object> role=db.one("SELECT role_id FROM sys_role WHERE role_key=#{p.key} AND status='0' AND del_flag='0'",P.of("key",key));
            if (role.isEmpty()) throw unavailable("办事角色不存在或已停用："+name);
            result.put(name+"RoleId",Inputs.number(role.get("role_id")));
        }
        String required=switch (biz) { case "PRINT"->"printReviewerRoleId"; case "STOCK_CHECK"->"checkReviewerRoleId"; case "INVENTORY"->"warehouseRoleId"; case "CMS_REVIEW"->"contentReviewerRoleId"; case "REPAIR","RECRUIT_SHIFT","RECRUIT_FOLLOWUP","RECRUIT_ASSIGNMENT"->"executorRoleId"; case "MATERIAL","PROCUREMENT"->"materialReviewerRoleId"; default->null; };
        if(required!=null && !("CMS_REVIEW".equals(biz)&&!Inputs.bool(source,"contentReviewRequired",true))) role(required,result); result.put("bizType",biz);
        return result;
    }
    public Long role(String name,Map<String,Object> snapshot) {
        Object value=snapshot.get(name);
        if (value==null || Inputs.number(value)<=0) throw unavailable("缺少固定责任岗位："+name);
        return Inputs.number(value);
    }
    private static Problem unavailable(String message) { return new Problem(503,"RULE_NOT_CONFIGURED",message); }
}
```

**backend/src/main/java/com/doupi/planref/Roots.java**

```java
package com.doupi.planref;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class Roots {
    private final Db db;
    private final Rules rules;
    public Roots(Db db,Rules rules) { this.db=db; this.rules=rules; }
    public long create(String biz,String key,Map<String,Object> body) {
        Actor actor=Actors.current(); actor.requireStaff();
        long applicant=body.get("applicantUserId")==null?actor.userId():Inputs.id(body,"applicantUserId");
        Map<String,Object> user=db.required("SELECT user_id,dept_id FROM sys_user WHERE user_id=#{p.id} AND status='0' AND del_flag='0'",P.of("id",applicant));
        long dept=user.get("dept_id")==null?0:Inputs.number(user.get("dept_id"));
        if (dept<=0) throw Problem.bad("申请人未分配有效部门");
        if (applicant!=actor.userId()) {
            actor.require("office:request:delegate");
            if (!actor.allData() && !actor.scopeDeptIds().contains(dept)) throw Problem.forbidden("超出可代录部门");
        }
        String source=body.get("clientSource")==null?"ADMIN_WEB":Inputs.text(body,"clientSource",1,16);
        if (!java.util.Set.of("ADMIN_WEB","STAFF_APP","WECHAT_MINI","PUBLIC_WEB").contains(source)) throw Problem.bad("终端来源不合法");
        String title=Inputs.optionalText(body,"title",200); if (title==null || title.isBlank()) title=biz+"申请";
        Timestamp due=null;
        if (body.get("dueAt")!=null) try { due=Timestamp.from(OffsetDateTime.parse(body.get("dueAt").toString()).toInstant()); }
        catch (RuntimeException e) { throw Problem.bad("dueAt必须为含时区的ISO8601时间"); }
        return db.insert("INSERT INTO office_request(request_no,biz_type,title,applicant_user_id,applicant_dept_id,created_by_user_id,client_source,status,current_node,rule_snapshot,revision,version,request_key,payload_hash,due_at,created_at,updated_at) "
            +"VALUES(#{p.no},#{p.biz},#{p.title},#{p.applicant},#{p.dept},#{p.actor},#{p.source},'DRAFT','DRAFT',#{p.rules},1,0,#{p.key},#{p.hash},#{p.due},CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3))",
            P.of("no",UUID.randomUUID().toString().replace("-",""),"biz",biz,"title",title,"applicant",applicant,"dept",dept,"actor",actor.userId(),"source",source,"rules",Json.write(rules.snapshot(biz)),"key",key,"hash",Json.hash(body),"due",due));
    }
}
```

**backend/src/main/java/com/doupi/planref/Commands.java**

```java
package com.doupi.planref;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.function.Function;
import java.util.function.Supplier;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class Commands {
    private final Db db;
    private final TransactionTemplate tx;
    public Commands(Db db,PlatformTransactionManager manager) { this.db=db; this.tx=new TransactionTemplate(manager); }
    public Map<String,Object> run(long id,String action,String key,Map<String,Object> body,int http,Function<Context,Map<String,Object>> work) {
        return execute(id,action,key,body,http,null,work);
    }
    public Map<String,Object> create(String action,String key,Map<String,Object> body,int http,Supplier<Long> root,Function<Context,Map<String,Object>> work) {
        return execute(0,action,key,body,http,root,work);
    }
    private Map<String,Object> execute(long id,String action,String key,Map<String,Object> body,int http,Supplier<Long> creator,Function<Context,Map<String,Object>> work) {
        Actor actor=Actors.current(); actor.requireStaff();
        if (key==null || key.isBlank() || key.length()>64) throw Problem.bad("必须提供1至64字符Idempotency-Key");
        String hash=Json.hash(P.of("targetRequestId",id,"body",body));
        Map<String,Object> replay=replay(actor,action,key,hash);
        if (replay!=null) return replay;
        try {
            return tx.execute(status->{
                long actualId=creator==null?id:creator.get();
                Map<String,Object> root=db.required("SELECT * FROM office_request WHERE request_id=#{p.id} FOR UPDATE",P.of("id",actualId));
                Access.requireRequest(actor,root,db);
                Map<String,Object> again=replay(actor,action,key,hash); if (again!=null) return again;
                if (creator==null && Inputs.nonNegative(body,"expectedVersion")!=Inputs.number(root.get("version")))
                    throw new Problem(409,"VERSION_CONFLICT","事项已更新，请刷新核对");
                long revision=Inputs.number(root.get("revision"));
                long actionId=db.insert("INSERT INTO office_action_log(request_id,target_type,target_id,action_code,actor_user_id,actor_dept_id,client_source,from_status,request_revision,idempotency_key,payload_hash,result_code,result_json,created_at) "
                    +"VALUES(#{p.id},'REQUEST',#{p.id},#{p.action},#{p.actor},#{p.dept},#{p.source},#{p.from},#{p.revision},#{p.key},#{p.hash},0,'{}',CURRENT_TIMESTAMP(3))",
                    P.of("id",actualId,"action",action,"actor",actor.userId(),"dept",actor.deptId(),"source",root.get("client_source"),"from",root.get("status"),"revision",revision,"key",key,"hash",hash));
                Context context=new Context(actualId,actionId,actor,root);
                Map<String,Object> result=new LinkedHashMap<>(work.apply(context));
                long next=context.nextVersion();
                int changed=db.write("UPDATE office_request SET version=#{p.next},updated_at=CURRENT_TIMESTAMP(3) WHERE request_id=#{p.id} AND version=#{p.old}",P.of("id",actualId,"next",next,"old",root.get("version")));
                if (changed!=1) throw Problem.conflict("事项版本冲突");
                Map<String,Object> after=db.required("SELECT * FROM office_request WHERE request_id=#{p.id}",P.of("id",actualId));
                result.put("requestId",Long.toString(actualId)); result.put("version",next); result.put("status",after.get("status"));
                db.write("UPDATE office_action_log SET to_status=#{p.to},before_json=#{p.before},after_json=#{p.after},result_code=#{p.http},result_json=#{p.result} WHERE action_id=#{p.id}",
                    P.of("id",actionId,"to",after.get("status"),"before",Json.write(root),"after",Json.write(P.of("request",after,"details",context.details)),"http",http,"result",Json.write(result)));
                result.put("_httpStatus",http); result.put("_replayed",false); return result;
            });
        } catch (DataIntegrityViolationException e) {
            Map<String,Object> raced=replay(actor,action,key,hash);
            if (raced!=null) return raced;
            throw new Problem(409,"DUPLICATE_DATA","唯一约束冲突，未提交本次业务");
        }
    }
    private Map<String,Object> replay(Actor actor,String action,String key,String hash) {
        Map<String,Object> old=db.one("SELECT request_id,payload_hash,result_code,result_json FROM office_action_log WHERE actor_user_id=#{p.actor} AND action_code=#{p.action} AND idempotency_key=#{p.key}",P.of("actor",actor.userId(),"action",action,"key",key));
        if (old.isEmpty()) return null;
        Access.requireRequest(actor,db.required("SELECT * FROM office_request WHERE request_id=#{p.id}",P.of("id",old.get("request_id"))),db);
        if (!hash.equals(old.get("payload_hash"))) throw new Problem(409,"IDEMPOTENCY_PAYLOAD_MISMATCH","同一命令键不能用于不同载荷或目标");
        if (Inputs.number(old.get("result_code"))==0) throw Problem.conflict("命令仍在处理中");
        Map<String,Object> result=Json.readMap(old.get("result_json")); result.put("_replayed",true); result.put("_httpStatus",old.get("result_code")); return result;
    }
    public final class Context {
        private final long requestId,actionId;
        private final Actor actor;
        private final Map<String,Object> root;
        private final java.util.Set<String> events=new java.util.HashSet<>();
        private final Map<String,Object> details=new LinkedHashMap<>();
        private Context(long id,long aid,Actor a,Map<String,Object> row) { requestId=id;actionId=aid;actor=a;root=java.util.Collections.unmodifiableMap(new LinkedHashMap<>(row)); }
        public void audit(Map<String,Object> values) { details.putAll(values); }
        public long requestId() { return requestId; }
        public long actionId() { return actionId; }
        public Actor actor() { return actor; }
        public Map<String,Object> request() { return root; }
        public long nextVersion() { return Math.addExact(Inputs.number(root.get("version")),1); }
        public void target(String type,long id) { db.write("UPDATE office_action_log SET target_type=#{p.type},target_id=#{p.target} WHERE action_id=#{p.id}",P.of("type",type,"target",id,"id",actionId)); }
        public void event(String type,Map<String,Object> payload) {
            if (!events.add(type)) throw new IllegalStateException("一个命令的同类事件必须聚合写入");
            db.write("INSERT INTO sys_outbox_event(event_key,event_type,aggregate_type,aggregate_id,aggregate_version,request_id,payload,status,attempts,next_attempt_at,created_at) VALUES(#{p.key},#{p.type},'REQUEST',#{p.id},#{p.version},#{p.id},#{p.payload},'PENDING',0,CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3))",
                P.of("key",requestId+":"+nextVersion()+":"+type,"type",type,"id",requestId,"version",nextVersion(),"payload",Json.write(payload)));
        }
        public long task(String node,String targetType,long targetId,Long userId,Long roleId,Long excluded) {
            if (userId==null && roleId==null) throw new Problem(503,"TASK_UNASSIGNED","固定任务缺少责任岗位");
            Map<String,Object> order=db.one("SELECT COALESCE(MAX(task_order),0)+1 AS n FROM office_task WHERE request_id=#{p.id} AND node_code=#{p.node}",P.of("id",requestId,"node",node));
            return db.insert("INSERT INTO office_task(request_id,node_code,round_no,task_order,target_type,target_id,assignee_user_id,assignee_role_id,excluded_user_id,status,version,created_by_user_id,created_at,updated_at) "
                +"VALUES(#{p.id},#{p.node},#{p.round},#{p.order},#{p.type},#{p.target},#{p.user},#{p.role},#{p.excluded},'OPEN',0,#{p.actor},CURRENT_TIMESTAMP(3),CURRENT_TIMESTAMP(3))",
                P.of("id",requestId,"node",node,"round",root.get("revision"),"order",order.get("n"),"type",targetType,"target",targetId,"user",userId,"role",roleId,"excluded",excluded,"actor",actor.userId()));
        }
        public void closeTasks(String node,String type,long id) {
            db.write("UPDATE office_task SET status='COMPLETED',acted_by=#{p.actor},acted_at=CURRENT_TIMESTAMP(3),version=version+1,updated_at=CURRENT_TIMESTAMP(3) WHERE request_id=#{p.id} AND node_code=#{p.node} AND target_type=#{p.type} AND target_id=#{p.target} AND status IN ('OPEN','CLAIMED')",
                P.of("actor",actor.userId(),"id",requestId,"node",node,"type",type,"target",id));
        }
    }
}
```





**backend/pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-parent</artifactId><version>4.0.3</version><relativePath/></parent>
  <groupId>com.doupi</groupId><artifactId>development-plan-reference</artifactId><version>1.0.0</version>
  <properties><java.version>17</java.version><project.build.sourceEncoding>UTF-8</project.build.sourceEncoding></properties>
  <dependencies>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-webmvc</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-security</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-oauth2-resource-server</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-redis</artifactId></dependency>
    <dependency><groupId>org.mybatis.spring.boot</groupId><artifactId>mybatis-spring-boot-starter</artifactId><version>4.0.1</version></dependency>
    <dependency><groupId>com.mysql</groupId><artifactId>mysql-connector-j</artifactId><scope>runtime</scope></dependency>
    <dependency><groupId>org.apache.pdfbox</groupId><artifactId>pdfbox</artifactId><version>3.0.3</version></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-test</artifactId><scope>test</scope></dependency>
    <dependency><groupId>org.springframework.security</groupId><artifactId>spring-security-test</artifactId><scope>test</scope></dependency>
    <dependency><groupId>com.h2database</groupId><artifactId>h2</artifactId><scope>test</scope></dependency>
  </dependencies>
  <build><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin><plugin><groupId>org.apache.maven.plugins</groupId><artifactId>maven-surefire-plugin</artifactId><configuration><argLine>-Dfile.encoding=UTF-8</argLine></configuration></plugin></plugins></build>
  <repositories><repository><id>public</id><url>https://maven.aliyun.com/repository/public</url></repository></repositories>
</project>
```

**backend/src/main/resources/application.yml**

```yaml
spring:
  datasource:
    url: ${PLAN_DB_URL}
    username: ${PLAN_DB_USER}
    password: ${PLAN_DB_PASSWORD}
  data:
    redis:
      host: ${PLAN_REDIS_HOST:127.0.0.1}
      port: ${PLAN_REDIS_PORT:6379}
      password: ${PLAN_REDIS_PASSWORD:}
  sql:
    init:
      mode: never
  servlet:
    multipart:
      max-file-size: 100MB
      max-request-size: 200MB
server:
  port: ${PLAN_HTTP_PORT:18080}
plan:
  jwt-secret: ${PLAN_JWT_SECRET:}
  session-minutes: 30
  file-root: ${PLAN_FILE_ROOT:./target/private-files}
  outbox-enabled: false
  file-cleanup-enabled: false
  wechat:
    app-id: ${PLAN_WECHAT_APP_ID:}
    secret: ${PLAN_WECHAT_SECRET:}
mybatis:
  configuration:
    map-underscore-to-camel-case: false
```

**admin/office-client.ts**

```typescript
export interface CommandTicket<T> { readonly key: string; readonly body: T }
export interface Reply<T> { code: number; msg: string; traceId: string; replayed: boolean; data: T }
export class OfficeHttpError extends Error {
  constructor(readonly status: number, readonly traceId: string, message: string) { super(message) }
}
export function ticket<T>(body: T): CommandTicket<T> { return Object.freeze({ key: crypto.randomUUID(), body: structuredClone(body) }) }
export class OfficeClient {
  constructor(private readonly origin: string, private readonly token: () => string | null, private readonly expired: () => void) {}
  async read<T>(path: string): Promise<T> { return this.send<T>('GET', path) }
  async command<T, B>(method: 'POST' | 'PUT', path: string, command: CommandTicket<B>): Promise<T> { return this.send<T>(method, path, command) }
  private async send<T>(method: string, path: string, command?: CommandTicket<unknown>): Promise<T> {
    if (!path.startsWith('/api/v1/')) throw new Error('API路径必须保留/api/v1前缀')
    const headers = new Headers({ Accept: 'application/json' })
    const token = this.token(); if (token) headers.set('Authorization', `Bearer ${token}`)
    if (command) { headers.set('Content-Type', 'application/json'); headers.set('Idempotency-Key', command.key) }
    const response = await fetch(this.origin + path, { method, headers, body: command ? JSON.stringify(command.body) : undefined, signal: AbortSignal.timeout(15000), cache: 'no-store' })
    if (response.status === 401) this.expired()
    const result = await response.json() as Reply<T>
    if (!response.ok) throw new OfficeHttpError(response.status, result.traceId, result.msg)
    return result.data
  }
}
```



## 6. 边界与异常场景处理

- 密码/账号错误统一401；停用、已删、auth_version变化或绑定撤销阻断旧员工会话；游客始终没有员工权限。
- Redis不可用503并保留服务端失败状态；JWT签名secret少于32字节启动失败，不能回退硬编码密钥。
- 字段业务校验422，缺必填头/结构格式400；缺操作权限403，不可见对象404；幂等/版本冲突409。未知异常500返回traceId，不输出SQL、堆栈或secret。
- 依赖peer冲突、分页总数变化、Jackson脱敏失效是阻断问题；逐项修复后重测受影响链路。生产账号权限生命周期沿用现有管理功能，须纳入本阶段回归，不能把参考工程当替代账号平台。
