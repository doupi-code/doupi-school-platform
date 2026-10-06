package com.doupi.stock.mapper;

import java.util.List;
import com.doupi.stock.domain.StockInItem;

/**
 * 入库单明细Mapper接口
 * 
 * @author doupi
 * @date 2026-09-25
 */
public interface StockInItemMapper 
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
     * 删除入库单明细
     * 
     * @param itemId 入库单明细主键
     * @return 结果
     */
    public int deleteEduStockInItemByItemId(Long itemId);

    /**
     * 批量删除入库单明细
     * 
     * @param itemIds 需要删除的数据主键集合
     * @return 结果
     */
    public int deleteEduStockInItemByItemIds(Long[] itemIds);

    /**
     * 根据入库单ID删除明细
     */
    public int deleteEduStockInItemByInId(Long inId);

    /**
     * 批量新增明细
     */
    public int batchInsertStockInItems(List<StockInItem> list);

    /**
     * 根据入库单ID查询明细（带物品详情）
     */
    public List<StockInItem> selectItemsByInId(Long inId);
}
