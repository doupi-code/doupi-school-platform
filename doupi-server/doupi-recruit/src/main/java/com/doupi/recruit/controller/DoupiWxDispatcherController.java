package com.doupi.recruit.controller;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.utils.SecurityUtils;
import com.doupi.common.utils.StringUtils;
import com.doupi.framework.web.service.TokenService;
import com.doupi.recruit.handler.WxActionHandler;
import com.doupi.recruit.handler.WxActionHandlerRegistry;

/**
 * 微信小程序/Web 统一分发网关 Controller (策略模式重构版)
 * 路由: POST /api/wx/dispatcher
 * 
 * 具备细粒度 RBAC 安全认证拦截，彻底消除上帝类 switch-case 与越权提权漏洞。
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/api/wx")
public class DoupiWxDispatcherController
{
    private static final Logger log = LoggerFactory.getLogger(DoupiWxDispatcherController.class);

    @Autowired
    private WxActionHandlerRegistry handlerRegistry;

    @Autowired
    private TokenService tokenService;

    @PostMapping("/dispatcher")
    public Map<String, Object> dispatch(@RequestBody Map<String, Object> req, HttpServletRequest request)
    {
        String action = (String) req.get("action");
        String requestId = (String) req.get("requestId");
        @SuppressWarnings("unchecked")
        Map<String, Object> payload = (Map<String, Object>) req.get("payload");
        if (payload == null)
        {
            payload = new HashMap<>();
        }
        // 将当前 action 注入 payload 供复用 handler 区分分支
        payload.put("_current_action", action);

        log.info("[WX-DISPATCHER][{}] 收到请求 action: {}", requestId, action);

        if (StringUtils.isEmpty(action))
        {
            return buildErrorResp(400, "Action 不能为空", requestId);
        }

        WxActionHandler handler = handlerRegistry.getHandler(action);
        if (handler == null)
        {
            log.warn("[WX-DISPATCHER][{}] 未找到匹配的 Action 处理器: {}", requestId, action);
            return buildErrorResp(404, "未知的网关操作: " + action, requestId);
        }

        // 1. 尝试从 SecurityContextHolder 或 TokenService 获取当前登录用户
        LoginUser loginUser = null;
        try
        {
            loginUser = SecurityUtils.getLoginUser();
        }
        catch (Exception ignored) {}

        if (loginUser == null)
        {
            try
            {
                loginUser = tokenService.getLoginUser(request);
            }
            catch (Exception ignored) {}
        }

        // 2. 检查处理器鉴权需求
        if (handler.isAuthRequired())
        {
            if (loginUser == null)
            {
                log.warn("[WX-DISPATCHER][{}] 访问受限接口 [{}] 被拒绝: 用户未登录", requestId, action);
                return buildErrorResp(401, "请先登录后再进行此操作", requestId);
            }

            // 3. 检查角色权限
            List<String> requiredRoles = handler.getRequiredRoles();
            if (requiredRoles != null && !requiredRoles.isEmpty())
            {
                boolean hasRole = false;
                if (loginUser.getPermissions() != null)
                {
                    for (String role : requiredRoles)
                    {
                        if (loginUser.getPermissions().contains("wx:" + role) || loginUser.getPermissions().contains("*:*:*"))
                        {
                            hasRole = true;
                            break;
                        }
                    }
                }
                if (!hasRole)
                {
                    log.warn("[WX-DISPATCHER][{}] 用户 [{}] 访问接口 [{}] 权限不足，需要角色: {}", 
                        requestId, loginUser.getUsername(), action, requiredRoles);
                    return buildErrorResp(403, "无权限执行此管理操作", requestId);
                }
            }
        }

        // 4. 执行业务逻辑
        try
        {
            Object data = handler.handle(payload, loginUser);
            Map<String, Object> resp = new HashMap<>();
            resp.put("ok", true);
            resp.put("data", data);
            resp.put("errCode", 0);
            resp.put("errMsg", "ok");
            resp.put("requestId", requestId);
            return resp;
        }
        catch (IllegalArgumentException | IllegalStateException e)
        {
            log.warn("[WX-DISPATCHER][{}] 业务处理校验未通过: {}", requestId, e.getMessage());
            return buildErrorResp(400, e.getMessage(), requestId);
        }
        catch (Exception e)
        {
            log.error("[WX-DISPATCHER][{}] 执行 Action [{}] 发生未捕获异常", requestId, action, e);
            return buildErrorResp(500, "服务处理异常: " + e.getMessage(), requestId);
        }
    }

    private Map<String, Object> buildErrorResp(int code, String msg, String requestId)
    {
        Map<String, Object> errResp = new HashMap<>();
        errResp.put("ok", false);
        errResp.put("errCode", code);
        errResp.put("errMsg", msg);
        errResp.put("requestId", requestId);
        return errResp;
    }
}
