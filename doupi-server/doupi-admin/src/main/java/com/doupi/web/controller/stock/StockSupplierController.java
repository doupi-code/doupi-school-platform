package com.doupi.web.controller.stock;

import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.enums.BusinessType;
import com.doupi.stock.domain.StockSupplier;
import com.doupi.stock.service.IStockSupplierService;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.common.core.page.TableDataInfo;

/**
 * 供应商Controller
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
@RestController
@RequestMapping({"/stock/supplier", "/edu/supplier"})
public class StockSupplierController extends BaseController
{
    @Autowired
    private IStockSupplierService stockSupplierService;

    /**
     * 查询供应商列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:supplier:list,edu:supplier:list')")
    @GetMapping("/list")
    public TableDataInfo list(StockSupplier stockSupplier)
    {
        startPage();
        List<StockSupplier> list = stockSupplierService.selectEduSupplierList(stockSupplier);
        return getDataTable(list);
    }

    /**
     * 导出供应商列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:supplier:export,edu:supplier:export')")
    @Log(title = "供应商", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, StockSupplier stockSupplier)
    {
        List<StockSupplier> list = stockSupplierService.selectEduSupplierList(stockSupplier);
        ExcelUtil<StockSupplier> util = new ExcelUtil<StockSupplier>(StockSupplier.class);
        util.exportExcel(response, list, "供应商数据");
    }

    /**
     * 获取供应商详细信息
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:supplier:query,edu:supplier:query')")
    @GetMapping(value = "/{supplierId}")
    public AjaxResult getInfo(@PathVariable("supplierId") Long supplierId)
    {
        return success(stockSupplierService.selectEduSupplierBySupplierId(supplierId));
    }

    /**
     * 新增供应商
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:supplier:add,edu:supplier:add')")
    @Log(title = "供应商", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody StockSupplier stockSupplier)
    {
        return toAjax(stockSupplierService.insertEduSupplier(stockSupplier));
    }

    /**
     * 修改供应商
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:supplier:edit,edu:supplier:edit')")
    @Log(title = "供应商", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody StockSupplier stockSupplier)
    {
        return toAjax(stockSupplierService.updateEduSupplier(stockSupplier));
    }

    /**
     * 删除供应商
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:supplier:remove,edu:supplier:remove')")
    @Log(title = "供应商", businessType = BusinessType.DELETE)
	@DeleteMapping("/{supplierIds}")
    public AjaxResult remove(@PathVariable Long[] supplierIds)
    {
        return toAjax(stockSupplierService.deleteEduSupplierBySupplierIds(supplierIds));
    }
}
