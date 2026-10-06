package com.doupi.recruit.domain;

import java.math.BigDecimal;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 校区信息对象 doupi_recruit_campus
 * 
 * @author doupi
 */
public class DoupiRecruitCampus extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 校区ID */
    private String campusId;

    /** 校区名称 */
    @Excel(name = "校区名称")
    private String campusName;

    /** 展示标题 */
    @Excel(name = "展示标题")
    private String title;

    /** 简介概览 */
    private String summary;

    /** 详细图文/介绍 */
    private String intro;

    /** 校区地址 */
    @Excel(name = "地址")
    private String address;

    /** 纬度 */
    private BigDecimal latitude;

    /** 经度 */
    private BigDecimal longitude;

    /** 联系电话 */
    @Excel(name = "联系电话")
    private String contactPhone;

    /** 办学性质 */
    @Excel(name = "性质")
    private String nature;

    /** 开设学段 */
    @Excel(name = "学段")
    private String section;

    /** 封面图片URL */
    private String coverImage;

    /** 是否发布(1-是 0-否) */
    @Excel(name = "发布状态")
    private Integer published;

    /** 排序 */
    private Integer sortOrder;

    public String getCampusId() { return campusId; }
    public void setCampusId(String campusId) { this.campusId = campusId; }

    public String getCampusName() { return campusName; }
    public void setCampusName(String campusName) { this.campusName = campusName; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getIntro() { return intro; }
    public void setIntro(String intro) { this.intro = intro; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal latitude) { this.latitude = latitude; }

    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal longitude) { this.longitude = longitude; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getNature() { return nature; }
    public void setNature(String nature) { this.nature = nature; }

    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }

    public String getCoverImage() { return coverImage; }
    public void setCoverImage(String coverImage) { this.coverImage = coverImage; }

    public Integer getPublished() { return published; }
    public void setPublished(Integer published) { this.published = published; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
