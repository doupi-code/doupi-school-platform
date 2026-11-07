package com.doupi.recruit.service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONException;
import com.alibaba.fastjson2.JSONObject;
import com.doupi.common.exception.ServiceException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class WechatIdentityClient
{
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(4)).build();
    private final String appId;
    private final String secret;

    public WechatIdentityClient(@Value("${plan.wechat.app-id:}") String appId,
            @Value("${plan.wechat.secret:}") String secret)
    {
        this.appId = appId.trim();
        this.secret = secret.trim();
    }

    public String appId()
    {
        return appId;
    }

    public String exchange(String code)
    {
        if (appId.isBlank() || secret.isBlank())
        {
            throw new ServiceException("微信登录尚未配置", 503);
        }
        URI uri = URI.create("https://api.weixin.qq.com/sns/jscode2session?appid=" + encode(appId)
                + "&secret=" + encode(secret) + "&js_code=" + encode(code) + "&grant_type=authorization_code");
        HttpRequest request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(7)).GET().build();
        try
        {
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            return readOpenId(response.statusCode(), response.body());
        }
        catch (InterruptedException e)
        {
            Thread.currentThread().interrupt();
            throw unavailable();
        }
        catch (IOException e)
        {
            throw unavailable();
        }
    }

    static String readOpenId(int status, String body)
    {
        if (status != 200)
        {
            throw unavailable();
        }
        JSONObject response;
        try
        {
            response = JSON.parseObject(body);
        }
        catch (JSONException e)
        {
            throw unavailable();
        }
        if (response == null)
        {
            throw unavailable();
        }
        Object error = response.get("errcode");
        if (error != null && (!(error instanceof Number number) || number.longValue() != 0))
        {
            if (error instanceof Number number)
            {
                long value = number.longValue();
                if (value == 40029 || value == 40163)
                {
                    throw new ServiceException("微信登录凭证已失效，请重新登录", 401);
                }
                if (value == 45011)
                {
                    throw new ServiceException("微信登录请求过于频繁，请稍后重试", 429);
                }
            }
            throw unavailable();
        }
        if (response.get("openid") instanceof String openId && !openId.isBlank() && openId.length() <= 128)
        {
            return openId;
        }
        throw unavailable();
    }

    private static ServiceException unavailable()
    {
        return new ServiceException("微信登录服务暂不可用", 503);
    }

    private static String encode(String value)
    {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }
}
