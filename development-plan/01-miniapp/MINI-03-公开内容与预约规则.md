# MINI-03 共用正式内容、校区和预约规则

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#mini-03)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**优先级与工期：P0，2个工作日。** 以一名单人Java开发者结合AI完成后端、原生小程序或React页面、联调及自测估算，不假设另有前端或QA人员；工期含约半天人工场景核对，外部微信审核等待不算有效开发日。App完整交付仍为P1。

小程序首页、正式资讯、校区说明与Web门户共用CMS公开接口，预约日历只显示服务端正式规则。仅公开发布态资料，不返回内部通知、员工联系方式、私有文件路径、草稿内容；不另建小程序内容事实表。

文件路径与实施任务：

- [ ] `backend/src/main/java/com/doupi/planref/publicsite/{PublicController,PublicService,PublicRepository}.java`：投影公开字段与发布条件。
- [ ] `backend/src/main/java/com/doupi/planref/recruit/RecruitService.java`：rules读取并校验真实配置。
- [ ] `doupi-miniApp/pages/index/`、资讯详情、校区与预约表单：替换dispatcher公开内容调用；盘点云fileID引用后逐步迁移公共素材，不直接删除存量资源。
- [ ] `miniapp/pages/home/index.{js,wxml,wxss}`：最小可浏览运行样例。

依赖：MINI-02完成，沿用MINI-01 HTTP；现有CMS正式发布的只读投影与公共素材能力；既有doupi_recruit_campus/config。公共图片必须已审核发布，不使用私有office/files地址。

验收：未发布/未来发布文章404；未发布校区不可预约；草稿页revision不一致不可见；规则缺失或非法503，不能默认为开放；Web和小程序读到同一timeSlots/openDaysAhead/needAudit。

## 2. 接口设计清单

接口前缀均为`/api/v1`。JSON统一`{code:int,msg:string,traceId:string,replayed:boolean,data:object}`；BIGINT标识使用十进制字符串，版本为非负整数。写操作的`Idempotency-Key:string(8..64)`必填，只重试原键及原正文。Authorization为`Bearer <服务端JWT>`；客户端角色、openid、userId、手机号不作为授权来源。除明确匿名接口外需要有效会话，返回401/403不降级为匿名员工。

| 接口名称 | 请求方式 | 路径 | 请求参数(字段名/类型/必填/含义) | 返回参数(字段名/类型/含义) | 权限要求 |
|---|---|---|---|---|---|
| 站点公开配置 | GET | `/api/v1/public/site` | 无 | config:object（公开键值集合）；config.site_name/site_name_en:string或缺省（学校中英文名称）；config.slogan/subtitle:string或缺省（标语/副标题）；config.address/hotlines/office_hours:string或缺省（地址/热线配置字符串/咨询时间）；config.icp:string或缺省（备案）；config.privacy_policy/privacy_version:string或缺省（正式隐私说明/版本） | 匿名 |
| 正式资讯列表 | GET | `/api/v1/public/articles` | query.kind:string／否默认updates，updates或notices；afterId:long>=0／否默认0／游标；limit:int1..50／否默认20 | items:object[]（正式文章列表，每项：articleId:string（文章ID）；title:string（正式标题）；kind:string（资讯类型）；category:string（栏目）；summary:string或null（摘要）；coverUrl:string或null（公共封面）；publishedAt:string ISO8601（真实发布时间）；revision:int（正式修订号））；nextAfterId:string或null（下一页游标，无下一页时为空） | 匿名 |
| 正式资讯详情 | GET | `/api/v1/public/articles/{id}` | id:long>0路径／是 | articleId:string（文章ID）；title:string（正式标题）；kind:string（资讯类型）；category:string（栏目）；summary:string或null（摘要）；coverUrl:string或null（公共封面）；publishedAt:string ISO8601（真实发布时间）；revision:int（正式修订号）；content:string或null（正式安全正文） | 匿名，只读已发布 |
| 正式页面与区块 | GET | `/api/v1/public/pages/{slug}` | slug:string(1..100)路径／是／小写字母数字和短横线 | slug:string（公开路由）；name:string（页面名称）；seoTitle/seoDescription:string或null（搜索展示标题/摘要）；revision:int（已发布修订）；publishedAt:string ISO8601（发布时间）；sections:object[]（同修订可见区块，每项sectionId:string区块ID、type:string允许的区块类型、name:string区块名称、content:object区块结构化内容） | 匿名，只读同发布修订 |
| 公开校区列表 | GET | `/api/v1/public/campuses` | 无 | items:object[]（已发布校区，每项：campus_id:string（校区ID）；campus_name:string（校区名称）；title:string或null（展示标题）；summary:string或null（简介）；address:string或null（公开地址）；contact_phone:string或null（公开联系电话）；cover_image:string或null（公共封面）；update_time:string ISO8601或null（更新时间）） | 匿名，仅published=1 |
| 公开校区详情 | GET | `/api/v1/public/campuses/{id}` | id:string(1..32)路径／是／校区ID | campus_id:string（校区ID）；campus_name:string（校区名称）；title:string或null（展示标题）；summary:string或null（简介）；address:string或null（公开地址）；contact_phone:string或null（公开联系电话）；cover_image:string或null（公共封面）；update_time:string ISO8601或null（更新时间）；intro:string或null（详细介绍）；latitude/longitude:decimal或null（公开纬度/经度） | 匿名，仅published=1 |
| 访校预约规则 | GET | `/api/v1/public/appointment-rules` | 无 | openDaysAhead:int1..60（可预约未来天数）；needAudit:boolean（是否需学校确认）；timeSlots:object[]（开放时段，每项name:string时段名称、maxQuota:positive-int名额上限） | 匿名，不返回内部配置 |



## 3. 数据流转细节

