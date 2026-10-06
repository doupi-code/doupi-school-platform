package com.doupi.edu.domain;

import java.math.BigDecimal;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 提分光荣榜对象 edu_celebration
 * 
 * @author doupi
 */
public class EduCelebration extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 光荣榜记录ID */
    private Long celebrationId;

    /** 学生姓名 */
    @Excel(name = "学生姓名")
    private String studentName;

    /** 脱敏姓名 */
    @Excel(name = "脱敏姓名")
    private String maskedName;

    /** 选科组合 */
    @Excel(name = "选科组合")
    private String subject;

    /** 原始/前次分数 */
    @Excel(name = "原始分数")
    private BigDecimal beforeScore;

    /** 现考/提升后分数 */
    @Excel(name = "现考分数")
    private BigDecimal afterScore;

    /** 提升分值 */
    @Excel(name = "提分分值")
    private BigDecimal upgradeScore;

    /** 届别批次 */
    @Excel(name = "届别批次")
    private String batchTitle;

    /** 去向/荣誉标签 */
    @Excel(name = "荣誉标签")
    private String tag;

    /** 状态(0正常 1停用) */
    @Excel(name = "状态", readConverterExp = "0=正常,1=停用")
    private String status;

    /** 排序权重 */
    private Integer orderNum;

    public Long getCelebrationId() { return celebrationId; }
    public void setCelebrationId(Long celebrationId) { this.celebrationId = celebrationId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getMaskedName() { return maskedName; }
    public void setMaskedName(String maskedName) { this.maskedName = maskedName; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public BigDecimal getBeforeScore() { return beforeScore; }
    public void setBeforeScore(BigDecimal beforeScore) { this.beforeScore = beforeScore; }

    public BigDecimal getAfterScore() { return afterScore; }
    public void setAfterScore(BigDecimal afterScore) { this.afterScore = afterScore; }

    public BigDecimal getUpgradeScore() { return upgradeScore; }
    public void setUpgradeScore(BigDecimal upgradeScore) { this.upgradeScore = upgradeScore; }

    public String getBatchTitle() { return batchTitle; }
    public void setBatchTitle(String batchTitle) { this.batchTitle = batchTitle; }

    public String getTag() { return tag; }
    public void setTag(String tag) { this.tag = tag; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getOrderNum() { return orderNum; }
    public void setOrderNum(Integer orderNum) { this.orderNum = orderNum; }
}
