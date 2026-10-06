package com.doupi.stock.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.doupi.common.exception.ServiceException;
import com.doupi.common.utils.DateUtils;
import com.doupi.common.utils.StringUtils;
import com.doupi.stock.domain.StockGoods;
import com.doupi.stock.domain.StockOut;
import com.doupi.stock.domain.StockOutItem;
import com.doupi.stock.mapper.StockGoodsMapper;
import com.doupi.stock.mapper.StockOutItemMapper;
import com.doupi.stock.mapper.StockOutMapper;
import com.doupi.stock.service.IStockSeqService;
import com.doupi.stock.service.IStockOutService;

/**
 * 出库单Service业务层处理
 * 
 * @author doupi
 * @date 2026-09-25
 */
@Service
public class StockOutServiceImpl implements IStockOutService 
{
    @Autowired
    private StockOutMapper stockOutMapper;

    @Autowired
    private StockOutItemMapper stockOutItemMapper;

    @Autowired
    private StockGoodsMapper stockGoodsMapper;

    @Autowired
    private IStockSeqService stockSeqService;

    /**
     * 查询出库单（含明细）
     * 
     * @param outId 出库单主键
     * @return 出库单
     */
    @Override
    public StockOut selectEduStockOutByOutId(Long outId)
    {
        StockOut stockOut = stockOutMapper.selectEduStockOutByOutId(outId);
        if (stockOut != null)
        {
            List<StockOutItem> items = stockOutItemMapper.selectItemsByOutId(outId);
            stockOut.setItemList(items);
            long total = 0L;
            if (items != null)
            {
                for (StockOutItem item : items)
                {
                    if (item.getQuantity() != null)
                    {
                        total += item.getQuantity();
                    }
                }
            }
            stockOut.setTotalQuantity(total);
        }
        return stockOut;
    }

    /**
     * 查询出库单列表
     * 
     * @param stockOut 出库单
     * @return 出库单
     */
    @Override
    public List<StockOut> selectEduStockOutList(StockOut stockOut)
    {
        return stockOutMapper.selectEduStockOutList(stockOut);
    }

    /**
     * 新增出库单（强制事务控制，严格校验库存并扣减）
     * 
     * @param stockOut 出库单
     * @return 结果
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int insertEduStockOut(StockOut stockOut)
    {
        List<StockOutItem> items = stockOut.getItemList();
        if (items == null || items.isEmpty())
        {
            throw new ServiceException("出库明细列表不能为空！");
        }
        for (StockOutItem item : items)
        {
            if (item.getGoodsId() == null)
            {
                throw new ServiceException("出库明细中必须选择物品！");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0)
            {
                throw new ServiceException("出库数量必须大于0！");
            }
            // 校验库存充足性
            StockGoods goods = stockGoodsMapper.selectEduGoodsByGoodsId(item.getGoodsId());
            if (goods == null)
            {
                throw new ServiceException("出库物品不存在！");
            }
            int rate = goods.getConversionRate() != null && goods.getConversionRate() > 0 ? goods.getConversionRate() : 1;
            boolean isSheetDeduct = "3".equals(stockOut.getOutType()) && rate > 1;

            if (isSheetDeduct)
            {
                // 文印耗材出库按基础单位（张）进行换算核验
                long totalAvailableSheets = (goods.getStockNum() != null ? goods.getStockNum() : 0L) * rate + (goods.getRemainSheets() != null ? goods.getRemainSheets() : 0);
                if (totalAvailableSheets < item.getQuantity())
                {
                    throw new ServiceException("物品【" + goods.getGoodsName() + "】库存不足，当前库存折合为 " + totalAvailableSheets
                            + " " + (goods.getBaseUnit() != null ? goods.getBaseUnit() : "张") + "（" + goods.getStockNum() + " " + goods.getUnit()
                            + (goods.getRemainSheets() != null && goods.getRemainSheets() > 0 ? "又" + goods.getRemainSheets() + "张" : "") + "），本次出库需求为 " + item.getQuantity() + " 张！");
                }
            }
            else
            {
                // 普通领用按整包装扣减
                long currentStock = goods.getStockNum() == null ? 0L : goods.getStockNum();
                if (currentStock < item.getQuantity())
                {
                    throw new ServiceException("物品【" + goods.getGoodsName() + "】库存不足，当前库存为 " + currentStock
                            + " " + goods.getUnit() + "，出库需求为 " + item.getQuantity() + " " + goods.getUnit() + "！");
                }
            }
        }

        // 生成自动流水单号 CK + yyyyMMdd + 3位流水号
        String outNo = stockSeqService.generateNo("CK");
        stockOut.setOutNo(outNo);
        stockOut.setStatus("1"); // 1-正常
        stockOut.setDelFlag("0");
        if (stockOut.getOutTime() == null)
        {
            stockOut.setOutTime(DateUtils.getNowDate());
        }
        if (StringUtils.isEmpty(stockOut.getOperator()))
        {
            stockOut.setOperator(StringUtils.isNotEmpty(stockOut.getCreateBy()) ? stockOut.getCreateBy() : "管理员");
        }
        stockOut.setCreateTime(DateUtils.getNowDate());

        int rows = stockOutMapper.insertEduStockOut(stockOut);

        // 扣减库存并插入明细
        for (StockOutItem item : items)
        {
            item.setOutId(stockOut.getOutId());
            item.setCreateTime(DateUtils.getNowDate());

            StockGoods goods = stockGoodsMapper.selectEduGoodsByGoodsId(item.getGoodsId());
            int rate = goods != null && goods.getConversionRate() != null && goods.getConversionRate() > 0 ? goods.getConversionRate() : 1;
            boolean isSheetDeduct = "3".equals(stockOut.getOutType()) && rate > 1;

            if (isSheetDeduct && goods != null)
            {
                // 文印出库按基础单位（张）执行整包拆零精确扣减
                long oldStock = goods.getStockNum() != null ? goods.getStockNum() : 0L;
                int oldRemain = goods.getRemainSheets() != null ? goods.getRemainSheets() : 0;
                long totalSheets = oldStock * rate + oldRemain;
                long newTotal = totalSheets - item.getQuantity();

                long newStock = newTotal / rate;
                int newRemain = (int) (newTotal % rate);

                goods.setStockNum(newStock);
                goods.setRemainSheets(newRemain);
                goods.setUpdateTime(DateUtils.getNowDate());
                stockGoodsMapper.updateEduGoods(goods);
            }
            else
            {
                // 普通领用按整包装扣减
                int deductRows = stockGoodsMapper.deductStock(item.getGoodsId(), item.getQuantity());
                if (deductRows == 0)
                {
                    throw new ServiceException("物品【" + (goods != null ? goods.getGoodsName() : item.getGoodsId())
                            + "】扣减库存失败，可能库存已被其他操作扣减！");
                }
            }
        }
        stockOutItemMapper.batchInsertStockOutItems(items);

        return rows;
    }

    /**
     * 修改出库单
     * 
     * @param stockOut 出库单
     * @return 结果
     */
    @Override
    public int updateEduStockOut(StockOut stockOut)
    {
        stockOut.setUpdateTime(DateUtils.getNowDate());
        return stockOutMapper.updateEduStockOut(stockOut);
    }

