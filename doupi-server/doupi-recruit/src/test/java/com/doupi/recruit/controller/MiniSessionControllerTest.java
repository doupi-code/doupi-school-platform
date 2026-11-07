package com.doupi.recruit.controller;

import java.util.List;
import java.util.Map;
import java.util.Set;
import com.doupi.common.core.domain.entity.SysRole;
import com.doupi.common.core.domain.entity.SysUser;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.framework.web.service.SysPermissionService;
import com.doupi.framework.web.service.TokenService;
import com.doupi.recruit.service.MiniSessionService;
import com.doupi.system.mapper.SysDeptMapper;
import com.doupi.system.service.ISysUserService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MiniSessionControllerTest
{
    @AfterEach
    void clearSecurityContext()
    {
        SecurityContextHolder.clearContext();
    }

    @Test
    void meUsesLiveAccountStatusPermissionsAndDepartmentScope()
    {
        var cached = new LoginUser(42L, 3L, new SysUser(42L), Set.of("wx:admin"));
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(cached, null, List.of()));

        var users = mock(ISysUserService.class);
        var permissions = mock(SysPermissionService.class);
        var live = new SysUser(42L);
        live.setDeptId(5L);
        live.setStatus("0");
        live.setDelFlag("0");
        var teacher = new SysRole();
        teacher.setRoleKey("teacher");
        teacher.setStatus("0");
        teacher.setDataScope("3");
        live.setRoles(List.of(teacher));
        when(users.selectUserById(42L)).thenReturn(live);
        when(permissions.getMenuPermission(live)).thenReturn(Set.of("recruit:appointment:list"));

        var service = new MiniSessionService(users, permissions, mock(SysDeptMapper.class));
        var controller = new MiniSessionController(service, mock(TokenService.class));
        var response = controller.me();
        assertEquals(200, response.getStatusCode().value());
        var data = (Map<?, ?>) response.getBody().data();
        assertEquals("42", data.get("userId"));
        assertEquals("5", data.get("deptId"));
        assertEquals(Set.of("recruit:appointment:list", "wx:teacher"), data.get("permissions"));
        assertEquals(Set.of("5"), data.get("scopeDeptIds"));
        live.setStatus("1");
        assertEquals(401, controller.me().getStatusCode().value());
    }

    @Test
    void logoutOnlyRevokesTheCurrentSessionAndReportsStorageFailure()
    {
        var tokens = mock(TokenService.class);
        var controller = new MiniSessionController(mock(MiniSessionService.class), tokens);
        var current = new LoginUser(42L, 5L, new SysUser(42L), Set.of());
        current.setToken("current-session");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(current, null, List.of()));
        doThrow(new DataAccessResourceFailureException("unavailable")).doNothing().when(tokens)
                .delLoginUser("current-session");

        assertThrows(DataAccessResourceFailureException.class, () -> controller.logout(current));
        assertEquals(current, SecurityContextHolder.getContext().getAuthentication().getPrincipal());
        assertEquals(503, controller.unavailable().getStatusCode().value());
        assertEquals(Map.of("revoked", true), controller.logout(current).getBody().data());
        verify(tokens, org.mockito.Mockito.times(2)).delLoginUser("current-session");
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }
}
