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
import com.doupi.stock.domain.StockIn;
import com.doupi.stock.service.IStockInService;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.common.core.page.TableDataInfo;

/**
 * 入库单Controller
 * 
 * @author doupi
 * @date 2026-09-25
 */
@RestController
@RequestMapping({"/stock/in", "/edu/in"})
public class StockInController extends BaseController
{
    @Autowired
    private IStockInService stockInService;

    /**
     * 查询入库单列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:in:list,edu:in:list')")
    @GetMapping("/list")
    public TableDataInfo list(StockIn stockIn)
    {
        startPage();
        List<StockIn> list = stockInService.selectEduStockInList(stockIn);
        return getDataTable(list);
    }

    /**
     * 导出入库单列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:in:export,edu:in:export')")
    @Log(title = "入库单", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, StockIn stockIn)
    {
        List<StockIn> list = stockInService.selectEduStockInList(stockIn);
        ExcelUtil<StockIn> util = new ExcelUtil<StockIn>(StockIn.class);
        util.exportExcel(response, list, "入库单数据");
    }

    /**
     * 获取入库单详细信息
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:in:query,edu:in:query')")
    @GetMapping(value = "/{inId}")
    public AjaxResult getInfo(@PathVariable("inId") Long inId)
    {
        return success(stockInService.selectEduStockInByInId(inId));
    }

    /**
     * 新增入库单
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:in:add,edu:in:add')")
    @Log(title = "入库单", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody StockIn stockIn)
    {
        return toAjax(stockInService.insertEduStockIn(stockIn));
    }

    /**
     * 修改入库单
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:in:edit,edu:in:edit')")
    @Log(title = "入库单", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody StockIn stockIn)
    {
        return toAjax(stockInService.updateEduStockIn(stockIn));
    }

    /**
     * 作废入库单
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:in:edit,edu:in:edit')")
    @Log(title = "作废入库单", businessType = BusinessType.UPDATE)
    @PutMapping("/cancel/{inId}")
    public AjaxResult cancel(@PathVariable Long inId)
    {
        return toAjax(stockInService.cancelEduStockIn(inId));
    }

    /**
     * 删除入库单
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:in:remove,edu:in:remove')")
    @Log(title = "入库单", businessType = BusinessType.DELETE)
	@DeleteMapping("/{inIds}")
    public AjaxResult remove(@PathVariable Long[] inIds)
    {
        return toAjax(stockInService.deleteEduStockInByInIds(inIds));
    }
}
