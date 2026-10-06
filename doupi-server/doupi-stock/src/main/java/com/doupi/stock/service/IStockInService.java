package com.doupi.stock.service;

import java.util.List;
import com.doupi.stock.domain.StockIn;

/**
 * 入库单Service接口
 * 
 * @author doupi
 * @date 2026-09-25
 */
public interface IStockInService 
{
    /**
     * 查询入库单
     * 
     * @param inId 入库单主键
     * @return 入库单
     */
    public StockIn selectEduStockInByInId(Long inId);

    /**
     * 查询入库单列表
     * 
     * @param stockIn 入库单
     * @return 入库单集合
     */
    public List<StockIn> selectEduStockInList(StockIn stockIn);

    /**
     * 新增入库单
     * 
     * @param stockIn 入库单
     * @return 结果
     */
    public int insertEduStockIn(StockIn stockIn);

    /**
     * 修改入库单
     * 
     * @param stockIn 入库单
     * @return 结果
     */
    public int updateEduStockIn(StockIn stockIn);

    /**
     * 批量删除入库单
     * 
     * @param inIds 需要删除的入库单主键集合
     * @return 结果
     */
    public int deleteEduStockInByInIds(Long[] inIds);

    /**
     * 删除入库单信息
     * 
     * @param inId 入库单主键
     * @return 结果
     */
    public int deleteEduStockInByInId(Long inId);

    /**
     * 作废入库单（回退库存）
     * 
     * @param inId 入库单主键
     * @return 结果
     */
    public int cancelEduStockIn(Long inId);
}
