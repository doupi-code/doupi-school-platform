package com.doupi.recruit.handler.impl;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.alibaba.fastjson2.JSON;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.utils.StringUtils;
import com.doupi.recruit.domain.DoupiRecruitConfig;
import com.doupi.recruit.handler.AbstractWxActionHandler;
import com.doupi.recruit.service.IDoupiRecruitConfigService;

/**
 * 预约元数据配置处理器
 * 
 * @author doupi
 */
@Component
public class AppointmentMetaHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitConfigService configService;

    @Override
    public List<String> getActions()
    {
        return Collections.singletonList("appointment.meta");
    }

    @Override
    public boolean isAuthRequired()
    {
        return false;
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception
    {
        DoupiRecruitConfig cfg = configService.selectConfigByKey("time_slots");
        Object slots = cfg != null && StringUtils.isNotEmpty(cfg.getConfigValue()) ? JSON.parse(cfg.getConfigValue()) : Collections.emptyList();
        
        DoupiRecruitConfig campusCfg = configService.selectConfigByKey("campus_list");
        List<String> campuses = Collections.emptyList();
        if (campusCfg != null && StringUtils.isNotEmpty(campusCfg.getConfigValue()))
        {
            campuses = JSON.parseArray(campusCfg.getConfigValue(), String.class);
        }
        
        DoupiRecruitConfig basicCfg = configService.selectConfigByKey("basic_config");
        int openDaysAhead = 14;
        if (basicCfg != null && StringUtils.isNotEmpty(basicCfg.getConfigValue()))
        {
            try
            {
                Map<String, Object> bMap = JSON.parseObject(basicCfg.getConfigValue(), Map.class);
                if (bMap != null && bMap.get("openDaysAhead") != null)
                {
                    openDaysAhead = ((Number) bMap.get("openDaysAhead")).intValue();
                }
            }
            catch (Exception ignored) {}
        }
        
        Map<String, Object> res = new HashMap<>();
        res.put("openDaysAhead", openDaysAhead);
        res.put("timeSlots", slots);
        res.put("campusList", campuses);
        return res;
    }
}
