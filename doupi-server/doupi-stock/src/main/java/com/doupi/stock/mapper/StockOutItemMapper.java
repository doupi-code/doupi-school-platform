package com.doupi.stock.mapper;

import java.util.List;
import com.doupi.stock.domain.StockOutItem;

/**
 * 出库单明细Mapper接口
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
public interface StockOutItemMapper 
{
    /**
     * 查询出库单明细
     * 
     * @param itemId 出库单明细主键
     * @return 出库单明细
     */
    public StockOutItem selectEduStockOutItemByItemId(Long itemId);

    /**
     * 查询出库单明细列表
     * 
     * @param stockOutItem 出库单明细
     * @return 出库单明细集合
     */
    public List<StockOutItem> selectEduStockOutItemList(StockOutItem stockOutItem);

    /**
     * 新增出库单明细
     * 
     * @param stockOutItem 出库单明细
     * @return 结果
     */
    public int insertEduStockOutItem(StockOutItem stockOutItem);

    /**
     * 修改出库单明细
     * 
     * @param stockOutItem 出库单明细
     * @return 结果
     */
    public int updateEduStockOutItem(StockOutItem stockOutItem);

    /**
     * 删除出库单明细
     * 
     * @param itemId 出库单明细主键
     * @return 结果
     */
    public int deleteEduStockOutItemByItemId(Long itemId);

    /**
     * 批量删除出库单明细
     * 
     * @param itemIds 需要删除的数据主键集合
     * @return 结果
     */
    public int deleteEduStockOutItemByItemIds(Long[] itemIds);

    /**
     * 根据出库单ID删除明细
     */
    public int deleteEduStockOutItemByOutId(Long outId);

    /**
     * 批量新增明细
     */
    public int batchInsertStockOutItems(List<StockOutItem> list);

    /**
     * 根据出库单ID查询明细（带物品详情）
     */
    public List<StockOutItem> selectItemsByOutId(Long outId);
}
