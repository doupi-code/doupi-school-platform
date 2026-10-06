package com.doupi.stock.service.impl;

import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.doupi.common.exception.ServiceException;
import com.doupi.common.utils.DateUtils;
import com.doupi.common.utils.StringUtils;
import com.doupi.stock.domain.StockGoods;
import com.doupi.stock.domain.StockCheck;
import com.doupi.stock.domain.StockCheckItem;
import com.doupi.stock.mapper.StockGoodsMapper;
import com.doupi.stock.mapper.StockCheckItemMapper;
import com.doupi.stock.mapper.StockCheckMapper;
import com.doupi.stock.service.IStockSeqService;
import com.doupi.stock.service.IStockCheckService;

/**
 * 库存盘点Service业务处理
 */
@Service
public class StockCheckServiceImpl implements IStockCheckService 
{
    @Autowired
    private StockCheckMapper stockCheckMapper;

    @Autowired
    private StockCheckItemMapper stockCheckItemMapper;

    @Autowired
    private StockGoodsMapper stockGoodsMapper;

    @Autowired
    private IStockSeqService stockSeqService;

    @Override
    public StockCheck selectEduStockCheckByCheckId(Long checkId) 
    {
        StockCheck check = stockCheckMapper.selectEduStockCheckByCheckId(checkId);
        if (check != null) 
        {
            List<StockCheckItem> items = stockCheckItemMapper.selectItemsByCheckId(checkId);
            check.setItemList(items);
        }
        return check;
    }

    @Override
    public List<StockCheck> selectEduStockCheckList(StockCheck stockCheck) 
    {
        return stockCheckMapper.selectEduStockCheckList(stockCheck);
    }

    @Override
    public List<StockCheckItem> prepareCheckItems(String checkType, String category) 
    {
        StockGoods query = new StockGoods();
        if ("2".equals(checkType) && StringUtils.isNotEmpty(category)) 
        {
            query.setCategory(category);
        }
        List<StockGoods> goodsList = stockGoodsMapper.selectEduGoodsList(query);
        List<StockCheckItem> items = new ArrayList<>();
        if (goodsList != null) 
        {
            for (StockGoods g : goodsList) 
            {
                StockCheckItem item = new StockCheckItem();
                item.setGoodsId(g.getGoodsId());
                item.setGoodsName(g.getGoodsName());
                item.setSpec(g.getSpec());
                item.setUnit(g.getUnit());
                item.setCategory(g.getCategory());
                long stock = g.getStockNum() == null ? 0L : g.getStockNum();
                item.setBookNum(stock);
                item.setRealNum(stock); // 默认实盘数量等于账面数量
                item.setDiffNum(0L);
                items.add(item);
            }
        }
        return items;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int insertEduStockCheck(StockCheck stockCheck) 
    {
        List<StockCheckItem> items = stockCheck.getItemList();
        if (items == null || items.isEmpty()) 
        {
            throw new ServiceException("盘点明细列表不能为空！");
        }

        // 计算差异
        for (StockCheckItem item : items) 
        {
            long book = item.getBookNum() == null ? 0L : item.getBookNum();
            long real = item.getRealNum() == null ? 0L : item.getRealNum();
            item.setDiffNum(real - book);
        }

        String checkNo = stockSeqService.generateNo("PD");
        stockCheck.setCheckNo(checkNo);
        stockCheck.setStatus("1"); // 1-待审核
        stockCheck.setDelFlag("0");
        if (stockCheck.getCheckTime() == null) 
        {
            stockCheck.setCheckTime(DateUtils.getNowDate());
        }
        stockCheck.setCreateTime(DateUtils.getNowDate());

        int rows = stockCheckMapper.insertEduStockCheck(stockCheck);

        for (StockCheckItem item : items) 
        {
            item.setCheckId(stockCheck.getCheckId());
            item.setCreateTime(DateUtils.getNowDate());
        }
        stockCheckItemMapper.batchInsertCheckItems(items);

        return rows;
    }

    @Override
    public int updateEduStockCheck(StockCheck stockCheck) 
    {
        stockCheck.setUpdateTime(DateUtils.getNowDate());
        return stockCheckMapper.updateEduStockCheck(stockCheck);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int auditEduStockCheck(Long checkId) 
    {
        StockCheck check = stockCheckMapper.selectEduStockCheckByCheckId(checkId);
        if (check == null) 
        {
            throw new ServiceException("盘点单不存在！");
        }
        if (!"1".equals(check.getStatus())) 
        {
            throw new ServiceException("只有待审核状态的盘点单才可以审核！");
        }

        List<StockCheckItem> items = stockCheckItemMapper.selectItemsByCheckId(checkId);
        if (items != null) 
        {
            for (StockCheckItem item : items) 
            {
                // 强制将物品库存更新为实盘数量
                long realNum = item.getRealNum() == null ? 0L : item.getRealNum();
                stockGoodsMapper.updateStockNum(item.getGoodsId(), realNum);
            }
        }

        StockCheck updateObj = new StockCheck();
        updateObj.setCheckId(checkId);
        updateObj.setStatus("2"); // 2-已审核
        updateObj.setUpdateTime(DateUtils.getNowDate());
        return stockCheckMapper.updateEduStockCheck(updateObj);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int cancelEduStockCheck(Long checkId) 
    {
        StockCheck check = stockCheckMapper.selectEduStockCheckByCheckId(checkId);
        if (check == null) 
        {
            throw new ServiceException("盘点单不存在！");
        }
        if (!"1".equals(check.getStatus())) 
        {
            throw new ServiceException("只有待审核状态的盘点单才可以作废！");
        }

        StockCheck updateObj = new StockCheck();
        updateObj.setCheckId(checkId);
        updateObj.setStatus("3"); // 3-已作废
        updateObj.setUpdateTime(DateUtils.getNowDate());
        return stockCheckMapper.updateEduStockCheck(updateObj);
    }

    @Override
    public int deleteEduStockCheckByCheckIds(Long[] checkIds) 
    {
        return stockCheckMapper.deleteEduStockCheckByCheckIds(checkIds);
    }
}
