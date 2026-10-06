package com.doupi.stock.mapper;

import java.util.List;
import com.doupi.stock.domain.StockGoods;

/**
 * 物品档案Mapper接口
 * 
 * @author doupi
 * @date 2026-09-25
 */
public interface StockGoodsMapper 
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
     * 删除物品档案
     * 
     * @param goodsId 物品档案主键
     * @return 结果
     */
    public int deleteEduGoodsByGoodsId(Long goodsId);

    /**
     * 批量删除物品档案
     * 
     * @param goodsIds 需要删除的数据主键集合
     * @return 结果
     */
    public int deleteEduGoodsByGoodsIds(Long[] goodsIds);

    /**
     * 增加库存
     */
    public int addStock(@org.apache.ibatis.annotations.Param("goodsId") Long goodsId, @org.apache.ibatis.annotations.Param("num") Long num);

    /**
     * 扣减库存（库存不足扣减失败返回0）
     */
    public int deductStock(@org.apache.ibatis.annotations.Param("goodsId") Long goodsId, @org.apache.ibatis.annotations.Param("num") Long num);

    /**
     * 盘点直接设置库存
     */
    public int updateStockNum(@org.apache.ibatis.annotations.Param("goodsId") Long goodsId, @org.apache.ibatis.annotations.Param("stockNum") Long stockNum);
}
