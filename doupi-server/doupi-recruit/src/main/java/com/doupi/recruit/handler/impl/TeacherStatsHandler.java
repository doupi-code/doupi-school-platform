package com.doupi.recruit.handler.impl;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.recruit.handler.AbstractWxActionHandler;
import com.doupi.recruit.service.IDoupiRecruitAppointmentService;

/**
 * 教师与后台看板统计数据处理器
 * 
 * @author doupi
 */
@Component
public class TeacherStatsHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    @Override
    public List<String> getActions()
    {
        return Arrays.asList("teacher.stats", "stats.dashboard", "admin.dashboardStats");
    }

    @Override
    public boolean isAuthRequired()
    {
        return true;
    }

    @Override
    public List<String> getRequiredRoles()
    {
        return Arrays.asList("admin", "teacher");
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception
    {
        return appointmentService.getDashboardStats();
    }
}
