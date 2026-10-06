package com.doupi.recruit.handler.impl;

import java.util.Arrays;
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
 * 用户个人中心与资料处理器
 * 
 * @author doupi
 */
@Component
public class UserProfileHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    @Override
    public List<String> getActions()
    {
        return Arrays.asList("user.getProfile", "profile.home");
    }

    @Override
    public boolean isAuthRequired()
    {
        return true;
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception
    {
        String phone = getSafeString(payload, "phone", "");
        String openid = getSafeString(payload, "openid", "");
        
        // 若入参未指定则从当前登录上下文中提取
        if (StringUtils.isEmpty(phone) && loginUser != null && loginUser.getUser() != null)
        {
            phone = loginUser.getUser().getPhonenumber();
        }

        DoupiRecruitAppointment q = new DoupiRecruitAppointment();
        if (StringUtils.isNotEmpty(phone)) { q.setParentPhone(phone); }
        if (StringUtils.isNotEmpty(openid)) { q.setOpenid(openid); }
        
        List<DoupiRecruitAppointment> list = appointmentService.selectDoupiRecruitAppointmentList(q);
        int count = list != null ? list.size() : 0;
        String userName = "访客家长";
        if (loginUser != null && loginUser.getUser() != null && StringUtils.isNotEmpty(loginUser.getUser().getNickName()))
        {
            userName = loginUser.getUser().getNickName();
        }
        else if (list != null && !list.isEmpty() && StringUtils.isNotEmpty(list.get(0).getParentName()))
        {
            userName = list.get(0).getParentName();
        }

        String role = "user";
        if (loginUser != null && loginUser.getPermissions() != null)
        {
            if (loginUser.getPermissions().contains("wx:admin"))
            {
                role = "admin";
            }
            else if (loginUser.getPermissions().contains("wx:teacher"))
            {
                role = "teacher";
            }
        }

        Map<String, Object> res = new HashMap<>();
        res.put("name", userName);
        res.put("phone", phone);
        res.put("role", role);
        res.put("appointmentCount", count);
        return res;
    }
}
