package com.doupi.cms.domain;

import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 官网轮播横幅实体类 doupi_cms_banner
 * 
 * @author doupi
 */
public class CmsBanner extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 轮播图ID */
    private Long bannerId;

    /** 海报标题 */
    @Excel(name = "海报标题")
    private String title;

    /** 海报图片URL */
    private String imageUrl;

    /** 点击跳转链接 */
    private String linkUrl;

    /** 展示端: all-全端 pc-电脑端 mobile-手机端 */
    private String platform;

    /** 状态: 0-启用 1-停用 */
    @Excel(name = "状态", readConverterExp = "0=启用,1=停用")
    private String status;

    /** 排序 */
    private Integer sortOrder;

    public Long getBannerId() { return bannerId; }
    public void setBannerId(Long bannerId) { this.bannerId = bannerId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getLinkUrl() { return linkUrl; }
    public void setLinkUrl(String linkUrl) { this.linkUrl = linkUrl; }

    public String getPlatform() { return platform; }
    public void setPlatform(String platform) { this.platform = platform; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
