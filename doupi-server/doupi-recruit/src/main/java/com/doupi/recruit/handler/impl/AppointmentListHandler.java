package com.doupi.recruit.handler.impl;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.utils.StringUtils;
import com.doupi.recruit.domain.DoupiRecruitAppointment;
import com.doupi.recruit.handler.AbstractWxActionHandler;
import com.doupi.recruit.service.IDoupiRecruitAppointmentService;

/**
 * 家长个人预约列表处理器
 * 
 * @author doupi
 */
@Component
public class AppointmentListHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    @Override
    public List<String> getActions()
    {
        return Arrays.asList("appointment.list", "appointment.queryByPhone");
    }

    @Override
    public boolean isAuthRequired()
    {
        return false; // 支持提供手机号查询，若已登录自动取当前用户
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception
    {
        DoupiRecruitAppointment q = new DoupiRecruitAppointment();
        String phone = getSafeString(payload, "parentPhone");
        if (StringUtils.isEmpty(phone))
        {
            phone = getSafeString(payload, "phone");
        }
        String openid = getSafeString(payload, "openid");

        if (StringUtils.isEmpty(phone) && StringUtils.isEmpty(openid) && loginUser != null && loginUser.getUser() != null)
        {
            phone = loginUser.getUser().getPhonenumber();
        }

        // 防范未传条件的全表泄露
        if (StringUtils.isEmpty(phone) && StringUtils.isEmpty(openid))
        {
            Map<String, Object> emptyRes = new HashMap<>();
            emptyRes.put("list", Collections.emptyList());
            emptyRes.put("total", 0);
            return emptyRes;
        }

        if (StringUtils.isNotEmpty(phone)) { q.setParentPhone(phone); }
        if (StringUtils.isNotEmpty(openid)) { q.setOpenid(openid); }

        List<DoupiRecruitAppointment> list = appointmentService.selectDoupiRecruitAppointmentList(q);
        Map<String, Object> res = new HashMap<>();
        res.put("list", list != null ? list : Collections.emptyList());
        res.put("total", list != null ? list.size() : 0);
        return res;
    }
}
