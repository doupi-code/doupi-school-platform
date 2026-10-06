package com.doupi.stock.service;

import java.util.List;
import com.doupi.stock.domain.StockOutItem;

/**
 * 出库单明细Service接口
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
public interface IStockOutItemService 
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
     * 批量删除出库单明细
     * 
     * @param itemIds 需要删除的出库单明细主键集合
     * @return 结果
     */
    public int deleteEduStockOutItemByItemIds(Long[] itemIds);

    /**
     * 删除出库单明细信息
     * 
     * @param itemId 出库单明细主键
     * @return 结果
     */
    public int deleteEduStockOutItemByItemId(Long itemId);
}
