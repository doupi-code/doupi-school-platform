package com.doupi.cms.mapper;

import java.util.List;
import com.doupi.cms.domain.CmsBanner;

/**
 * 官网轮播横幅Mapper接口
 * 
 * @author doupi
 */
public interface CmsBannerMapper 
{
    public CmsBanner selectBannerById(Long bannerId);

    public List<CmsBanner> selectBannerList(CmsBanner banner);

    public int insertBanner(CmsBanner banner);

    public int updateBanner(CmsBanner banner);

    public int deleteBannerById(Long bannerId);

    public int deleteBannerByIds(Long[] bannerIds);
}
