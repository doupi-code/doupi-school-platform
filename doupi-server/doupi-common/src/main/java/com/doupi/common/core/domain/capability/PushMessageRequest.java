package com.doupi.common.core.domain.capability;

import java.io.Serializable;
import java.util.Map;

/**
 * 消息推送统一请求对象
 * 
 * @author doupi
 */
public class PushMessageRequest implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 目标用户ID或手机号 */
    private String targetUserId;

    /** 目标用户微信 openid */
    private String openid;

    /** 消息标题 */
    private String title;

    /** 消息正文内容 */
    private String content;

    /** 消息业务类型 (APPOINTMENT, NOTICE, REMINDER, AUDIT) */
    private String type;

    /** 关联模块名称 */
    private String module;

    /** 关联业务ID (如预约ID) */
    private Long targetId;

    /** 微信小程序订阅消息模板ID */
    private String wechatTemplateId;

    /** 微信小程序跳转页面路径 */
    private String wechatPage;

    /** 微信小程序模板数据 Map */
    private Map<String, String> wechatData;

    public PushMessageRequest() {}

    public String getTargetUserId()
    {
        return targetUserId;
    }

    public void setTargetUserId(String targetUserId)
    {
        this.targetUserId = targetUserId;
    }

    public String getOpenid()
    {
        return openid;
    }

    public void setOpenid(String openid)
    {
        this.openid = openid;
    }

    public String getTitle()
    {
        return title;
    }

    public void setTitle(String title)
    {
        this.title = title;
    }

    public String getContent()
    {
        return content;
    }

    public void setContent(String content)
    {
        this.content = content;
    }

    public String getType()
    {
        return com.doupi.common.utils.StringUtils.isNotEmpty(type) ? type : "APPOINTMENT";
    }

    public void setType(String type)
    {
        this.type = type;
    }

    public String getModule()
    {
        return module;
    }

    public void setModule(String module)
    {
        this.module = module;
    }

    public Long getTargetId()
    {
        return targetId;
    }

    public void setTargetId(Long targetId)
    {
        this.targetId = targetId;
    }

    public String getWechatTemplateId()
    {
        return wechatTemplateId;
    }

    public void setWechatTemplateId(String wechatTemplateId)
    {
        this.wechatTemplateId = wechatTemplateId;
    }

    public String getWechatPage()
    {
        return wechatPage;
    }

    public void setWechatPage(String wechatPage)
    {
        this.wechatPage = wechatPage;
    }

    public Map<String, String> getWechatData()
    {
        return wechatData;
    }

    public void setWechatData(Map<String, String> wechatData)
    {
        this.wechatData = wechatData;
    }
}
