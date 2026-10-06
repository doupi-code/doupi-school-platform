package com.doupi.common.core.service;

import java.util.Map;
import com.doupi.common.core.domain.capability.PushMessageRequest;

/**
 * 统一消息推送中心服务接口
 * 
 * @author doupi
 */
public interface PushNotificationService
{
    /**
     * 发送站内消息
     * 
     * @param userId 目标用户ID
     * @param title 消息标题
     * @param content 消息正文
     * @param type 业务类型
     * @return 是否成功
     */
    boolean sendInAppMessage(String userId, String title, String content, String type);

    /**
     * 发送微信小程序订阅消息
     * 
     * @param openid 用户微信 openid
     * @param templateId 订阅消息模板ID
     * @param page 跳转小程序页面
     * @param data 模板填充数据
     * @return 是否推送成功
     */
    boolean sendWechatSubscribeMessage(String openid, String templateId, String page, Map<String, String> data);

    /**
     * 全渠道统一推送请求
     * 
     * @param request 推送请求参数包
     * @return 是否成功触发
     */
    boolean sendPush(PushMessageRequest request);

    /**
     * 业务便捷触达：预约状态变更一键全渠道通知（站内信 + 小程序订阅）
     * 
     * @param appointmentId 预约ID
     * @param newStatus 新状态 (APPROVED, VERIFIED, CANCELLED)
     * @param remark 附加说明
     * @return 是否通知成功
     */
    boolean notifyAppointmentStatusChange(Long appointmentId, String newStatus, String remark);
}
