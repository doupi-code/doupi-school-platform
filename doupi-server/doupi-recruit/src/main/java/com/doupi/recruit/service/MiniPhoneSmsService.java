package com.doupi.recruit.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import com.doupi.common.exception.ServiceException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

@Service
public class MiniPhoneSmsService
{
    private static final int EXPIRE_MINUTES = 5;
    private static final Duration RESEND_DELAY = Duration.ofSeconds(60);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final RedisScript<Long> VERIFY = RedisScript.of("""
            local value = redis.call('GET', KEYS[1])
            if not value then return 0 end
            if string.sub(value, 2) == ARGV[1] then
                redis.call('DEL', KEYS[1])
                return 1
            end
            local remaining = tonumber(string.sub(value, 1, 1)) - 1
            if remaining <= 0 then
                redis.call('DEL', KEYS[1])
            else
                redis.call('SET', KEYS[1], tostring(remaining) .. string.sub(value, 2), 'KEEPTTL')
            end
            return 0
            """, Long.class);
    private final MiniWechatService wechat;
    private final TencentLoginSmsSender sender;
    private final StringRedisTemplate redis;

    public MiniPhoneSmsService(MiniWechatService wechat, TencentLoginSmsSender sender, StringRedisTemplate redis)
    {
        this.wechat = wechat;
        this.sender = sender;
        this.redis = redis;
    }

    public Map<String, Object> sendCode(String phone, String wechatCode)
    {
        requirePhone(phone);
        sender.requireConfigured();
        String openId = wechat.authenticateWechat(wechatCode);
        reserve("mini:sms:send:wechat:" + openId);
        reserve("mini:sms:send:phone:" + phone);
        String code = String.format(Locale.ROOT, "%06d", RANDOM.nextInt(1_000_000));
        sender.send(phone, code, EXPIRE_MINUTES);
        redis.opsForValue().set(codeKey(openId, phone), "5" + code, Duration.ofMinutes(EXPIRE_MINUTES));
        return Map.of("resendAfter", RESEND_DELAY.toSeconds());
    }

    public Map<String, Object> login(String phone, String code, String wechatCode)
    {
        requirePhone(phone);
        if (code == null || !code.matches("[0-9]{6}"))
        {
            throw new ServiceException("请输入6位验证码", 400);
        }
        String openId = wechat.authenticateWechat(wechatCode);
        Long verified = redis.execute(VERIFY, List.of(codeKey(openId, phone)), code);
        if (verified == null)
        {
            throw new ServiceException("验证码服务暂不可用", 503);
        }
        if (verified != 1)
        {
            throw new ServiceException("验证码错误或已过期", 401);
        }
        return wechat.issueSession(openId, phone);
    }

    private void reserve(String key)
    {
        Boolean reserved = redis.opsForValue().setIfAbsent(key, "1", RESEND_DELAY);
        if (reserved == null)
        {
            throw new ServiceException("验证码服务暂不可用", 503);
        }
        if (!reserved)
        {
            throw new ServiceException("验证码请求过于频繁，请稍后重试", 429);
        }
    }

    private static void requirePhone(String phone)
    {
        if (phone == null || !phone.matches("1[3-9][0-9]{9}"))
        {
            throw new ServiceException("请输入正确的手机号", 400);
        }
    }

    private static String codeKey(String openId, String phone)
    {
        return "mini:sms:code:" + openId + ':' + phone;
    }
}
