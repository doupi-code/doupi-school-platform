package com.doupi.stock.service.impl;

import java.util.List;
import com.doupi.common.utils.DateUtils;
import com.doupi.common.utils.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.stock.mapper.StockGoodsMapper;
import com.doupi.stock.domain.StockGoods;
import com.doupi.stock.service.IStockGoodsService;

/**
 * 物品档案Service业务层处理
 * 
 * @author doupi
 * @date 2026-09-25
 */
@Service
public class StockGoodsServiceImpl implements IStockGoodsService 
{
    @Autowired
    private StockGoodsMapper stockGoodsMapper;

    /**
     * 查询物品档案
     * 
     * @param goodsId 物品档案主键
     * @return 物品档案
     */
    @Override
    public StockGoods selectEduGoodsByGoodsId(Long goodsId)
    {
        return stockGoodsMapper.selectEduGoodsByGoodsId(goodsId);
    }

    /**
     * 查询物品档案列表
     * 
     * @param stockGoods 物品档案
     * @return 物品档案
     */
    @Override
    public List<StockGoods> selectEduGoodsList(StockGoods stockGoods)
    {
        return stockGoodsMapper.selectEduGoodsList(stockGoods);
    }

    /**
     * 新增物品档案
     * 
     * @param stockGoods 物品档案
     * @return 结果
     */
     @Override
    public int insertEduGoods(StockGoods stockGoods)
    {
        if ("2".equals(stockGoods.getCategory()) && (stockGoods.getGrade() == null || stockGoods.getGrade().trim().isEmpty()))
        {
            throw new com.doupi.common.exception.ServiceException("学生教材类物品必须选择适用年级！");
        }
        stockGoods.setStockNum(0L);
        stockGoods.setDelFlag("0");
        stockGoods.setCreateTime(DateUtils.getNowDate());
        return stockGoodsMapper.insertEduGoods(stockGoods);
    }

    /**
     * 修改物品档案
     * 
     * @param stockGoods 物品档案
     * @return 结果
     */
    @Override
    public int updateEduGoods(StockGoods stockGoods)
    {
        if ("2".equals(stockGoods.getCategory()) && (stockGoods.getGrade() == null || stockGoods.getGrade().trim().isEmpty()))
        {
            throw new com.doupi.common.exception.ServiceException("学生教材类物品必须选择适用年级！");
        }

        StockGoods oldGoods = stockGoodsMapper.selectEduGoodsByGoodsId(stockGoods.getGoodsId());
        if (oldGoods == null)
        {
            throw new com.doupi.common.exception.ServiceException("待修改的物资档案不存在！");
        }

        Integer oldRate = oldGoods.getConversionRate() != null && oldGoods.getConversionRate() > 0 ? oldGoods.getConversionRate() : 500;
        Integer newRate = stockGoods.getConversionRate() != null && stockGoods.getConversionRate() > 0 ? stockGoods.getConversionRate() : oldRate;
        stockGoods.setConversionRate(newRate);

        if (StringUtils.isEmpty(stockGoods.getBaseUnit()))
        {
            stockGoods.setBaseUnit(StringUtils.isNotEmpty(oldGoods.getBaseUnit()) ? oldGoods.getBaseUnit() : "张");
        }

        // 默认重算模式为模式 A（实物包装数保持不变）
        String mode = stockGoods.getRecalcMode();
        if (StringUtils.isEmpty(mode))
        {
            mode = "A";
        }

        // 库存数必须由出入库单唯一变更，物资档案编辑一律忽略前端传入的库存字段，
        // 始终以数据库当前值为准（仅当换算率变化时按所选模式重算）。
        Long curStockNum = oldGoods.getStockNum() != null ? oldGoods.getStockNum() : 0L;
        Integer curRemainSheets = oldGoods.getRemainSheets() != null ? oldGoods.getRemainSheets() : 0;

        // 当换算率发生变化时执行重算
        if (!oldRate.equals(newRate))
        {
            if ("B".equalsIgnoreCase(mode))
            {
                // 模式 B：纸张实际总张数不变，重算折合包装数（包数折半）
                long oldStock = oldGoods.getStockNum() != null ? oldGoods.getStockNum() : 0L;
                int oldRemain = oldGoods.getRemainSheets() != null ? oldGoods.getRemainSheets() : 0;
                long oldTotalSheets = oldStock * oldRate + oldRemain;

                long newStock = oldTotalSheets / newRate;
                int newRemain = (int) (oldTotalSheets % newRate);

                stockGoods.setStockNum(newStock);
                stockGoods.setRemainSheets(newRemain);
            }
            else
            {
                // 模式 A（默认）：实物包装数保持不变，重算折合总张数
                stockGoods.setStockNum(curStockNum);
                stockGoods.setRemainSheets(curRemainSheets);
            }
        }
        else
        {
            stockGoods.setStockNum(curStockNum);
            stockGoods.setRemainSheets(curRemainSheets);
        }

        stockGoods.setUpdateTime(DateUtils.getNowDate());
        return stockGoodsMapper.updateEduGoods(stockGoods);
    }

    /**
     * 批量删除物品档案
     * 
     * @param goodsIds 需要删除的物品档案主键
     * @return 结果
     */
    @Override
    public int deleteEduGoodsByGoodsIds(Long[] goodsIds)
    {
        for (Long goodsId : goodsIds)
        {
            StockGoods goods = stockGoodsMapper.selectEduGoodsByGoodsId(goodsId);
            if (goods != null && goods.getStockNum() != null && goods.getStockNum() > 0)
            {
                throw new com.doupi.common.exception.ServiceException("物品【" + goods.getGoodsName() + "】当前库存为 " + goods.getStockNum() + "，必须为0才可删除！");
            }
        }
        return stockGoodsMapper.deleteEduGoodsByGoodsIds(goodsIds);
    }

    /**
     * 删除物品档案信息
     * 
     * @param goodsId 物品档案主键
     * @return 结果
     */
    @Override
    public int deleteEduGoodsByGoodsId(Long goodsId)
    {
        StockGoods goods = stockGoodsMapper.selectEduGoodsByGoodsId(goodsId);
        if (goods != null && goods.getStockNum() != null && goods.getStockNum() > 0)
        {
            throw new com.doupi.common.exception.ServiceException("物品【" + goods.getGoodsName() + "】当前库存为 " + goods.getStockNum() + "，必须为0才可删除！");
        }
        return stockGoodsMapper.deleteEduGoodsByGoodsId(goodsId);
    }
}
