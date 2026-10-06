package com.doupi.stock.service;

import java.util.List;
import java.util.Map;
import com.doupi.stock.domain.vo.StockDashboardVo;
import com.doupi.stock.domain.vo.StockMonthlyReportVo;
import com.doupi.stock.domain.vo.StockDetailVo;

/**
 * 统计报表Service接口
 */
public interface IStockReportService 
{
    /** 获取首页仪表盘统计数据 */
    public StockDashboardVo getDashboardData();

    /** 查询出入库明细报表 */
    public List<StockDetailVo> selectStockDetailList(Map<String, Object> params);

    /** 查询月度统计报表 */
    public List<StockMonthlyReportVo> selectMonthlyReportList(String year);
}
