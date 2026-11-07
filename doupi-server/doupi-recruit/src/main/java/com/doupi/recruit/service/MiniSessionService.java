package com.doupi.recruit.service;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import com.doupi.common.core.domain.entity.SysDept;
import com.doupi.common.core.domain.entity.SysRole;
import com.doupi.common.core.domain.entity.SysUser;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.framework.web.service.SysPermissionService;
import com.doupi.system.mapper.SysDeptMapper;
import com.doupi.system.service.ISysUserService;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class MiniSessionService
{
    private final ISysUserService users;
    private final SysPermissionService permissions;
    private final SysDeptMapper departments;

    public MiniSessionService(ISysUserService users, SysPermissionService permissions, SysDeptMapper departments)
    {
        this.users = users;
        this.permissions = permissions;
        this.departments = departments;
    }

    public LoginUser current()
    {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof LoginUser cached)
                || cached.getUserId() == null || cached.getUserId() <= 0)
        {
            return null;
        }
        SysUser user = users.selectUserById(cached.getUserId());
        if (user == null || !"0".equals(user.getStatus()) || !"0".equals(user.getDelFlag()))
        {
            return null;
        }
        Set<String> currentPermissions = new HashSet<>(permissions.getMenuPermission(user));
        for (SysRole role : activeRoles(user))
        {
            if ("admin".equals(role.getRoleKey()) || "teacher".equals(role.getRoleKey()))
            {
                currentPermissions.add("wx:" + role.getRoleKey());
            }
        }
        return new LoginUser(user.getUserId(), user.getDeptId(), user, currentPermissions);
    }

    public Set<String> scopeDeptIds(SysUser user)
    {
        Set<String> result = new TreeSet<>();
        List<SysRole> roles = activeRoles(user);
        if (user.isAdmin() || roles.stream().anyMatch(role -> "1".equals(role.getDataScope())))
        {
            departments.selectDeptList(new SysDept()).forEach(dept -> result.add(dept.getDeptId().toString()));
            return result;
        }
        Long deptId = user.getDeptId();
        for (SysRole role : roles)
        {
            String scope = role.getDataScope();
            if ("2".equals(scope))
            {
                departments.selectDeptListByRoleId(role.getRoleId(), false).forEach(id -> result.add(id.toString()));
            }
            else if (deptId != null && ("3".equals(scope) || "4".equals(scope)))
            {
                result.add(deptId.toString());
                if ("4".equals(scope))
                {
                    departments.selectChildrenDeptById(deptId).forEach(dept -> result.add(dept.getDeptId().toString()));
                }
            }
        }
        return result;
    }

    private List<SysRole> activeRoles(SysUser user)
    {
        return user.getRoles() == null ? List.of() : user.getRoles().stream()
                .filter(role -> "0".equals(role.getStatus())).toList();
    }
}
