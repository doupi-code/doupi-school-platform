package com.doupi.recruit.controller;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
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
        LoginUser principal = sessions.principal();
        var identity = principal != null && principal.getExternalIdentityId() != null ? sessions.externalIdentity() : null;
        boolean visitor = identity != null && Long.valueOf(0).equals(principal.getUserId());
        if ((current == null && !visitor) || (principal != null && principal.getExternalIdentityId() != null && identity == null))
        {
            return reply(401, "登录会话已失效", null);
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("userId", visitor ? "0" : current.getUserId().toString());
        data.put("identityId", identity == null ? "0" : Long.toString(identity.id()));
        data.put("deptId", visitor || current.getDeptId() == null ? "0" : current.getDeptId().toString());
        data.put("kind", visitor ? "VISITOR" : "STAFF");
        data.put("permissions", visitor ? Set.of() : new TreeSet<>(current.getPermissions()));
        data.put("scopeDeptIds", visitor ? Set.of() : sessions.scopeDeptIds(current.getUser()));
        data.put("bindingStatus", identity == null ? null : identity.status());
        if (visitor)
        {
            var binding = sessions.latestBinding(identity.id());
            if (binding != null)
            {
                data.put("bindingRequestId", Long.toString(binding.id()));
                data.put("lastBindingStatus", binding.status());
            }
        }
        if (!visitor)
        {
            data.put("nickname", current.getUser().getNickName());
        }
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
