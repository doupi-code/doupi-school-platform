package com.doupi.cms.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.core.page.TableDataInfo;
import com.doupi.common.enums.BusinessType;
import com.doupi.cms.domain.*;
import com.doupi.cms.service.ICmsPortalService;

/**
 * 官网CMS管理后台服务控制器 (doupi-cms独立模块)
 * 路由前缀: /cms
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/cms")
public class CmsPortalController extends BaseController
{
    @Autowired
    private ICmsPortalService portalService;

    // ==================== 1. 门户参数 ====================

    @GetMapping("/config")
    @PreAuthorize("@ss.hasPermi('cms:config:list')")
    public AjaxResult getConfig()
    {
        return success(portalService.getSiteConfig());
    }

    @Log(title = "官网门户参数", businessType = BusinessType.UPDATE)
    @PutMapping("/config")
    @PreAuthorize("@ss.hasPermi('cms:config:edit')")
    public AjaxResult updateConfig(@RequestBody Map<String, Object> data)
    {
        portalService.updateSiteConfig(data);
        return success("官网门户参数已成功同步并发布！");
    }

    // ==================== 2. 公文与资讯 ====================

    @GetMapping("/article/list")
    @PreAuthorize("@ss.hasPermi('cms:article:list')")
    public TableDataInfo listArticle(CmsArticle article)
    {
        List<CmsArticle> list = portalService.selectArticleList(article);
        return getDataTable(list);
    }

    @GetMapping("/article/{articleId}")
    @PreAuthorize("@ss.hasPermi('cms:article:list')")
    public AjaxResult getArticle(@PathVariable Long articleId)
    {
        return success(portalService.selectArticleById(articleId));
    }

    @Log(title = "官网公文资讯", businessType = BusinessType.INSERT)
    @PostMapping("/article")
    @PreAuthorize("@ss.hasPermi('cms:article:add')")
    public AjaxResult addArticle(@RequestBody CmsArticle article)
    {
        article.setCreateBy(getUsername());
        return toAjax(portalService.insertArticle(article));
    }

    @Log(title = "官网公文资讯", businessType = BusinessType.UPDATE)
    @PutMapping("/article")
    @PreAuthorize("@ss.hasPermi('cms:article:edit')")
    public AjaxResult editArticle(@RequestBody CmsArticle article)
    {
        article.setUpdateBy(getUsername());
        return toAjax(portalService.updateArticle(article));
    }

    @Log(title = "官网公文资讯", businessType = BusinessType.DELETE)
    @DeleteMapping("/article/{articleIds}")
    @PreAuthorize("@ss.hasPermi('cms:article:remove')")
    public AjaxResult removeArticle(@PathVariable Long[] articleIds)
    {
        return toAjax(portalService.deleteArticleByIds(articleIds));
    }

    // ==================== 3. 名师天团 ====================

    @GetMapping("/teacher/list")
    @PreAuthorize("@ss.hasPermi('cms:teacher:list')")
    public TableDataInfo listTeacher(CmsTeacher teacher)
    {
        List<CmsTeacher> list = portalService.selectTeacherList(teacher);
        return getDataTable(list);
    }

    @GetMapping("/teacher/{teacherId}")
    @PreAuthorize("@ss.hasPermi('cms:teacher:list')")
    public AjaxResult getTeacher(@PathVariable Long teacherId)
    {
        return success(portalService.selectTeacherById(teacherId));
    }

    @Log(title = "官网名师天团", businessType = BusinessType.INSERT)
    @PostMapping("/teacher")
    @PreAuthorize("@ss.hasPermi('cms:teacher:add')")
    public AjaxResult addTeacher(@RequestBody CmsTeacher teacher)
    {
        return toAjax(portalService.insertTeacher(teacher));
    }

    @Log(title = "官网名师天团", businessType = BusinessType.UPDATE)
    @PutMapping("/teacher")
    @PreAuthorize("@ss.hasPermi('cms:teacher:edit')")
    public AjaxResult editTeacher(@RequestBody CmsTeacher teacher)
    {
        return toAjax(portalService.updateTeacher(teacher));
    }

    @Log(title = "官网名师天团", businessType = BusinessType.DELETE)
    @DeleteMapping("/teacher/{teacherIds}")
    @PreAuthorize("@ss.hasPermi('cms:teacher:remove')")
    public AjaxResult removeTeacher(@PathVariable Long[] teacherIds)
    {
        return toAjax(portalService.deleteTeacherByIds(teacherIds));
    }

    // ==================== 4. 校园设施 ====================

    @GetMapping("/facility/list")
    @PreAuthorize("@ss.hasPermi('cms:facility:list')")
    public TableDataInfo listFacility(CmsFacility facility)
    {
        List<CmsFacility> list = portalService.selectFacilityList(facility);
        return getDataTable(list);
    }

    @GetMapping("/facility/{facilityId}")
    @PreAuthorize("@ss.hasPermi('cms:facility:list')")
    public AjaxResult getFacility(@PathVariable Long facilityId)
    {
        return success(portalService.selectFacilityById(facilityId));
    }

    @Log(title = "官网校园设施", businessType = BusinessType.INSERT)
    @PostMapping("/facility")
    @PreAuthorize("@ss.hasPermi('cms:facility:add')")
    public AjaxResult addFacility(@RequestBody CmsFacility facility)
    {
        return toAjax(portalService.insertFacility(facility));
    }

    @Log(title = "官网校园设施", businessType = BusinessType.UPDATE)
    @PutMapping("/facility")
    @PreAuthorize("@ss.hasPermi('cms:facility:edit')")
    public AjaxResult editFacility(@RequestBody CmsFacility facility)
    {
        return toAjax(portalService.updateFacility(facility));
    }

    @Log(title = "官网校园设施", businessType = BusinessType.DELETE)
    @DeleteMapping("/facility/{facilityIds}")
    @PreAuthorize("@ss.hasPermi('cms:facility:remove')")
    public AjaxResult removeFacility(@PathVariable Long[] facilityIds)
    {
        return toAjax(portalService.deleteFacilityByIds(facilityIds));
    }

    // ==================== 5. 轮播横幅 ====================

    @GetMapping("/banner/list")
    @PreAuthorize("@ss.hasPermi('cms:banner:list')")
    public TableDataInfo listBanner(CmsBanner banner)
    {
        List<CmsBanner> list = portalService.selectBannerList(banner);
        return getDataTable(list);
    }

    @GetMapping("/banner/{bannerId}")
    @PreAuthorize("@ss.hasPermi('cms:banner:list')")
    public AjaxResult getBanner(@PathVariable Long bannerId)
    {
        return success(portalService.selectBannerById(bannerId));
    }

    @Log(title = "官网轮播横幅", businessType = BusinessType.INSERT)
    @PostMapping("/banner")
    @PreAuthorize("@ss.hasPermi('cms:banner:add')")
    public AjaxResult addBanner(@RequestBody CmsBanner banner)
    {
        return toAjax(portalService.insertBanner(banner));
    }

    @Log(title = "官网轮播横幅", businessType = BusinessType.UPDATE)
    @PutMapping("/banner")
    @PreAuthorize("@ss.hasPermi('cms:banner:edit')")
    public AjaxResult editBanner(@RequestBody CmsBanner banner)
    {
        return toAjax(portalService.updateBanner(banner));
    }

    @Log(title = "官网轮播横幅", businessType = BusinessType.DELETE)
    @DeleteMapping("/banner/{bannerIds}")
    @PreAuthorize("@ss.hasPermi('cms:banner:remove')")
    public AjaxResult removeBanner(@PathVariable Long[] bannerIds)
    {
        return toAjax(portalService.deleteBannerByIds(bannerIds));
    }

    // ==================== 6. 常见问答 ====================

    @GetMapping("/faq/list")
    @PreAuthorize("@ss.hasPermi('cms:faq:list')")
    public TableDataInfo listFaq(CmsFaq faq)
    {
        List<CmsFaq> list = portalService.selectFaqList(faq);
        return getDataTable(list);
    }

    @GetMapping("/faq/{faqId}")
    @PreAuthorize("@ss.hasPermi('cms:faq:list')")
    public AjaxResult getFaq(@PathVariable Long faqId)
    {
        return success(portalService.selectFaqById(faqId));
    }

    @Log(title = "官网常见问答", businessType = BusinessType.INSERT)
    @PostMapping("/faq")
    @PreAuthorize("@ss.hasPermi('cms:faq:add')")
    public AjaxResult addFaq(@RequestBody CmsFaq faq)
    {
        return toAjax(portalService.insertFaq(faq));
    }

    @Log(title = "官网常见问答", businessType = BusinessType.UPDATE)
    @PutMapping("/faq")
    @PreAuthorize("@ss.hasPermi('cms:faq:edit')")
    public AjaxResult editFaq(@RequestBody CmsFaq faq)
    {
        return toAjax(portalService.updateFaq(faq));
    }

    @Log(title = "官网常见问答", businessType = BusinessType.DELETE)
    @DeleteMapping("/faq/{faqIds}")
    @PreAuthorize("@ss.hasPermi('cms:faq:remove')")
    public AjaxResult removeFaq(@PathVariable Long[] faqIds)
    {
        return toAjax(portalService.deleteFaqByIds(faqIds));
    }
}
