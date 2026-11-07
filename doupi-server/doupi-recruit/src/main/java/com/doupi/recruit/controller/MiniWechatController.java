package com.doupi.recruit.controller;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import com.doupi.common.core.domain.ApiV1Response;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.exception.ServiceException;
import com.doupi.recruit.service.MiniWechatService;
import com.doupi.recruit.service.MiniWechatService.CommandResult;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataAccessException;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

@RestController
@RequestMapping("/api/v1")
public class MiniWechatController
{
    private static final Logger log = LoggerFactory.getLogger(MiniWechatController.class);
    private final MiniWechatService service;
    private final RedisTemplate<Object, Object> redis;
    private final RedisScript<Long> limitScript;
    private final Set<String> trustedProxies;

    public MiniWechatController(MiniWechatService service, RedisTemplate<Object, Object> redis,
            RedisScript<Long> limitScript, @Value("${plan.wechat.trusted-proxies:}") String trustedProxies)
    {
        this.service = service;
        this.redis = redis;
        this.limitScript = limitScript;
        this.trustedProxies = Arrays.stream(trustedProxies.split(",")).map(String::trim)
                .filter(value -> !value.isEmpty()).collect(Collectors.toUnmodifiableSet());
    }

    @PostMapping("/auth/wechat")
    public ResponseEntity<ApiV1Response> login(@RequestBody LoginBody body, HttpServletRequest request)
    {
        throttle("mini:wechat:login:" + loginSource(request), 120);
        return reply(200, "ok", false, service.login(body.code()));
    }

    @PostMapping("/auth/employee-bindings")
    public ResponseEntity<ApiV1Response> apply(@RequestBody ApplyBody body, @AuthenticationPrincipal LoginUser actor,
            @RequestHeader(value = "Idempotency-Key", required = false) String key)
    {
        if (actor != null && actor.getExternalIdentityId() != null)
        {
            throttle("mini:wechat:binding:" + actor.getExternalIdentityId(), 20);
        }
        return success(service.apply(body.username(), body.reason(), key));
    }

    @GetMapping("/staff/employee-bindings")
    public ResponseEntity<ApiV1Response> queue(@RequestParam(required = false) Long before)
    {
        return reply(200, "ok", false, service.queue(before));
    }

    @PostMapping("/staff/employee-bindings/{id}/review")
    public ResponseEntity<ApiV1Response> review(@PathVariable long id, @RequestBody ReviewBody body,
            @RequestHeader(value = "Idempotency-Key", required = false) String key)
    {
        return success(service.review(id, body.expectedVersion(), body.decision(), body.remark(), key));
    }

    @PostMapping("/staff/employee-bindings/{id}/revoke")
    public ResponseEntity<ApiV1Response> revoke(@PathVariable long id, @RequestBody RevokeBody body,
            @RequestHeader(value = "Idempotency-Key", required = false) String key)
    {
        return success(service.revoke(id, body.expectedVersion(), key));
    }

    @ExceptionHandler(ServiceException.class)
    public ResponseEntity<ApiV1Response> serviceError(ServiceException exception)
    {
        int status = exception.getCode() == null ? 400 : exception.getCode();
        return reply(status, exception.getMessage(), false, null);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiV1Response> badRequest()
    {
        return reply(400, "请求参数无效", false, null);
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiV1Response> unavailable(DataAccessException exception)
    {
        ApiV1Response response = ApiV1Response.of(503, "身份服务暂不可用", null);
        log.error("微信身份服务依赖异常 traceId={} type={}", response.traceId(), exception.getClass().getSimpleName());
        return ResponseEntity.status(503).cacheControl(CacheControl.noStore()).body(response);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<ApiV1Response> unexpected(RuntimeException exception)
    {
        ApiV1Response response = ApiV1Response.of(500, "身份服务处理失败", null);
        log.error("微信身份服务执行异常 traceId={} type={}", response.traceId(), exception.getClass().getSimpleName());
        return ResponseEntity.status(500).cacheControl(CacheControl.noStore()).body(response);
    }

    private void throttle(String key, int count)
    {
        Long result = redis.execute(limitScript, List.of(key), count, 60);
        if (result == null)
        {
            throw new ServiceException("身份服务暂不可用", 503);
        }
        if (result > count)
        {
            throw new ServiceException("请求过于频繁，请稍后重试", 429);
        }
    }

    String loginSource(HttpServletRequest request)
    {
        String peer = request.getRemoteAddr();
        String forwarded = trustedProxies.contains(peer) ? request.getHeader("X-Real-IP") : null;
        if (forwarded != null && (forwarded.matches("(?:[0-9]{1,3}\\.){3}[0-9]{1,3}")
                || (forwarded.contains(":") && forwarded.matches("[0-9a-fA-F:.]{2,45}"))))
        {
            return forwarded;
        }
        return peer;
    }

    private ResponseEntity<ApiV1Response> success(CommandResult result)
    {
        return reply(result.status(), "ok", result.replayed(), result.data());
    }

    private ResponseEntity<ApiV1Response> reply(int status, String message, boolean replayed, Object data)
    {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore())
                .body(new ApiV1Response(status < 300 ? 0 : status, message, UUID.randomUUID().toString(), replayed, data));
    }

    public record LoginBody(String code) {}
    public record ApplyBody(String username, String reason) {}
    public record ReviewBody(Long expectedVersion, String decision, String remark) {}
    public record RevokeBody(Long expectedVersion) {}
}
