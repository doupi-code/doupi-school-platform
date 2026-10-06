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
import com.doupi.cms.service.ICmsPageBuilderService;

/**
 * 官网全站可视化页面搭建 (Page Builder) 后台管理控制器
 * 路由前缀: /cms/builder
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/cms/builder")
public class CmsPageBuilderController extends BaseController
{
    @Autowired
    private ICmsPageBuilderService builderService;

    // ================= 1. 全局布局管理 (Header / Footer / SEO) =================

    @GetMapping("/global/{category}")
    @PreAuthorize("@ss.hasPermi('cms:config:list')")
    public AjaxResult getGlobal(@PathVariable String category)
    {
        return success(builderService.getGlobal(category));
    }

    @Log(title = "官网全局布局配置", businessType = BusinessType.UPDATE)
    @PutMapping("/global")
    @PreAuthorize("@ss.hasPermi('cms:config:edit')")
    public AjaxResult saveGlobal(@RequestBody CmsGlobal global)
    {
        return toAjax(builderService.saveGlobal(global));
    }

    // ================= 2. 页面管理 (Page) =================

    @GetMapping("/pages")
    @PreAuthorize("@ss.hasPermi('cms:config:list')")
    public TableDataInfo listPages(CmsPage page)
    {
        startPage();
        List<CmsPage> list = builderService.selectPageList(page);
        return getDataTable(list);
    }

    @GetMapping("/pages/{pageId}")
    @PreAuthorize("@ss.hasPermi('cms:config:list')")
    public AjaxResult getPageDetail(@PathVariable Long pageId)
    {
        return success(builderService.selectPageById(pageId));
    }

    @Log(title = "官网页面创建", businessType = BusinessType.INSERT)
    @PostMapping("/pages")
    @PreAuthorize("@ss.hasPermi('cms:config:edit')")
    public AjaxResult addPage(@RequestBody CmsPage page)
    {
        return toAjax(builderService.insertPage(page));
    }

    @Log(title = "官网页面修改", businessType = BusinessType.UPDATE)
    @PutMapping("/pages")
    @PreAuthorize("@ss.hasPermi('cms:config:edit')")
    public AjaxResult editPage(@RequestBody CmsPage page)
    {
        return toAjax(builderService.updatePage(page));
    }

    @Log(title = "官网页面删除", businessType = BusinessType.DELETE)
    @DeleteMapping("/pages/{pageId}")
    @PreAuthorize("@ss.hasPermi('cms:config:edit')")
    public AjaxResult removePage(@PathVariable Long pageId)
    {
        return toAjax(builderService.deletePageById(pageId));
    }

    // ================= 3. 动态区块批量保存与发布 (Sections) =================

    @GetMapping("/pages/{pageId}/sections")
    @PreAuthorize("@ss.hasPermi('cms:config:list')")
    public AjaxResult getPageSections(@PathVariable Long pageId)
    {
        return success(builderService.selectSectionsByPageId(pageId, true));
    }

    @Log(title = "官网页面区块排版与保存", businessType = BusinessType.UPDATE)
    @PutMapping("/pages/{pageId}/sections")
    @PreAuthorize("@ss.hasPermi('cms:config:edit')")
    public AjaxResult savePageSections(@PathVariable Long pageId, @RequestBody List<CmsSection> sections)
    {
        builderService.batchSaveSections(pageId, sections);
        return success("页面区块排版与内容已成功保存并同步到全网！");
    }

    @Log(title = "官网页面发布", businessType = BusinessType.UPDATE)
    @PostMapping("/publish/{pageId}")
    @PreAuthorize("@ss.hasPermi('cms:config:edit')")
    public AjaxResult publishPage(@PathVariable Long pageId)
    {
        CmsPage page = builderService.selectPageById(pageId);
        if (page == null)
        {
            return error("页面不存在");
        }
        page.setStatus("0"); // 标记为已发布
        builderService.updatePage(page);
        builderService.evictPageCache(page.getPageSlug());
        return success("页面已成功发布上线！");
    }
}
