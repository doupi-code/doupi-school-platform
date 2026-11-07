package com.doupi.recruit.controller;

import java.util.List;
import java.util.Map;
import java.util.Set;
import com.doupi.common.core.domain.entity.SysUser;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.recruit.handler.AbstractWxActionHandler;
import com.doupi.recruit.handler.WxActionHandlerRegistry;
import com.doupi.recruit.service.MiniSessionService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class MiniGatewayBoundaryTest
{
    @Test
    void onlyExplicitPublicActionsReachHandlersWithoutAnAuthenticatedActor()
    {
        WxActionHandlerRegistry registry = new WxActionHandlerRegistry();
        registry.registerHandlers(List.of(new AbstractWxActionHandler()
        {
            @Override
            public List<String> getActions()
            {
                return List.of("campus.summary", "campus.adminDetail", "appointment.adminCancel", "auth.login");
            }

            @Override
            public boolean isAuthRequired()
            {
                return false;
            }

            @Override
            public Object handle(Map<String, Object> payload, LoginUser actor)
            {
                return "handled";
            }
        }));
        DoupiWxDispatcherController controller = new DoupiWxDispatcherController(registry, mock(MiniSessionService.class));
        assertEquals("handled", controller.dispatch(Map.of("action", "campus.summary")).get("data"));
        assertEquals(401, controller.dispatch(Map.of("action", "campus.adminDetail")).get("errCode"));
        assertEquals(401, controller.dispatch(Map.of("action", "appointment.adminCancel",
                "payload", Map.of("role", "admin", "_userId", "1"))).get("errCode"));
        assertEquals(503, controller.dispatch(Map.of("action", "auth.login",
                "payload", Map.of("phone", "13800000000", "code", "unverified"))).get("errCode"));
    }

    @Test
    void v1PersonalActionsUseTheCurrentAccountAndReturnTheStandardEnvelope()
    {
        WxActionHandlerRegistry registry = new WxActionHandlerRegistry();
        registry.registerHandlers(List.of(new AbstractWxActionHandler()
        {
            @Override
            public List<String> getActions()
            {
                return List.of("appointment.queryByPhone", "appointment.adminCancel");
            }

            @Override
            public Object handle(Map<String, Object> payload, LoginUser actor)
            {
                return payload;
            }
        }));
        SysUser staff = new SysUser(42L);
        staff.setPhonenumber("13800000042");
        MiniSessionService sessions = mock(MiniSessionService.class);
        when(sessions.current()).thenReturn(new LoginUser(42L, 5L, staff, Set.of("wx:teacher")));
        DoupiWxDispatcherController controller = new DoupiWxDispatcherController(registry, sessions);
        var reply = controller.dispatchV1(Map.of("action", "appointment.queryByPhone", "payload",
                Map.of("phone", "13800000001", "parentPhone", "13800000001", "openid", "forged", "_userId", 1)));
        assertEquals(200, reply.getStatusCode().value());
        var envelope = reply.getBody();
        assertNotNull(envelope);
        assertEquals(0, envelope.code());
        assertNotNull(envelope.traceId());
        assertFalse(envelope.replayed());
        assertEquals(Map.of("phone", "13800000042", "parentPhone", "13800000042",
                "_current_action", "appointment.queryByPhone"), envelope.data());
        assertEquals(403, controller.dispatchV1(Map.of("action", "appointment.adminCancel")).getStatusCode().value());
    }
}
