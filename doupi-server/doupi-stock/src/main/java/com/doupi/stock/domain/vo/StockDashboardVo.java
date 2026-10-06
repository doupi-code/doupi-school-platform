package com.doupi.stock.domain.vo;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 仪表板统计数据VO
 */
public class StockDashboardVo implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 本月入库总金额 */
    private BigDecimal monthlyInAmount = BigDecimal.ZERO;

    /** 本月出库总金额 */
    private BigDecimal monthlyOutAmount = BigDecimal.ZERO;

    /** 当前库存总金额 */
    private BigDecimal totalStockAmount = BigDecimal.ZERO;

    /** 库存预警物品数量 */
    private Long warnLowCount = 0L;

    /** 近12个月出入库趋势 (包含 month, inAmount, outAmount, inQty, outQty) */
    private List<Map<String, Object>> monthlyTrends;

    /** 物资分类库存统计 (包含 category, name, stockNum) */
    private List<Map<String, Object>> categoryStock;

    public BigDecimal getMonthlyInAmount() {
        return monthlyInAmount;
    }

    public void setMonthlyInAmount(BigDecimal monthlyInAmount) {
        this.monthlyInAmount = monthlyInAmount;
    }

    public BigDecimal getMonthlyOutAmount() {
        return monthlyOutAmount;
    }

    public void setMonthlyOutAmount(BigDecimal monthlyOutAmount) {
        this.monthlyOutAmount = monthlyOutAmount;
    }

    public BigDecimal getTotalStockAmount() {
        return totalStockAmount;
    }

    public void setTotalStockAmount(BigDecimal totalStockAmount) {
        this.totalStockAmount = totalStockAmount;
    }

    public Long getWarnLowCount() {
        return warnLowCount;
    }

    public void setWarnLowCount(Long warnLowCount) {
        this.warnLowCount = warnLowCount;
    }

    public List<Map<String, Object>> getMonthlyTrends() {
        return monthlyTrends;
    }

    public void setMonthlyTrends(List<Map<String, Object>> monthlyTrends) {
        this.monthlyTrends = monthlyTrends;
    }

    public List<Map<String, Object>> getCategoryStock() {
        return categoryStock;
    }

    public void setCategoryStock(List<Map<String, Object>> categoryStock) {
        this.categoryStock = categoryStock;
    }
}
