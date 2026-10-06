package com.doupi.cms.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.cms.domain.*;
import com.doupi.cms.service.ICmsPortalService;
import com.doupi.cms.service.ICmsPageBuilderService;

/**
 * 官网公共门户数据接口 (免登录游客访问)
 * 路由前缀: /api/public/v1/cms
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/api/public/v1/cms")
public class CmsPublicController extends BaseController
{
    @Autowired
    private ICmsPortalService portalService;

    @Autowired
    private ICmsPageBuilderService pageBuilderService;

    /**
     * 获取全局公共配置 (header/footer/seo)
     */
    @GetMapping("/global/{category}")
    public AjaxResult getGlobalLayout(@PathVariable String category)
    {
        CmsGlobal global = pageBuilderService.getGlobal(category);
        return AjaxResult.success("操作成功", global != null ? global.getConfigContent() : null);
    }

    /**
     * 核心全站聚合渲染接口 (按路由slug获取页面SEO、Header、Footer及已排序Sections)
     */
    @GetMapping("/page-render")
    public AjaxResult getPageRender(@RequestParam(value = "slug", defaultValue = "/") String slug)
    {
        return success(pageBuilderService.renderPage(slug));
    }

    @GetMapping("/site")
    public AjaxResult getSite()
    {
        return success(portalService.getSiteConfig());
    }

    @GetMapping("/articles")
    public AjaxResult getArticles(CmsArticle article)
    {
        article.setStatus("0");
        return success(portalService.selectArticleList(article));
    }

    @GetMapping("/articles/{articleId}")
    public AjaxResult getArticle(@PathVariable Long articleId)
    {
        return success(portalService.selectArticleById(articleId));
    }

    @GetMapping("/teachers")
    public AjaxResult getTeachers(CmsTeacher teacher)
    {
        teacher.setStatus("0");
        return success(portalService.selectTeacherList(teacher));
    }

    @GetMapping("/facilities")
    public AjaxResult getFacilities(CmsFacility facility)
    {
        facility.setStatus("0");
        return success(portalService.selectFacilityList(facility));
    }

    @GetMapping("/banners")
    public AjaxResult getBanners(CmsBanner banner)
    {
        banner.setStatus("0");
        return success(portalService.selectBannerList(banner));
    }

    @GetMapping("/faqs")
    public AjaxResult getFaqs(CmsFaq faq)
    {
        faq.setStatus("0");
        return success(portalService.selectFaqList(faq));
    }
}
