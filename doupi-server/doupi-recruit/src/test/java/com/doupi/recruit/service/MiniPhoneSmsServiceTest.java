package com.doupi.recruit.service;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import com.doupi.common.exception.ServiceException;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MiniPhoneSmsServiceTest
{
    private static final String PHONE = "13800000000";
    private final MiniWechatService wechat = mock(MiniWechatService.class);
    private final TencentLoginSmsSender sender = mock(TencentLoginSmsSender.class);
    private final StringRedisTemplate redis = mock(StringRedisTemplate.class);
    private final MiniPhoneSmsService sms = new MiniPhoneSmsService(wechat, sender, redis);

    @Test
    void providerFailureDoesNotSaveAUsableCode()
    {
        @SuppressWarnings("unchecked")
        ValueOperations<String, String> values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        when(values.setIfAbsent(anyString(), eq("1"), eq(Duration.ofSeconds(60)))).thenReturn(true);
        when(wechat.authenticateWechat("wx-code")).thenReturn("openid");
        doThrow(new ServiceException("send failed", 503)).when(sender).send(eq(PHONE), anyString(), anyInt());

        assertEquals(503, assertThrows(ServiceException.class, () -> sms.sendCode(PHONE, "wx-code")).getCode());
        verify(values, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    void samePhoneCannotIssueASessionWithoutItsWechatScopedCode()
    {
        when(wechat.authenticateWechat("wx-code")).thenReturn("openid");
        when(redis.execute(any(), eq(List.of("mini:sms:code:openid:" + PHONE)), eq("012345"))).thenReturn(0L, 1L, 0L);
        when(wechat.issueSession("openid", PHONE)).thenReturn(Map.of("kind", "VISITOR"));

        assertEquals(401, assertThrows(ServiceException.class, () -> sms.login(PHONE, "012345", "wx-code")).getCode());
        assertEquals("VISITOR", sms.login(PHONE, "012345", "wx-code").get("kind"));
        assertEquals(401, assertThrows(ServiceException.class, () -> sms.login(PHONE, "012345", "wx-code")).getCode());
        verify(wechat).issueSession("openid", PHONE);
    }
}
