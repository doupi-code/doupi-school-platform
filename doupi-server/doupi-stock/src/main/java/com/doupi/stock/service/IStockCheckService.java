package com.doupi.stock.service;

import java.util.List;
import com.doupi.stock.domain.StockCheck;
import com.doupi.stock.domain.StockCheckItem;

/**
 * 库存盘点Service接口
 */
public interface IStockCheckService 
{
    public StockCheck selectEduStockCheckByCheckId(Long checkId);

    public List<StockCheck> selectEduStockCheckList(StockCheck stockCheck);

    public int insertEduStockCheck(StockCheck stockCheck);

    public int updateEduStockCheck(StockCheck stockCheck);

    public int auditEduStockCheck(Long checkId);

    public int cancelEduStockCheck(Long checkId);

    public int deleteEduStockCheckByCheckIds(Long[] checkIds);

    public List<StockCheckItem> prepareCheckItems(String checkType, String category);
}
