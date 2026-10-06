package com.doupi.edu.domain.vo;

import java.io.Serializable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * 教务物资领退统计大屏概览VO
 * 
 * @author doupi
 */
public class EduMaterialReportSummaryVo implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 累计发放物资总件数 */
    private Integer totalGrantQty;

    /** 累计归还回收件数 */
    private Integer totalReturnQty;

    /** 净领用消耗总件数 */
    private Integer netGrantQty;

    /** 参与领用总人次 */
    private Integer totalPersonCount;

    /** 覆盖班级总数 */
    private Integer totalClassCount;

    /** 领退业务单据总笔数 */
    private Integer totalOrderCount;

    /** 物资估算总价值(元) */
    private BigDecimal totalAmount;

    /** 物资品类分布统计 [{name: '教师办公品', value: 120}, ...] */
    private List<Map<String, Object>> categoryPieData;

    /** 各班级/年级物资领用排行 [{className: '高一(1)班', quantity: 240}, ...] */
    private List<Map<String, Object>> classRankData;

    /** 近6个月物资领用趋势 [{month: '2026-05', grantQty: 300, returnQty: 20}, ...] */
    private List<Map<String, Object>> monthlyTrendData;

    /** 高频领用物资TOP8 */
    private List<Map<String, Object>> topGoodsList;

    public Integer getTotalGrantQty() { return totalGrantQty; }
    public void setTotalGrantQty(Integer totalGrantQty) { this.totalGrantQty = totalGrantQty; }

    public Integer getTotalReturnQty() { return totalReturnQty; }
    public void setTotalReturnQty(Integer totalReturnQty) { this.totalReturnQty = totalReturnQty; }

    public Integer getNetGrantQty() { return netGrantQty; }
    public void setNetGrantQty(Integer netGrantQty) { this.netGrantQty = netGrantQty; }

    public Integer getTotalPersonCount() { return totalPersonCount; }
    public void setTotalPersonCount(Integer totalPersonCount) { this.totalPersonCount = totalPersonCount; }

    public Integer getTotalClassCount() { return totalClassCount; }
    public void setTotalClassCount(Integer totalClassCount) { this.totalClassCount = totalClassCount; }

    public Integer getTotalOrderCount() { return totalOrderCount; }
    public void setTotalOrderCount(Integer totalOrderCount) { this.totalOrderCount = totalOrderCount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public List<Map<String, Object>> getCategoryPieData() { return categoryPieData; }
    public void setCategoryPieData(List<Map<String, Object>> categoryPieData) { this.categoryPieData = categoryPieData; }

    public List<Map<String, Object>> getClassRankData() { return classRankData; }
    public void setClassRankData(List<Map<String, Object>> classRankData) { this.classRankData = classRankData; }

    public List<Map<String, Object>> getMonthlyTrendData() { return monthlyTrendData; }
    public void setMonthlyTrendData(List<Map<String, Object>> monthlyTrendData) { this.monthlyTrendData = monthlyTrendData; }

    public List<Map<String, Object>> getTopGoodsList() { return topGoodsList; }
    public void setTopGoodsList(List<Map<String, Object>> topGoodsList) { this.topGoodsList = topGoodsList; }
}
