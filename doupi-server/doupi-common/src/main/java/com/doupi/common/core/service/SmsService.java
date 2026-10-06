package com.doupi.common.core.service;

import com.doupi.common.core.domain.capability.SmsResult;

/**
 * 统一短信服务接口
 * 
 * @author doupi
 */
public interface SmsService
{
    /**
     * 发送手机验证码 (自动缓存到 Redis，默认 5 分钟有效)
     * 
     * @param phone 手机号
     * @param expireMinutes 有效时长(分钟)
     * @return 发送结果包含验证码凭证
     */
    SmsResult sendVerificationCode(String phone, int expireMinutes);

    /**
     * 校验手机验证码
     * 
     * @param phone 手机号
     * @param inputCode 用户输入的验证码
     * @return 校验是否通过
     */
    boolean verifyCode(String phone, String inputCode);

    /**
     * 发送访校探校预约通过通知短信
     * 
     * @param phone 家长手机号
     * @param studentName 学生姓名
     * @param visitDate 到访日期
     * @param timeSlot 时间段
     * @param checkInCode 核销码
     * @return 发送结果
     */
    SmsResult sendAppointmentNotification(String phone, String studentName, String visitDate, String timeSlot, String checkInCode);

    /**
     * 发送通用短信模板
     * 
     * @param phone 接收手机号
     * @param templateId 模板编号
     * @param templateParams 模板变量替换数组
     * @return 发送结果
     */
    SmsResult sendCustomTemplate(String phone, String templateId, String[] templateParams);
}
