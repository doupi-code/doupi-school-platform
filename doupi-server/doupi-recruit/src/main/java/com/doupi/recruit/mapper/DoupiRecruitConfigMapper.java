package com.doupi.recruit.mapper;

import java.util.List;
import com.doupi.recruit.domain.DoupiRecruitConfig;

/**
 * 招生配置Mapper接口
 * 
 * @author doupi
 */
public interface DoupiRecruitConfigMapper 
{
    public DoupiRecruitConfig selectDoupiRecruitConfigByKey(String configKey);

    public List<DoupiRecruitConfig> selectDoupiRecruitConfigList(DoupiRecruitConfig config);

    public int insertDoupiRecruitConfig(DoupiRecruitConfig config);

    public int updateDoupiRecruitConfig(DoupiRecruitConfig config);

    public int deleteDoupiRecruitConfigByKey(String configKey);
}
