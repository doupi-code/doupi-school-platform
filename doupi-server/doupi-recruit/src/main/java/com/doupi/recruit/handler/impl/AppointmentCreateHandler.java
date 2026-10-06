package com.doupi.recruit.handler.impl;

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
 * 访校预约创建处理器
 * 
 * @author doupi
 */
@Component
public class AppointmentCreateHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    @Override
    public List<String> getActions()
    {
        return Collections.singletonList("appointment.create");
    }

    @Override
    public boolean isAuthRequired()
    {
        return false; // 家长与访客可提交预约
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception
    {
        DoupiRecruitAppointment app = new DoupiRecruitAppointment();
        app.setParentName(getSafeString(payload, "parentName", ""));
        app.setParentPhone(getSafeString(payload, "parentPhone", ""));
        app.setStudentName(getSafeString(payload, "studentName", ""));
        app.setStudentGender(getSafeString(payload, "studentGender", "男"));
        
        String grade = getSafeString(payload, "studentGrade");
        if (StringUtils.isEmpty(grade))
        {
            grade = getSafeString(payload, "intentionGrade", "高一");
        }
        app.setStudentGrade(grade);
        app.setCurrentSchool(getSafeString(payload, "currentSchool", ""));
        app.setCampusId(getSafeString(payload, "campusId", "default"));
        app.setCampusName(getSafeString(payload, "campusName", "汉外华襄主校区"));
        
        String vDate = getSafeString(payload, "visitDate");
        if (StringUtils.isEmpty(vDate))
        {
            vDate = getSafeString(payload, "appointmentDate", "2026-10-01");
        }
        app.setVisitDate(vDate);
        
        String timeSlot = getSafeString(payload, "timeSlot");
        if (StringUtils.isEmpty(timeSlot))
        {
            timeSlot = getSafeString(payload, "visitTime");
        }
        if (StringUtils.isEmpty(timeSlot))
        {
            timeSlot = "上午 09:00 - 11:30";
        }
        app.setTimeSlot(timeSlot);
        
        // 若当前已登录，记录 openid
        String openid = getSafeString(payload, "openid");
        if (StringUtils.isEmpty(openid) && loginUser != null && loginUser.getUser() != null)
        {
            openid = loginUser.getUser().getRemark();
        }
        app.setOpenid(openid != null ? openid : "");
        app.setRemark(getSafeString(payload, "remark", ""));
        app.setStatus("APPROVED");

        appointmentService.insertDoupiRecruitAppointment(app);

        Map<String, Object> res = new HashMap<>();
        res.put("id", app.getAppointmentId());
        res.put("appointmentId", app.getAppointmentId());
        res.put("appointmentNo", app.getAppointmentNo());
        res.put("checkInCode", app.getCheckInCode());
        res.put("status", app.getStatus());
        return res;
    }
}
