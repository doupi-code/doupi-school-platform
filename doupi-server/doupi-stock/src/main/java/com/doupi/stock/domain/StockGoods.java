package com.doupi.stock.domain;

import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 物品档案对象 edu_goods
 * 
 * @author doupi
 * @date 2026-09-25
 */
public class StockGoods extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 物品ID */
    private Long goodsId;

    /** 物品名称 */
    @Excel(name = "物品名称")
    private String goodsName;

    /** 分类 */
    @Excel(name = "分类")
    private String category;

    /** 适用年级（如高一、初一，非教材类为空） */
    @Excel(name = "适用年级", readConverterExp = "如=高一、初一，非教材类为空")
    private String grade;

    /** 规格 */
    @Excel(name = "规格")
    private String spec;

    /** 单位 */
    @Excel(name = "单位")
    private String unit;

    /** 当前库存 */
    @Excel(name = "当前库存")
    private Long stockNum;

    /** 库存下限 */
    @Excel(name = "库存下限")
    private Long warnLow;

    /** 存放位置 */
    @Excel(name = "存放位置")
    private String location;

    /** 每包装基础数量换算率(如1000张/包) */
    @Excel(name = "包装换算率")
    private Integer conversionRate;

    /** 最小基础单位(如张/支) */
    @Excel(name = "基础单位")
    private String baseUnit;

    /** 散张/零头余量(如整包拆开后剩余散张数) */
    @Excel(name = "散张余量")
    private Integer remainSheets;

    /** 重算模式参数（'A': 包数不变总张数重算; 'B': 总张数不变包数折半重算） */
    private String recalcMode;

    /** 删除标志 0存在 2删除 */
    private String delFlag;

    public Integer getConversionRate() 
    {
        return conversionRate;
    }

    public void setConversionRate(Integer conversionRate) 
    {
        this.conversionRate = conversionRate;
    }

    public String getBaseUnit() 
    {
        return baseUnit;
    }

    public void setBaseUnit(String baseUnit) 
    {
        this.baseUnit = baseUnit;
    }

    public Integer getRemainSheets() 
    {
        return remainSheets;
    }

    public void setRemainSheets(Integer remainSheets) 
    {
        this.remainSheets = remainSheets;
    }

    public String getRecalcMode() 
    {
        return recalcMode;
    }

    public void setRecalcMode(String recalcMode) 
    {
        this.recalcMode = recalcMode;
    }

    public void setGoodsId(Long goodsId) 
    {
        this.goodsId = goodsId;
    }

    public Long getGoodsId() 
    {
        return goodsId;
    }

    public void setGoodsName(String goodsName) 
    {
        this.goodsName = goodsName;
    }

    public String getGoodsName() 
    {
        return goodsName;
    }

    public void setCategory(String category) 
    {
        this.category = category;
    }

    public String getCategory() 
    {
        return category;
    }

    public void setGrade(String grade) 
    {
        this.grade = grade;
    }

    public String getGrade() 
    {
        return grade;
    }

    public void setSpec(String spec) 
    {
        this.spec = spec;
    }

    public String getSpec() 
    {
        return spec;
    }

    public void setUnit(String unit) 
    {
        this.unit = unit;
    }

    public String getUnit() 
    {
        return unit;
    }

    public void setStockNum(Long stockNum) 
    {
        this.stockNum = stockNum;
    }

    public Long getStockNum() 
    {
        return stockNum;
    }

    public void setWarnLow(Long warnLow) 
    {
        this.warnLow = warnLow;
    }

    public Long getWarnLow() 
    {
        return warnLow;
    }

    public void setLocation(String location) 
    {
        this.location = location;
    }

    public String getLocation() 
    {
        return location;
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
            .append("goodsId", getGoodsId())
            .append("goodsName", getGoodsName())
            .append("category", getCategory())
            .append("grade", getGrade())
            .append("spec", getSpec())
            .append("unit", getUnit())
            .append("stockNum", getStockNum())
            .append("warnLow", getWarnLow())
            .append("location", getLocation())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("delFlag", getDelFlag())
            .toString();
    }
}
