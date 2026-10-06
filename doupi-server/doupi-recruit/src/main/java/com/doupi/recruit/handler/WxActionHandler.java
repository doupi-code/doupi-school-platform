package com.doupi.recruit.handler;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import com.doupi.common.core.domain.model.LoginUser;

/**
 * 微信小程序/Web网关 Action 处理器接口
 * 
 * @author doupi
 */
public interface WxActionHandler
{
    /**
     * 该处理器支持的主 Action 名称
     */
    default String getAction()
    {
        return null;
    }

    /**
     * 该处理器支持的所有 Action 列表（用于同一业务的多别名或相关分支）
     */
    default List<String> getActions()
    {
        String a = getAction();
        return a != null ? Collections.singletonList(a) : Collections.emptyList();
    }

    /**
     * 执行具体业务逻辑
     * 
     * @param payload 请求载荷
     * @param loginUser 当前登录用户（若为公开接口可能为 null）
     * @return 业务响应数据
     * @throws Exception 业务或系统异常
     */
    Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception;

    /**
     * 是否需要认证鉴权（默认 true）
     */
    default boolean isAuthRequired()
    {
        return true;
    }

    /**
     * 允许访问的角色列表（空列表表示任意认证用户均可访问）
     */
    default List<String> getRequiredRoles()
    {
        return Collections.emptyList();
    }
}
