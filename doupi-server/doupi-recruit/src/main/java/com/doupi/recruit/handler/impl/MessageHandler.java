package com.doupi.recruit.handler.impl;

import java.util.ArrayList;
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
 * 消息通知列表与未读数处理器
 * 
 * @author doupi
 */
@Component
public class MessageHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    @Override
    public List<String> getActions()
    {
        return Arrays.asList("message.list", "message.count");
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
        String phone = getSafeString(payload, "phone");
        if (StringUtils.isEmpty(phone)) { phone = getSafeString(payload, "parentPhone"); }
        String openid = getSafeString(payload, "openid");

        if (StringUtils.isEmpty(phone) && StringUtils.isEmpty(openid) && loginUser != null && loginUser.getUser() != null)
        {
            phone = loginUser.getUser().getPhonenumber();
        }

        DoupiRecruitAppointment q = new DoupiRecruitAppointment();
        if (StringUtils.isNotEmpty(phone)) { q.setParentPhone(phone); }
        if (StringUtils.isNotEmpty(openid)) { q.setOpenid(openid); }

        if ("message.count".equalsIgnoreCase(action))
        {
            int count = 0;
            if (StringUtils.isNotEmpty(phone) || StringUtils.isNotEmpty(openid))
            {
                List<DoupiRecruitAppointment> apps = appointmentService.selectDoupiRecruitAppointmentList(q);
                count = apps != null ? apps.size() : 0;
            }
            Map<String, Object> res = new HashMap<>();
            res.put("unreadCount", count);
            return res;
        }
        else
        {
            List<Map<String, Object>> msgs = new ArrayList<>();
            if (StringUtils.isNotEmpty(phone) || StringUtils.isNotEmpty(openid))
            {
                List<DoupiRecruitAppointment> apps = appointmentService.selectDoupiRecruitAppointmentList(q);
                if (apps != null)
                {
                    for (DoupiRecruitAppointment a : apps)
                    {
                        Map<String, Object> msg = new HashMap<>();
                        msg.put("id", a.getAppointmentId());
                        if ("VERIFIED".equalsIgnoreCase(a.getStatus()))
                        {
                            msg.put("title", "访校核销完成通知");
                            msg.put("content", "您预约的学生" + a.getStudentName() + "已于" + (a.getVerifyTime() != null ? a.getVerifyTime().toString() : a.getVisitDate()) + "完成现场到校核销。");
                        }
                        else if ("APPROVED".equalsIgnoreCase(a.getStatus()))
                        {
                            msg.put("title", "访校预约审核通过");
                            msg.put("content", "您为学生" + a.getStudentName() + "提交的" + a.getVisitDate() + "访校预约已通过审核，核销凭证码为：" + a.getCheckInCode());
                        }
                        else if ("CANCELLED".equalsIgnoreCase(a.getStatus()))
                        {
                            msg.put("title", "访校预约已取消");
                            msg.put("content", "学生" + a.getStudentName() + "单号" + a.getAppointmentNo() + "的预约已被取消。");
                        }
                        else
                        {
                            msg.put("title", "访校预约提交成功");
                            msg.put("content", "您为学生" + a.getStudentName() + "提交的" + a.getVisitDate() + "访校申请已进入待确认队列。");
                        }
                        msg.put("createTime", a.getCreateTime() != null ? a.getCreateTime().toString() : "刚刚");
                        msgs.add(msg);
                    }
                }
            }
            Map<String, Object> res = new HashMap<>();
            res.put("list", msgs);
            res.put("unreadCount", msgs.size());
            return res;
        }
    }
}
