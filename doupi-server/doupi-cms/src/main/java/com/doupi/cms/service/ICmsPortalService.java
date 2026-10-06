package com.doupi.cms.service;

import java.util.List;
import java.util.Map;
import com.doupi.cms.domain.*;

/**
 * 官网CMS独立业务层接口
 * 
 * @author doupi
 */
public interface ICmsPortalService
{
    // 门户配置
    Map<String, Object> getSiteConfig();
    void updateSiteConfig(Map<String, Object> config);

    // 公文与资讯
    List<CmsArticle> selectArticleList(CmsArticle article);
    CmsArticle selectArticleById(Long articleId);
    int insertArticle(CmsArticle article);
    int updateArticle(CmsArticle article);
    int deleteArticleByIds(Long[] ids);

    // 名师天团
    List<CmsTeacher> selectTeacherList(CmsTeacher teacher);
    CmsTeacher selectTeacherById(Long teacherId);
    int insertTeacher(CmsTeacher teacher);
    int updateTeacher(CmsTeacher teacher);
    int deleteTeacherByIds(Long[] ids);

    // 校园设施
    List<CmsFacility> selectFacilityList(CmsFacility facility);
    CmsFacility selectFacilityById(Long facilityId);
    int insertFacility(CmsFacility facility);
    int updateFacility(CmsFacility facility);
    int deleteFacilityByIds(Long[] ids);

    // 轮播横幅
    List<CmsBanner> selectBannerList(CmsBanner banner);
    CmsBanner selectBannerById(Long bannerId);
    int insertBanner(CmsBanner banner);
    int updateBanner(CmsBanner banner);
    int deleteBannerByIds(Long[] ids);

    // 常见问答
    List<CmsFaq> selectFaqList(CmsFaq faq);
    CmsFaq selectFaqById(Long faqId);
    int insertFaq(CmsFaq faq);
    int updateFaq(CmsFaq faq);
    int deleteFaqByIds(Long[] ids);
}
