package com.doupi.cms.domain;

import java.util.List;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 官网页面定义实体类 doupi_cms_page
 * 
 * @author doupi
 */
public class CmsPage extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 页面ID */
    private Long pageId;

    /** 页面访问路由 (如 / 或 /about/campuses) */
    private String pageSlug;

    /** 页面中文名称 */
    private String pageName;

    /** SEO标题 */
    private String seoTitle;

    /** SEO关键字 */
    private String seoKeywords;

    /** SEO描述 */
    private String seoDescription;

    /** 发布状态: 0=已发布 1=草稿 */
    private String status;

    /** 页面内包含的动态区块列表 */
    private List<CmsSection> sections;

    public Long getPageId()
    {
        return pageId;
    }

    public void setPageId(Long pageId)
    {
        this.pageId = pageId;
    }

    public String getPageSlug()
    {
        return pageSlug;
    }

    public void setPageSlug(String pageSlug)
    {
        this.pageSlug = pageSlug;
    }

    public String getPageName()
    {
        return pageName;
    }

    public void setPageName(String pageName)
    {
        this.pageName = pageName;
    }

    public String getSeoTitle()
    {
        return seoTitle;
    }

    public void setSeoTitle(String seoTitle)
    {
        this.seoTitle = seoTitle;
    }

    public String getSeoKeywords()
    {
        return seoKeywords;
    }

    public void setSeoKeywords(String seoKeywords)
    {
        this.seoKeywords = seoKeywords;
    }

    public String getSeoDescription()
    {
        return seoDescription;
    }

    public void setSeoDescription(String seoDescription)
    {
        this.seoDescription = seoDescription;
    }

    public String getStatus()
    {
        return status;
    }

    public void setStatus(String status)
    {
        this.status = status;
    }

    public List<CmsSection> getSections()
    {
        return sections;
    }

    public void setSections(List<CmsSection> sections)
    {
        this.sections = sections;
    }
}
