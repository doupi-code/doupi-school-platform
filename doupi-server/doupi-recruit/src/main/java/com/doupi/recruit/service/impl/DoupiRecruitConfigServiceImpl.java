package com.doupi.recruit.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.common.utils.DateUtils;
import com.doupi.recruit.domain.DoupiRecruitBanner;
import com.doupi.recruit.domain.DoupiRecruitConfig;
import com.doupi.recruit.mapper.DoupiRecruitBannerMapper;
import com.doupi.recruit.mapper.DoupiRecruitConfigMapper;
import com.doupi.recruit.service.IDoupiRecruitConfigService;

/**
 * 招生配置与轮播图Service业务层处理
 * 
 * @author doupi
 */
@Service
public class DoupiRecruitConfigServiceImpl implements IDoupiRecruitConfigService 
{
    @Autowired
    private DoupiRecruitConfigMapper configMapper;

    @Autowired
    private DoupiRecruitBannerMapper bannerMapper;

    @Override
    public DoupiRecruitConfig selectConfigByKey(String configKey)
    {
        return configMapper.selectDoupiRecruitConfigByKey(configKey);
    }

    @Override
    public int saveConfig(String configKey, String configValue, String remark)
    {
        DoupiRecruitConfig config = configMapper.selectDoupiRecruitConfigByKey(configKey);
        if (config == null)
        {
            config = new DoupiRecruitConfig();
            config.setConfigKey(configKey);
            config.setConfigValue(configValue);
            config.setRemark(remark);
            return configMapper.insertDoupiRecruitConfig(config);
        }
        else
        {
            config.setConfigValue(configValue);
            config.setRemark(remark);
            return configMapper.updateDoupiRecruitConfig(config);
        }
    }

    @Override
    public List<DoupiRecruitBanner> selectBannerList(DoupiRecruitBanner banner)
    {
        return bannerMapper.selectDoupiRecruitBannerList(banner);
    }

    @Override
    public int insertBanner(DoupiRecruitBanner banner)
    {
        banner.setCreateTime(DateUtils.getNowDate());
        return bannerMapper.insertDoupiRecruitBanner(banner);
    }

    @Override
    public int updateBanner(DoupiRecruitBanner banner)
    {
        banner.setUpdateTime(DateUtils.getNowDate());
        return bannerMapper.updateDoupiRecruitBanner(banner);
    }

    @Override
    public int deleteBannerById(Long bannerId)
    {
        return bannerMapper.deleteDoupiRecruitBannerById(bannerId);
    }
}
