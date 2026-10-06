package com.doupi.recruit.handler.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONArray;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.utils.StringUtils;
import com.doupi.recruit.domain.DoupiRecruitBanner;
import com.doupi.recruit.domain.DoupiRecruitCampus;
import com.doupi.recruit.domain.DoupiRecruitConfig;
import com.doupi.recruit.handler.AbstractWxActionHandler;
import com.doupi.recruit.service.IDoupiRecruitCampusService;
import com.doupi.recruit.service.IDoupiRecruitConfigService;

/**
 * 校园配置与关于信息处理器
 * 
 * @author doupi
 */
@Component
public class ConfigHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitConfigService configService;

    @Autowired
    private IDoupiRecruitCampusService campusService;

    @Override
    public List<String> getActions()
    {
        return Arrays.asList(
            "config.listBanner",
            "config.getTimeSlots",
            "config.getCampusList",
            "config.getBasicConfig",
            "config.summary",
            "about.summary"
        );
    }

    @Override
    public boolean isAuthRequired()
    {
        return false; // 基础配置与介绍页面无需强制登录
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception
    {
        String action = getSafeString(payload, "_current_action");

        if ("config.listBanner".equalsIgnoreCase(action))
        {
            List<DoupiRecruitBanner> banners = configService.selectBannerList(new DoupiRecruitBanner());
            List<Map<String, Object>> list = new ArrayList<>();
            if (banners != null)
            {
                for (DoupiRecruitBanner b : banners)
                {
                    Map<String, Object> item = new HashMap<>();
                    item.put("banner_id", b.getBannerId());
                    item.put("title", b.getTitle());
                    item.put("image_url", b.getImageUrl());
                    item.put("imageUrl", b.getImageUrl());
                    item.put("link_url", b.getLinkUrl());
                    item.put("status", b.getStatus());
                    list.add(item);
                }
            }
            return list;
        }
        else if ("config.getTimeSlots".equalsIgnoreCase(action))
        {
            DoupiRecruitConfig cfg = configService.selectConfigByKey("time_slots");
            Object timeSlots;
            if (cfg != null && StringUtils.isNotEmpty(cfg.getConfigValue()))
            {
                timeSlots = JSON.parse(cfg.getConfigValue());
            }
            else
            {
                timeSlots = JSONArray.parse("[{\"slotId\":\"1\",\"name\":\"上午 09:00 - 11:30\",\"maxQuota\":30},{\"slotId\":\"2\",\"name\":\"下午 14:00 - 16:30\",\"maxQuota\":30}]");
            }
            Map<String, Object> res = new HashMap<>();
            res.put("timeSlots", timeSlots);
            return res;
        }
        else if ("config.getCampusList".equalsIgnoreCase(action))
        {
            DoupiRecruitConfig cfg = configService.selectConfigByKey("campus_list");
            List<String> list;
            if (cfg != null && StringUtils.isNotEmpty(cfg.getConfigValue()))
            {
                list = JSON.parseArray(cfg.getConfigValue(), String.class);
            }
            else
            {
                list = Arrays.asList("高中部", "初中部", "国际部");
            }
            Map<String, Object> res = new HashMap<>();
            res.put("campusList", list);
            return res;
        }
        else if ("about.summary".equalsIgnoreCase(action))
        {
            DoupiRecruitCampus campus = campusService.selectDoupiRecruitCampusById("default");
            Map<String, Object> res = new HashMap<>();
            res.put("appName", "华襄预约");
            Map<String, Object> cMap = new HashMap<>();
            if (campus != null)
            {
                cMap.put("title", campus.getTitle());
                cMap.put("summary", campus.getSummary());
                cMap.put("intro", campus.getIntro());
                cMap.put("contactPhone", campus.getContactPhone());
                cMap.put("address", campus.getAddress());
            }
            res.put("campus", cMap);
            Map<String, Object> aboutConfig = new HashMap<>();
            aboutConfig.put("version", "v2.0");
            aboutConfig.put("schoolName", "武汉汉阳外国语学校华襄校区");
            res.put("aboutConfig", aboutConfig);
            return res;
        }
        else // config.getBasicConfig / config.summary
        {
            Map<String, Object> res = new HashMap<>();
            res.put("appName", "华襄预约");
            res.put("contactPhone", "027-87654321");
            res.put("openDaysAhead", 14);
            res.put("needAudit", false);
            return res;
        }
    }
}