| 接口 | 请求／服务端来源 → 明确数据库字段 → 返回 | 事务、并发与缓存 |
|---|---|---|
| `/public/site` | doupi_cms_config.config_key白名单→config_value；不返回其他secret类配置→config对象 | 只读直接查库，无Redis业务缓存；配置表无发布态，只有学校确认的正式公共配置才能写入该白名单 |
| `/public/articles` | kind/afterId/limit→article.kind/article_id；status=0且published_at<=UTC now→限定投影→items/nextAfterId | 只读参数绑定，最多50；按主键稳定游标，无草稿缓存 |
| `/public/articles/{id}` | id→article_id且status=0/published_at有效→content等正式字段 | 查无与未发布均404；客户端以文本或经审核安全渲染器显示，不直接注入未经净化HTML |
| `/public/pages/{slug}` | slug→page.page_slug/status/published_at；published_revision=revision→section.page_id/revision/is_visible/sort_order→sections | 只读事务保持页与区块一致；编辑后根修订不同则不公开该草稿；不声称支持任意历史回滚 |
| `/public/campuses` | campus.published=1→campus_id/name/address/contact_phone/cover_image/update_time | 仅公开校区投影；不混入teacher_binding或学生表 |
| `/public/campuses/{id}` | id→campus_id且published=1→intro/坐标及公开联系方式 | 未发布404，地址坐标不提供授权能力 |
| `/public/appointment-rules` | config_key=basic_config→config_value.openDaysAhead/needAudit；time_slots→name/maxQuota→规则返回 | 每次创建重新读规则，展示不是抢占名额；重复时段、无slot、非正quota、超60天均503。无有效规则不补示例配置 |

## 4. 数据库补充设计

以下完整单表DDL与[最新目标结构](../../database/target/schema.sql)一致；[线上基线](../../database/baseline/production-2026-11-05.sql)仅表示已存在结构。新增字段、索引、约束及表仍待开发，历史数据前提见[结构差异](../../docs/engineering/05-数据库结构差异.md)。完整空库脚本按先表后外键执行依赖排序，本文不作为正式库迁移脚本。

**doupi_cms_config**

```sql
CREATE TABLE `doupi_cms_config` (
  `config_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '参数ID',
  `config_key` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '参数键名',
  `config_value` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '参数键值(JSON或字符串)',
  `config_name` VARCHAR(128) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '参数中文名称',
  `remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '备注说明',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT 'admin' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`config_id`),
  UNIQUE `uk_config_key` (
    `config_key`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网门户参数表';
```

**doupi_cms_article**

