package com.doupi.stock.mapper;

import java.util.List;
import com.doupi.stock.domain.StockOut;

/**
 * 出库单Mapper接口
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
public interface StockOutMapper 
{
    /**
     * 查询出库单
     * 
     * @param outId 出库单主键
     * @return 出库单
     */
    public StockOut selectEduStockOutByOutId(Long outId);

    /**
     * 查询出库单列表
     * 
     * @param stockOut 出库单
     * @return 出库单集合
     */
    public List<StockOut> selectEduStockOutList(StockOut stockOut);

    /**
     * 新增出库单
     * 
     * @param stockOut 出库单
     * @return 结果
     */
    public int insertEduStockOut(StockOut stockOut);

    /**
     * 修改出库单
     * 
     * @param stockOut 出库单
     * @return 结果
     */
    public int updateEduStockOut(StockOut stockOut);

    /**
     * 删除出库单
     * 
     * @param outId 出库单主键
     * @return 结果
     */
    public int deleteEduStockOutByOutId(Long outId);

    /**
     * 批量删除出库单
     * 
     * @param outIds 需要删除的数据主键集合
     * @return 结果
     */
    public int deleteEduStockOutByOutIds(Long[] outIds);

    /**
     * 查询指定前缀下的最大出库单号
     * 
     * @param prefix 单号前缀
     * @return 最大单号
     */
    public String selectMaxOutNo(String prefix);
}
