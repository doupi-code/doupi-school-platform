package com.doupi.cms.domain;

import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 官网校园设施实体类 doupi_cms_facility
 * 
 * @author doupi
 */
public class CmsFacility extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 设施ID */
    private Long facilityId;

    /** 设施编号(c1,c2等) */
    private String facilityCode;

    /** 建筑/场馆名称 */
    @Excel(name = "建筑/场馆名称")
    private String name;

    /** 设施标签 */
    @Excel(name = "设施标签")
    private String tag;

    /** 所属分区: 教学/运动/生活/生态 */
    @Excel(name = "所属分区")
    private String zone;

    /** 建筑占地面积 */
    private String area;

    /** 详细硬件与功能介绍 */
    private String detail;

    /** 实景高清照片URL */
    private String imageUrl;

    /** 状态: 0-正常 1-隐藏 */
    @Excel(name = "状态", readConverterExp = "0=正常,1=隐藏")
    private String status;

    /** 排序 */
    private Integer sortOrder;

    public Long getFacilityId() { return facilityId; }
    public void setFacilityId(Long facilityId) { this.facilityId = facilityId; }

    public String getFacilityCode() { return facilityCode; }
    public void setFacilityCode(String facilityCode) { this.facilityCode = facilityCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }

    public String getZone() { return zone; }
    public void setZone(String zone) { this.zone = zone; }

    public String getArea() { return area; }
    public void setArea(String area) { this.area = area; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
