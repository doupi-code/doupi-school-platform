package com.doupi.stock.service;

import java.util.List;
import com.doupi.stock.domain.StockGoods;

/**
 * 物品档案Service接口
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
public interface IStockGoodsService 
{
    /**
     * 查询物品档案
     * 
     * @param goodsId 物品档案主键
     * @return 物品档案
     */
    public StockGoods selectEduGoodsByGoodsId(Long goodsId);

    /**
     * 查询物品档案列表
     * 
     * @param stockGoods 物品档案
     * @return 物品档案集合
     */
    public List<StockGoods> selectEduGoodsList(StockGoods stockGoods);

    /**
     * 新增物品档案
     * 
     * @param stockGoods 物品档案
     * @return 结果
     */
    public int insertEduGoods(StockGoods stockGoods);

    /**
     * 修改物品档案
     * 
     * @param stockGoods 物品档案
     * @return 结果
     */
    public int updateEduGoods(StockGoods stockGoods);

    /**
     * 批量删除物品档案
     * 
     * @param goodsIds 需要删除的物品档案主键集合
     * @return 结果
     */
    public int deleteEduGoodsByGoodsIds(Long[] goodsIds);

    /**
     * 删除物品档案信息
     * 
     * @param goodsId 物品档案主键
     * @return 结果
     */
    public int deleteEduGoodsByGoodsId(Long goodsId);
}
