package com.doupi.recruit.handler.impl;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.recruit.handler.AbstractWxActionHandler;

/**
 * 微信验证码发送处理器
 * 
 * @author doupi
 */
@Component
public class AuthSendSmsCodeHandler extends AbstractWxActionHandler
{
    @Override
    public List<String> getActions()
    {
        return Collections.singletonList("auth.sendSmsCode");
    }

    @Override
    public boolean isAuthRequired()
    {
        return false;
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception
    {
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "验证码已发送(测试环境默认123456)");
        return res;
    }
}
