package com.doupi.recruit.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import com.doupi.common.core.domain.ApiV1Response;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.exception.ServiceException;
import com.doupi.recruit.handler.WxActionHandler;
import com.doupi.recruit.handler.WxActionHandlerRegistry;
import com.doupi.recruit.service.MiniSessionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** 微信小程序分发网关，并保留旧调用方的响应格式。 */
@RestController
public class DoupiWxDispatcherController
{
    private static final Logger log = LoggerFactory.getLogger(DoupiWxDispatcherController.class);
    private static final Set<String> PUBLIC_ACTIONS = Set.of(
            "campus.summary", "campus.detail", "about.summary", "config.summary",
            "config.listBanner", "config.getTimeSlots", "config.getCampusList",
            "config.getBasicConfig", "appointment.meta", "appointment.create");
    private static final Set<String> DISABLED_ACTIONS = Set.of(
            "auth.login", "auth.loginByPhone", "auth.phoneLogin", "auth.sendSmsCode", "auth.getPhoneNumber",
            "binding.submitBindRequest", "binding.getMyBindRequestStatus", "binding.status");
    private static final Set<String> PERSONAL_ACTIONS = Set.of(
            "appointment.list", "appointment.queryByPhone", "user.getProfile", "profile.home",
            "message.list", "message.count");

    private final WxActionHandlerRegistry registry;
    private final MiniSessionService sessions;

    public DoupiWxDispatcherController(WxActionHandlerRegistry registry, MiniSessionService sessions)
    {
        this.registry = registry;
        this.sessions = sessions;
    }

    @PostMapping("/api/wx/dispatcher")
    public Map<String, Object> dispatch(@RequestBody Map<String, Object> request)
    {
        Result result = execute(request, UUID.randomUUID().toString());
        Map<String, Object> response = new HashMap<>();
        response.put("ok", result.status == 200);
        response.put("errCode", result.status == 200 ? 0 : result.status);
        response.put("errMsg", result.message);
        response.put("requestId", request.get("requestId"));
        if (result.status == 200)
        {
            response.put("data", result.data);
        }
        return response;
    }

    @PostMapping("/api/v1/wx/dispatcher")
    public ResponseEntity<ApiV1Response> dispatchV1(@RequestBody Map<String, Object> request)
    {
        String traceId = UUID.randomUUID().toString();
        Result result = execute(request, traceId);
        return reply(new ApiV1Response(result.status == 200 ? 0 : result.status, result.message,
                traceId, false, result.data), result.status);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiV1Response> invalidBody()
    {
        return reply(ApiV1Response.of(400, "请求正文不是有效的JSON对象", null), 400);
    }

    private Result execute(Map<String, Object> request, String traceId)
    {
        if (!(request.get("action") instanceof String action) || !action.matches("[a-zA-Z0-9.]{1,80}"))
        {
            return Result.error(400, "Action 无效");
        }
        if (DISABLED_ACTIONS.contains(action))
        {
            return Result.error(503, "此操作等待微信身份验证服务接入");
        }
        WxActionHandler handler = registry.getHandler(action);
        if (handler == null)
        {
            return Result.error(404, "未知的网关操作");
        }
        Object rawPayload = request.get("payload");
        if (rawPayload != null && !(rawPayload instanceof Map<?, ?>))
        {
            return Result.error(400, "Payload 必须是对象");
        }
        Map<String, Object> payload = new HashMap<>();
        if (rawPayload instanceof Map<?, ?> fields)
        {
            fields.forEach((key, value) -> {
                if (key instanceof String name && !name.startsWith("_") && !"openid".equalsIgnoreCase(name))
                {
                    payload.put(name, value);
                }
            });
        }
        payload.put("_current_action", action);
        try
        {
            LoginUser actor = null;
            if (!PUBLIC_ACTIONS.contains(action) || handler.isAuthRequired())
            {
                LoginUser principal = sessions.principal();
                if (principal != null && principal.getExternalIdentityId() != null)
                {
                    boolean valid = Long.valueOf(0).equals(principal.getUserId())
                            ? sessions.externalIdentity() != null : sessions.current() != null;
                    return valid ? Result.error(403, "此旧版功能等待身份和数据范围接入")
                            : Result.error(401, "登录会话已失效");
                }
                actor = sessions.current();
                if (actor == null)
                {
                    return Result.error(401, "请先登录后再进行此操作");
                }
                if (!hasAccess(action, handler.getRequiredRoles(), actor.getPermissions()))
                {
                    return Result.error(403, "无权限执行此操作");
                }
            }
            if (PERSONAL_ACTIONS.contains(action))
            {
                String phone = actor.getUser().getPhonenumber();
                if (phone == null || phone.isBlank())
                {
                    return Result.error(403, "账号缺少已核验手机号");
                }
                payload.put("phone", phone);
                payload.put("parentPhone", phone);
            }
            return new Result(200, "ok", handler.handle(payload, actor));
        }
        catch (ServiceException exception)
        {
            Integer code = exception.getCode();
            int status = code != null && Set.of(400, 401, 403, 404, 409, 422).contains(code) ? code : 400;
            return Result.error(status, exception.getMessage());
        }
        catch (IllegalArgumentException exception)
        {
            return Result.error(400, "请求参数无效");
        }
        catch (DataAccessException exception)
        {
            log.error("小程序网关依赖服务不可用 action={} traceId={}", action, traceId, exception);
            return Result.error(503, "服务暂不可用，请稍后重试");
        }
        catch (Exception exception)
        {
            log.error("小程序网关处理失败 action={} traceId={}", action, traceId, exception);
            return Result.error(500, "服务处理异常");
        }
    }

    private boolean hasAccess(String action, List<String> roles, Set<String> permissions)
    {
        if (permissions.contains("*:*:*"))
        {
            return true;
        }
        if ("appointment.adminCancel".equals(action) || "admin.dashboardStats".equals(action))
        {
            return permissions.contains("wx:admin");
        }
        if ("campus.adminDetail".equals(action) || "appointment.adminDetail".equals(action))
        {
            return permissions.contains("wx:admin") || permissions.contains("wx:teacher");
        }
        return roles == null || roles.isEmpty()
                || roles.stream().anyMatch(role -> permissions.contains("wx:" + role));
    }

    private ResponseEntity<ApiV1Response> reply(ApiV1Response response, int status)
    {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore()).body(response);
    }

    private record Result(int status, String message, Object data)
    {
        private static Result error(int status, String message)
        {
            return new Result(status, message, null);
        }
    }
}
