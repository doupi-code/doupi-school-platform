package com.doupi.edu.domain.vo;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.doupi.common.annotation.Excel;

/**
 * 教务物资领退最细化明细台账VO（细化到各班、个人、各个物资）
 * 
 * @author doupi
 */
public class EduMaterialDetailReportVo implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 明细主键ID */
    private Long itemId;

    /** 主记录ID */
    private Long recordId;

    /** 流水单号 */
    @Excel(name = "流水单号", width = 18)
    private String recordNo;

    /** 业务类型(发放领取/退还回收) */
    @Excel(name = "业务类型", width = 12)
    private String recordTypeName;

    private String recordType;

    /** 业务场景 */
    @Excel(name = "业务场景", width = 18)
    private String businessCategory;

    /** 经办时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Excel(name = "经办领用时间", width = 20, dateFormat = "yyyy-MM-dd HH:mm:ss")
    private Date operateTime;

    /** 所属年级 */
    @Excel(name = "所属年级", width = 12)
    private String grade;

    /** 班级名称 */
    @Excel(name = "班级名称", width = 16)
    private String className;

    private Long classId;

    /** 对象类型(教师/学生/班级) */
    @Excel(name = "领用对象类型", width = 14)
    private String targetTypeName;

    private String targetType;

    /** 领用人/归还人姓名 */
    @Excel(name = "领用人姓名", width = 14)
    private String targetName;

    /** 所属学科/选科 */
    @Excel(name = "学科/选科", width = 14)
    private String subject;

    /** 物资分类 */
    @Excel(name = "物资分类", width = 14)
    private String categoryName;

    private String category;

    /** 物资ID */
    private Long goodsId;

    /** 物资名称 */
    @Excel(name = "物资名称", width = 20)
    private String goodsName;

    /** 规格型号 */
    @Excel(name = "规格型号", width = 16)
    private String spec;

    /** 计量单位 */
    @Excel(name = "单位", width = 10)
    private String unit;

    /** 变动数量 */
    @Excel(name = "领退数量", width = 12)
    private Integer quantity;

    /** 参考单价 */
    @Excel(name = "参考单价(元)", width = 14)
    private BigDecimal price;

    /** 金额估算 */
    @Excel(name = "金额估算(元)", width = 14)
    private BigDecimal amount;

    /** 引用套装 */
    @Excel(name = "引用套装", width = 18)
    private String kitName;

    /** 经办教务人员 */
    @Excel(name = "经办教务", width = 12)
    private String operator;

    /** 物品状态 */
    @Excel(name = "物资状态", width = 12)
    private String itemStatus;

    /** 拍照凭证URL */
    private String imageUrl;

    /** 备注 */
    @Excel(name = "备注说明", width = 25)
    private String remark;

    public Long getItemId() { return itemId; }
    public void setItemId(Long itemId) { this.itemId = itemId; }

    public Long getRecordId() { return recordId; }
    public void setRecordId(Long recordId) { this.recordId = recordId; }

    public String getRecordNo() { return recordNo; }
    public void setRecordNo(String recordNo) { this.recordNo = recordNo; }

    public String getRecordTypeName() { return recordTypeName; }
    public void setRecordTypeName(String recordTypeName) { this.recordTypeName = recordTypeName; }

    public String getRecordType() { return recordType; }
    public void setRecordType(String recordType) { this.recordType = recordType; }

    public String getBusinessCategory() { return businessCategory; }
    public void setBusinessCategory(String businessCategory) { this.businessCategory = businessCategory; }

    public Date getOperateTime() { return operateTime; }
    public void setOperateTime(Date operateTime) { this.operateTime = operateTime; }

    public String getGrade() { return grade; }
    public void setGrade(String grade) { this.grade = grade; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public Long getClassId() { return classId; }
    public void setClassId(Long classId) { this.classId = classId; }

    public String getTargetTypeName() { return targetTypeName; }
    public void setTargetTypeName(String targetTypeName) { this.targetTypeName = targetTypeName; }

    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }

    public String getTargetName() { return targetName; }
    public void setTargetName(String targetName) { this.targetName = targetName; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Long getGoodsId() { return goodsId; }
    public void setGoodsId(Long goodsId) { this.goodsId = goodsId; }

    public String getGoodsName() { return goodsName; }
    public void setGoodsName(String goodsName) { this.goodsName = goodsName; }

    public String getSpec() { return spec; }
    public void setSpec(String spec) { this.spec = spec; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getKitName() { return kitName; }
    public void setKitName(String kitName) { this.kitName = kitName; }

    public String getOperator() { return operator; }
    public void setOperator(String operator) { this.operator = operator; }

    public String getItemStatus() { return itemStatus; }
    public void setItemStatus(String itemStatus) { this.itemStatus = itemStatus; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public String getRemark() { return remark; }
    public void setRemark(String remark) { this.remark = remark; }
}
