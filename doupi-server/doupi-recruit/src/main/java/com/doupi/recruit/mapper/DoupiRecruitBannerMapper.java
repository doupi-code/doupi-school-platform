package com.doupi.recruit.mapper;

import java.util.List;
import com.doupi.recruit.domain.DoupiRecruitBanner;

/**
 * 轮播图Mapper接口
 * 
 * @author doupi
 */
public interface DoupiRecruitBannerMapper 
{
    public DoupiRecruitBanner selectDoupiRecruitBannerById(Long bannerId);

    public List<DoupiRecruitBanner> selectDoupiRecruitBannerList(DoupiRecruitBanner banner);

    public int insertDoupiRecruitBanner(DoupiRecruitBanner banner);

    public int updateDoupiRecruitBanner(DoupiRecruitBanner banner);

    public int deleteDoupiRecruitBannerById(Long bannerId);
}
