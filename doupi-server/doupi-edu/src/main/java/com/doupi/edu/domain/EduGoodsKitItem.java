package com.doupi.edu.domain;

import com.doupi.common.core.domain.BaseEntity;

/**
 * 物资套装明细对象 edu_goods_kit_item
 * 
 * @author doupi
 */
public class EduGoodsKitItem extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 明细ID */
    private Long itemId;

    /** 套装ID */
    private Long kitId;

    /** 物资ID */
    private Long goodsId;

    /** 默认配发数量 */
    private Integer quantity;

    /** 排序号 */
    private Integer sortOrder;

    /** 配发说明 */
    private String remark;

    /** 物资名称（非表字段） */
    private String goodsName;

    /** 规格型号（非表字段） */
    private String spec;

    /** 计量单位（非表字段） */
    private String unit;

    /** 当前库存（非表字段） */
    private Long stockNum;

    /** 物资分类（非表字段） */
    private String category;

    public Long getItemId() {
        return itemId;
    }

    public void setItemId(Long itemId) {
        this.itemId = itemId;
    }

    public Long getKitId() {
        return kitId;
    }

    public void setKitId(Long kitId) {
        this.kitId = kitId;
    }

    public Long getGoodsId() {
        return goodsId;
    }

    public void setGoodsId(Long goodsId) {
        this.goodsId = goodsId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public Integer getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }

    @Override
    public String getRemark() {
        return remark;
    }

    @Override
    public void setRemark(String remark) {
        this.remark = remark;
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

    public Long getStockNum() {
        return stockNum;
    }

    public void setStockNum(Long stockNum) {
        this.stockNum = stockNum;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
