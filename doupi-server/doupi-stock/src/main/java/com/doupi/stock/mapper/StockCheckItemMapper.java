package com.doupi.stock.mapper;

import java.util.List;
import com.doupi.stock.domain.StockCheckItem;

/**
 * 盘点明细Mapper接口
 */
public interface StockCheckItemMapper 
{
    public List<StockCheckItem> selectItemsByCheckId(Long checkId);

    public int batchInsertCheckItems(List<StockCheckItem> list);

    public int deleteCheckItemsByCheckId(Long checkId);

    public int deleteEduStockCheckItemByItemIds(Long[] itemIds);
}
