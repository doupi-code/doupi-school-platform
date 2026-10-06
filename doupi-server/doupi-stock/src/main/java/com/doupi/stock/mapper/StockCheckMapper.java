package com.doupi.stock.mapper;

import java.util.List;
import com.doupi.stock.domain.StockCheck;

/**
 * 盘点单Mapper接口
 */
public interface StockCheckMapper 
{
    public StockCheck selectEduStockCheckByCheckId(Long checkId);

    public List<StockCheck> selectEduStockCheckList(StockCheck stockCheck);

    public int insertEduStockCheck(StockCheck stockCheck);

    public int updateEduStockCheck(StockCheck stockCheck);

    public int deleteEduStockCheckByCheckId(Long checkId);

    public int deleteEduStockCheckByCheckIds(Long[] checkIds);

    public String selectMaxCheckNo(String prefix);
}
