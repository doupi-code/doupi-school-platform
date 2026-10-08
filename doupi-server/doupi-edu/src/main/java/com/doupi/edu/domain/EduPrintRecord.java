package com.doupi.edu.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 印刷登记对象 edu_print_record
 * 
 * @author doupi
 * @date 2026-09-25
 */
public class EduPrintRecord extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 印刷ID */
    private Long printId;

    /** 印刷名称 */
    @Excel(name = "印刷名称")
    private String printName;

    /** 用纸物品ID */
    @Excel(name = "用纸物品ID")
    private Long paperGoodsId;

    /** 纸张类型 */
    @Excel(name = "纸张类型")
    private String paperType;

    /** 印刷份数 */
    @Excel(name = "印刷份数")
    private Long printCount;

    /** 每份页数/张数 */
    @Excel(name = "每份页数")
    private Long pageCount;

    /** 印刷方式（1单页印刷 2双页印刷） */
    @Excel(name = "印刷方式", readConverterExp = "1=单页印刷,2=双页印刷")
    private String printSide;

    /** 消耗总纸张数 */
    @Excel(name = "总耗纸量(张)")
    private Long totalPages;

    /** 原稿文件附件 */
    @Excel(name = "原稿附件")
    private String attachment;

    /** 印刷效果图 */
    @Excel(name = "印刷效果图")
    private String resultImg;

    /** 申请教师 */
    @Excel(name = "申请教师")
    private Long teacherId;

    /** 年级 */
    @Excel(name = "年级")
    private String grade;

    /** 班级ID */
    @Excel(name = "班级ID")
    private Long classId;

    /** 班级名称 */
    @Excel(name = "班级名称")
    private String className;

    /** 经办人 */
    @Excel(name = "经办人")
    private String operator;

    /** 印刷时间 */
    @JsonFormat(pattern = "yyyy-MM-dd")
    @Excel(name = "印刷时间", width = 30, dateFormat = "yyyy-MM-dd")
    private Date printTime;

    /** 状态 */
    @Excel(name = "状态")
    private String status;

    /** 关联出库单ID */
    @Excel(name = "关联出库单ID")
    private Long outId;

    /** 删除标志 */
    private String delFlag;

    /** 申请教师姓名 */
    @Excel(name = "申请教师姓名")
    private String teacherName;

    /** 用纸物品名称 */
    @Excel(name = "用纸物品名称")
    private String paperGoodsName;

    /** 关联出库单号 */
    @Excel(name = "关联出库单号")
    private String outNo;

    /** 印刷错误张数 */
    @Excel(name = "印刷错误张数")
    private Long errorCount;

    /** 印刷错误说明 */
    @Excel(name = "印刷错误说明")
    private String errorRemark;

    /** 错误关联出库单ID */
    private Long errorOutId;

    /** 错误关联出库单号 */
    @Excel(name = "错误出库单号")
    private String errorOutNo;

    public String getTeacherName() {
        return teacherName;
    }

    public void setTeacherName(String teacherName) {
        this.teacherName = teacherName;
    }

    public String getPaperGoodsName() {
        return paperGoodsName;
    }

    public void setPaperGoodsName(String paperGoodsName) {
        this.paperGoodsName = paperGoodsName;
    }

    public String getOutNo() {
        return outNo;
    }

    public void setOutNo(String outNo) {
        this.outNo = outNo;
    }

    public Long getErrorCount() {
        return errorCount;
    }

    public void setErrorCount(Long errorCount) {
        this.errorCount = errorCount;
    }

    public String getErrorRemark() {
        return errorRemark;
    }

    public void setErrorRemark(String errorRemark) {
        this.errorRemark = errorRemark;
    }

    public Long getErrorOutId() {
        return errorOutId;
    }

    public void setErrorOutId(Long errorOutId) {
        this.errorOutId = errorOutId;
    }

    public String getErrorOutNo() {
        return errorOutNo;
    }

    public void setErrorOutNo(String errorOutNo) {
        this.errorOutNo = errorOutNo;
    }

    public void setPrintId(Long printId) 
    {
        this.printId = printId;
    }

    public Long getPrintId() 
    {
        return printId;
    }

    public void setPrintName(String printName) 
    {
        this.printName = printName;
    }

    public String getPrintName() 
    {
        return printName;
    }

    public void setPaperGoodsId(Long paperGoodsId) 
    {
        this.paperGoodsId = paperGoodsId;
    }

    public Long getPaperGoodsId() 
    {
        return paperGoodsId;
    }

    public void setPaperType(String paperType) 
    {
        this.paperType = paperType;
    }

    public String getPaperType() 
    {
        return paperType;
    }

    public void setPrintCount(Long printCount) 
    {
        this.printCount = printCount;
    }

    public Long getPrintCount() 
    {
        return printCount;
    }

    public void setTeacherId(Long teacherId) 
    {
        this.teacherId = teacherId;
    }

    public Long getTeacherId() 
    {
        return teacherId;
    }

    public void setOperator(String operator) 
    {
        this.operator = operator;
    }

    public String getOperator() 
    {
        return operator;
    }

    public void setPrintTime(Date printTime) 
    {
        this.printTime = printTime;
    }

    public Date getPrintTime() 
    {
        return printTime;
    }

    public void setStatus(String status) 
    {
        this.status = status;
    }

    public String getStatus() 
    {
        return status;
    }

    public void setOutId(Long outId) 
    {
        this.outId = outId;
    }

    public Long getOutId() 
    {
        return outId;
    }

    public void setDelFlag(String delFlag) 
    {
        this.delFlag = delFlag;
    }

    public String getDelFlag() 
    {
        return delFlag;
    }

    public Long getPageCount() 
    {
        return pageCount;
    }

    public void setPageCount(Long pageCount) 
    {
        this.pageCount = pageCount;
    }

    public String getPrintSide() 
    {
        return printSide;
    }

    public void setPrintSide(String printSide) 
    {
        this.printSide = printSide;
    }

    public Long getTotalPages() 
    {
        return totalPages;
    }

    public void setTotalPages(Long totalPages) 
    {
        this.totalPages = totalPages;
    }

    public String getAttachment() 
    {
        return attachment;
    }

    public void setAttachment(String attachment) 
    {
        this.attachment = attachment;
    }

    public String getResultImg() 
    {
        return resultImg;
    }

    public void setResultImg(String resultImg) 
    {
        this.resultImg = resultImg;
    }

    public String getGrade() 
    {
        return grade;
    }

    public void setGrade(String grade) 
    {
        this.grade = grade;
    }

    public Long getClassId() 
    {
        return classId;
    }

    public void setClassId(Long classId) 
    {
        this.classId = classId;
    }

    public String getClassName() 
    {
        return className;
    }

    public void setClassName(String className) 
    {
        this.className = className;
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this,ToStringStyle.MULTI_LINE_STYLE)
            .append("printId", getPrintId())
            .append("printName", getPrintName())
            .append("paperGoodsId", getPaperGoodsId())
            .append("paperType", getPaperType())
            .append("printCount", getPrintCount())
            .append("pageCount", getPageCount())
            .append("printSide", getPrintSide())
            .append("totalPages", getTotalPages())
            .append("attachment", getAttachment())
            .append("resultImg", getResultImg())
            .append("teacherId", getTeacherId())
            .append("grade", getGrade())
            .append("classId", getClassId())
            .append("className", getClassName())
            .append("operator", getOperator())
            .append("printTime", getPrintTime())
            .append("remark", getRemark())
            .append("status", getStatus())
            .append("outId", getOutId())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("delFlag", getDelFlag())
            .toString();
    }
}
