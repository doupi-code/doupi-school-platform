package com.doupi.stock.domain;

import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 盘点明细对象 edu_stock_check_item
 */
public class StockCheckItem extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 明细ID */
    private Long itemId;

    /** 盘点单ID */
    private Long checkId;

    /** 物品ID */
    private Long goodsId;

    /** 账面库存 */
    @Excel(name = "账面库存")
    private Long bookNum;

    /** 实盘数量 */
    @Excel(name = "实盘数量")
    private Long realNum;

    /** 差异数量(实盘-账面) */
    @Excel(name = "差异数量")
    private Long diffNum;

    /** 物品名称 */
    @Excel(name = "物品名称")
    private String goodsName;

    /** 规格 */
    @Excel(name = "规格")
    private String spec;

    /** 单位 */
    @Excel(name = "单位")
    private String unit;

    /** 物品分类 */
    private String category;

    public Long getItemId() {
        return itemId;
    }

    public void setItemId(Long itemId) {
        this.itemId = itemId;
    }

    public Long getCheckId() {
        return checkId;
    }

    public void setCheckId(Long checkId) {
        this.checkId = checkId;
    }

    public Long getGoodsId() {
        return goodsId;
    }

    public void setGoodsId(Long goodsId) {
        this.goodsId = goodsId;
    }

    public Long getBookNum() {
        return bookNum;
    }

    public void setBookNum(Long bookNum) {
        this.bookNum = bookNum;
    }

    public Long getRealNum() {
        return realNum;
    }

    public void setRealNum(Long realNum) {
        this.realNum = realNum;
    }

    public Long getDiffNum() {
        return diffNum;
    }

    public void setDiffNum(Long diffNum) {
        this.diffNum = diffNum;
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }
}
