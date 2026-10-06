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
import com.doupi.stock.domain.StockOut;
import com.doupi.stock.service.IStockOutService;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.common.core.page.TableDataInfo;

/**
 * 出库单Controller
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
@RestController
@RequestMapping({"/stock/out", "/edu/out"})
public class StockOutController extends BaseController
{
    @Autowired
    private IStockOutService stockOutService;

    /**
     * 查询出库单列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:out:list,edu:out:list')")
    @GetMapping("/list")
    public TableDataInfo list(StockOut stockOut)
    {
        startPage();
        List<StockOut> list = stockOutService.selectEduStockOutList(stockOut);
        return getDataTable(list);
    }

    /**
     * 导出出库单列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:out:export,edu:out:export')")
    @Log(title = "出库单", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, StockOut stockOut)
    {
        List<StockOut> list = stockOutService.selectEduStockOutList(stockOut);
        ExcelUtil<StockOut> util = new ExcelUtil<StockOut>(StockOut.class);
        util.exportExcel(response, list, "出库单数据");
    }

    /**
     * 获取出库单详细信息
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:out:query,edu:out:query,edu:record:query')")
    @GetMapping(value = "/{outId}")
    public AjaxResult getInfo(@PathVariable("outId") Long outId)
    {
        return success(stockOutService.selectEduStockOutByOutId(outId));
    }

    /**
     * 新增出库单
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:out:add,edu:out:add')")
    @Log(title = "出库单", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody StockOut stockOut)
    {
        return toAjax(stockOutService.insertEduStockOut(stockOut));
    }

    /**
     * 修改出库单
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:out:edit,edu:out:edit')")
    @Log(title = "出库单", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody StockOut stockOut)
    {
        return toAjax(stockOutService.updateEduStockOut(stockOut));
    }

    /**
     * 作废出库单
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:out:edit,edu:out:edit')")
    @Log(title = "作废出库单", businessType = BusinessType.UPDATE)
    @PutMapping("/cancel/{outId}")
    public AjaxResult cancel(@PathVariable Long outId)
    {
        return toAjax(stockOutService.cancelEduStockOut(outId));
    }

    /**
     * 删除出库单
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:out:remove,edu:out:remove')")
    @Log(title = "出库单", businessType = BusinessType.DELETE)
	@DeleteMapping("/{outIds}")
    public AjaxResult remove(@PathVariable Long[] outIds)
    {
        return toAjax(stockOutService.deleteEduStockOutByOutIds(outIds));
    }
}
