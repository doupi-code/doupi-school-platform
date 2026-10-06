package com.doupi.edu.domain;

import java.util.List;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 教务物资套装模版对象 edu_goods_kit
 * 
 * @author doupi
 */
public class EduGoodsKit extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 套装ID */
    private Long kitId;

    /** 套装名称 */
    @Excel(name = "套装名称")
    private String kitName;

    /** 套装编码 */
    @Excel(name = "套装编码")
    private String kitCode;

    /** 适用对象(1教师教学办公用品 2学生教材 3班级通用) */
    @Excel(name = "适用对象", readConverterExp = "1=教师教学办公用品,2=学生教材,3=班级通用")
    private String targetType;

    /** 适用年级(通用/高一/高二/高三/复读部) */
    @Excel(name = "适用年级")
    private String grade;

    /** 适用选科/方向(通用/物理类/历史类/物化生/历政地) */
    @Excel(name = "适用选科")
    private String subject;

    /** 套装说明/适用场景 */
    @Excel(name = "套装说明")
    private String description;

    /** 状态(0正常 1停用) */
    @Excel(name = "状态", readConverterExp = "0=正常,1=停用")
    private String status;

    /** 排序号 */
    private Integer sortOrder;

    /** 删除标志 */
    private String delFlag;

    /** 套装明细列表 */
    private List<EduGoodsKitItem> itemList;

    /** 包含物品总种类数（辅助显示） */
    private Integer itemCount;

    /** 包含物品总件数（辅助显示） */
    private Integer totalQuantity;

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

    public String getKitCode() {
        return kitCode;
    }

    public void setKitCode(String kitCode) {
        this.kitCode = kitCode;
    }

    public String getTargetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    public String getDelFlag() {
        return delFlag;
    }

    public void setDelFlag(String delFlag) {
        this.delFlag = delFlag;
    }

    public List<EduGoodsKitItem> getItemList() {
        return itemList;
    }

    public void setItemList(List<EduGoodsKitItem> itemList) {
        this.itemList = itemList;
    }

    public Integer getItemCount() {
        return itemCount;
    }

    public void setItemCount(Integer itemCount) {
        this.itemCount = itemCount;
    }

    public Integer getTotalQuantity() {
        return totalQuantity;
    }

    public void setTotalQuantity(Integer totalQuantity) {
        this.totalQuantity = totalQuantity;
    }
}
