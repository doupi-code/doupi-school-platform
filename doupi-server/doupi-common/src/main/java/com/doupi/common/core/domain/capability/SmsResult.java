package com.doupi.common.core.domain.capability;

import java.io.Serializable;

/**
 * 短信发送统一结果
 * 
 * @author doupi
 */
public class SmsResult implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 是否成功 */
    private boolean success;

    /** 响应状态码 */
    private String code;

    /** 响应提示信息 */
    private String message;

    /** 发送请求唯一流水号 */
    private String requestId;

    /** 业务凭证或验证码（仅在调试模式或内部流转时填充） */
    private String verificationCode;

    public SmsResult() {}

    public SmsResult(boolean success, String code, String message)
    {
        this.success = success;
        this.code = code;
        this.message = message;
    }

    public static SmsResult success(String message)
    {
        return new SmsResult(true, "200", message);
    }

    public static SmsResult success(String message, String verificationCode)
    {
        SmsResult r = new SmsResult(true, "200", message);
        r.setVerificationCode(verificationCode);
        return r;
    }

    public static SmsResult fail(String code, String message)
    {
        return new SmsResult(false, code, message);
    }

    public static SmsResult fail(String message)
    {
        return new SmsResult(false, "500", message);
    }

    public boolean isSuccess()
    {
        return success;
    }

    public void setSuccess(boolean success)
    {
        this.success = success;
    }

    public String getCode()
    {
        return code;
    }

    public void setCode(String code)
    {
        this.code = code;
    }

    public String getMessage()
    {
        return message;
    }

    public void setMessage(String message)
    {
        this.message = message;
    }

    public String getRequestId()
    {
        return requestId;
    }

    public void setRequestId(String requestId)
    {
        this.requestId = requestId;
    }

    public String getVerificationCode()
    {
        return verificationCode;
    }

    public void setVerificationCode(String verificationCode)
    {
        this.verificationCode = verificationCode;
    }
}
