package com.doupi.recruit.controller;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.TreeSet;
import com.doupi.common.core.domain.ApiV1Response;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.framework.web.service.TokenService;
import com.doupi.recruit.service.MiniSessionService;
import org.springframework.dao.DataAccessException;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class MiniSessionController
{
    private final MiniSessionService sessions;
    private final TokenService tokens;

    public MiniSessionController(MiniSessionService sessions, TokenService tokens)
    {
        this.sessions = sessions;
        this.tokens = tokens;
    }

    @GetMapping("/me")
    public ResponseEntity<ApiV1Response> me()
    {
        LoginUser current = sessions.current();
        if (current == null)
        {
            return reply(401, "登录会话已失效", null);
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("userId", current.getUserId().toString());
        data.put("identityId", "0");
        data.put("deptId", current.getDeptId() == null ? "0" : current.getDeptId().toString());
        data.put("kind", "STAFF");
        data.put("permissions", new TreeSet<>(current.getPermissions()));
        data.put("scopeDeptIds", sessions.scopeDeptIds(current.getUser()));
        data.put("bindingStatus", null);
        return reply(200, "ok", data);
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiV1Response> logout(@AuthenticationPrincipal LoginUser current)
    {
        if (current == null || current.getToken() == null || current.getToken().isBlank())
        {
            return reply(401, "登录会话已失效", null);
        }
        tokens.delLoginUser(current.getToken());
        SecurityContextHolder.clearContext();
        return reply(200, "ok", Map.of("revoked", true));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<ApiV1Response> unavailable()
    {
        return reply(503, "登录会话服务暂不可用", null);
    }

    private ResponseEntity<ApiV1Response> reply(int status, String message, Object data)
    {
        return ResponseEntity.status(status).cacheControl(CacheControl.noStore())
                .body(ApiV1Response.of(status == 200 ? 0 : status, message, data));
    }
}
