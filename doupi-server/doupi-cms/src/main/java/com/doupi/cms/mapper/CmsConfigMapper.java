package com.doupi.cms.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.doupi.cms.domain.CmsConfig;

/**
 * 官网门户参数Mapper接口
 * 
 * @author doupi
 */
public interface CmsConfigMapper 
{
    public CmsConfig selectConfigByKey(String configKey);

    public List<CmsConfig> selectAllConfigs();

    public int insertConfig(CmsConfig config);

    public int updateConfig(CmsConfig config);

    public int upsertConfig(@Param("configKey") String configKey, 
                            @Param("configValue") String configValue, 
                            @Param("configName") String configName);
}
