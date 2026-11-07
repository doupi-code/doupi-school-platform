package com.doupi.recruit.handler.impl;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.exception.ServiceException;
import com.doupi.common.utils.StringUtils;
import com.doupi.recruit.domain.DoupiRecruitAppointment;
import com.doupi.recruit.handler.AbstractWxActionHandler;
import com.doupi.recruit.service.IDoupiRecruitAppointmentService;

/**
 * 预约详情与取消处理器
 * 
 * @author doupi
 */
@Component
public class AppointmentDetailHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    @Override
    public List<String> getActions()
    {
        return Arrays.asList("appointment.detail", "appointment.adminDetail", "appointment.cancel", "appointment.adminCancel");
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception
    {
        String action = getSafeString(payload, "_current_action");
        Object id = payload.getOrDefault("appointmentId", payload.get("id"));
        String number = getSafeString(payload, "appointmentNo");
        if (id == null && StringUtils.isEmpty(number))
        {
            throw new ServiceException("缺少预约标识", 400);
        }
        DoupiRecruitAppointment appointment = id == null
                ? appointmentService.selectDoupiRecruitAppointmentByNo(number)
                : appointmentService.selectDoupiRecruitAppointmentById(Long.valueOf(id.toString()));
        if (appointment == null)
        {
            throw new ServiceException("未找到预约", 404);
        }
        if ("appointment.detail".equals(action) || "appointment.cancel".equals(action))
        {
            String phone = loginUser.getUser().getPhonenumber();
            if (StringUtils.isEmpty(phone) || !phone.equals(appointment.getParentPhone()))
            {
                throw new ServiceException("未找到预约", 404);
            }
        }
        if ("appointment.cancel".equals(action) || "appointment.adminCancel".equals(action))
        {
            DoupiRecruitAppointment update = new DoupiRecruitAppointment();
            update.setAppointmentId(appointment.getAppointmentId());
            update.setStatus("CANCELLED");
            if (appointmentService.updateDoupiRecruitAppointment(update) == 0)
            {
                throw new ServiceException("未找到预约", 404);
            }
            return Map.of("success", true);
        }
        return Map.of("appointment", appointment);
    }
}
