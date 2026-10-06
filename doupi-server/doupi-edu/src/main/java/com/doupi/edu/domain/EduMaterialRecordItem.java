package com.doupi.edu.domain;

import java.io.Serializable;
import java.util.Date;

/**
 * 教务日常物资领退明细对象 edu_material_record_item
 * 
 * @author doupi
 */
public class EduMaterialRecordItem implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 明细ID */
    private Long itemId;

    /** 主记录ID */
    private Long recordId;

    /** 物资ID */
    private Long goodsId;

    /** 物资名称 */
    private String goodsName;

    /** 规格型号 */
    private String spec;

    /** 计量单位 */
    private String unit;

    /** 数量 */
    private Integer quantity;

    /** 物品状态(完好/轻微磨损/损坏报损) */
    private String itemStatus;

    /** 备注 */
    private String remark;

    /** 创建时间 */
    private Date createTime;

    /** 当前可用库存（辅助字段） */
    private Long stockNum;

    public Long getItemId() {
        return itemId;
    }

    public void setItemId(Long itemId) {
        this.itemId = itemId;
    }

    public Long getRecordId() {
        return recordId;
    }

    public void setRecordId(Long recordId) {
        this.recordId = recordId;
    }

    public Long getGoodsId() {
        return goodsId;
    }

    public void setGoodsId(Long goodsId) {
        this.goodsId = goodsId;
    }

    public String getGoodsName() {
        return goodsName;
    }

    public void setGoodsName(String goodsName) {
        this.goodsName = goodsName;
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

    public String getItemStatus() {
        return itemStatus;
    }

    public void setItemStatus(String itemStatus) {
        this.itemStatus = itemStatus;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public Date getCreateTime() {
        return createTime;
    }

    public void setCreateTime(Date createTime) {
        this.createTime = createTime;
    }

    public Long getStockNum() {
        return stockNum;
    }

    public void setStockNum(Long stockNum) {
        this.stockNum = stockNum;
    }
}
