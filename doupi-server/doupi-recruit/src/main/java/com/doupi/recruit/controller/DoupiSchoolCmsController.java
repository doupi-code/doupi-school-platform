package com.doupi.recruit.controller;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.enums.BusinessType;
import com.doupi.recruit.service.IDoupiSchoolPortalService;

/**
 * 官网CMS管理 - 门户配置与内容服务控制器
 * 提供给管理后台 /cms 模块进行内容可视化管理
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/cms/portal")
public class DoupiSchoolCmsController extends BaseController
{
    @Autowired
    private IDoupiSchoolPortalService portalService;

    /**
     * 获取官网门户基础配置与公信力指标
     */
    @GetMapping("/config")
    @PreAuthorize("@ss.hasPermi('cms:config:list')")
    public AjaxResult getConfig()
    {
        return success(portalService.getSiteInfo());
    }

    /**
     * 更新官网门户基础配置（热线、标语、地址等）
     */
    @Log(title = "官网门户配置", businessType = BusinessType.UPDATE)
    @PutMapping("/config")
    @PreAuthorize("@ss.hasPermi('cms:config:edit')")
    public AjaxResult updateConfig(@RequestBody Map<String, Object> data)
    {
        portalService.updateSiteInfo(data);
        return success("官网门户配置更新成功！");
    }

    /**
     * 获取官网教师名录
     */
    @GetMapping("/teachers")
    @PreAuthorize("@ss.hasPermi('cms:teacher:list')")
    public AjaxResult getTeachers(@RequestParam(required = false) String group,
                                  @RequestParam(required = false) String category,
                                  @RequestParam(required = false) String subject)
    {
        return success(portalService.getTeachers(group, category, subject));
    }

    /**
     * 获取官网建筑与设施列表
     */
    @GetMapping("/facilities")
    @PreAuthorize("@ss.hasPermi('cms:campus:list')")
    public AjaxResult getFacilities(@RequestParam(required = false) String zone)
    {
        return success(portalService.getFacilities(zone));
    }

    /**
     * 获取官网常见问答列表
     */
    @GetMapping("/faqs")
    @PreAuthorize("@ss.hasPermi('cms:faq:list')")
    public AjaxResult getFaqs(@RequestParam(required = false) String category)
    {
        return success(portalService.getFaqs(category));
    }
}
