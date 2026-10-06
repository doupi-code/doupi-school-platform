package com.doupi.recruit.handler.impl;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.alibaba.fastjson2.JSON;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.utils.StringUtils;
import com.doupi.recruit.domain.DoupiRecruitConfig;
import com.doupi.recruit.domain.DoupiRecruitTeacherBinding;
import com.doupi.recruit.handler.AbstractWxActionHandler;
import com.doupi.recruit.service.IDoupiRecruitConfigService;
import com.doupi.recruit.service.IDoupiRecruitTeacherBindingService;

/**
 * 教师微信绑定业务处理器
 * 
 * @author doupi
 */
@Component
public class BindingHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitConfigService configService;

    @Autowired
    private IDoupiRecruitTeacherBindingService bindingService;

    @Override
    public List<String> getActions()
    {
        return Arrays.asList("binding.listDirectors", "binding.submitBindRequest", "binding.getMyBindRequestStatus", "binding.status");
    }

    @Override
    public boolean isAuthRequired()
    {
        return false;
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception
    {
        String action = getSafeString(payload, "_current_action");

        if ("binding.listDirectors".equalsIgnoreCase(action))
        {
            DoupiRecruitConfig cfg = configService.selectConfigByKey("directors_list");
            List<Map<String, Object>> directors = new ArrayList<>();
            if (cfg != null && StringUtils.isNotEmpty(cfg.getConfigValue()))
            {
                try
                {
                    directors = JSON.parseObject(cfg.getConfigValue(), List.class);
                }
                catch (Exception ignored) {}
            }
            Map<String, Object> res = new HashMap<>();
            res.put("list", directors);
            return res;
        }
        else if ("binding.submitBindRequest".equalsIgnoreCase(action))
        {
            DoupiRecruitTeacherBinding b = new DoupiRecruitTeacherBinding();
            b.setTeacherId(getSafeString(payload, "teacherId", "T001"));
            b.setTeacherName(getSafeString(payload, "teacherName", "教师"));
            b.setTeacherPhone(getSafeString(payload, "teacherPhone", "13800000000"));
            b.setDirectorId(getSafeString(payload, "directorId", "DIR01"));
            b.setDirectorName(getSafeString(payload, "directorName", "招生主管"));
            b.setStatus("APPROVED");
            bindingService.insertDoupiRecruitTeacherBinding(b);
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            return res;
        }
        else // binding.getMyBindRequestStatus / binding.status
        {
            String teacherId = getSafeString(payload, "teacherId", "T001");
            DoupiRecruitTeacherBinding b = bindingService.selectDoupiRecruitTeacherBindingByTeacherId(teacherId);
            Map<String, Object> res = new HashMap<>();
            res.put("binding", b);
            res.put("isBound", b != null && "APPROVED".equalsIgnoreCase(b.getStatus()));
            return res;
        }
    }
}
