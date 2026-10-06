package com.doupi.edu.domain.vo;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import com.doupi.common.annotation.Excel;

/**
 * 各班级物资领用汇总透视VO
 * 
 * @author doupi
 */
public class EduMaterialClassStatVo implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 班级ID */
    private Long classId;

    /** 所属年级 */
    @Excel(name = "年级", width = 12)
    private String grade;

    /** 班级名称 */
    @Excel(name = "班级名称", width = 16)
    private String className;

    /** 领用总频次(单数) */
    @Excel(name = "领用单据数", width = 12)
    private Integer orderCount;

    /** 领用总件数 */
    @Excel(name = "领用物资总件数", width = 14)
    private Integer totalQuantity;

    /** 涉及物资品类数 */
    @Excel(name = "领用物资品类数", width = 14)
    private Integer goodsTypesCount;

    /** 涉及领用人数 */
    @Excel(name = "领用总人次", width = 12)
    private Integer personCount;

    /** 物资估算总金额 */
    @Excel(name = "领用物资总估值(元)", width = 16)
    private BigDecimal totalAmount;

    /** 该班主要领用物资摘要展示 */
    @Excel(name = "主要领用物资清单", width = 35)
    private String goodsSummary;

    /** 班级领用具体物资子列表（用于前端表格下钻展开） */
    private List<EduMaterialDetailReportVo> itemList;

    public Long getClassId() { return classId; }
    public void setClassId(Long classId) { this.classId = classId; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public Integer getOrderCount() { return orderCount; }
    public void setOrderCount(Integer orderCount) { this.orderCount = orderCount; }

    public Integer getTotalQuantity() { return totalQuantity; }
    public void setTotalQuantity(Integer totalQuantity) { this.totalQuantity = totalQuantity; }

    public Integer getGoodsTypesCount() { return goodsTypesCount; }
    public void setGoodsTypesCount(Integer goodsTypesCount) { this.goodsTypesCount = goodsTypesCount; }

    public Integer getPersonCount() { return personCount; }
    public void setPersonCount(Integer personCount) { this.personCount = personCount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public String getGoodsSummary() { return goodsSummary; }
    public void setGoodsSummary(String goodsSummary) { this.goodsSummary = goodsSummary; }

    public List<EduMaterialDetailReportVo> getItemList() { return itemList; }
    public void setItemList(List<EduMaterialDetailReportVo> itemList) { this.itemList = itemList; }
}
