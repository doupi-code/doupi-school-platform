package com.doupi.stock.mapper;

import java.util.List;
import com.doupi.stock.domain.StockSupplier;

/**
 * 供应商Mapper接口
 * 
 * @author doupi
 * @date 2026-09-25
 */
public interface StockSupplierMapper 
{
    /**
     * 查询供应商
     * 
     * @param supplierId 供应商主键
     * @return 供应商
     */
    public StockSupplier selectEduSupplierBySupplierId(Long supplierId);

    /**
     * 查询供应商列表
     * 
     * @param stockSupplier 供应商
     * @return 供应商集合
     */
    public List<StockSupplier> selectEduSupplierList(StockSupplier stockSupplier);

    /**
     * 新增供应商
     * 
     * @param stockSupplier 供应商
     * @return 结果
     */
    public int insertEduSupplier(StockSupplier stockSupplier);

    /**
     * 修改供应商
     * 
     * @param stockSupplier 供应商
     * @return 结果
     */
    public int updateEduSupplier(StockSupplier stockSupplier);

    /**
     * 删除供应商
     * 
     * @param supplierId 供应商主键
     * @return 结果
     */
    public int deleteEduSupplierBySupplierId(Long supplierId);

    /**
     * 批量删除供应商
     * 
     * @param supplierIds 需要删除的数据主键集合
     * @return 结果
     */
    public int deleteEduSupplierBySupplierIds(Long[] supplierIds);
}
