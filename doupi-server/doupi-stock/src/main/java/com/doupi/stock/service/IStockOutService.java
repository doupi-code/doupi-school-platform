package com.doupi.stock.service;

import java.util.List;
import com.doupi.stock.domain.StockOut;

/**
 * 出库单Service接口
 * 
 * @author doupi
 * @date 2026-09-25
 */
public interface IStockOutService 
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
     * 批量删除出库单
     * 
     * @param outIds 需要删除的出库单主键集合
     * @return 结果
     */
    public int deleteEduStockOutByOutIds(Long[] outIds);

    /**
     * 删除出库单信息
     * 
     * @param outId 出库单主键
     * @return 结果
     */
    public int deleteEduStockOutByOutId(Long outId);

    /**
     * 作废出库单（回退库存）
     * 
     * @param outId 出库单主键
     * @return 结果
     */
    public int cancelEduStockOut(Long outId);
}
