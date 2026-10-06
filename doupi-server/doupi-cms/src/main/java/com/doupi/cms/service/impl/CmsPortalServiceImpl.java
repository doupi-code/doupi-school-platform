package com.doupi.cms.service.impl;

import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.doupi.cms.domain.*;
import com.doupi.cms.mapper.*;
import com.doupi.cms.service.ICmsPortalService;

/**
 * 官网CMS独立业务实现类 (100% 真实操作 MySQL 数据库)
 * 彻底消除代码硬编码与内存列表，所有数据落库持久化
 * 
 * @author doupi
 */
@Service
public class CmsPortalServiceImpl implements ICmsPortalService
{
    @Autowired
    private CmsConfigMapper configMapper;

    @Autowired
    private CmsArticleMapper articleMapper;

    @Autowired
    private CmsTeacherMapper teacherMapper;

    @Autowired
    private CmsFacilityMapper facilityMapper;

    @Autowired
    private CmsBannerMapper bannerMapper;

    @Autowired
    private CmsFaqMapper faqMapper;

    // ==================== 1. 门户参数 (全真实读写 doupi_cms_config) ====================

    @Override
    public Map<String, Object> getSiteConfig()
    {
        Map<String, Object> result = new HashMap<>();
        List<CmsConfig> configs = configMapper.selectAllConfigs();
        if (configs != null)
        {
            for (CmsConfig item : configs)
            {
                result.put(item.getConfigKey(), item.getConfigValue());
            }
        }
        return result;
    }

    @Override
    @Transactional
    public void updateSiteConfig(Map<String, Object> config)
    {
        if (config == null || config.isEmpty())
        {
            return;
        }

        for (Map.Entry<String, Object> entry : config.entrySet())
        {
            String key = entry.getKey();
            Object val = entry.getValue();
            String strVal = val != null ? String.valueOf(val) : "";
            configMapper.upsertConfig(key, strVal, key);
        }
    }

    // ==================== 2. 公文与资讯 (doupi_cms_article) ====================

    @Override
    public List<CmsArticle> selectArticleList(CmsArticle article)
    {
        return articleMapper.selectArticleList(article);
    }

    @Override
    public CmsArticle selectArticleById(Long articleId)
    {
        return articleMapper.selectArticleById(articleId);
    }

    @Override
    public int insertArticle(CmsArticle article)
    {
        return articleMapper.insertArticle(article);
    }

    @Override
    public int updateArticle(CmsArticle article)
    {
        return articleMapper.updateArticle(article);
    }

    @Override
    public int deleteArticleByIds(Long[] ids)
    {
        if (ids == null || ids.length == 0) return 0;
        return articleMapper.deleteArticleByIds(ids);
    }

    // ==================== 3. 名师天团 (doupi_cms_teacher) ====================

    @Override
    public List<CmsTeacher> selectTeacherList(CmsTeacher teacher)
    {
        return teacherMapper.selectTeacherList(teacher);
    }

    @Override
    public CmsTeacher selectTeacherById(Long teacherId)
    {
        return teacherMapper.selectTeacherById(teacherId);
    }

    @Override
    public int insertTeacher(CmsTeacher teacher)
    {
        return teacherMapper.insertTeacher(teacher);
    }

    @Override
    public int updateTeacher(CmsTeacher teacher)
    {
        return teacherMapper.updateTeacher(teacher);
    }

    @Override
    public int deleteTeacherByIds(Long[] ids)
    {
        if (ids == null || ids.length == 0) return 0;
        return teacherMapper.deleteTeacherByIds(ids);
    }

    // ==================== 4. 校园设施 (doupi_cms_facility) ====================

    @Override
    public List<CmsFacility> selectFacilityList(CmsFacility facility)
    {
        return facilityMapper.selectFacilityList(facility);
    }

    @Override
    public CmsFacility selectFacilityById(Long facilityId)
    {
        return facilityMapper.selectFacilityById(facilityId);
    }

    @Override
    public int insertFacility(CmsFacility facility)
    {
        return facilityMapper.insertFacility(facility);
    }

    @Override
    public int updateFacility(CmsFacility facility)
    {
        return facilityMapper.updateFacility(facility);
    }

    @Override
    public int deleteFacilityByIds(Long[] ids)
    {
        if (ids == null || ids.length == 0) return 0;
        return facilityMapper.deleteFacilityByIds(ids);
    }

    // ==================== 5. 轮播横幅 (doupi_cms_banner) ====================

    @Override
    public List<CmsBanner> selectBannerList(CmsBanner banner)
    {
        return bannerMapper.selectBannerList(banner);
    }

    @Override
    public CmsBanner selectBannerById(Long bannerId)
    {
        return bannerMapper.selectBannerById(bannerId);
    }

    @Override
    public int insertBanner(CmsBanner banner)
    {
        return bannerMapper.insertBanner(banner);
    }

    @Override
    public int updateBanner(CmsBanner banner)
    {
        return bannerMapper.updateBanner(banner);
    }

    @Override
    public int deleteBannerByIds(Long[] ids)
    {
        if (ids == null || ids.length == 0) return 0;
        return bannerMapper.deleteBannerByIds(ids);
    }

    // ==================== 6. 常见问答 (doupi_cms_faq) ====================

    @Override
    public List<CmsFaq> selectFaqList(CmsFaq faq)
    {
        return faqMapper.selectFaqList(faq);
    }

    @Override
    public CmsFaq selectFaqById(Long faqId)
    {
        return faqMapper.selectFaqById(faqId);
    }

    @Override
    public int insertFaq(CmsFaq faq)
    {
        return faqMapper.insertFaq(faq);
    }

    @Override
    public int updateFaq(CmsFaq faq)
    {
        return faqMapper.updateFaq(faq);
    }

    @Override
    public int deleteFaqByIds(Long[] ids)
    {
        if (ids == null || ids.length == 0) return 0;
        return faqMapper.deleteFaqByIds(ids);
    }
}
