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
    public boolean isAuthRequired()
    {
        return false;
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception
    {
        String action = getSafeString(payload, "_current_action");

        if (action != null && action.contains("cancel"))
        {
            Object idObj = payload.get("appointmentId");
            if (idObj != null)
            {
                DoupiRecruitAppointment app = new DoupiRecruitAppointment();
                app.setAppointmentId(Long.valueOf(idObj.toString()));
                app.setStatus("CANCELLED");
                appointmentService.updateDoupiRecruitAppointment(app);
            }
            Map<String, Object> res = new HashMap<>();
            res.put("success", true);
            return res;
        }
        else
        {
            Object idObj = payload.get("appointmentId");
            String no = getSafeString(payload, "appointmentNo");
            DoupiRecruitAppointment app = null;
            if (idObj != null)
            {
                app = appointmentService.selectDoupiRecruitAppointmentById(Long.valueOf(idObj.toString()));
            }
            else if (StringUtils.isNotEmpty(no))
            {
                app = appointmentService.selectDoupiRecruitAppointmentByNo(no);
            }
            Map<String, Object> res = new HashMap<>();
            res.put("appointment", app);
            return res;
        }
    }
}
