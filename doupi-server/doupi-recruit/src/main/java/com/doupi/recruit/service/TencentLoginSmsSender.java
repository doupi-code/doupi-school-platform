package com.doupi.recruit.service;

import com.doupi.common.exception.ServiceException;
import com.tencentcloudapi.common.Credential;
import com.tencentcloudapi.common.exception.TencentCloudSDKException;
import com.tencentcloudapi.common.profile.ClientProfile;
import com.tencentcloudapi.common.profile.HttpProfile;
import com.tencentcloudapi.sms.v20210111.SmsClient;
import com.tencentcloudapi.sms.v20210111.models.SendSmsRequest;
import com.tencentcloudapi.sms.v20210111.models.SendStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
class TencentLoginSmsSender
{
    private final SmsClient client;
    private final String appId;
    private final String signName;
    private final String templateId;

    TencentLoginSmsSender(@Value("${SMS_SECRET_ID:}") String secretId, @Value("${SMS_SECRET_KEY:}") String secretKey,
            @Value("${SMS_SDK_APP_ID:}") String appId, @Value("${SMS_SIGN_NAME:}") String signName,
            @Value("${SMS_LOGIN_TEMPLATE_ID:}") String templateId, @Value("${SMS_REGION:ap-guangzhou}") String region)
    {
        this.appId = appId.trim();
        this.signName = signName.trim();
        this.templateId = templateId.trim();
        if (secretId.isBlank() || secretKey.isBlank() || this.appId.isBlank() || this.signName.isBlank() || this.templateId.isBlank())
        {
            client = null;
            return;
        }
        HttpProfile http = new HttpProfile();
        http.setEndpoint("sms.tencentcloudapi.com");
        http.setConnTimeout(4);
        http.setReadTimeout(7);
        http.setWriteTimeout(4);
        ClientProfile profile = new ClientProfile();
        profile.setHttpProfile(http);
        client = new SmsClient(new Credential(secretId.trim(), secretKey.trim()), region.trim(), profile);
    }

    void requireConfigured()
    {
        if (client == null)
        {
            throw new ServiceException("验证码短信尚未配置", 503);
        }
    }

    void send(String phone, String code, int expireMinutes)
    {
        requireConfigured();
        SendSmsRequest request = new SendSmsRequest();
        request.setPhoneNumberSet(new String[] { "+86" + phone });
        request.setSmsSdkAppId(appId);
        request.setSignName(signName);
        request.setTemplateId(templateId);
        request.setTemplateParamSet(new String[] { code, Integer.toString(expireMinutes) });
        try
        {
            SendStatus[] statuses = client.SendSms(request).getSendStatusSet();
            if (statuses == null || statuses.length != 1 || !"Ok".equals(statuses[0].getCode()))
            {
                throw new ServiceException("验证码短信发送失败，请稍后重试", 503);
            }
        }
        catch (TencentCloudSDKException e)
        {
            throw new ServiceException("验证码短信暂不可用，请稍后重试", 503);
        }
    }
}
