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
 * 教师/管理端现场预约核销处理器 (严格角色控制 + 真实核销人审计)
 * 
 * @author doupi
 */
@Component
public class TeacherVerifyHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    @Override
    public List<String> getActions()
    {
        return Collections.singletonList("teacher.verifyAppointment");
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
        String code = getSafeString(payload, "checkInCode");
        if (StringUtils.isEmpty(code))
        {
            code = getSafeString(payload, "verifyCodePayload");
        }
        if (StringUtils.isEmpty(code))
        {
            throw new IllegalArgumentException("核销码不能为空");
        }

        // 真实核销人取自当前已通过认证的安全上下文，防止客户端篡改
        String verifier = "现场老师";
        if (loginUser != null && loginUser.getUser() != null)
        {
            verifier = StringUtils.isNotEmpty(loginUser.getUser().getNickName()) 
                ? loginUser.getUser().getNickName() 
                : loginUser.getUsername();
        }

        DoupiRecruitAppointment existing = appointmentService.selectDoupiRecruitAppointmentByCheckInCode(code);
        if (existing == null)
        {
            throw new IllegalArgumentException("核销码无效或预约记录不存在");
        }
        if ("VERIFIED".equalsIgnoreCase(existing.getStatus()))
        {
            throw new IllegalStateException("该预约此前已完成核销，请勿重复核销！");
        }

        boolean ok = appointmentService.verifyAppointment(code, verifier);
        if (!ok)
        {
            throw new RuntimeException("核销底层处理异常，请检查数据库连接后重试");
        }

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "核销成功");
        res.put("verifier", verifier);
        res.put("appointment", existing);
        return res;
    }
}