```sql
CREATE TABLE `doupi_cms_article` (
  `article_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '资讯ID',
  `title` VARCHAR(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '文章标题',
  `kind` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'updates' COMMENT '类型: updates-高招资讯 notices-校园公告',
  `category` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '校园动态' COMMENT '栏目分类',
  `summary` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '摘要提炼',
  `content` LONGTEXT COLLATE utf8mb4_unicode_ci COMMENT '富文本正文',
  `cover_url` VARCHAR(512) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '封面图片URL',
  `published_date` VARCHAR(20) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '发布日期(YYYY-MM-DD)',
  `author` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '汉外华襄校办' COMMENT '发布作者/署名',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '状态: 0-正常发布 1-草稿箱',
  `sort_order` INT DEFAULT '0' COMMENT '排序权重',
  `create_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT 'admin' COMMENT '创建者',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_by` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '更新者',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`article_id`),
  INDEX `idx_kind` (`kind`),
  INDEX `idx_status` (`status`),
  `revision` INT NOT NULL DEFAULT 1 COMMENT '新增，修订',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，并发编辑发布',
  `published_at` DATETIME(3) NULL COMMENT '新增，真实发布时间',
  `published_by` BIGINT NULL COMMENT '新增，发布身份',
  INDEX `idx_article_public` (`kind`, `status`, `published_at`, `article_id`),
  CONSTRAINT `fk_ref_085` FOREIGN KEY (`published_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网公文与资讯表';
```

**doupi_cms_page**

```sql
CREATE TABLE `doupi_cms_page` (
  `page_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '页面ID',
  `page_slug` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '页面访问路由 (如 / 或 about/campuses)',
  `page_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '页面中文名称',
  `seo_title` VARCHAR(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SEO标题',
  `seo_keywords` VARCHAR(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SEO关键字',
  `seo_description` VARCHAR(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'SEO描述',
  `status` CHAR(1) COLLATE utf8mb4_unicode_ci DEFAULT '0' COMMENT '发布状态: 0=已发布, 1=草稿',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`page_id`),
  UNIQUE `uk_slug` (
    `page_slug`
  ),
  `revision` INT NOT NULL DEFAULT 1 COMMENT '新增，页面区块共同修订',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，页面编辑根版本',
  `published_revision` INT NULL COMMENT '新增，公开版本',
  `published_at` DATETIME(3) NULL COMMENT '新增',
  `published_by` BIGINT NULL COMMENT '新增',
  INDEX `idx_page_public` (`status`, `page_slug`),
  CONSTRAINT `fk_ref_086` FOREIGN KEY (`published_by`) REFERENCES `sys_user` (
    `user_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网页面定义表';
```

**doupi_cms_section**

```sql
CREATE TABLE `doupi_cms_section` (
  `section_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '区块ID',
  `page_id` BIGINT NOT NULL COMMENT '所属页面ID',
  `section_type` VARCHAR(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '区块类型: hero, results, intro, reasons, stories, faculty, campus, news, rich_text, faq',
  `section_name` VARCHAR(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '区块别名',
  `sort_order` INT DEFAULT '0' COMMENT '排序权重(越小越靠前)',
  `is_visible` TINYINT(1) DEFAULT '1' COMMENT '是否可见: 1=可见, 0=隐藏',
  `content_data` JSON NOT NULL COMMENT '区块专属详细配置JSON',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`section_id`),
  INDEX `idx_page_order` (`page_id`, `sort_order`),
  `revision` INT NOT NULL DEFAULT 1 COMMENT '新增，页面修订',
  `version` BIGINT NOT NULL DEFAULT 0 COMMENT '新增，并发编辑',
  INDEX `idx_section_revision` (`page_id`, `revision`, `sort_order`),
  CONSTRAINT `fk_ref_115` FOREIGN KEY (`page_id`) REFERENCES `doupi_cms_page` (
    `page_id`
  ) ON DELETE RESTRICT ON UPDATE RESTRICT
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='官网页面动态区块表';
```

**doupi_recruit_campus**

```sql
CREATE TABLE `doupi_recruit_campus` (
  `campus_id` VARCHAR(32) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '校区ID',
  `campus_name` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '校区名称',
  `title` VARCHAR(128) COLLATE utf8mb4_unicode_ci DEFAULT '华襄校园介绍' COMMENT '展示标题',
  `summary` TEXT COLLATE utf8mb4_unicode_ci COMMENT '简介概览',
  `intro` TEXT COLLATE utf8mb4_unicode_ci COMMENT '详细图文/介绍',
  `address` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '校区地址',
  `latitude` DECIMAL(10, 6) DEFAULT '30.550000' COMMENT '纬度',
  `longitude` DECIMAL(10, 6) DEFAULT '114.280000' COMMENT '经度',
  `contact_phone` VARCHAR(32) COLLATE utf8mb4_unicode_ci DEFAULT '027-88888888' COMMENT '联系电话',
  `nature` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '全日制寄宿' COMMENT '办学性质',
  `section` VARCHAR(64) COLLATE utf8mb4_unicode_ci DEFAULT '小初高一贯制' COMMENT '开设学段',
  `cover_image` VARCHAR(512) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '封面图片URL',
  `published` TINYINT(1) DEFAULT '1' COMMENT '是否发布(1-是 0-否)',
  `sort_order` INT DEFAULT '0' COMMENT '排序',
  `create_time` DATETIME DEFAULT CURRENT_TIMESTAMP() COMMENT '创建时间',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`campus_id`)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='校区信息表';
```

**doupi_recruit_config**

```sql
CREATE TABLE `doupi_recruit_config` (
  `config_id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '配置ID',
  `config_key` VARCHAR(64) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键',
  `config_value` TEXT COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置值(JSON或字符串)',
  `remark` VARCHAR(255) COLLATE utf8mb4_unicode_ci DEFAULT '' COMMENT '说明',
  `update_time` DATETIME DEFAULT CURRENT_TIMESTAMP() ON UPDATE CURRENT_TIMESTAMP() COMMENT '更新时间',
  PRIMARY KEY (`config_id`),
  UNIQUE `uk_config_key` (
    `config_key`
  )
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='招生与系统配置表';
```

## 5. 代码实现骨架

下面是文档内的完整分层代码，可在Java17、Spring Boot4.0.3、MyBatis4.0.1下编译。Db/Inputs/Json/Actor/SessionTokens等公共依赖见[公共契约](../00-shared/公共契约.md)与文档内公共实现；所有SQL值使用参数绑定。客户端代码为同一契约的运行示例，正式接入时按第1节路径迁移，不宣称已修改生产工程。



**backend/src/main/java/com/doupi/planref/publicsite/PublicController.java**

```java
package com.doupi.planref.publicsite;

import com.doupi.planref.*;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/public")
public class PublicController {
    private final PublicService service;
    public PublicController(PublicService service) {this.service=service;}
    @GetMapping("/site") public ResponseEntity<Map<String,Object>> site(){return ApiReply.of(service.site(),200);}
    @GetMapping("/articles") public ResponseEntity<Map<String,Object>> articles(@RequestParam(defaultValue="updates") String kind,@RequestParam(defaultValue="0") long afterId,@RequestParam(defaultValue="20") int limit){return ApiReply.of(service.articles(kind,afterId,limit),200);}
    @GetMapping("/articles/{id}") public ResponseEntity<Map<String,Object>> article(@PathVariable long id){return ApiReply.of(service.article(id),200);}
    @GetMapping("/pages/{slug}") public ResponseEntity<Map<String,Object>> page(@PathVariable String slug){return ApiReply.of(service.page(slug),200);}
    @GetMapping("/campuses") public ResponseEntity<Map<String,Object>> campuses(){return ApiReply.of(service.campuses(),200);}
    @GetMapping("/campuses/{id}") public ResponseEntity<Map<String,Object>> campus(@PathVariable String id){return ApiReply.of(service.campus(id),200);}
}
```

**backend/src/main/java/com/doupi/planref/publicsite/PublicService.java**

```java
package com.doupi.planref.publicsite;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicService {
    private final PublicRepository repo;
    public PublicService(PublicRepository repo) {this.repo=repo;}
    public Map<String,Object> site() {
        Map<String,Object> values=new LinkedHashMap<>();
        for(Map<String,Object> row:repo.config()) values.put(row.get("config_key").toString(),row.get("config_value"));
        return P.of("config",values);
    }
    public Map<String,Object> articles(String kind,long after,int limit) {
        if(!Set.of("updates","notices").contains(kind)||after<0||limit<1||limit>50) throw Problem.bad("Invalid article query");
        List<Map<String,Object>> items=new ArrayList<>();
        for(Map<String,Object> row:repo.articles(kind,after,limit)) items.add(articleView(row,false));
        return P.of("items",items,"nextAfterId",items.size()==limit?items.get(items.size()-1).get("articleId"):null);
    }
    public Map<String,Object> article(long id) {return articleView(repo.article(id),true);}
    private Map<String,Object> articleView(Map<String,Object> row,boolean detail) {
        Map<String,Object> out=P.of("articleId",String.valueOf(row.get("article_id")),"title",row.get("title"),"kind",row.get("kind"),"category",row.get("category"),"summary",row.get("summary"),"coverUrl",row.get("cover_url"),"publishedAt",row.get("published_at"),"revision",row.get("revision"));
        if(detail) out.put("content",row.get("content"));
        return out;
    }
    @Transactional(readOnly=true)
    public Map<String,Object> page(String slug) {
        if(!slug.matches("[a-z0-9][a-z0-9-]{0,99}")) throw Problem.bad("Invalid public page slug");
        Map<String,Object> page=repo.page(slug);
        List<Map<String,Object>> sections=new ArrayList<>();
        for(Map<String,Object> s:repo.sections(Inputs.number(page.get("page_id")),Inputs.number(page.get("published_revision"))))
            sections.add(P.of("sectionId",String.valueOf(s.get("section_id")),"type",s.get("section_type"),"name",s.get("section_name"),"content",Json.readMap(s.get("content_data"))));
        return P.of("slug",page.get("page_slug"),"name",page.get("page_name"),"seoTitle",page.get("seo_title"),"seoDescription",page.get("seo_description"),"revision",page.get("published_revision"),"publishedAt",page.get("published_at"),"sections",sections);
    }
    public Map<String,Object> campuses() {return P.of("items",repo.campuses());}
    public Map<String,Object> campus(String id) {if(id.isBlank()||id.length()>32) throw Problem.bad("Invalid campus");return repo.campus(id);}
}
```

**backend/src/main/java/com/doupi/planref/publicsite/PublicRepository.java**

```java
package com.doupi.planref.publicsite;

import com.doupi.planref.*;
import java.util.*;
import org.springframework.stereotype.Repository;

@Repository
public class PublicRepository {
    private final Db db;
    public PublicRepository(Db db) {this.db=db;}
    public List<Map<String,Object>> config() {
        return db.list("SELECT config_key,config_value,update_time FROM doupi_cms_config WHERE config_key IN ('site_name','site_name_en','slogan','subtitle','address','hotlines','office_hours','icp','privacy_policy','privacy_version')",Map.of());
    }
    public List<Map<String,Object>> articles(String kind,long after,int limit) {
        return db.list("SELECT article_id,title,kind,category,summary,cover_url,published_at,revision FROM doupi_cms_article WHERE status='0' AND published_at IS NOT NULL AND published_at<=UTC_TIMESTAMP(3) AND kind=#{p.kind} AND (#{p.after}=0 OR article_id<#{p.after}) ORDER BY article_id DESC LIMIT #{p.limit}",P.of("kind",kind,"after",after,"limit",limit));
    }
    public Map<String,Object> article(long id) {
        return db.required("SELECT article_id,title,kind,category,summary,content,cover_url,published_at,revision FROM doupi_cms_article WHERE article_id=#{p.id} AND status='0' AND published_at IS NOT NULL AND published_at<=UTC_TIMESTAMP(3)",P.of("id",id));
    }
    public Map<String,Object> page(String slug) {
        return db.required("SELECT page_id,page_slug,page_name,seo_title,seo_description,published_revision,published_at FROM doupi_cms_page WHERE page_slug=#{p.slug} AND status='0' AND published_at IS NOT NULL AND published_at<=UTC_TIMESTAMP(3) AND published_revision=revision",P.of("slug",slug));
    }
    public List<Map<String,Object>> sections(long page,long revision) {
        return db.list("SELECT section_id,section_type,section_name,content_data,sort_order FROM doupi_cms_section WHERE page_id=#{p.page} AND revision=#{p.revision} AND is_visible=1 ORDER BY sort_order,section_id",P.of("page",page,"revision",revision));
    }
    public List<Map<String,Object>> campuses() {
        return db.list("SELECT campus_id,campus_name,title,summary,address,contact_phone,cover_image,update_time FROM doupi_recruit_campus WHERE published=1 ORDER BY sort_order,campus_id",Map.of());
    }
    public Map<String,Object> campus(String id) {
        return db.required("SELECT campus_id,campus_name,title,summary,intro,address,latitude,longitude,contact_phone,cover_image,update_time FROM doupi_recruit_campus WHERE campus_id=#{p.id} AND published=1",P.of("id",id));
    }
}
```

**backend/src/main/java/com/doupi/planref/recruit/RecruitService.java**

```java
package com.doupi.planref.recruit;

import com.doupi.planref.*;
import com.doupi.planref.auth.*;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;
import org.springframework.stereotype.Service;

@Service
public class RecruitService {
    private final Db db;private final RecruitRepository repo;private final ExternalCommands commands;private final AuthRepository auth;
    public RecruitService(Db db,RecruitRepository repo,ExternalCommands commands,AuthRepository auth) {this.db=db;this.repo=repo;this.commands=commands;this.auth=auth;}
    public Map<String,Object> rules() {
        Map<String,Object> basic=db.one("SELECT config_value FROM doupi_recruit_config WHERE config_key='basic_config'",Map.of());
        Map<String,Object> slots=db.one("SELECT config_value FROM doupi_recruit_config WHERE config_key='time_slots'",Map.of());
        if(basic.isEmpty()||slots.isEmpty()) throw new Problem(503,"BOOKING_RULES_NOT_CONFIGURED","School booking rules are not configured");
        try {
            Map<String,Object> b=Json.readMap(basic.get("config_value").toString());
            long days=Inputs.positive(b,"openDaysAhead");
            if(days>60||!b.containsKey("needAudit")) throw Problem.bad("Invalid booking rules");
            List<Map<String,Object>> list=Inputs.list(Json.readMap("{\"slots\":"+slots.get("config_value")+"}"),"slots");
            if(list.isEmpty()) throw Problem.bad("No available booking slots");
            Set<String> names=new HashSet<>();
            for(Map<String,Object> s:list) {String name=Inputs.text(s,"name",1,64);if(!names.add(name)) throw Problem.bad("Duplicate slot");Inputs.positive(s,"maxQuota");}
            return P.of("openDaysAhead",days,"needAudit",Inputs.bool(b,"needAudit",true),"timeSlots",list);
        } catch(RuntimeException ex) {throw new Problem(503,"BOOKING_RULES_INVALID","School booking rules require correction");}
    }
    public Map<String,Object> create(Map<String,Object> b,String key) {
        Actor a=Actors.current();if(a.identityId()<=0) throw Problem.forbidden("Controlled visitor session required");
        String student=Inputs.text(b,"studentName",1,64),parent=Inputs.text(b,"parentName",1,64),phone=Inputs.text(b,"parentPhone",11,16);
        if(!phone.matches("\\+?[0-9]{11,15}")) throw Problem.bad("Invalid contact phone");
        String campus=Inputs.text(b,"campusId",1,32),grade=Inputs.text(b,"studentGrade",1,64),slot=Inputs.text(b,"timeSlot",1,64),date=Inputs.text(b,"visitDate",10,10);
        String proof=proof(b),remark=Inputs.optionalText(b,"remark",500); LocalDate visit;
        try {visit=LocalDate.parse(date);} catch(DateTimeParseException ex) {throw Problem.bad("Invalid visit date");}
        LocalDate today=LocalDate.now(ZoneId.of("Asia/Shanghai"));
        return commands.run("IDENTITY:"+a.identityId(),"APPOINTMENT_CREATE",key,b,201,()->{
            Map<String,Object> r=rules();
            if(visit.isBefore(today)||visit.isAfter(today.plusDays(Inputs.number(r.get("openDaysAhead"))))) throw Problem.bad("Date outside booking window");
            long quota=0;
            for(Map<String,Object> s:Inputs.list(r,"timeSlots")) if(slot.equals(s.get("name"))) quota=Inputs.positive(s,"maxQuota");
            if(quota==0) throw Problem.bad("Slot is not open");
            Map<String,Object> c=db.required("SELECT campus_id,campus_name FROM doupi_recruit_campus WHERE campus_id=#{p.campus} AND published=1 FOR UPDATE",P.of("campus",campus));
            Map<String,Object> count=db.required("SELECT COUNT(*) AS used_count FROM doupi_recruit_appointment WHERE campus_id=#{p.campus} AND visit_on=#{p.date} AND time_slot=#{p.slot} AND status IN ('PENDING','APPROVED','VERIFIED')",P.of("campus",campus,"date",date,"slot",slot));
            if(Inputs.number(count.get("used_count"))>=quota) throw Problem.conflict("Booking slot is full");
            Map<String,Object> identity=auth.identity(a.identityId(),false);
            String status=Inputs.bool(r,"needAudit",true)?"PENDING":"APPROVED";
            String no="A"+UUID.randomUUID().toString().replace("-","").substring(0,28);
            String code="APPROVED".equals(status)?UUID.randomUUID().toString().replace("-",""):null;
            Map<String,Object> p=P.of("no",no,"identity",a.identityId(),"hash",ExternalCommands.sha256(proof),"openid","WECHAT".equals(identity.get("provider"))?identity.get("subject_id"):null,
                "status",status,"parent",parent,"phone",phone,"student",student,"grade",grade,"campus",campus,"campusName",c.get("campus_name"),"date",date,"slot",slot,"code",code,
                "channel","WECHAT".equals(identity.get("provider"))?"WECHAT_MINI":"PUBLIC_WEB","key",key,"actor","IDENTITY:"+a.identityId(),"payloadHash",Json.hash(b),"remark",remark);
            long id=db.insert("INSERT INTO doupi_recruit_appointment(appointment_no,visitor_identity_id,public_access_token_hash,openid,status,parent_name,parent_phone,student_name,student_grade,campus_id,campus_name,visit_date,visit_on,time_slot,check_in_code,source_channel,create_key,create_actor_key,payload_hash,remark,version,create_time) "
                + "VALUES(#{p.no},#{p.identity},#{p.hash},#{p.openid},#{p.status},#{p.parent},#{p.phone},#{p.student},#{p.grade},#{p.campus},#{p.campusName},#{p.date},#{p.date},#{p.slot},#{p.code},#{p.channel},#{p.key},#{p.actor},#{p.payloadHash},#{p.remark},0,CURRENT_TIMESTAMP(3))",p);
            repo.audit(id,a,"CREATE",null,status,"Visitor created appointment");
            Map<String,Object> row=repo.appointment(id,false);repo.notifyVisitor(row,"预约已登记","请在本人预约中查询确认状态，未确认前不承诺接待。");
            return repo.view(row,false);
        });
    }
    private String proof(Map<String,Object> b) {
        String s=Inputs.text(b,"querySecret",43,128);
        if(!s.matches("[A-Za-z0-9_-]{43,128}")) throw Problem.bad("Query proof must be cryptographically generated base64url");
        return s;
    }
    private void owner(Map<String,Object> row,Map<String,Object> b) {
        Actor actor=Actors.current();
        if(actor.identityId()<=0 || row.get("visitor_identity_id")==null || Inputs.number(row.get("visitor_identity_id"))!=actor.identityId()) throw new Problem(404,"APPOINTMENT_NOT_FOUND","Appointment or access proof is invalid");
        String no=Inputs.text(b,"appointmentNo",1,32),secret=proof(b);
        if(!no.equals(row.get("appointment_no"))||!ExternalCommands.matches(secret,String.valueOf(row.get("public_access_token_hash"))))
            throw new Problem(404,"APPOINTMENT_NOT_FOUND","Appointment or access proof is invalid");
    }
    public Map<String,Object> query(Map<String,Object> b) {
        String no=Inputs.text(b,"appointmentNo",1,32);proof(b);
        Map<String,Object> row=db.one("SELECT * FROM doupi_recruit_appointment WHERE appointment_no=#{p.no}",P.of("no",no));
        if(row.isEmpty()) throw new Problem(404,"APPOINTMENT_NOT_FOUND","Appointment or access proof is invalid");
        owner(row,b);return repo.view(row,false);
    }
    public Map<String,Object> mine() {
        Actor a=Actors.current();if(a.identityId()<=0) throw Problem.forbidden("Visitor identity required");
        List<Map<String,Object>> items=db.list("SELECT appointment_id,appointment_no,status,campus_name,visit_date,time_slot,version FROM doupi_recruit_appointment WHERE visitor_identity_id=#{p.id} ORDER BY appointment_id DESC LIMIT 100",P.of("id",a.identityId()));
        List<Map<String,Object>> out=new ArrayList<>();
        for(Map<String,Object> row:items) out.add(P.of("appointmentId",String.valueOf(row.get("appointment_id")),"appointmentNo",row.get("appointment_no"),"status",row.get("status"),"campusName",row.get("campus_name"),"visitDate",row.get("visit_date"),"timeSlot",row.get("time_slot"),"version",row.get("version")));
        return P.of("items",out);
    }
    public Map<String,Object> mineDetail(long id) {
        Actor a=Actors.current();Map<String,Object> row=repo.appointment(id,false);
        if(a.identityId()<=0 || row.get("visitor_identity_id")==null || Inputs.number(row.get("visitor_identity_id"))!=a.identityId()) throw Problem.notFound("Appointment not found");
        return repo.view(row,false);
    }
    public Map<String,Object> staffDetail(long id) {
        Actor a=Actors.current();a.require("recruit:appointment:query");Map<String,Object> row=repo.appointment(id,false);repo.staffScope(a,row);return repo.view(row,true);
    }
    public Map<String,Object> cancel(long id,Map<String,Object> b,String key) {
        Map<String,Object> prior=repo.appointment(id,false);owner(prior,b);
        String reason=Inputs.text(b,"reason",1,500);
        return commands.run("IDENTITY:"+Actors.current().identityId(),"APPOINTMENT_CANCEL",key,P.of("appointmentId",id,"body",b),200,()->{
            Map<String,Object> row=repo.appointment(id,true);owner(row,b);
            if("CANCELLED".equals(row.get("status"))) return repo.view(row,false);
            requireVersion(row,b);
            if(!BookingPolicy.canCancel(String.valueOf(row.get("status")))) throw Problem.conflict("Checked-in appointment cannot be cancelled");
            db.write("UPDATE doupi_recruit_appointment SET status='CANCELLED',audit_remark=#{p.reason},check_in_code=NULL,version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"reason",reason));
            Actor a=Actors.current();repo.audit(id,a,"CANCEL",String.valueOf(row.get("status")),"CANCELLED",reason);
            repo.notifyVisitor(row,"预约已取消","本预约已取消，原到校凭证不再有效。");return repo.view(repo.appointment(id,false),false);
        });
    }
    private void requireVersion(Map<String,Object> row,Map<String,Object> b) {
        if(Inputs.nonNegative(b,"expectedVersion")!=Inputs.number(row.get("version"))) throw Problem.conflict("Appointment changed; refresh first");
    }
    public Map<String,Object> staffList() {
        Actor a=Actors.current();a.requireStaff();a.require("recruit:appointment:query");
        Map<String,Object> p=P.of("user",a.userId());
        List<String> placeholders=new ArrayList<>();int n=0;
        for(Long dept:a.scopeDeptIds()) {String k="scope"+(n++);p.put(k,dept);placeholders.add("#{p."+k+"}");}
        String scopes=placeholders.isEmpty()?"1=0":"cs.dept_id IN ("+String.join(",",placeholders)+")";
        String clause=a.allData()?"1=1":"(a.assigned_teacher_user_id=#{p.user} OR EXISTS (SELECT 1 FROM recruit_campus_scope cs WHERE cs.campus_id=a.campus_id AND "+scopes+"))";
        List<Map<String,Object>> visible=new ArrayList<>();
        for(Map<String,Object> row:db.list("SELECT a.* FROM doupi_recruit_appointment a WHERE "+clause+" ORDER BY a.appointment_id DESC LIMIT 100",p)) visible.add(repo.view(row,true));
        return P.of("items",visible);
    }
    public Map<String,Object> staffAction(long id,String action,Map<String,Object> b,String key) {
        Actor a=Actors.current();a.requireStaff();
        String permission=switch(action){case "confirm"->"recruit:appointment:confirm";case "verify"->"recruit:appointment:verify";case "remark"->"recruit:appointment:edit";default->throw Problem.bad("Invalid appointment action");};
        a.require(permission);repo.staffScope(a,repo.appointment(id,false));
        String actionCode=switch(action){case "confirm"->"APPOINTMENT_CONFIRM";case "verify"->"APPOINTMENT_VERIFY";case "remark"->"APPOINTMENT_REMARK";default->throw Problem.bad("Invalid appointment action");};
        return commands.run("STAFF:"+a.userId(),actionCode,key,P.of("appointmentId",id,"body",b),200,()->{
            Map<String,Object> row=repo.appointment(id,true);repo.staffScope(a,row);
            String from=String.valueOf(row.get("status")),to=from,reason;
            if("verify".equals(action)) {
                String code=Inputs.text(b,"checkInCode",1,64);
                if(!ExternalCommands.matches(code,ExternalCommands.sha256(String.valueOf(row.get("check_in_code"))))) throw Problem.bad("Invalid check-in proof");
                boolean change;
                try {change=BookingPolicy.checkInChangesState(from);}catch(IllegalArgumentException ex){throw Problem.conflict("Appointment is not approved for check-in");}
                if(!change) {Map<String,Object> out=repo.view(row,true);out.put("alreadyVerified",true);return out;}
                if(row.get("visit_on")==null || !LocalDate.now(ZoneId.of("Asia/Shanghai")).toString().equals(row.get("visit_on").toString())) throw Problem.conflict("Check-in is only valid on the appointment date");
                requireVersion(row,b);to="VERIFIED";reason="Checked in by authorized staff";
                db.write("UPDATE doupi_recruit_appointment SET status='VERIFIED',verify_time=CURRENT_TIMESTAMP(3),verifier_user_id=#{p.user},verifier=#{p.name},version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"user",a.userId(),"name",Long.toString(a.userId())));
            } else if("confirm".equals(action)) {
                requireVersion(row,b);if(!"PENDING".equals(from)) throw Problem.conflict("Appointment is not pending confirmation");
                String decision=Inputs.text(b,"decision",6,7);reason=Inputs.text(b,"remark",1,500);
                if(!Set.of("APPROVE","REJECT").contains(decision)) throw Problem.bad("Invalid confirmation decision");
                to="APPROVE".equals(decision)?"APPROVED":"CANCELLED";
                Long teacher="APPROVE".equals(decision)?Inputs.id(b,"assignedTeacherUserId"):null;
                if(teacher!=null) {
                    if(teacher!=a.userId()) a.require("recruit:appointment:assign");
                    Actor receiver=auth.staff(teacher,0);receiver.require("recruit:appointment:query");
                    Map<String,Object> target=P.of("assigned_teacher_user_id",null,"campus_id",row.get("campus_id"));
                    repo.staffScope(receiver,target);
                }
                db.write("UPDATE doupi_recruit_appointment SET status=#{p.status},assigned_teacher_user_id=#{p.teacher},teacher_name=(SELECT nick_name FROM sys_user WHERE user_id=#{p.teacher}),audit_remark=#{p.remark},check_in_code=#{p.code},version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"status",to,"teacher",teacher,"remark",reason,"code","APPROVED".equals(to)?UUID.randomUUID().toString().replace("-",""):null));
            } else {
                requireVersion(row,b);reason=Inputs.text(b,"remark",1,500);
                db.write("UPDATE doupi_recruit_appointment SET audit_remark=#{p.remark},version=version+1,update_time=CURRENT_TIMESTAMP(3) WHERE appointment_id=#{p.id}",P.of("id",id,"remark",reason));
            }
            repo.audit(id,a,action.toUpperCase(Locale.ROOT),from,to,reason);
            if(!from.equals(to)) repo.notifyVisitor(row,"预约状态更新","请在本人预约详情查看正式结果。");
            return repo.view(repo.appointment(id,false),true);
        });
    }
}
```

**miniapp/pages/home/index.js**

```javascript
const api = require('../../lib/http');
Page({
  data: { form: { parentName: '', parentPhone: '', studentName: '', studentGrade: '', campusId: '', visitDate: '', timeSlot: '', remark: '' }, campuses: [], rules: null, items: [], staffItems: [], detail: null, me: null, error: '', busy: false, pending: false, bindingName: '', bindingReason: '', checkInCode: '', staffRemark: '', privacy: '', privacyReady: false, articles: [], article: null, messages: [] },
  onLoad() { this.loadPublic(); if (wx.getStorageSync('planref.token')) this.refresh(); },
  async loadPublic() { try { const [campuses, rules, site, articles] = await Promise.all([api.request('/public/campuses'), api.request('/public/appointment-rules'), api.request('/public/site'), api.request('/public/articles')]); this.setData({ campuses: campuses.items, rules, articles: articles.items, privacyReady: !!site.config.privacy_policy, privacy: site.config.privacy_policy || '请向学校获取正式隐私说明后再提交个人信息。' }); } catch (e) { this.fail(e); } },
  async article(e) { try { this.setData({ article: await api.request('/public/articles/' + e.currentTarget.dataset.id) }); } catch (error) { this.fail(error); } },
  fail(e) { this.setData({ error: e.message + (e.traceId ? '（追踪号 ' + e.traceId + '）' : '') }); },
  input(e) { this.setData({ ['form.' + e.currentTarget.dataset.field]: e.detail.value }); },
  text(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }); },
  async signIn() { try { this.setData({ me: await api.login(), error: '' }); await this.refresh(); } catch (e) { this.fail(e); } },
  async refresh() { try { const me = await api.request('/auth/me'); const mine = await api.request('/visitor/appointments'); this.setData({ messages: (await api.request('/visitor/notifications')).items, me, items: mine.items, pending: !!wx.getStorageSync('planref.create') }); if (me.kind === 'STAFF' && (me.permissions.includes('*') || me.permissions.includes('recruit:appointment:query'))) this.setData({ staffItems: (await api.request('/staff/appointments')).items }); } catch (e) { this.fail(e); } },
  async create() {
    this.setData({ busy: true, error: '' });
    try {
      if (!this.data.me) throw new Error('请先微信登录');
      if (!this.data.privacyReady) throw new Error('学校尚未发布正式隐私说明，请先联系学校');
      const confirmation = await new Promise(resolve => wx.showModal({ title: '确认提交访校资料', content: '我已阅读页面隐私说明，同意学校为访校接待使用本次填写的联系人和学生信息。', success: resolve }));
      if (!confirmation.confirm) return;
      let pending = wx.getStorageSync('planref.create');
      const body = pending ? pending.body : { ...this.data.form, querySecret: await api.randomSecret() };
      const result = await api.command('/public/appointments', body, 'planref.create');
      const proofs = wx.getStorageSync('planref.proofs') || {}; proofs[result.appointmentId] = { appointmentNo: result.appointmentNo, querySecret: body.querySecret }; wx.setStorageSync('planref.proofs', proofs);
      this.setData({ detail: result, pending: false }); await this.refresh();
    } catch (e) { this.fail(e); } finally { this.setData({ busy: false, pending: !!wx.getStorageSync('planref.create') }); }
  },
  async detail(e) { try { this.setData({ detail: await api.request('/visitor/appointments/' + e.currentTarget.dataset.id), error: '' }); } catch (e) { this.fail(e); } },
  async cancel() { try { const d = this.data.detail, proof = (wx.getStorageSync('planref.proofs') || {})[d.appointmentId]; if (!proof) throw new Error('本机无查询凭证，请联系学校核实后取消'); this.setData({ detail: await api.command('/public/appointments/' + d.appointmentId + '/cancel', { ...proof, expectedVersion: d.version, reason: '家长取消预约' }, 'planref.cancel.' + d.appointmentId) }); await this.refresh(); } catch (e) { this.fail(e); } },
  async applyBinding() { try { const r = await api.command('/auth/employee-bindings', { username: this.data.bindingName, reason: this.data.bindingReason }, 'planref.binding'); this.setData({ error: '学校核实中：' + r.status }); } catch (e) { this.fail(e); } },
  async staffDetail(e) { try { this.setData({ detail: null, staffDetail: await api.request('/staff/appointments/' + e.currentTarget.dataset.id) }); } catch (e) { this.fail(e); } },
  async staffAction(e) { const d = this.data.staffDetail, action = e.currentTarget.dataset.action; try { const body = { expectedVersion: d.version, ...(action === 'verify' ? { checkInCode: this.data.checkInCode } : { remark: this.data.staffRemark }), ...(action === 'confirm' ? { decision: 'APPROVE', assignedTeacherUserId: this.data.me.userId } : {}) }; this.setData({ staffDetail: await api.command('/staff/appointments/' + d.appointmentId + '/' + action, body, 'planref.staff.' + action + '.' + d.appointmentId) }); await this.refresh(); } catch (e) { this.fail(e); } },
  async readMessage(e) { try { await api.command('/visitor/notifications/' + e.currentTarget.dataset.id + '/read', {}, 'planref.read.' + e.currentTarget.dataset.id); await this.refresh(); } catch (error) { this.fail(error); } },
  async subscribe() { try { const capabilities = await api.request('/public/subscription-capabilities'); if (!capabilities.templateIds.length) throw new Error('学校尚未配置订阅模板，预约结果可在本人预约查看'); const templateId = capabilities.templateIds[0]; const result = await new Promise((resolve, reject) => wx.requestSubscribeMessage({ tmplIds: [templateId], success: resolve, fail: reject })); if (['accept', 'reject', 'ban'].includes(result[templateId])) { await api.command('/visitor/subscription-consents', { templateId, decision: result[templateId] }, 'planref.consent'); this.setData({ error: '已记录本次选择；当前未启用外部发送，请查看站内预约结果。' }); } } catch (e) { this.fail(e); } },
  async logout() { try { if (wx.getStorageSync('planref.create')) throw new Error('预约结果仍未确认，请先原键重试或联系学校核实'); await api.request('/auth/logout', 'POST'); wx.removeStorageSync('planref.token'); wx.removeStorageSync('planref.proofs'); this.setData({ me: null, items: [], staffItems: [], detail: null, staffDetail: null }); } catch (e) { this.fail(e); } }
});
```

**miniapp/pages/home/index.wxml**

```xml
<view class="page">
  <view class="title">访校预约</view><text selectable>{{privacy}}</text>
  <view wx:if="{{error}}" role="alert">{{error}}</view>
  <button bindtap="signIn">微信登录／核实后重新登录</button><button wx:if="{{me}}" bindtap="logout">退出</button>
  <view wx:if="{{me}}">身份：{{me.kind}}；员工权限由学校核实</view>
  <view>正式资讯</view><view wx:for="{{articles}}" wx:key="articleId" data-id="{{item.articleId}}" bindtap="article">{{item.title}} {{item.publishedAt}}</view><text wx:if="{{article}}" selectable>{{article.title}}：{{article.content}}</text>
  <view>公开校区</view><view wx:for="{{campuses}}" wx:key="campus_id">{{item.campus_name}}：{{item.address}}（校区ID {{item.campus_id}}）</view>
  <view wx:if="{{rules}}">可预约未来{{rules.openDaysAhead}}天；待确认不等于已安排。<text wx:for="{{rules.timeSlots}}" wx:key="name">时段：{{item.name}} </text></view>
  <input disabled="{{pending}}" placeholder="联系人" data-field="parentName" bindinput="input"/><input disabled="{{pending}}" placeholder="联系电话" type="number" data-field="parentPhone" bindinput="input"/>
  <input disabled="{{pending}}" placeholder="学生姓名" data-field="studentName" bindinput="input"/><input disabled="{{pending}}" placeholder="意向年级" data-field="studentGrade" bindinput="input"/>
  <input disabled="{{pending}}" placeholder="以上公开校区ID" data-field="campusId" bindinput="input"/><input disabled="{{pending}}" placeholder="日期YYYY-MM-DD" data-field="visitDate" bindinput="input"/>
  <input disabled="{{pending}}" placeholder="以上开放时段名称" data-field="timeSlot" bindinput="input"/><input disabled="{{pending}}" placeholder="咨询需求（可选）" data-field="remark" bindinput="input"/>
  <button loading="{{busy}}" disabled="{{busy}}" bindtap="create">{{pending ? '原键重试结果未明的预约' : '确认隐私说明并提交预约'}}</button>
  <button bindtap="refresh">刷新本人预约</button><view wx:for="{{items}}" wx:key="appointmentId" data-id="{{item.appointmentId}}" bindtap="detail">{{item.appointmentNo}} {{item.status}} {{item.visitDate}} {{item.timeSlot}}</view>
  <view wx:if="{{detail}}"><text selectable>预约{{detail.appointmentNo}}：{{detail.status}}；接待人 {{detail.assignedTeacherName || '待分配'}}；到校时间 {{detail.verifiedAt || '未到校'}}；有效到校凭证 {{detail.checkInCode || '尚无有效凭证'}}</text><button wx:if="{{detail.status === 'PENDING' || detail.status === 'APPROVED'}}" bindtap="cancel">取消该预约</button></view>
  <view wx:for="{{messages}}" wx:key="notification_id" data-id="{{item.notification_id}}" bindtap="readMessage">{{item.title}}：{{item.content}}（{{item.is_read ? '已读' : '未读'}}）</view>
  <button bindtap="subscribe">选择订阅提醒</button>
  <view>员工绑定申请（须由另一位学校核实人审核）</view><input placeholder="学校账号" data-field="bindingName" bindinput="text"/><input placeholder="核实依据说明" data-field="bindingReason" bindinput="text"/><button bindtap="applyBinding">申请核实</button>
  <view wx:if="{{me.kind === 'STAFF'}}"><view>授权接待事项</view><view wx:for="{{staffItems}}" wx:key="appointmentId" data-id="{{item.appointmentId}}" bindtap="staffDetail">{{item.appointmentNo}} {{item.status}}</view>
  <view wx:if="{{staffDetail}}">{{staffDetail.appointmentNo}} {{staffDetail.parentName}} {{staffDetail.parentPhone}}<input placeholder="学校处理备注" data-field="staffRemark" bindinput="text"/><button wx:if="{{staffDetail.status === 'PENDING'}}" data-action="confirm" bindtap="staffAction">确认由本人接待</button><input placeholder="现场家长出示的凭证" data-field="checkInCode" bindinput="text"/><button data-action="verify" bindtap="staffAction">核验到校</button><button data-action="remark" bindtap="staffAction">保存接待备注</button></view></view>
</view>
```

**miniapp/pages/home/index.wxss**

```css
page { background:#f5f7fa;color:#182c32;font-size:30rpx } .page {padding:32rpx} .title{font-size:44rpx;font-weight:600;margin-bottom:24rpx} input{background:white;padding:20rpx;margin:16rpx 0;border:1rpx solid #ccd7dc} button{margin:16rpx 0} text{display:block;margin:12rpx 0;white-space:pre-wrap}
```



## 6. 边界与异常场景处理

- 公共响应不得含对象存储私有key、员工手机号、密码、draft、原稿URL；静态公开图片与办公原稿分开。
- 公开空列表明确无内容；规则空缺503，不能生成默认开放日或展示虚构最新资讯。
- 内容发布后清理现有公开缓存；参考服务直接查库确保后台更正立即可见，未来缓存必须以发布版本为键并在发布后失效。
- 云存储fileID逐项盘点和回归后迁移；真机弱网、图片失效、文章为空均有可见错误，不把加载占位当真实内容。