    /**
     * 作废出库单（强制事务，回退累加物品库存）
     * 
     * @param outId 出库单主键
     * @return 结果
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int cancelEduStockOut(Long outId)
    {
        StockOut stockOut = stockOutMapper.selectEduStockOutByOutId(outId);
        if (stockOut == null)
        {
            throw new ServiceException("出库单不存在！");
        }
        if ("2".equals(stockOut.getStatus()))
        {
            throw new ServiceException("该出库单已作废，请勿重复操作！");
        }
        List<StockOutItem> items = stockOutItemMapper.selectItemsByOutId(outId);
        if (items != null)
        {
            for (StockOutItem item : items)
            {
                StockGoods goods = stockGoodsMapper.selectEduGoodsByGoodsId(item.getGoodsId());
                int rate = goods != null && goods.getConversionRate() != null && goods.getConversionRate() > 0 ? goods.getConversionRate() : 1;
                boolean isSheetDeduct = "3".equals(stockOut.getOutType()) && rate > 1;

                if (isSheetDeduct && goods != null)
                {
                    // 文印出库按基础单位（张）执行整包拆零加回回退
                    long oldStock = goods.getStockNum() != null ? goods.getStockNum() : 0L;
                    int oldRemain = goods.getRemainSheets() != null ? goods.getRemainSheets() : 0;
                    long totalSheets = oldStock * rate + oldRemain + item.getQuantity();

                    long newStock = totalSheets / rate;
                    int newRemain = (int) (totalSheets % rate);

                    goods.setStockNum(newStock);
                    goods.setRemainSheets(newRemain);
                    goods.setUpdateTime(DateUtils.getNowDate());
                    stockGoodsMapper.updateEduGoods(goods);
                }
                else
                {
                    stockGoodsMapper.addStock(item.getGoodsId(), item.getQuantity());
                }
            }
        }
        StockOut updateObj = new StockOut();
        updateObj.setOutId(outId);
        updateObj.setStatus("2"); // 2-已作废
        updateObj.setUpdateTime(DateUtils.getNowDate());
        return stockOutMapper.updateEduStockOut(updateObj);
    }

    /**
     * 批量删除出库单（强制事务，若未作废则自动先作废回退库存）
     * 
     * @param outIds 需要删除的出库单主键
     * @return 结果
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int deleteEduStockOutByOutIds(Long[] outIds)
    {
        if (outIds != null && outIds.length > 0)
        {
            for (Long outId : outIds)
            {
                deleteEduStockOutByOutId(outId);
            }
            return outIds.length;
        }
        return 0;
    }

    /**
     * 删除出库单信息（强制事务，若未作废则自动先作废回退库存）
     * 
     * @param outId 出库单主键
     * @return 结果
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int deleteEduStockOutByOutId(Long outId)
    {
        StockOut stockOut = stockOutMapper.selectEduStockOutByOutId(outId);
        if (stockOut != null && !"2".equals(stockOut.getStatus()))
        {
            cancelEduStockOut(outId);
        }
        return stockOutMapper.deleteEduStockOutByOutId(outId);
    }
}
