package com.doupi.recruit.service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
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
    private AccessToken cachedAccessToken;

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
        requireConfigured();
        URI uri = URI.create("https://api.weixin.qq.com/sns/jscode2session?appid=" + encode(appId)
                + "&secret=" + encode(secret) + "&js_code=" + encode(code) + "&grant_type=authorization_code");
        HttpRequest request = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(7)).GET().build();
        HttpResponse<String> response = send(request);
        return readOpenId(response.statusCode(), response.body());
    }

    public String exchangePhone(String code)
    {
        AccessToken token = accessToken(null);
        JSONObject response = phoneResponse(code, token.value());
        int error = response.getIntValue("errcode");
        if (error == 40001 || error == 40014 || error == 42001)
        {
            response = phoneResponse(code, accessToken(token).value());
        }
        return readPhone(response, appId);
    }

    static String readPhone(JSONObject response, String appId)
    {
        Object error = response.get("errcode");
        if (!(error instanceof Number number))
        {
            throw unavailable();
        }
        if (number.longValue() == 40029 || number.longValue() == 40163)
        {
            throw new ServiceException("手机号授权已失效，请重新授权", 401);
        }
        if (number.longValue() != 0)
        {
            throw unavailable();
        }
        JSONObject info = response.getJSONObject("phone_info");
        JSONObject watermark = info == null ? null : info.getJSONObject("watermark");
        if (watermark == null || !appId.equals(watermark.getString("appid")))
        {
            throw unavailable();
        }
        String phone = info.getString("purePhoneNumber");
        if (!"86".equals(info.getString("countryCode")) || phone == null || !phone.matches("1[3-9]\\d{9}"))
        {
            throw new ServiceException("当前仅支持中国大陆手机号", 400);
        }
        return phone;
    }

    private synchronized AccessToken accessToken(AccessToken rejected)
    {
        requireConfigured();
        if (cachedAccessToken != null && cachedAccessToken != rejected && cachedAccessToken.expiresAt().isAfter(Instant.now()))
        {
            return cachedAccessToken;
        }
        JSONObject response = post("https://api.weixin.qq.com/cgi-bin/stable_token", Map.of("grant_type", "client_credential",
                "appid", appId, "secret", secret, "force_refresh", rejected != null));
        String token = response.getString("access_token");
        int ttl = response.getIntValue("expires_in");
        if (token == null || token.isBlank() || ttl <= 120)
        {
            throw unavailable();
        }
        cachedAccessToken = new AccessToken(token, Instant.now().plusSeconds(ttl - 120));
        return cachedAccessToken;
    }

    private JSONObject phoneResponse(String code, String token)
    {
        return post("https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=" + encode(token), Map.of("code", code));
    }

    private JSONObject post(String url, Map<String, ?> body)
    {
        HttpRequest request = HttpRequest.newBuilder(URI.create(url)).timeout(Duration.ofSeconds(7))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(JSON.toJSONString(body))).build();
        HttpResponse<String> response = send(request);
        return readResponse(response.statusCode(), response.body());
    }

    private void requireConfigured()
    {
        if (appId.isBlank() || secret.isBlank())
        {
            throw new ServiceException("微信登录尚未配置", 503);
        }
    }

    private HttpResponse<String> send(HttpRequest request)
    {
        try
        {
            return http.send(request, HttpResponse.BodyHandlers.ofString());
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

    private static JSONObject readResponse(int status, String body)
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
        return response;
    }

    static String readOpenId(int status, String body)
    {
        JSONObject response = readResponse(status, body);
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

    private record AccessToken(String value, Instant expiresAt) {}
}
