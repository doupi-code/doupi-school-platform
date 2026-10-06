package com.doupi.cms.domain;

import com.doupi.common.core.domain.BaseEntity;

/**
 * 官网页面动态区块实体类 doupi_cms_section
 * 
 * @author doupi
 */
public class CmsSection extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 区块ID */
    private Long sectionId;

    /** 所属页面ID */
    private Long pageId;

    /** 区块类型: hero, results, intro, reasons, stories, faculty, campus, news, rich_text, faq */
    private String sectionType;

    /** 区块别名/名称 */
    private String sectionName;

    /** 排序权重 */
    private Integer sortOrder;

    /** 是否可见: 1-可见 0-隐藏 */
    private Integer isVisible;

    /** 区块专属详细配置JSON字符串 */
    private String contentData;

    public Long getSectionId()
    {
        return sectionId;
    }

    public void setSectionId(Long sectionId)
    {
        this.sectionId = sectionId;
    }

    public Long getPageId()
    {
        return pageId;
    }

    public void setPageId(Long pageId)
    {
        this.pageId = pageId;
    }

    public String getSectionType()
    {
        return sectionType;
    }

    public void setSectionType(String sectionType)
    {
        this.sectionType = sectionType;
    }

    public String getSectionName()
    {
        return sectionName;
    }

    public void setSectionName(String sectionName)
    {
        this.sectionName = sectionName;
    }

    public Integer getSortOrder()
    {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder)
    {
        this.sortOrder = sortOrder;
    }

    public Integer getIsVisible()
    {
        return isVisible;
    }

    public void setIsVisible(Integer isVisible)
    {
        this.isVisible = isVisible;
    }

    public String getContentData()
    {
        return contentData;
    }

    public void setContentData(String contentData)
    {
        this.contentData = contentData;
    }
}
