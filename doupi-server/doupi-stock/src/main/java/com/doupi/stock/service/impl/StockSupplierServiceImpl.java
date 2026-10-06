package com.doupi.stock.service.impl;

import java.util.List;
import com.doupi.common.utils.DateUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.stock.mapper.StockSupplierMapper;
import com.doupi.stock.domain.StockSupplier;
import com.doupi.stock.service.IStockSupplierService;

/**
 * 供应商Service业务层处理
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
@Service
public class StockSupplierServiceImpl implements IStockSupplierService 
{
    @Autowired
    private StockSupplierMapper stockSupplierMapper;

    /**
     * 查询供应商
     * 
     * @param supplierId 供应商主键
     * @return 供应商
     */
    @Override
    public StockSupplier selectEduSupplierBySupplierId(Long supplierId)
    {
        return stockSupplierMapper.selectEduSupplierBySupplierId(supplierId);
    }

    /**
     * 查询供应商列表
     * 
     * @param stockSupplier 供应商
     * @return 供应商
     */
    @Override
    public List<StockSupplier> selectEduSupplierList(StockSupplier stockSupplier)
    {
        return stockSupplierMapper.selectEduSupplierList(stockSupplier);
    }

    /**
     * 新增供应商
     * 
     * @param stockSupplier 供应商
     * @return 结果
     */
    @Override
    public int insertEduSupplier(StockSupplier stockSupplier)
    {
        checkSupplierNameUnique(stockSupplier);
        stockSupplier.setDelFlag("0");
        stockSupplier.setCreateTime(DateUtils.getNowDate());
        return stockSupplierMapper.insertEduSupplier(stockSupplier);
    }

    /**
     * 修改供应商
     * 
     * @param stockSupplier 供应商
     * @return 结果
     */
    @Override
    public int updateEduSupplier(StockSupplier stockSupplier)
    {
        checkSupplierNameUnique(stockSupplier);
        stockSupplier.setUpdateTime(DateUtils.getNowDate());
        return stockSupplierMapper.updateEduSupplier(stockSupplier);
    }

    private void checkSupplierNameUnique(StockSupplier stockSupplier)
    {
        StockSupplier query = new StockSupplier();
        query.setSupplierName(stockSupplier.getSupplierName());
        List<StockSupplier> list = stockSupplierMapper.selectEduSupplierList(query);
        for (StockSupplier item : list)
        {
            if (stockSupplier.getSupplierId() == null || !item.getSupplierId().equals(stockSupplier.getSupplierId()))
            {
                throw new com.doupi.common.exception.ServiceException("供应商名称【" + stockSupplier.getSupplierName() + "】已存在！");
            }
        }
    }

    /**
     * 批量删除供应商
     * 
     * @param supplierIds 需要删除的供应商主键
     * @return 结果
     */
    @Override
    public int deleteEduSupplierBySupplierIds(Long[] supplierIds)
    {
        return stockSupplierMapper.deleteEduSupplierBySupplierIds(supplierIds);
    }

    /**
     * 删除供应商信息
     * 
     * @param supplierId 供应商主键
     * @return 结果
     */
    @Override
    public int deleteEduSupplierBySupplierId(Long supplierId)
    {
        return stockSupplierMapper.deleteEduSupplierBySupplierId(supplierId);
    }
}
