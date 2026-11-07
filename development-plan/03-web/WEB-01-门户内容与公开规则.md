# WEB-01 门户正式内容、校区与公开规则

## 1. 模块功能边界

进度与完成记录：以[根开发计划的唯一状态主表](../../开发计划.md#web-01)为准；本节复选框只记录模块内任务，不另建模块状态。全部验收通过后，须在主表填写完成日期（YYYY-MM-DD）和可核查的验收证据链接，再勾选模块。已有基础、文档整理或参考验证均不代表业务验收完成。

实施路径与公共约定：下列路径是待实施文件或第5节已内嵌代码的逻辑位置；公共Java组件、认证及命令边界见[公共契约](../00-shared/公共契约.md)。本轮不创建独立工程或实现源码。

**P0，3个工作日。** 一名单人Java开发者结合AI负责Java、React页面、联调与自测；不假设独立前端或QA团队。保留React19、TypeScript6、Vite8、AntD6、Tailwind4、Router7和Zustand5既有工程，不为此次预约统一规则整体重建门户。App仍为P1。

覆盖学校介绍、正式资讯、校区、招生指引、联系方式与访校入口。与小程序读同一CMS正式投影及预约规则；不将示例战报当真实成绩，不向公开端输出学校内部通知、公文原稿或行政台账。首期保留现有导航与布局，逐页替换公开数据和空状态。

文件路径与任务：

- [ ] `doupi-web-client-react/src/`现有公开页面、API客户端与路由：连接公开接口，保留Router7，清理示例内容伪装最新公告的展示。
- [ ] `backend/src/main/java/com/doupi/planref/publicsite/{PublicController,PublicService,PublicRepository}.java`：正式发布过滤、字段白名单与稳定游标。
- [ ] `web/src/{api.ts,main.tsx,style.css}`：正式资讯、校区、预约入口与可访问空状态；不用dangerouslySetInnerHTML注入未净化内容。
- [ ] `web/vite.config.mjs`：仅开发代理；生产Nginx保留/api/v1，不修改API前缀。

依赖：执行顺序在ADM-18完成后进入本模块；P0公开读取不以P1内容审核功能为必要前提，ADM-13复用的现有发布能力即可供P0读取。另依赖校区及时间段配置、MINI-03共享字段契约与公共素材安全发布。需要真实隐私说明、联系方式和学校批准的资料。

验收：匿名仅见已发布；未发布/撤下文章404；翻页无重复游标；后台发布/撤回后Web和小程序一致；无真实内容不回退到虚构宣传；学校内资料和未公开文件绝不出现。

## 2. 接口设计清单

接口统一`/api/v1`，响应`{code:int,msg:string,traceId:string,replayed:boolean,data:object}`；BIGINT标识字符串。鉴权接口的受控访客JWT为Authorization:string必填，写命令Idempotency-Key:string(8..64)必填。Web访客会话独立签发，不能继承后台员工JWT；客户端身份和手机号不授权。

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

参考Web为独立React19／TypeScript6／Vite8可运行项目：安装自身package.json依赖，配置后端环境，运行`npm run dev`，Vite将`/api/v1`代理到18080。部署由Nginx保留此前缀。Java层为Java17、Boot4.0.3、MyBatis4.0.1，依赖公共Db/Inputs/Json/Actors等契约。参考表单使用原生控件便于独立验证，正式页面沿用AntD/Tailwind与已有视觉。



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

**web/package.json**

```json
{
  "name": "planref-portal",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc --noEmit && vite build"
  },
  "dependencies": {
    "react": "19.3.0",
    "react-dom": "19.3.0"
  },
  "devDependencies": {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    "typescript": "6.0.3",
    "vite": "8.3.1"
  }
}
```

**web/tsconfig.json**

```json
{"compilerOptions":{"target":"ES2022","lib":["ES2022","DOM"],"jsx":"react-jsx","module":"ESNext","moduleResolution":"Bundler","strict":true,"noEmit":true,"skipLibCheck":true},"include":["src"]}
```

**web/vite.config.mjs**

```text
export default { server: { proxy: { '/api/v1': 'http://127.0.0.1:18080' } } };
```

**web/index.html**

```html
<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>学校访校预约参考</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
```

**web/src/api.ts**

```typescript
export type Row = Record<string, any>;
export class ApiError extends Error { constructor(public status: number, message: string, public traceId?: string) { super(message); } }
export async function request(path: string, method = 'GET', body?: Row, key?: string): Promise<Row> {
  const token = sessionStorage.getItem('planref.token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token && !['/auth/visitor','/auth/wechat','/auth/login'].includes(path)) headers.Authorization = 'Bearer ' + token;
  if (key) headers['Idempotency-Key'] = key;
  let response: Response;
  try { response = await fetch('/api/v1' + path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store', signal: AbortSignal.timeout(12000), credentials: 'omit' }); }
  catch { throw new Error('网络未确认结果，请保留原命令重试'); }
  const envelope = await response.json();
  if (!response.ok) { if (response.status === 401) sessionStorage.removeItem('planref.token'); throw new ApiError(response.status, envelope.msg || '请求失败', envelope.traceId); }
  return envelope.data;
}
export function secret(): string { const bytes = crypto.getRandomValues(new Uint8Array(32)); return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
export async function ensureVisitor(): Promise<void> {
  const unresolvedCreate = !!sessionStorage.getItem('planref.create');
  if (sessionStorage.getItem('planref.token')) {
    try { const me=await request('/auth/me'); if(me.kind==='VISITOR') return; }
    catch(error) { if(!(error instanceof ApiError) || error.status!==401) throw error; }
    if(unresolvedCreate) throw new Error('原访客会话已失效，预约结果仍未确认，请联系学校核实后再提交');
    sessionStorage.removeItem('planref.token');
  }
  if(unresolvedCreate) throw new Error('原访客会话已失效，预约结果仍未确认，请联系学校核实后再提交');
  const session=await request('/auth/visitor','POST');
  if(session.kind!=='VISITOR') throw new Error('访客会话类型错误');
  sessionStorage.setItem('planref.token',session.token);
}
export async function command(path: string, body: Row, slot: string): Promise<Row> {
  const raw = sessionStorage.getItem(slot); const pending = raw ? JSON.parse(raw) : { key: secret(), body };
  if (!raw) sessionStorage.setItem(slot,JSON.stringify(pending));
  try { const data = await request(path,'POST',pending.body,pending.key); sessionStorage.removeItem(slot); return data; }
  catch (error) { if (error instanceof ApiError && error.status >= 400 && error.status < 500 && ![401,403].includes(error.status)) sessionStorage.removeItem(slot); throw error; }
}
```

**web/src/env.d.ts**

```typescript
/// <reference types="vite/client" />
```

**web/src/main.tsx**

```tsx
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { request, command, ensureVisitor, secret, type Row } from './api';
import './style.css';
function App() {
 const [site,setSite]=useState<Row>({}),[campuses,setCampuses]=useState<Row[]>([]),[articles,setArticles]=useState<Row[]>([]),[article,setArticle]=useState<Row|null>(null),[rules,setRules]=useState<Row|null>(null),[result,setResult]=useState<Row|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[pending,setPending]=useState(!!sessionStorage.getItem('planref.create'));
 const [form,setForm]=useState<Row>({parentName:'',parentPhone:'',studentName:'',studentGrade:'',campusId:'',visitDate:'',timeSlot:'',remark:''}),[accepted,setAccepted]=useState(false),[no,setNo]=useState(''),[proof,setProof]=useState('');
 function fail(e: unknown) {setError(e instanceof Error?e.message:'请求失败');}
 useEffect(()=>{ Promise.all([request('/public/site'),request('/public/campuses'),request('/public/articles'),request('/public/appointment-rules')]).then(([s,c,a,r])=>{setSite(s.config);setCampuses(c.items);setArticles(a.items);setRules(r);}).catch(fail); },[]);
 async function create(e: React.FormEvent) {
  e.preventDefault();setBusy(true);setError('');
  try {
   if(!accepted) throw new Error('请阅读并确认学校隐私说明');
   await ensureVisitor();const raw=sessionStorage.getItem('planref.create');const body=raw?JSON.parse(raw).body:{...form,querySecret:secret()};
   const data=await command('/public/appointments',body,'planref.create');sessionStorage.setItem('planref.proof.'+data.appointmentId,JSON.stringify({appointmentNo:data.appointmentNo,querySecret:body.querySecret}));setResult(data);setNo(data.appointmentNo);setProof(body.querySecret);
  }catch(e){fail(e);}finally{setBusy(false);setPending(!!sessionStorage.getItem('planref.create'));}
 }
 async function query(e: React.FormEvent) { e.preventDefault();try{await ensureVisitor();setResult(await request('/public/appointments/query','POST',{appointmentNo:no,querySecret:proof}));setError('');}catch(e){fail(e);} }
 async function cancel() {if(!result)return;try{const body={appointmentNo:no,querySecret:proof,expectedVersion:result.version,reason:'联系人取消预约'};setResult(await command('/public/appointments/'+result.appointmentId+'/cancel',body,'planref.cancel.'+result.appointmentId));setError('');}catch(e){fail(e);}}
 const field=(name:string,label:string,type='text')=><label>{label}<input required={name!=='remark'} type={type} value={form[name]} disabled={pending||busy} onChange={e=>setForm({...form,[name]:e.target.value})}/></label>;
 return <main><header><h1>{site.site_name||'学校公开信息'}</h1><p>{site.slogan}</p><p>{site.address} {site.hotlines}</p></header>
  {error&&<p role="alert">{error}</p>}<section><h2>正式资讯</h2>{articles.map(a=><article key={a.articleId}><button onClick={()=>request('/public/articles/'+a.articleId).then(setArticle).catch(fail)}>{a.title}</button><p>{a.summary}</p><time>{a.publishedAt}</time></article>)}{article&&<article><h3>{article.title}</h3><p className="content">{article.content}</p></article>}</section>
  <section><h2>公开校区</h2>{campuses.map(c=><article key={c.campus_id}><h3>{c.campus_name}</h3><p>{c.summary}</p><p>{c.address} {c.contact_phone}</p></article>)}</section>
  <section><h2>访校预约</h2><p>待确认不等于已经安排接待。{rules&&`开放未来${rules.openDaysAhead}天。`}</p><form onSubmit={create}>{field('parentName','联系人')}{field('parentPhone','联系电话','tel')}{field('studentName','学生姓名')}{field('studentGrade','意向年级')}<label>校区<select required disabled={pending||busy} value={form.campusId} onChange={e=>setForm({...form,campusId:e.target.value})}><option value="">请选择</option>{campuses.map(c=><option key={c.campus_id} value={c.campus_id}>{c.campus_name}</option>)}</select></label>{field('visitDate','期望日期','date')}<label>开放时段<select required disabled={pending||busy} value={form.timeSlot} onChange={e=>setForm({...form,timeSlot:e.target.value})}><option value="">请选择</option>{rules?.timeSlots.map((s:Row)=><option key={s.name}>{s.name}</option>)}</select></label>{field('remark','咨询需求（可选）')}<p className="content">{site.privacy_policy||'学校未发布正式隐私说明，当前不能提交个人信息。'}</p><label><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/>我已阅读学校隐私说明</label><button disabled={busy||!site.privacy_policy}>{pending?'原键重试结果未明的预约':'提交预约'}</button></form></section>
  <section><h2>本人预约查询</h2><p>预约号、凭证和本浏览器访客会话共同核验。会话失效或凭证遗失请联系学校，不按手机号公开查单。</p><form onSubmit={query}><label>预约号<input required value={no} onChange={e=>setNo(e.target.value)}/></label><label>本次查询凭证<input required type="password" autoComplete="off" value={proof} onChange={e=>setProof(e.target.value)}/></label><button>查询本人预约</button></form>{result&&<article><p>{result.appointmentNo}：{result.status}</p><p>{result.campusName} {result.visitDate} {result.timeSlot}</p><p>接待人：{result.assignedTeacherName||'待分配'}；到校时间：{result.verifiedAt||'未到校'}</p><p>有效到校凭证：{result.checkInCode||'尚无有效凭证'}</p>{['PENDING','APPROVED'].includes(result.status)&&<button onClick={cancel}>取消该预约</button>}</article>}</section>
  <footer><p>个人信息用于学校访校接待。未经学校核实无法取得员工身份。</p><p>{site.icp}</p><button onClick={async()=>{try{if(sessionStorage.getItem('planref.create'))throw new Error('预约结果仍未确认，请先原键重试或联系学校核实');await request('/auth/logout','POST');Object.keys(sessionStorage).filter(key=>key.startsWith('planref.')).forEach(key=>sessionStorage.removeItem(key));setResult(null);setProof('');}catch(e){fail(e);}}}>退出并清除此页会话</button></footer>
 </main>;
}
createRoot(document.getElementById('root')!).render(<App/>);
```

**web/src/style.css**

```css
*{box-sizing:border-box}body{margin:0;background:#f4f7f7;color:#193333;font:16px/1.6 system-ui,sans-serif}main{max-width:1000px;margin:auto;padding:24px}header,section,footer{padding:24px;background:#fff;margin-bottom:20px;border-radius:12px}h1,h2,h3{line-height:1.25}form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}label{display:flex;flex-direction:column;gap:6px}input,select,button{font:inherit;min-height:44px;padding:8px;border:1px solid #8babab;border-radius:6px}button{cursor:pointer;background:#e4f1ed}input[type=checkbox]{width:24px;min-height:24px}.content{white-space:pre-wrap;overflow-wrap:anywhere}article{padding:12px 0;border-bottom:1px solid #dae4e4}[role=alert]{color:#9c250f;padding:12px;background:#ffebe4}button:disabled{opacity:.6;cursor:wait}:focus-visible{outline:3px solid #0a7262;outline-offset:3px}@media(max-width:640px){main{padding:12px}header,section,footer{padding:16px}form{grid-template-columns:1fr}}
```



## 6. 边界与异常场景处理

- 文章不存在、未发布或未来发布统一404；公开空列表显示无内容，不补虚构公告。
- CMS发布内容必须在后台安全处理；参考Web用React文本节点渲染正文，不能直接注入原始HTML；公共图片不能引用office私有文件路径。
- 发布修订变化不复用旧缓存；参考工程直接查库，后续缓存须以发布修订为键且撤下立即失效。
- 预约规则缺失503，禁用可提交入口并显示联系学校；校区未公开不得成为预约选项。
- 移动端窄屏、键盘导航、文本缩放、空内容、加载失败都显示真实状态，不以静态页面渲染成功替代业务验收。
