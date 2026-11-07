package com.doupi.recruit.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MiniWechatControllerTest
{
    @Test
    void loginRateLimitTrustsOnlyExplicitProxyPeers()
    {
        var request = mock(HttpServletRequest.class);
        var controller = new MiniWechatController(null, null, null, null, "127.0.0.1,::1");
        when(request.getRemoteAddr()).thenReturn("192.0.2.4", "127.0.0.1", "127.0.0.1");
        when(request.getHeader("X-Real-IP")).thenReturn("198.51.100.10", "invalid, value");
        assertEquals("192.0.2.4", controller.loginSource(request));
        assertEquals("198.51.100.10", controller.loginSource(request));
        assertEquals("127.0.0.1", controller.loginSource(request));
    }
}
