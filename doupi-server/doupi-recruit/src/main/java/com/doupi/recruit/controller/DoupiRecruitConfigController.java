package com.doupi.recruit.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.enums.BusinessType;
import com.doupi.recruit.domain.DoupiRecruitBanner;
import com.doupi.recruit.domain.DoupiRecruitConfig;
import com.doupi.recruit.service.IDoupiRecruitConfigService;

/**
 * 招生配置与轮播图Controller
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/recruit/config")
public class DoupiRecruitConfigController extends BaseController
{
    @Autowired
    private IDoupiRecruitConfigService configService;

    /**
     * 获取指定配置
     */
    @GetMapping(value = "/{configKey}")
    public AjaxResult getConfig(@PathVariable("configKey") String configKey)
    {
        DoupiRecruitConfig config = configService.selectConfigByKey(configKey);
        return success(config != null ? config.getConfigValue() : "");
    }

    /**
     * 保存指定配置
     */
    @PreAuthorize("@ss.hasPermi('recruit:config:edit')")
    @Log(title = "招生配置", businessType = BusinessType.UPDATE)
    @PostMapping("/save")
    public AjaxResult saveConfig(@RequestBody Map<String, String> body)
    {
        String key = body.get("configKey");
        String val = body.get("configValue");
        String remark = body.get("remark");
        return toAjax(configService.saveConfig(key, val, remark));
    }

    /**
     * 查询轮播图列表
     */
    @GetMapping("/banner/list")
    public AjaxResult listBanner(DoupiRecruitBanner banner)
    {
        List<DoupiRecruitBanner> list = configService.selectBannerList(banner);
        return success(list);
    }

    /**
     * 新增轮播图
     */
    @PreAuthorize("@ss.hasPermi('recruit:config:edit')")
    @Log(title = "招生轮播图", businessType = BusinessType.INSERT)
    @PostMapping("/banner")
    public AjaxResult addBanner(@RequestBody DoupiRecruitBanner banner)
    {
        return toAjax(configService.insertBanner(banner));
    }

    /**
     * 修改轮播图
     */
    @PreAuthorize("@ss.hasPermi('recruit:config:edit')")
    @Log(title = "招生轮播图", businessType = BusinessType.UPDATE)
    @PutMapping("/banner")
    public AjaxResult editBanner(@RequestBody DoupiRecruitBanner banner)
    {
        return toAjax(configService.updateBanner(banner));
    }

    /**
     * 删除轮播图
     */
    @PreAuthorize("@ss.hasPermi('recruit:config:edit')")
    @Log(title = "招生轮播图", businessType = BusinessType.DELETE)
    @DeleteMapping("/banner/{bannerId}")
    public AjaxResult removeBanner(@PathVariable Long bannerId)
    {
        return toAjax(configService.deleteBannerById(bannerId));
    }
}
