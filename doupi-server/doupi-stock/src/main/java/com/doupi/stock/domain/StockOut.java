package com.doupi.stock.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 出库单对象 edu_stock_out
 * 
 * @author doupi
 * @date 2026-09-25
 */
public class StockOut extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 出库ID */
    private Long outId;

    /** 出库单号 */
    @Excel(name = "出库单号")
    private String outNo;

    /** 出库类型 */
    @Excel(name = "出库类型")
    private String outType;

    /** 领用人/班级 */
    @Excel(name = "领用人/班级")
    private String receiver;

    /** 关联班级ID */
    @Excel(name = "关联班级ID")
    private Long classId;

    /** 出库时间 */
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Excel(name = "出库时间", width = 30, dateFormat = "yyyy-MM-dd")
    private Date outTime;

    /** 经办人 */
    @Excel(name = "经办人")
    private String operator;

    /** 状态 */
    @Excel(name = "状态")
    private String status;

    /** 删除标志 */
    private String delFlag;

    /** 班级名称 */
    @Excel(name = "班级名称")
    private String className;

    /** 年级 */
    @Excel(name = "年级")
    private String grade;

    /** 明细列表 */
    private java.util.List<StockOutItem> itemList;

    /** 总数量 */
    private Long totalQuantity;

    /** 关联印刷登记ID (若属于印刷用纸出库) */
    @Excel(name = "关联印刷登记ID")
    private Long printId;

    /** 关联印刷登记名称 */
    @Excel(name = "关联印刷登记名称")
    private String printName;

    /** 所属部门/领用部门 */
    @Excel(name = "所属部门")
    private String dept;

    public String getDept() {
        return dept;
    }

    public void setDept(String dept) {
        this.dept = dept;
    }

    public Long getPrintId() {
        return printId;
    }

    public void setPrintId(Long printId) {
        this.printId = printId;
    }

    public String getPrintName() {
        return printName;
    }

    public void setPrintName(String printName) {
        this.printName = printName;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public java.util.List<StockOutItem> getItemList() {
        return itemList;
    }

    public void setItemList(java.util.List<StockOutItem> itemList) {
        this.itemList = itemList;
    }

    public Long getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(Long totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public void setOutId(Long outId) 
    {
        this.outId = outId;
    }

    public Long getOutId() 
    {
        return outId;
    }

    public void setOutNo(String outNo) 
    {
        this.outNo = outNo;
    }

    public String getOutNo() 
    {
        return outNo;
    }

    public void setOutType(String outType) 
    {
        this.outType = outType;
    }

    public String getOutType() 
    {
        return outType;
    }

    public void setReceiver(String receiver) 
    {
        this.receiver = receiver;
    }

    public String getReceiver() 
    {
        return receiver;
    }

    public void setClassId(Long classId) 
    {
        this.classId = classId;
    }

    public Long getClassId() 
    {
        return classId;
    }

    public void setOutTime(Date outTime) 
    {
        this.outTime = outTime;
    }

    public Date getOutTime() 
    {
        return outTime;
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
            .append("outId", getOutId())
            .append("outNo", getOutNo())
            .append("outType", getOutType())
            .append("receiver", getReceiver())
            .append("classId", getClassId())
            .append("outTime", getOutTime())
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
