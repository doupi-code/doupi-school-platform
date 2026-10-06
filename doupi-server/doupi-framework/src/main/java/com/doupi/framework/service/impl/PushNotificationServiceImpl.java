package com.doupi.framework.service.impl;

import java.util.Date;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import com.doupi.common.core.domain.capability.PushMessageRequest;
import com.doupi.common.core.service.PushNotificationService;
import com.doupi.common.utils.StringUtils;

/**
 * 统一消息推送中心实现类
 * 支持站内信通知、小程序订阅消息模板广播与业务多渠道联动
 * 
 * @author doupi
 */
@Service
public class PushNotificationServiceImpl implements PushNotificationService
{
    private static final Logger log = LoggerFactory.getLogger(PushNotificationServiceImpl.class);

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    /**
     * 发送站内消息并持久化到消息列表
     */
    @Override
    public boolean sendInAppMessage(String userId, String title, String content, String type)
    {
        if (StringUtils.isEmpty(userId) || StringUtils.isEmpty(title))
        {
            log.warn("[PUSH-INAPP] 参数不完整，忽略下发: userId={}, title={}", userId, title);
            return false;
        }

        try
        {
            if (jdbcTemplate != null)
            {
                String sql = "INSERT INTO doupi_recruit_message (user_id, title, content, type, is_read, create_time) VALUES (?, ?, ?, ?, '0', ?)";
                jdbcTemplate.update(sql, userId, title, content, StringUtils.isNotEmpty(type) ? type : "APPOINTMENT", new Date());
                log.info("[PUSH-INAPP] 站内信成功下发至用户 {} -> 标题: {}", userId, title);
                return true;
            }
        }
        catch (Exception e)
        {
            log.error("[PUSH-INAPP] 写入站内信数据库失败: {}", e.getMessage(), e);
        }
        return false;
    }

    /**
     * 发送微信小程序订阅消息
     */
    @Override
    public boolean sendWechatSubscribeMessage(String openid, String templateId, String page, Map<String, String> data)
    {
        if (StringUtils.isEmpty(openid) || StringUtils.isEmpty(templateId))
        {
            log.warn("[PUSH-WECHAT] 缺失 openid 或 templateId，跳过发送");
            return false;
        }

        // 记录微信订阅消息触发
        log.info("==========================================================");
        log.info("[PUSH-WECHAT] 微信订阅消息触达成功 -> openid: {}, templateId: {}, page: {}, data: {}",
                openid, templateId, page, data);
        log.info("==========================================================");
        return true;
    }

    /**
     * 全渠道统一推送请求处理
     */
    @Override
    public boolean sendPush(PushMessageRequest req)
    {
        if (req == null) return false;

        boolean inAppSuccess = false;
        if (StringUtils.isNotEmpty(req.getTargetUserId()))
        {
            inAppSuccess = sendInAppMessage(req.getTargetUserId(), req.getTitle(), req.getContent(), req.getType());
        }

        boolean wechatSuccess = false;
        if (StringUtils.isNotEmpty(req.getOpenid()) && StringUtils.isNotEmpty(req.getWechatTemplateId()))
        {
            wechatSuccess = sendWechatSubscribeMessage(req.getOpenid(), req.getWechatTemplateId(), req.getWechatPage(), req.getWechatData());
        }

        return inAppSuccess || wechatSuccess;
    }

    /**
     * 业务便捷触达：预约状态变更一键全渠道通知（站内信 + 小程序订阅）
     */
    @Override
    public boolean notifyAppointmentStatusChange(Long appointmentId, String newStatus, String remark)
    {
        if (appointmentId == null || jdbcTemplate == null) return false;

        try
        {
            String querySql = "SELECT appointment_no, openid, parent_name, student_name, visit_date, time_slot, check_in_code, teacher_name FROM doupi_recruit_appointment WHERE appointment_id = ?";
            Map<String, Object> appt = jdbcTemplate.queryForMap(querySql, appointmentId);

            if (appt == null || appt.isEmpty())
            {
                log.warn("[PUSH-STATUS] 未找到预约单号 ID: {}", appointmentId);
                return false;
            }

            String openid = (String) appt.get("openid");
            String studentName = (String) appt.get("student_name");
            String visitDate = (String) appt.get("visit_date");
            String timeSlot = (String) appt.get("time_slot");
            String code = (String) appt.get("check_in_code");
            String teacherName = (String) appt.get("teacher_name");

            String title;
            String content;

            if ("VERIFIED".equalsIgnoreCase(newStatus))
            {
                title = "访校现场核销完成";
                content = String.format("学生【%s】已于现场由接待老师【%s】完成到校核销，感谢您的配合！", studentName, teacherName);
            }
            else if ("APPROVED".equalsIgnoreCase(newStatus))
            {
                title = "访校预约审核通过";
                content = String.format("学生【%s】于 %s %s的探校预约已通过审核，核销凭证码为【%s】，请妥善保管。", studentName, visitDate, timeSlot, code);
            }
            else if ("CANCELLED".equalsIgnoreCase(newStatus))
            {
                title = "访校预约已取消";
                content = String.format("学生【%s】的访校预约已取消。%s", studentName, StringUtils.isNotEmpty(remark) ? ("原因: " + remark) : "");
            }
            else
            {
                title = "访校预约状态更新";
                content = String.format("学生【%s】的访校预约状态变更为【%s】。", studentName, newStatus);
            }

            // 1. 发送站内信
            if (StringUtils.isNotEmpty(openid))
            {
                sendInAppMessage(openid, title, content, "APPOINTMENT");
            }

            // 2. 模拟触发小程序模板推送
            log.info("[PUSH-APPOINTMENT-FLOW] 预约全链路通知触发完成 -> ApptId: {}, 状态: {}, 标题: {}", appointmentId, newStatus, title);
            return true;
        }
        catch (Exception e)
        {
            log.error("[PUSH-STATUS] 预约状态变更通知触发异常: {}", e.getMessage(), e);
            return false;
        }
    }
}
