package com.doupi.recruit.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;
import com.alibaba.fastjson2.JSON;
import com.doupi.common.core.domain.entity.SysUser;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.common.exception.ServiceException;
import com.doupi.framework.web.service.TokenService;
import com.doupi.recruit.mapper.MiniIdentityMapper;
import com.doupi.recruit.mapper.MiniIdentityMapper.Binding;
import com.doupi.recruit.mapper.MiniIdentityMapper.Identity;
import com.doupi.system.service.ISysUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MiniWechatService
{
    private static final String APPROVE = "identity:binding:approve";
    private final WechatIdentityClient wechat;
    private final MiniIdentityMapper mapper;
    private final MiniSessionService sessions;
    private final TokenService tokens;
    private final ISysUserService users;

    public MiniWechatService(WechatIdentityClient wechat, MiniIdentityMapper mapper, MiniSessionService sessions,
            TokenService tokens, ISysUserService users)
    {
        this.wechat = wechat;
        this.mapper = mapper;
        this.sessions = sessions;
        this.tokens = tokens;
        this.users = users;
    }

    public Map<String, Object> login(String code)
    {
        String openId = wechat.exchange(text(code, 1, 128, "微信登录凭证"));
        String appId = wechat.appId();
        mapper.upsertIdentity(appId, openId);
        Identity identity = mapper.findIdentity(appId, openId);
        if (identity == null || !appId.equals(identity.appId()) || !openId.equals(identity.subjectId()))
        {
            throw problem(503, "微信身份暂不可用");
        }
        SysUser staff = "VERIFIED".equals(identity.status()) && identity.staffId() != null
                && identity.bindingId() != null && identity.authVersion() != null
                ? users.selectUserById(identity.staffId()) : null;
        boolean verified = MiniSessionService.isActive(staff);
        long userId = verified ? staff.getUserId() : 0L;
        Long deptId = verified ? staff.getDeptId() : Long.valueOf(0);
        // The session stores the issued role boundary, never a cached grant or school password.
        SysUser snapshot = new SysUser(userId);
        snapshot.setUserName(verified ? staff.getUserName() : "wechat-visitor");
        LoginUser login = new LoginUser(userId, deptId, snapshot, Set.of());
        login.setExternalIdentityId(identity.id());
        login.setExternalBindingId(verified ? identity.bindingId() : null);
        login.setExternalAuthVersion(verified ? identity.authVersion() : null);
        return Map.of("token", tokens.createToken(login), "kind", verified ? "STAFF" : "VISITOR",
                "userId", Long.toString(userId), "identityId", Long.toString(identity.id()));
    }

    @Transactional
    public CommandResult apply(String username, String reason, String key)
    {
        LoginUser login = sessions.principal();
        Identity actor = sessions.externalIdentity();
        if (login == null || actor == null)
        {
            throw problem(login == null || login.getExternalIdentityId() != null ? 401 : 403, "请先使用微信登录");
        }
        if (!Long.valueOf(0).equals(login.getUserId()))
        {
            throw problem(409, "当前微信身份已绑定员工");
        }
        String account = text(username, 1, 30, "学校账号");
        String evidence = text(reason, 5, 300, "核实说明");
        return execute("IDENTITY:" + actor.id(), "BINDING_APPLY", key, List.of(account, evidence), 201, () -> {
            Identity identity = mapper.selectIdentity(actor.id(), true);
            if (identity == null || !Set.of("VISITOR", "REVOKED").contains(identity.status()))
            {
                throw problem(409, "当前微信身份已有待核实或已通过的申请");
            }
            SysUser target = users.selectUserByUserName(account);
            if (!MiniSessionService.isActive(target))
            {
                throw problem(404, "未找到可绑定的学校账号");
            }
            mapper.insertBinding(identity.id(), target.getUserId(), evidence);
            mapper.updateIdentity(identity.id(), null, "PENDING", null);
            Binding binding = mapper.selectPendingBinding(identity.id());
            return bindingResult(binding, "PENDING", binding.version(), false);
        });
    }

    public Map<String, Object> queue(Long before)
    {
        Reviewer actor = reviewer();
        long cursor = before == null ? Long.MAX_VALUE : before;
        if (cursor <= 0)
        {
            throw problem(400, "分页标识无效");
        }
        List<Binding> bindings = mapper.selectQueue(actor.all(), actor.departments(), cursor);
        List<Map<String, Object>> rows = bindings.stream().map(binding -> Map.<String, Object>of(
                "bindingRequestId", Long.toString(binding.id()),
                "username", binding.username(), "nickname", Objects.toString(binding.nickname(), ""),
                "status", binding.status(), "reason", binding.reason(), "version", binding.version(),
                "self", actor.userId() == binding.staffId())).toList();
        String nextBefore = bindings.size() == 100 ? Long.toString(bindings.get(99).id()) : "";
        return Map.of("items", rows, "nextBefore", nextBefore);
    }

    @Transactional
    public CommandResult review(long id, Long expectedVersion, String decision, String remark, String key)
    {
        Reviewer actor = reviewer();
        String verdict = text(decision, 6, 7, "核实结论");
        if (!Set.of("APPROVE", "REJECT").contains(verdict))
        {
            throw problem(400, "核实结论无效");
        }
        String evidence = text(remark, 1, 300, "核实备注");
        long version = requireVersion(expectedVersion);
        Binding target = scopedBinding(id, actor, false);
        return execute("STAFF:" + actor.userId(), "BINDING_APPROVE", key, List.of(id, version, verdict, evidence),
                200, () -> {
                    Identity identity = mapper.selectIdentity(target.identityId(), true);
                    Binding locked = scopedBinding(id, actor, true);
                    if (identity == null || !"PENDING".equals(identity.status())
                            || !"PENDING".equals(locked.status()) || version != locked.version())
                    {
                        throw problem(409, "申请状态已变化，请刷新");
                    }
                    boolean approved = "APPROVE".equals(verdict);
                    if (approved && mapper.lockActiveStaff(locked.staffId()) == null)
                    {
                        throw problem(409, "目标学校账号已停用");
                    }
                    String status = approved ? "VERIFIED" : "REJECTED";
                    mapper.reviewBinding(locked.id(), actor.userId(), status, evidence);
                    mapper.updateIdentity(identity.id(), approved ? locked.staffId() : null,
                            approved ? "VERIFIED" : "VISITOR", actor.userId());
                    return bindingResult(locked, status, version + 1, approved);
                });
    }

    @Transactional
    public CommandResult revoke(long id, Long expectedVersion, String key)
    {
        Reviewer actor = reviewer();
        long version = requireVersion(expectedVersion);
        Binding target = scopedBinding(id, actor, false);
        return execute("STAFF:" + actor.userId(), "BINDING_REVOKE", key, List.of(id, version), 200, () -> {
            Identity identity = mapper.selectIdentity(target.identityId(), true);
            Binding locked = scopedBinding(id, actor, true);
            if (identity == null || !"VERIFIED".equals(identity.status())
                    || !Long.valueOf(id).equals(mapper.lockCurrentBinding(identity.id(), locked.staffId()))
                    || version != locked.version())
            {
                throw problem(409, "绑定状态已变化，请刷新");
            }
            // Keep approval history; the revocation command records the operator and affected binding.
            mapper.updateIdentity(identity.id(), null, "REVOKED", null);
            return bindingResult(locked, "REVOKED", version, true);
        });
    }

    private Reviewer reviewer()
    {
        LoginUser login = sessions.principal();
        if (login != null && login.getExternalIdentityId() != null)
        {
            boolean valid = Long.valueOf(0).equals(login.getUserId())
                    ? sessions.externalIdentity() != null : sessions.current() != null;
            throw problem(valid ? 403 : 401, "请使用学校管理后台账号核实");
        }
        LoginUser staff = sessions.current();
        if (login == null || staff == null)
        {
            throw problem(401, "请先登录学校管理后台");
        }
        boolean all = staff.getUser().isAdmin();
        if (!all && !staff.getPermissions().contains(APPROVE))
        {
            throw problem(403, "无员工绑定核实权限");
        }
        return new Reviewer(staff.getUserId(), all, all ? Set.of() : sessions.scopeDeptIds(staff.getUser(), APPROVE));
    }

    private Binding scopedBinding(long id, Reviewer actor, boolean lock)
    {
        if (id <= 0)
        {
            throw problem(400, "申请编号无效");
        }
        Binding binding = mapper.selectBinding(id, lock);
        if (binding == null)
        {
            throw problem(404, "未找到绑定申请");
        }
        if (actor.userId() == binding.staffId() || (!actor.all()
                && (binding.deptId() == null || !actor.departments().contains(binding.deptId().toString()))))
        {
            throw problem(403, "不能核实本人或授权部门范围外的申请");
        }
        return binding;
    }

    private CommandResult execute(String scope, String action, String key, List<?> body, int status,
            Supplier<Map<String, Object>> operation)
    {
        if (key == null || !key.matches("[A-Za-z0-9_.:-]{8,64}"))
        {
            throw problem(400, "幂等键格式无效");
        }
        String hash;
        try
        {
            hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(JSON.toJSONString(body).getBytes(StandardCharsets.UTF_8)));
        }
        catch (NoSuchAlgorithmException e)
        {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
        mapper.upsertCommand(scope, action, key, hash);
        var command = mapper.lockCommand(scope, action, key);
        if (!hash.equals(command.hash()))
        {
            throw problem(409, "幂等键已用于不同请求");
        }
        if (command.result() != null)
        {
            return new CommandResult(status, true, JSON.parseObject(command.result()));
        }
        Map<String, Object> result = operation.get();
        mapper.finishCommand(command.id(), status, JSON.toJSONString(result));
        return new CommandResult(status, false, result);
    }

    private static Map<String, Object> bindingResult(Binding binding, String status, long version, boolean relogin)
    {
        return Map.of("bindingRequestId", Long.toString(binding.id()), "status", status,
                "version", version, "loginAgainRequired", relogin);
    }

    private static String text(String raw, int min, int max, String label)
    {
        String value = raw == null ? "" : raw.trim();
        if (value.length() < min || value.length() > max)
        {
            throw problem(400, label + "长度无效");
        }
        return value;
    }

    private static long requireVersion(Long version)
    {
        if (version == null || version < 0)
        {
            throw problem(400, "申请版本无效");
        }
        return version;
    }

    private static ServiceException problem(int status, String message)
    {
        return new ServiceException(message, status);
    }

    private record Reviewer(long userId, boolean all, Set<String> departments)
    {
    }

    public record CommandResult(int status, boolean replayed, Map<String, Object> data)
    {
    }
}
