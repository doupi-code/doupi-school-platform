package com.doupi.edu.domain;

import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 教务日常物资领退记录对象 edu_material_record
 * 
 * @author doupi
 */
public class EduMaterialRecord extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 记录ID */
    private Long recordId;

    /** 业务流水单号 */
    @Excel(name = "流水单号")
    private String recordNo;

    /** 业务类型(1发放领取 2退还回收) */
    @Excel(name = "业务类型", readConverterExp = "1=发放领取,2=退还回收")
    private String recordType;

    /** 业务场景(教师入职教学套件/学生选科领书/日常零星文具申领/班级领用/教师离职交接/学生退学退书/其他) */
    @Excel(name = "业务场景")
    private String businessCategory;

    /** 对象类型(1教师 2学生 3班级) */
    @Excel(name = "对象类型", readConverterExp = "1=教师,2=学生,3=班级")
    private String targetType;

    /** 关联对象ID */
    private Long targetId;

    /** 领用/归还人姓名(教师姓名/学生姓名) */
    @Excel(name = "领用/归还人")
    private String targetName;

    /** 关联班级ID */
    private Long classId;

    /** 关联班级名称 */
    @Excel(name = "关联班级")
    private String className;

    /** 所属年级 */
    @Excel(name = "年级")
    private String grade;

    /** 所属选科/学科 */
    @Excel(name = "选科/学科")
    private String subject;

    /** 引用的物资套装ID */
    private Long kitId;

    /** 引用的物资套装名称 */
    @Excel(name = "引用套装")
    private String kitName;

    /** 总件数 */
    @Excel(name = "总件数")
    private Integer totalQuantity;

    /** 实物/签领拍照留存图片URL(非必填) */
    @Excel(name = "拍照凭证")
    private String imageUrl;

    /** 经办教务人员 */
    @Excel(name = "经办教务")
    private String operator;

    /** 经办时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Excel(name = "经办时间", width = 30, dateFormat = "yyyy-MM-dd HH:mm:ss")
    private Date operateTime;

    /** 状态(0正常 1已撤销) */
    @Excel(name = "状态", readConverterExp = "0=正常,1=已撤销")
    private String status;

    /** 删除标志 */
    private String delFlag;

    /** 领退明细列表 */
    private List<EduMaterialRecordItem> itemList;

    public Long getRecordId() {
        return recordId;
    }

    public void setRecordId(Long recordId) {
        this.recordId = recordId;
    }

    public String getRecordNo() {
        return recordNo;
    }

    public void setRecordNo(String recordNo) {
        this.recordNo = recordNo;
    }

    public String getRecordType() {
        return recordType;
    }

    public void setRecordType(String recordType) {
        this.recordType = recordType;
    }

    public String getBusinessCategory() {
        return businessCategory;
    }

    public void setBusinessCategory(String businessCategory) {
        this.businessCategory = businessCategory;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public Long getTargetId() {
        return targetId;
    }

    public void setTargetId(Long targetId) {
        this.targetId = targetId;
    }

    public String getTargetName() {
        return targetName;
    }

    public void setTargetName(String targetName) {
        this.targetName = targetName;
    }

    public Long getClassId() {
        return classId;
    }

    public void setClassId(Long classId) {
        this.classId = classId;
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

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public Long getKitId() {
        return kitId;
    }

    public void setKitId(Long kitId) {
        this.kitId = kitId;
    }

    public String getKitName() {
        return kitName;
    }

    public void setKitName(String kitName) {
        this.kitName = kitName;
    }

    public Integer getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(Integer totalQuantity) {
        this.totalQuantity = totalQuantity;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getOperator() {
        return operator;
    }

    public void setOperator(String operator) {
        this.operator = operator;
    }

    public Date getOperateTime() {
        return operateTime;
    }

    public void setOperateTime(Date operateTime) {
        this.operateTime = operateTime;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getDelFlag() {
        return delFlag;
    }

    public void setDelFlag(String delFlag) {
        this.delFlag = delFlag;
    }

    public List<EduMaterialRecordItem> getItemList() {
        return itemList;
    }

    public void setItemList(List<EduMaterialRecordItem> itemList) {
        this.itemList = itemList;
    }
}
