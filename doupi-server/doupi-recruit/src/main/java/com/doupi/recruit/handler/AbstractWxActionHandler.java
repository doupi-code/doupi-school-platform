package com.doupi.recruit.handler;

import java.util.Map;
import com.doupi.common.utils.StringUtils;

/**
 * 微信 Action 处理器抽象基类
 * 
 * @author doupi
 */
public abstract class AbstractWxActionHandler implements WxActionHandler
{
    protected String getSafeString(Map<String, Object> map, String key, String defaultVal)
    {
        if (map == null || !map.containsKey(key) || map.get(key) == null)
        {
            return defaultVal;
        }
        return String.valueOf(map.get(key)).trim();
    }

    protected String getSafeString(Map<String, Object> map, String key)
    {
        return getSafeString(map, key, null);
    }

    protected Long getSafeLong(Map<String, Object> map, String key)
    {
        String val = getSafeString(map, key);
        if (StringUtils.isNotEmpty(val))
        {
            try
            {
                return Long.valueOf(val);
            }
            catch (Exception ignored) {}
        }
        return null;
    }

    protected Integer getSafeInteger(Map<String, Object> map, String key, Integer defaultVal)
    {
        String val = getSafeString(map, key);
        if (StringUtils.isNotEmpty(val))
        {
            try
            {
                return Integer.valueOf(val);
            }
            catch (Exception ignored) {}
        }
        return defaultVal;
    }
}
