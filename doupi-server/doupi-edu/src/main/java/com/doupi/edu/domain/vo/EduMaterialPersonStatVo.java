package com.doupi.edu.domain.vo;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import com.doupi.common.annotation.Excel;

/**
 * 个人(教师/学生)物资领用汇总透视VO
 * 
 * @author doupi
 */
public class EduMaterialPersonStatVo implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 领用对象类型(1教师 2学生 3班级) */
    @Excel(name = "人员类型", width = 12)
    private String targetTypeName;

    private String targetType;

    /** 领用人姓名 */
    @Excel(name = "领用人姓名", width = 14)
    private String targetName;

    /** 关联班级 */
    @Excel(name = "所在班级/部门", width = 16)
    private String className;

    /** 年级 */
    @Excel(name = "所属年级", width = 12)
    private String grade;

    /** 学科/选科 */
    @Excel(name = "学科/选科", width = 14)
    private String subject;

    /** 领用总频次(单数) */
    @Excel(name = "领用次数", width = 12)
    private Integer orderCount;

    /** 领用物资总件数 */
    @Excel(name = "累计领用件数", width = 14)
    private Integer totalQuantity;

    /** 领用物资品类数 */
    @Excel(name = "领用品类数", width = 12)
    private Integer goodsTypesCount;

    /** 物资估算总金额 */
    @Excel(name = "领用物资估值(元)", width = 16)
    private BigDecimal totalAmount;

    /** 领用主要物资摘要 */
    @Excel(name = "主要领用清单", width = 35)
    private String goodsSummary;

    /** 个人领用明细子列表 */
    private List<EduMaterialDetailReportVo> itemList;

    public String getTargetTypeName() { return targetTypeName; }
    public void setTargetTypeName(String targetTypeName) { this.targetTypeName = targetTypeName; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public String getTargetName() { return targetName; }
    public void setTargetName(String targetName) { this.targetName = targetName; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public Integer getOrderCount() { return orderCount; }
    public void setOrderCount(Integer orderCount) { this.orderCount = orderCount; }

    public Integer getTotalQuantity() { return totalQuantity; }
    public void setTotalQuantity(Integer totalQuantity) { this.totalQuantity = totalQuantity; }

    public Integer getGoodsTypesCount() { return goodsTypesCount; }
    public void setGoodsTypesCount(Integer goodsTypesCount) { this.goodsTypesCount = goodsTypesCount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getGoodsSummary() { return goodsSummary; }
    public void setGoodsSummary(String goodsSummary) { this.goodsSummary = goodsSummary; }

    public List<EduMaterialDetailReportVo> getItemList() { return itemList; }
    public void setItemList(List<EduMaterialDetailReportVo> itemList) { this.itemList = itemList; }
}
