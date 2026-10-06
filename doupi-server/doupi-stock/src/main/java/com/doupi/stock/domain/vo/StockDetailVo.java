package com.doupi.stock.domain.vo;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.doupi.common.annotation.Excel;

/**
 * 出入库明细报表VO
 */
public class StockDetailVo implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 单据大类（入库/出库） */
    @Excel(name = "单据类型")
    private String docType;

    /** 业务类型（采购入库/调拨入库/教师领用/学生领书/耗材出库等） */
    @Excel(name = "业务类型")
    private String bizType;

    /** 单据号 */
    @Excel(name = "单据号")
    private String docNo;

    /** 发生日期 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Excel(name = "发生日期", width = 30, dateFormat = "yyyy-MM-dd HH:mm:ss")
    private Date docTime;

    /** 物品名称 */
    @Excel(name = "物品名称")
    private String goodsName;

    /** 物品分类 */
    @Excel(name = "物品分类")
    private String categoryName;

    /** 规格 */
    @Excel(name = "规格")
    private String spec;

    /** 单位 */
    @Excel(name = "单位")
    private String unit;

    /** 变动数量 */
    @Excel(name = "数量")
    private Integer quantity;

    /** 单价 */
    @Excel(name = "单价")
    private BigDecimal price;

    /** 金额 */
    @Excel(name = "金额")
    private BigDecimal amount;

    /** 经办人 */
    @Excel(name = "经办人")
    private String operator;

    /** 往来单位/领用班级/领用人 */
    @Excel(name = "往来单位/领用对象")
    private String target;

    /** 备注 */
    @Excel(name = "备注")
    private String remark;

    public String getDocType() {
        return docType;
    }

    public void setDocType(String docType) {
        this.docType = docType;
    }

    public String getBizType() {
        return bizType;
    }

    public void setBizType(String bizType) {
        this.bizType = bizType;
    }

    public String getDocNo() {
        return docNo;
    }

    public void setDocNo(String docNo) {
        this.docNo = docNo;
    }

    public Date getDocTime() {
        return docTime;
    }

    public void setDocTime(Date docTime) {
        this.docTime = docTime;
    }

    public String getGoodsName() {
        return goodsName;
    }

    public void setGoodsName(String goodsName) {
        this.goodsName = goodsName;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public String getSpec() {
        return spec;
    }

    public void setSpec(String spec) {
        this.spec = spec;
    }

    public String getUnit() {
        return unit;
    }

    public void setUnit(String unit) {
        this.unit = unit;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getPrice() {
        return price;
    }

    public void setPrice(BigDecimal price) {
        this.price = price;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getOperator() {
        return operator;
    }

    public void setOperator(String operator) {
        this.operator = operator;
    }

    public String getTarget() {
        return target;
    }

    public void setTarget(String target) {
        this.target = target;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }
}
