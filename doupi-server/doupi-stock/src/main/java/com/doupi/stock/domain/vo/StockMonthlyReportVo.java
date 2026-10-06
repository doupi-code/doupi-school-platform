package com.doupi.stock.domain.vo;

import java.io.Serializable;
import java.math.BigDecimal;
import com.doupi.common.annotation.Excel;

/**
 * 月度出入库统计报表VO
 */
public class StockMonthlyReportVo implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 月份 (例如 2026-09) */
    @Excel(name = "统计月份")
    private String month;

    /** 入库单数量 */
    @Excel(name = "入库单数")
    private Long inOrderCount = 0L;

    /** 入库物资总件数 */
    @Excel(name = "入库总件数")
    private Long inQuantity = 0L;

    /** 入库总金额 */
    @Excel(name = "入库总金额")
    private BigDecimal inAmount = BigDecimal.ZERO;

    /** 出库单数量 */
    @Excel(name = "出库单数")
    private Long outOrderCount = 0L;

    /** 出库物资总件数 */
    @Excel(name = "出库总件数")
    private Long outQuantity = 0L;

    /** 出库估算总金额 */
    @Excel(name = "出库总金额")
    private BigDecimal outAmount = BigDecimal.ZERO;

    public String getMonth() {
        return month;
    }

    public void setMonth(String month) {
        this.month = month;
    }

    public Long getInOrderCount() {
        return inOrderCount;
    }

    public void setInOrderCount(Long inOrderCount) {
        this.inOrderCount = inOrderCount;
    }

    public Long getInQuantity() {
        return inQuantity;
    }

    public void setInQuantity(Long inQuantity) {
        this.inQuantity = inQuantity;
    }

    public BigDecimal getInAmount() {
        return inAmount;
    }

    public void setInAmount(BigDecimal inAmount) {
        this.inAmount = inAmount;
    }

    public Long getOutOrderCount() {
        return outOrderCount;
    }

    public void setOutOrderCount(Long outOrderCount) {
        this.outOrderCount = outOrderCount;
    }

    public Long getOutQuantity() {
        return outQuantity;
    }

    public void setOutQuantity(Long outQuantity) {
        this.outQuantity = outQuantity;
    }

    public BigDecimal getOutAmount() {
        return outAmount;
    }

    public void setOutAmount(BigDecimal outAmount) {
        this.outAmount = outAmount;
    }
}
