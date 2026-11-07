package com.doupi.framework.security.filter;

import java.io.IOException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.alibaba.fastjson2.JSON;
import com.alibaba.fastjson2.JSONWriter;
import com.doupi.common.core.domain.ApiV1Response;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.utils.SecurityUtils;
import com.doupi.common.utils.StringUtils;
import com.doupi.framework.web.service.TokenService;

/**
 * token过滤器 验证token有效性
 * 
 * @author doupi
 */
@Component
public class JwtAuthenticationTokenFilter extends OncePerRequestFilter
{
    @Autowired
    private TokenService tokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException
    {
        LoginUser loginUser;
        try
        {
            loginUser = tokenService.getLoginUser(request);
            if (loginUser != null && loginUser.getExternalIdentityId() != null
                    && !request.getRequestURI().startsWith(request.getContextPath() + "/api/v1/"))
            {
                loginUser = null;
            }
            if (loginUser != null && loginUser.getExternalIdentityId() == null && SecurityUtils.getAuthentication() == null)
            {
                tokenService.verifyToken(loginUser);
            }
        }
        catch (DataAccessException e)
        {
            if (!request.getRequestURI().startsWith(request.getContextPath() + "/api/v1/"))
            {
                throw e;
            }
            response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.setHeader("Cache-Control", "no-store");
            response.getWriter().write(JSON.toJSONString(ApiV1Response.of(503, "登录会话服务暂不可用", null),
                    JSONWriter.Feature.WriteNulls));
            return;
        }
        if (StringUtils.isNotNull(loginUser) && StringUtils.isNull(SecurityUtils.getAuthentication()))
        {
            UsernamePasswordAuthenticationToken authenticationToken = new UsernamePasswordAuthenticationToken(loginUser, null, loginUser.getAuthorities());
            authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(authenticationToken);
        }
        chain.doFilter(request, response);
    }
}
