package com.doupi.stock.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 入库单对象 edu_stock_in
 * 
 * @author doupi
 * @date 2026-09-25
 */
public class StockIn extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 入库ID */
    private Long inId;

    /** 入库单号 */
    @Excel(name = "入库单号")
    private String inNo;

    /** 入库类型 */
    @Excel(name = "入库类型")
    private String inType;

    /** 供应商ID */
    @Excel(name = "供应商ID")
    private Long supplierId;

    /** 入库时间 */
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Excel(name = "入库时间", width = 30, dateFormat = "yyyy-MM-dd")
    private Date inTime;

    /** 经办人 */
    @Excel(name = "经办人")
    private String operator;

    /** 状态 */
    @Excel(name = "状态")
    private String status;

    /** 删除标志 */
    private String delFlag;

    /** 供应商名称 */
    @Excel(name = "供应商名称")
    private String supplierName;

    /** 明细列表 */
    private java.util.List<StockInItem> itemList;

    /** 总金额 */
    private java.math.BigDecimal totalAmount;

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public java.util.List<StockInItem> getItemList() {
        return itemList;
    }

    public void setItemList(java.util.List<StockInItem> itemList) {
        this.itemList = itemList;
    }

    public java.math.BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(java.math.BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public void setInId(Long inId) 
    {
        this.inId = inId;
    }

    public Long getInId() 
    {
        return inId;
    }

    public void setInNo(String inNo) 
    {
        this.inNo = inNo;
    }

    public String getInNo() 
    {
        return inNo;
    }

    public void setInType(String inType) 
    {
        this.inType = inType;
    }

    public String getInType() 
    {
        return inType;
    }

    public void setSupplierId(Long supplierId) 
    {
        this.supplierId = supplierId;
    }

    public Long getSupplierId() 
    {
        return supplierId;
    }

    public void setInTime(Date inTime) 
    {
        this.inTime = inTime;
    }

    public Date getInTime() 
    {
        return inTime;
    }

    public void setOperator(String operator) 
    {
        this.operator = operator;
    }

    public String getOperator() 
    {
        return operator;
    }

    public void setStatus(String status) 
    {
        this.status = status;
    }

    public String getStatus() 
    {
        return status;
    }

    public void setDelFlag(String delFlag) 
    {
        this.delFlag = delFlag;
    }

    public String getDelFlag() 
    {
        return delFlag;
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this,ToStringStyle.MULTI_LINE_STYLE)
            .append("inId", getInId())
            .append("inNo", getInNo())
            .append("inType", getInType())
            .append("supplierId", getSupplierId())
            .append("inTime", getInTime())
            .append("operator", getOperator())
            .append("remark", getRemark())
            .append("status", getStatus())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("delFlag", getDelFlag())
            .toString();
    }
}
