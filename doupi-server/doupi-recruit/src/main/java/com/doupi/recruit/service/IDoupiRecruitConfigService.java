package com.doupi.recruit.service;

import java.util.List;
import com.doupi.recruit.domain.DoupiRecruitBanner;
import com.doupi.recruit.domain.DoupiRecruitConfig;

/**
 * 招生配置与轮播图Service接口
 * 
 * @author doupi
 */
public interface IDoupiRecruitConfigService 
{
    public DoupiRecruitConfig selectConfigByKey(String configKey);

    public int saveConfig(String configKey, String configValue, String remark);

    public List<DoupiRecruitBanner> selectBannerList(DoupiRecruitBanner banner);

    public int insertBanner(DoupiRecruitBanner banner);

    public int updateBanner(DoupiRecruitBanner banner);

    public int deleteBannerById(Long bannerId);
}
