package com.doupi.recruit.handler;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 微信网关 Action 处理器注册表
 * 
 * @author doupi
 */
@Component
public class WxActionHandlerRegistry
{
    private static final Logger log = LoggerFactory.getLogger(WxActionHandlerRegistry.class);

    private final Map<String, WxActionHandler> handlerMap = new HashMap<>();

    @Autowired(required = false)
    public void registerHandlers(List<WxActionHandler> handlers)
    {
        if (handlers != null)
        {
            for (WxActionHandler handler : handlers)
            {
                List<String> actions = handler.getActions();
                if (actions != null)
                {
                    for (String action : actions)
                    {
                        if (action != null)
                        {
                            handlerMap.put(action.trim(), handler);
                            log.info("[WX-GATEWAY] 成功注册 Action 处理器: {} -> {}", action, handler.getClass().getSimpleName());
                        }
                    }
                }
            }
        }
    }

    public WxActionHandler getHandler(String action)
    {
        if (action == null)
        {
            return null;
        }
        return handlerMap.get(action.trim());
    }

    public boolean hasHandler(String action)
    {
        return action != null && handlerMap.containsKey(action.trim());
    }
}
