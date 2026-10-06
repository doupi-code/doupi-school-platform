package com.doupi.stock.service.impl;

import java.util.List;
import com.doupi.common.utils.DateUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.stock.mapper.StockInItemMapper;
import com.doupi.stock.domain.StockInItem;
import com.doupi.stock.service.IStockInItemService;

/**
 * 入库单明细Service业务层处理
 * 
 * @author doupi
 * @date 2026-09-25
 */
@Service
public class StockInItemServiceImpl implements IStockInItemService 
{
    @Autowired
    private StockInItemMapper stockInItemMapper;

    /**
     * 查询入库单明细
     * 
     * @param itemId 入库单明细主键
     * @return 入库单明细
     */
    @Override
    public StockInItem selectEduStockInItemByItemId(Long itemId)
    {
        return stockInItemMapper.selectEduStockInItemByItemId(itemId);
    }

    /**
     * 查询入库单明细列表
     * 
     * @param stockInItem 入库单明细
     * @return 入库单明细
     */
    @Override
    public List<StockInItem> selectEduStockInItemList(StockInItem stockInItem)
    {
        return stockInItemMapper.selectEduStockInItemList(stockInItem);
    }

    /**
     * 新增入库单明细
     * 
     * @param stockInItem 入库单明细
     * @return 结果
     */
    @Override
    public int insertEduStockInItem(StockInItem stockInItem)
    {
        stockInItem.setCreateTime(DateUtils.getNowDate());
        return stockInItemMapper.insertEduStockInItem(stockInItem);
    }

    /**
     * 修改入库单明细
     * 
     * @param stockInItem 入库单明细
     * @return 结果
     */
    @Override
    public int updateEduStockInItem(StockInItem stockInItem)
    {
        stockInItem.setUpdateTime(DateUtils.getNowDate());
        return stockInItemMapper.updateEduStockInItem(stockInItem);
    }

    /**
     * 批量删除入库单明细
     * 
     * @param itemIds 需要删除的入库单明细主键
     * @return 结果
     */
    @Override
    public int deleteEduStockInItemByItemIds(Long[] itemIds)
    {
        return stockInItemMapper.deleteEduStockInItemByItemIds(itemIds);
    }

    /**
     * 删除入库单明细信息
     * 
     * @param itemId 入库单明细主键
     * @return 结果
     */
    @Override
    public int deleteEduStockInItemByItemId(Long itemId)
    {
        return stockInItemMapper.deleteEduStockInItemByItemId(itemId);
    }
}
