package com.doupi.recruit.service;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.TreeSet;
import com.doupi.common.core.domain.entity.SysDept;
import com.doupi.common.core.domain.entity.SysRole;
import com.doupi.common.core.domain.entity.SysUser;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.recruit.mapper.MiniIdentityMapper;
import com.doupi.recruit.mapper.MiniIdentityMapper.Identity;
import com.doupi.recruit.mapper.MiniIdentityMapper.Binding;
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
    private final MiniIdentityMapper identities;

    public MiniSessionService(ISysUserService users, SysPermissionService permissions, SysDeptMapper departments,
            MiniIdentityMapper identities)
    {
        this.users = users;
        this.permissions = permissions;
        this.departments = departments;
        this.identities = identities;
    }

    public LoginUser current()
    {
        LoginUser cached = principal();
        if (cached == null || cached.getUserId() == null || cached.getUserId() <= 0
                || (cached.getExternalIdentityId() != null && externalIdentity() == null))
        {
            return null;
        }
        SysUser user = users.selectUserById(cached.getUserId());
        if (!isActive(user))
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

    public LoginUser principal()
    {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.isAuthenticated()
                && authentication.getPrincipal() instanceof LoginUser login ? login : null;
    }

    public Identity externalIdentity()
    {
        LoginUser cached = principal();
        if (cached == null || cached.getExternalIdentityId() == null)
        {
            return null;
        }
        Identity identity = identities.selectIdentity(cached.getExternalIdentityId(), false);
        if (identity == null || cached.getUserId() == null)
        {
            return null;
        }
        if (cached.getUserId() == 0)
        {
            return identity;
        }
        return "VERIFIED".equals(identity.status()) && Objects.equals(cached.getUserId(), identity.staffId())
                && cached.getExternalBindingId() != null && cached.getExternalBindingId().equals(identity.bindingId())
                && cached.getExternalAuthVersion() != null && cached.getExternalAuthVersion().equals(identity.authVersion())
                ? identity : null;
    }

    public Binding latestBinding(long identityId)
    {
        return identities.selectLatestBinding(identityId);
    }

    public static boolean isActive(SysUser user)
    {
        return user != null && "0".equals(user.getStatus()) && "0".equals(user.getDelFlag());
    }

    public Set<String> scopeDeptIds(SysUser user)
    {
        return scopeDeptIds(user, activeRoles(user));
    }

    public Set<String> scopeDeptIds(SysUser user, String permission)
    {
        return scopeDeptIds(user, activeRoles(user).stream()
                .filter(role -> role.getPermissions() != null && role.getPermissions().contains(permission)).toList());
    }

    private Set<String> scopeDeptIds(SysUser user, List<SysRole> roles)
    {
        Set<String> result = new TreeSet<>();
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
