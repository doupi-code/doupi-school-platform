package com.doupi.stock.domain;

import java.util.Date;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 库存盘点单主表对象 edu_stock_check
 */
public class StockCheck extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 盘点ID */
    private Long checkId;

    /** 盘点单号 */
    @Excel(name = "盘点单号")
    private String checkNo;

    /** 盘点类型（1-全量 2-按分类） */
    @Excel(name = "盘点类型", readConverterExp = "1=全量,2=按分类")
    private String checkType;

    /** 物品分类 */
    @Excel(name = "物品分类", readConverterExp = "1=教师办公用品,2=学生教材,3=文印耗材")
    private String category;

    /** 盘点时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Excel(name = "盘点时间", width = 30, dateFormat = "yyyy-MM-dd HH:mm:ss")
    private Date checkTime;

    /** 经办人 */
    @Excel(name = "经办人")
    private String operator;

    /** 状态（1-待审核 2-已审核 3-已作废） */
    @Excel(name = "状态", readConverterExp = "1=待审核,2=已审核,3=已作废")
    private String status;

    /** 删除标志 0正常 2删除 */
    private String delFlag;

    /** 明细列表 */
    private List<StockCheckItem> itemList;

    public Long getCheckId() {
        return checkId;
    }

    public void setCheckId(Long checkId) {
        this.checkId = checkId;
    }

    public String getCheckNo() {
        return checkNo;
    }

    public void setCheckNo(String checkNo) {
        this.checkNo = checkNo;
    }

    public String getCheckType() {
        return checkType;
    }

    public void setCheckType(String checkType) {
        this.checkType = checkType;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public Date getCheckTime() {
        return checkTime;
    }

    public void setCheckTime(Date checkTime) {
        this.checkTime = checkTime;
    }

    public String getOperator() {
        return operator;
    }

    public void setOperator(String operator) {
        this.operator = operator;
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

    public List<StockCheckItem> getItemList() {
        return itemList;
    }

    public void setItemList(List<StockCheckItem> itemList) {
        this.itemList = itemList;
    }
}
