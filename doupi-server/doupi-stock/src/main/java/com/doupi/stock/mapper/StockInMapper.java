package com.doupi.stock.mapper;

import java.util.List;
import com.doupi.stock.domain.StockIn;

/**
 * 入库单Mapper接口
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
public interface StockInMapper 
{
    /**
     * 查询入库单
     * 
     * @param inId 入库单主键
     * @return 入库单
     */
    public StockIn selectEduStockInByInId(Long inId);

    /**
     * 查询入库单列表
     * 
     * @param stockIn 入库单
     * @return 入库单集合
     */
    public List<StockIn> selectEduStockInList(StockIn stockIn);

    /**
     * 新增入库单
     * 
     * @param stockIn 入库单
     * @return 结果
     */
    public int insertEduStockIn(StockIn stockIn);

    /**
     * 修改入库单
     * 
     * @param stockIn 入库单
     * @return 结果
     */
    public int updateEduStockIn(StockIn stockIn);

    /**
     * 删除入库单
     * 
     * @param inId 入库单主键
     * @return 结果
     */
    public int deleteEduStockInByInId(Long inId);

    /**
     * 批量删除入库单
     * 
     * @param inIds 需要删除的数据主键集合
     * @return 结果
     */
    public int deleteEduStockInByInIds(Long[] inIds);

    /**
     * 查询指定前缀下的最大入库单号
     * 
     * @param prefix 单号前缀
     * @return 最大单号
     */
    public String selectMaxInNo(String prefix);
}
