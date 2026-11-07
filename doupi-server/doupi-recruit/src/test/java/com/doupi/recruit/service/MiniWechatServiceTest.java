package com.doupi.recruit.service;

import java.util.Set;
import com.doupi.common.core.domain.entity.SysUser;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.exception.ServiceException;
import com.doupi.framework.web.service.TokenService;
import com.doupi.recruit.mapper.MiniIdentityMapper;
import com.doupi.recruit.mapper.MiniIdentityMapper.Binding;
import com.doupi.recruit.mapper.MiniIdentityMapper.Command;
import com.doupi.recruit.mapper.MiniIdentityMapper.Identity;
import com.doupi.system.service.ISysUserService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class MiniWechatServiceTest
{
    private final WechatIdentityClient wechat = mock(WechatIdentityClient.class);
    private final MiniIdentityMapper mapper = mock(MiniIdentityMapper.class);
    private final MiniSessionService sessions = mock(MiniSessionService.class);
    private final TokenService tokens = mock(TokenService.class);
    private final ISysUserService users = mock(ISysUserService.class);
    private final MiniWechatService service = new MiniWechatService(wechat, mapper, sessions, tokens, users);

    @Test
    void failedWechatExchangeCannotCreateIdentityOrSession()
    {
        when(wechat.exchange("code")).thenThrow(new ServiceException("unavailable", 503));
        assertEquals(503, assertThrows(ServiceException.class, () -> service.login("code")).getCode());
        verifyNoInteractions(mapper, tokens);
    }

    @Test
    void failedPhoneProofCannotCreateIdentityOrSession()
    {
        when(wechat.exchange("wechat-code")).thenReturn("verified-openid");
        when(wechat.exchangePhone("expired-phone-code")).thenThrow(new ServiceException("expired", 401));

        assertEquals(401, assertThrows(ServiceException.class,
                () -> service.loginWithPhone("wechat-code", "expired-phone-code")).getCode());
        verifyNoInteractions(mapper, tokens);
    }

    @Test
    void verifiedPhoneRemainsContactDataAndCannotGrantStaffPermissions()
    {
        when(wechat.appId()).thenReturn("test-app");
        when(wechat.exchange("wechat-code")).thenReturn("verified-openid");
        when(wechat.exchangePhone("phone-code")).thenReturn("13800000000");
        when(mapper.findIdentity("test-app", "verified-openid"))
                .thenReturn(new Identity(11, null, "VISITOR", null, "test-app", "verified-openid", null));
        when(tokens.createToken(any())).thenReturn("server-token");

        assertEquals("VISITOR", service.loginWithPhone("wechat-code", "phone-code").get("kind"));
        var issued = ArgumentCaptor.forClass(LoginUser.class);
        verify(tokens).createToken(issued.capture());
        assertEquals("13800000000", issued.getValue().getVerifiedPhone());
        assertNull(issued.getValue().getExternalBindingId());
        verifyNoInteractions(users);
    }

    @Test
    void pendingIdentityIsIssuedAsVisitorAndVerifiedIdentityRequiresFreshLogin()
    {
        when(wechat.appId()).thenReturn("test-app");
        when(wechat.exchange("code")).thenReturn("verified-openid");
        when(mapper.findIdentity("test-app", "verified-openid"))
                .thenReturn(new Identity(11, null, "PENDING", null, "test-app", "verified-openid", null),
                        new Identity(11, 42L, "VERIFIED", 17L, "test-app", "verified-openid", 2L));
        SysUser staff = new SysUser(42L);
        staff.setStatus("0");
        staff.setDelFlag("0");
        when(users.selectUserById(42L)).thenReturn(staff);
        when(tokens.createToken(org.mockito.ArgumentMatchers.any())).thenReturn("server-token");

        assertEquals("VISITOR", service.login("code").get("kind"));
        assertEquals("STAFF", service.login("code").get("kind"));
        var issued = ArgumentCaptor.forClass(LoginUser.class);
        verify(tokens, org.mockito.Mockito.times(2)).createToken(issued.capture());
        assertEquals(0L, issued.getAllValues().get(0).getUserId());
        assertNull(issued.getAllValues().get(0).getExternalBindingId());
        assertEquals(17L, issued.getValue().getExternalBindingId());
        assertEquals(2L, issued.getValue().getExternalAuthVersion());
        assertTrue(issued.getValue().getPermissions().isEmpty());
    }

    @Test
    void collationCollisionCannotSignInAsTheOtherIdentity()
    {
        when(wechat.appId()).thenReturn("test-app");
        when(wechat.exchange("code")).thenReturn("ExactOpenId");
        when(mapper.findIdentity("test-app", "ExactOpenId"))
                .thenReturn(new Identity(11, 42L, "VERIFIED", 17L, "test-app", "exactopenid", 0L));
        assertEquals(503, assertThrows(ServiceException.class, () -> service.login("code")).getCode());
        verifyNoInteractions(users, tokens);
    }

    @Test
    void reviewRejectsSelfAndOutOfScopeEvenWithTheApprovalPermission()
    {
        SysUser operator = new SysUser(42L);
        when(sessions.current()).thenReturn(new LoginUser(42L, 5L, operator, Set.of("identity:binding:approve")));
        when(sessions.principal()).thenReturn(new LoginUser(42L, 5L, operator, Set.of()));
        when(sessions.scopeDeptIds(operator, "identity:binding:approve")).thenReturn(Set.of("5"));
        when(mapper.selectBinding(9, false))
                .thenReturn(new Binding(9, 11, 42, 5L, "staff", "Staff", "PENDING", "reason", 0),
                            new Binding(9, 11, 43, 6L, "staff", "Staff", "PENDING", "reason", 0));

        assertEquals(403, assertThrows(ServiceException.class,
                () -> service.review(9, 0L, "APPROVE", "ok", "review-key")).getCode());
        assertEquals(403, assertThrows(ServiceException.class,
                () -> service.review(9, 0L, "APPROVE", "ok", "review-key")).getCode());
    }

    @Test
    void revokeDoesNotAffectReplacementBindingEvenWithAnOlderReadSnapshot()
    {
        SysUser operator = new SysUser(1L);
        var staff = new LoginUser(1L, 5L, operator, Set.of("*:*:*"));
        when(sessions.principal()).thenReturn(staff);
        when(sessions.current()).thenReturn(staff);
        var old = new Binding(17, 11, 42, 5L, "staff", "Staff", "VERIFIED", "reason", 1);
        when(mapper.selectBinding(17, false)).thenReturn(old);
        when(mapper.selectBinding(17, true)).thenReturn(old);
        when(mapper.selectIdentity(11, true))
                .thenReturn(new Identity(11, 42L, "VERIFIED", 17L, "app", "subject", 0L));
        when(mapper.lockCurrentBinding(11, 42)).thenReturn(18L);
        when(mapper.lockCommand("STAFF:1", "BINDING_REVOKE", "revoke-key"))
                .thenAnswer(invocation -> {
                    var hash = ArgumentCaptor.forClass(String.class);
                    verify(mapper).upsertCommand(eq("STAFF:1"), eq("BINDING_REVOKE"), eq("revoke-key"), hash.capture());
                    return new Command(1, hash.getValue(), null);
                });

        assertEquals(409, assertThrows(ServiceException.class,
                () -> service.revoke(17, 1L, "revoke-key")).getCode());
        verify(mapper, never()).updateIdentity(anyLong(), any(), anyString(), any());
    }

    @Test
    void repeatedApplicationReturnsSavedResultAndChangedInputConflicts()
    {
        when(sessions.principal()).thenReturn(new LoginUser(0L, 0L, new SysUser(0L), Set.of()));
        when(sessions.externalIdentity()).thenReturn(new Identity(11, null, "PENDING", null, "test-app", "openid", null));
        when(mapper.lockCommand("IDENTITY:11", "BINDING_APPLY", "binding-key"))
                .thenAnswer(invocation -> {
                    var hash = ArgumentCaptor.forClass(String.class);
                    verify(mapper).upsertCommand(eq("IDENTITY:11"), eq("BINDING_APPLY"), eq("binding-key"), hash.capture());
                    return new Command(1, hash.getValue(), "{\"bindingRequestId\":\"19\",\"status\":\"PENDING\",\"version\":0}");
                })
                .thenReturn(new Command(1, "different-hash", null));

        var result = service.apply("staff", "School check", "binding-key");
        assertTrue(result.replayed());
        assertEquals("19", result.data().get("bindingRequestId"));
        assertEquals(409, assertThrows(ServiceException.class,
                () -> service.apply("staff-other", "School check", "binding-key")).getCode());
        verifyNoInteractions(users);
    }
}
