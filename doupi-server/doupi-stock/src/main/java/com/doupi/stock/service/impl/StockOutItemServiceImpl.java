package com.doupi.stock.service.impl;

import java.util.List;
import com.doupi.common.utils.DateUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.stock.mapper.StockOutItemMapper;
import com.doupi.stock.domain.StockOutItem;
import com.doupi.stock.service.IStockOutItemService;

/**
 * 出库单明细Service业务层处理
 * 
 * @author doupi
 * @date 2026-09-25
 */
@Service
public class StockOutItemServiceImpl implements IStockOutItemService 
{
    @Autowired
    private StockOutItemMapper stockOutItemMapper;

    /**
     * 查询出库单明细
     * 
     * @param itemId 出库单明细主键
     * @return 出库单明细
     */
    @Override
    public StockOutItem selectEduStockOutItemByItemId(Long itemId)
    {
        return stockOutItemMapper.selectEduStockOutItemByItemId(itemId);
    }

    /**
     * 查询出库单明细列表
     * 
     * @param stockOutItem 出库单明细
     * @return 出库单明细
     */
    @Override
    public List<StockOutItem> selectEduStockOutItemList(StockOutItem stockOutItem)
    {
        return stockOutItemMapper.selectEduStockOutItemList(stockOutItem);
    }

    /**
     * 新增出库单明细
     * 
     * @param stockOutItem 出库单明细
     * @return 结果
     */
    @Override
    public int insertEduStockOutItem(StockOutItem stockOutItem)
    {
        stockOutItem.setCreateTime(DateUtils.getNowDate());
        return stockOutItemMapper.insertEduStockOutItem(stockOutItem);
    }

    /**
     * 修改出库单明细
     * 
     * @param stockOutItem 出库单明细
     * @return 结果
     */
    @Override
    public int updateEduStockOutItem(StockOutItem stockOutItem)
    {
        stockOutItem.setUpdateTime(DateUtils.getNowDate());
        return stockOutItemMapper.updateEduStockOutItem(stockOutItem);
    }

    /**
     * 批量删除出库单明细
     * 
     * @param itemIds 需要删除的出库单明细主键
     * @return 结果
     */
    @Override
    public int deleteEduStockOutItemByItemIds(Long[] itemIds)
    {
        return stockOutItemMapper.deleteEduStockOutItemByItemIds(itemIds);
    }

    /**
     * 删除出库单明细信息
     * 
     * @param itemId 出库单明细主键
     * @return 结果
     */
    @Override
    public int deleteEduStockOutItemByItemId(Long itemId)
    {
        return stockOutItemMapper.deleteEduStockOutItemByItemId(itemId);
    }
}
