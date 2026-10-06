package com.doupi.stock.service;

import java.util.List;
import com.doupi.stock.domain.StockInItem;

/**
 * 入库单明细Service接口
 * 
 * @author doupi
 * @date 2026-09-25
 */
public interface IStockInItemService 
{
    /**
     * 查询入库单明细
     * 
     * @param itemId 入库单明细主键
     * @return 入库单明细
     */
    public StockInItem selectEduStockInItemByItemId(Long itemId);

    /**
     * 查询入库单明细列表
     * 
     * @param stockInItem 入库单明细
     * @return 入库单明细集合
     */
    public List<StockInItem> selectEduStockInItemList(StockInItem stockInItem);

    /**
     * 新增入库单明细
     * 
     * @param stockInItem 入库单明细
     * @return 结果
     */
    public int insertEduStockInItem(StockInItem stockInItem);

    /**
     * 修改入库单明细
     * 
     * @param stockInItem 入库单明细
     * @return 结果
     */
    public int updateEduStockInItem(StockInItem stockInItem);

    /**
     * 批量删除入库单明细
     * 
     * @param itemIds 需要删除的入库单明细主键集合
     * @return 结果
     */
    public int deleteEduStockInItemByItemIds(Long[] itemIds);

    /**
     * 删除入库单明细信息
     * 
     * @param itemId 入库单明细主键
     * @return 结果
     */
    public int deleteEduStockInItemByItemId(Long itemId);
}
