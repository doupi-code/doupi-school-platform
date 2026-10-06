package com.doupi.cms.domain;

import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 官网名师天团实体类 doupi_cms_teacher
 * 
 * @author doupi
 */
public class CmsTeacher extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 名师ID */
    private Long teacherId;

    /** URL别名/唯一标识 */
    private String slug;

    /** 教师姓名 */
    @Excel(name = "教师姓名")
    private String name;

    /** 任教学科 */
    @Excel(name = "任教学科")
    private String subject;

    /** 职级头衔(如副校长/化学特级教师) */
    @Excel(name = "职级头衔")
    private String title;

    /** 类别: principal-校级领导 special-特级教师 backbone-骨干教师 */
    private String category;

    /** 群组: management-管理层 faculty-学科名师 */
    private String groupName;

    /** 荣誉标签 */
    private String tags;

    /** 生平履历与名校背景介绍 */
    private String bio;

    /** 治学格言/名言金句 */
    private String quote;

    /** 教龄 */
    @Excel(name = "教龄(年)")
    private Integer years;

    /** 突出战绩/标杆荣誉 */
    private String achievement;

    /** 名师正面肖像图URL */
    private String avatarUrl;

    /** 状态: 0-显示 1-隐藏 */
    @Excel(name = "状态", readConverterExp = "0=显示,1=隐藏")
    private String status;

    /** 排序 */
    private Integer sortOrder;

    public Long getTeacherId() { return teacherId; }
    public void setTeacherId(Long teacherId) { this.teacherId = teacherId; }

    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getGroupName() { return groupName; }
    public void setGroupName(String groupName) { this.groupName = groupName; }

    public String getTags() { return tags; }
    public void setTags(String tags) { this.tags = tags; }

    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }

    public String getQuote() { return quote; }
    public void setQuote(String quote) { this.quote = quote; }

    public Integer getYears() { return years; }
    public void setYears(Integer years) { this.years = years; }

    public String getAchievement() { return achievement; }
    public void setAchievement(String achievement) { this.achievement = achievement; }

    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
