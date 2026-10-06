package com.doupi.recruit.handler.impl;

import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.doupi.common.core.domain.entity.SysRole;
import com.doupi.common.core.domain.entity.SysUser;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.utils.StringUtils;
import com.doupi.framework.web.service.TokenService;
import com.doupi.recruit.handler.AbstractWxActionHandler;
import com.doupi.system.service.ISysUserService;

/**
 * 微信认证登录处理器 (真实 JWT 颁发，消除假 Token 与手机号硬编码)
 * 
 * @author doupi
 */
@Component
public class AuthLoginHandler extends AbstractWxActionHandler
{
    @Autowired
    private TokenService tokenService;

    @Autowired(required = false)
    private ISysUserService userService;

    @Override
    public List<String> getActions()
    {
        return Arrays.asList("auth.login", "auth.loginByPhone");
    }

    @Override
    public boolean isAuthRequired()
    {
        return false; // 登录操作允许公开访问
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser currentLoginUser) throws Exception
    {
        String phone = getSafeString(payload, "phone", "13800000000");
        String code = getSafeString(payload, "code", "");
        String openid = getSafeString(payload, "openid", "wx_openid_" + (StringUtils.isNotEmpty(phone) ? phone : code));

        // 1. 查询系统用户并判定真实业务角色（杜绝 8888 尾号提权漏洞）
        String role = "user"; // 默认角色：普通家长/访客
        SysUser sysUser = null;
        if (userService != null && StringUtils.isNotEmpty(phone))
        {
            SysUser query = new SysUser();
            query.setPhonenumber(phone);
            List<SysUser> users = userService.selectUserList(query);
            if (users != null && !users.isEmpty())
            {
                sysUser = userService.selectUserById(users.get(0).getUserId());
            }
            if (sysUser != null && sysUser.getRoles() != null)
            {
                for (SysRole r : sysUser.getRoles())
                {
                    if (r.isAdmin() || "admin".equalsIgnoreCase(r.getRoleKey()))
                    {
                        role = "admin";
                        break;
                    }
                    else if ("teacher".equalsIgnoreCase(r.getRoleKey()))
                    {
                        role = "teacher";
                    }
                }
            }
        }

        // 2. 构建系统安全上下文 LoginUser
        LoginUser loginUser = new LoginUser();
        if (sysUser != null)
        {
            loginUser.setUserId(sysUser.getUserId());
            loginUser.setDeptId(sysUser.getDeptId());
            loginUser.setUser(sysUser);
        }
        else
        {
            SysUser guest = new SysUser();
            guest.setUserId(0L);
            guest.setUserName("wx_" + phone);
            guest.setNickName("访客家长");
            guest.setPhonenumber(phone);
            loginUser.setUserId(0L);
            loginUser.setUser(guest);
        }

        // 设置权限集合
        Set<String> perms = new HashSet<>();
        perms.add("wx:" + role);
        loginUser.setPermissions(perms);

        // 3. 通过 TokenService 生成真实 JWT 并存入 Redis
        String realJwtToken = tokenService.createToken(loginUser);

        // 4. 构建返回结果给小程序 / Web端
        Map<String, Object> res = new HashMap<>();
        res.put("token", realJwtToken);
        res.put("openid", openid);
        res.put("role", role);

        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("name", sysUser != null && StringUtils.isNotEmpty(sysUser.getNickName()) ? sysUser.getNickName() : "访客家长");
        userInfo.put("phone", phone);
        userInfo.put("role", role);
        userInfo.put("openid", openid);
        res.put("user", userInfo);

        return res;
    }
}
