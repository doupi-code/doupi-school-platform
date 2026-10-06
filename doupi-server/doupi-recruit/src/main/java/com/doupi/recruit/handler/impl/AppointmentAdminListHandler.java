package com.doupi.recruit.handler.impl;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.recruit.domain.DoupiRecruitAppointment;
import com.doupi.recruit.handler.AbstractWxActionHandler;
import com.doupi.recruit.service.IDoupiRecruitAppointmentService;

/**
 * 管理员/教师预约全局列表处理器（受角色严格保护）
 * 
 * @author doupi
 */
@Component
public class AppointmentAdminListHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    @Override
    public List<String> getActions()
    {
        return Arrays.asList("appointment.adminList", "appointment.globalList");
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
        DoupiRecruitAppointment q = new DoupiRecruitAppointment();
        if (payload.containsKey("status")) { q.setStatus(getSafeString(payload, "status")); }
        if (payload.containsKey("visitDate")) { q.setVisitDate(getSafeString(payload, "visitDate")); }
        
        List<DoupiRecruitAppointment> list = appointmentService.selectDoupiRecruitAppointmentList(q);
        Map<String, Object> res = new HashMap<>();
        res.put("list", list != null ? list : Collections.emptyList());
        res.put("total", list != null ? list.size() : 0);
        return res;
    }
}
