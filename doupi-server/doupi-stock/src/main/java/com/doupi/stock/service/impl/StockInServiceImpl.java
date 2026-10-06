package com.doupi.stock.service.impl;

import java.math.BigDecimal;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.doupi.common.exception.ServiceException;
import com.doupi.common.utils.DateUtils;
import com.doupi.common.utils.StringUtils;
import com.doupi.stock.domain.StockGoods;
import com.doupi.stock.domain.StockIn;
import com.doupi.stock.domain.StockInItem;
import com.doupi.stock.mapper.StockGoodsMapper;
import com.doupi.stock.mapper.StockInItemMapper;
import com.doupi.stock.mapper.StockInMapper;
import com.doupi.stock.service.IStockSeqService;
import com.doupi.stock.service.IStockInService;

/**
 * 入库单Service业务层处理
 * 
 * @author doupi
 * @date 2026-09-25
 */
@Service
public class StockInServiceImpl implements IStockInService 
{
    @Autowired
    private StockInMapper stockInMapper;

    @Autowired
    private StockInItemMapper stockInItemMapper;

    @Autowired
    private StockGoodsMapper stockGoodsMapper;

    @Autowired
    private IStockSeqService stockSeqService;

    /**
     * 查询入库单（含明细）
     * 
     * @param inId 入库单主键
     * @return 入库单
     */
    @Override
    public StockIn selectEduStockInByInId(Long inId)
    {
        StockIn stockIn = stockInMapper.selectEduStockInByInId(inId);
        if (stockIn != null)
        {
            List<StockInItem> items = stockInItemMapper.selectItemsByInId(inId);
            stockIn.setItemList(items);
            BigDecimal total = BigDecimal.ZERO;
            if (items != null)
            {
                for (StockInItem item : items)
                {
                    if (item.getAmount() != null)
                    {
                        total = total.add(item.getAmount());
                    }
                }
            }
            stockIn.setTotalAmount(total);
        }
        return stockIn;
    }

    /**
     * 查询入库单列表
     * 
     * @param stockIn 入库单
     * @return 入库单
     */
    @Override
    public List<StockIn> selectEduStockInList(StockIn stockIn)
    {
        return stockInMapper.selectEduStockInList(stockIn);
    }

    /**
     * 新增入库单（事务控制，联动累加物品库存）
     * 
     * @param stockIn 入库单
     * @return 结果
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int insertEduStockIn(StockIn stockIn)
    {
        List<StockInItem> items = stockIn.getItemList();
        if (items == null || items.isEmpty())
        {
            throw new ServiceException("入库明细列表不能为空！");
        }
        if ("1".equals(stockIn.getInType()) && stockIn.getSupplierId() == null)
        {
            throw new ServiceException("采购入库类型必须选择供应商！");
        }
        for (StockInItem item : items)
        {
            if (item.getGoodsId() == null)
            {
                throw new ServiceException("入库明细中必须选择物品！");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0)
            {
                throw new ServiceException("入库明细数量必须大于0！");
            }
            if (item.getPrice() != null)
            {
                item.setAmount(item.getPrice().multiply(new BigDecimal(item.getQuantity())));
            }
            else
            {
                item.setAmount(BigDecimal.ZERO);
            }
        }

        // 生成自动流水单号 RK + yyyyMMdd + 3位流水号
        String inNo = stockSeqService.generateNo("RK");
        stockIn.setInNo(inNo);
        stockIn.setStatus("1"); // 1-正常
        stockIn.setDelFlag("0");
        if (stockIn.getInTime() == null)
        {
            stockIn.setInTime(DateUtils.getNowDate());
        }
        if (StringUtils.isEmpty(stockIn.getOperator()))
        {
            stockIn.setOperator(StringUtils.isNotEmpty(stockIn.getCreateBy()) ? stockIn.getCreateBy() : "管理员");
        }
        stockIn.setCreateTime(DateUtils.getNowDate());

        int rows = stockInMapper.insertEduStockIn(stockIn);

        // 保存明细并累加对应物品库存
        for (StockInItem item : items)
        {
            item.setInId(stockIn.getInId());
            item.setCreateTime(DateUtils.getNowDate());
            stockGoodsMapper.addStock(item.getGoodsId(), item.getQuantity());
        }
        stockInItemMapper.batchInsertStockInItems(items);

        return rows;
    }

    /**
     * 修改入库单
     * 
     * @param stockIn 入库单
     * @return 结果
     */
    @Override
    public int updateEduStockIn(StockIn stockIn)
    {
        stockIn.setUpdateTime(DateUtils.getNowDate());
        return stockInMapper.updateEduStockIn(stockIn);
    }

    /**
     * 作废入库单（强制事务，扣减回退对应物品库存）
     * 
     * @param inId 入库单主键
     * @return 结果
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int cancelEduStockIn(Long inId)
    {
        StockIn stockIn = stockInMapper.selectEduStockInByInId(inId);
        if (stockIn == null)
        {
            throw new ServiceException("入库单不存在！");
        }
        if ("2".equals(stockIn.getStatus()))
        {
            throw new ServiceException("该入库单已作废，请勿重复操作！");
        }
        List<StockInItem> items = stockInItemMapper.selectItemsByInId(inId);
        if (items != null)
        {
            for (StockInItem item : items)
            {
                StockGoods goods = stockGoodsMapper.selectEduGoodsByGoodsId(item.getGoodsId());
                if (goods == null)
                {
                    throw new ServiceException("物品数据不存在，无法作废！");
                }
                if (goods.getStockNum() == null || goods.getStockNum() < item.getQuantity())
                {
                    throw new ServiceException("物品【" + goods.getGoodsName() + "】当前库存为 " + goods.getStockNum()
                            + "，低于入库数量 " + item.getQuantity() + "，无法回退扣减库存，作废失败！");
                }
                int updateRows = stockGoodsMapper.deductStock(item.getGoodsId(), item.getQuantity());
                if (updateRows == 0)
                {
                    throw new ServiceException("物品【" + goods.getGoodsName() + "】扣减库存失败！");
                }
            }
        }
        StockIn updateObj = new StockIn();
        updateObj.setInId(inId);
        updateObj.setStatus("2"); // 2-已作废
        updateObj.setUpdateTime(DateUtils.getNowDate());
        return stockInMapper.updateEduStockIn(updateObj);
    }

    /**
     * 批量删除入库单
     * 
     * @param inIds 需要删除的入库单主键
     * @return 结果
     */
    @Override
    public int deleteEduStockInByInIds(Long[] inIds)
    {
        return stockInMapper.deleteEduStockInByInIds(inIds);
    }

    /**
     * 删除入库单信息
     * 
     * @param inId 入库单主键
     * @return 结果
     */
    @Override
    public int deleteEduStockInByInId(Long inId)
    {
        return stockInMapper.deleteEduStockInByInId(inId);
    }
}
