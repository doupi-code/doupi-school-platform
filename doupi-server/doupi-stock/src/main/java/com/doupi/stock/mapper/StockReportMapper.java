package com.doupi.stock.mapper;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import com.doupi.stock.domain.vo.StockDetailVo;

/**
 * 统计报表Mapper接口
 */
public interface StockReportMapper 
{
    /** 查询某月入库总金额 */
    public BigDecimal getMonthlyInAmount(@Param("month") String month);

    /** 查询某月出库总金额 */
    public BigDecimal getMonthlyOutAmount(@Param("month") String month);

    /** 查询当前所有物品库存总价值 */
    public BigDecimal getTotalStockAmount();

    /** 查询库存预警物品数 */
    public Long getWarnLowCount();

    /** 查询物品分类库存统计 */
    public List<Map<String, Object>> selectCategoryStockSummary();

    /** 查询各月入库聚合统计 */
    public List<Map<String, Object>> selectMonthlyInSummary(@Param("beginMonth") String beginMonth);

    /** 查询各月出库聚合统计 */
    public List<Map<String, Object>> selectMonthlyOutSummary(@Param("beginMonth") String beginMonth);

    /** 出入库明细报表多条件查询 */
    public List<StockDetailVo> selectStockDetailList(Map<String, Object> params);
}
