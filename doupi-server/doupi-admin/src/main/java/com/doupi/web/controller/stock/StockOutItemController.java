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
import com.doupi.stock.domain.StockOutItem;
import com.doupi.stock.service.IStockOutItemService;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.common.core.page.TableDataInfo;

/**
 * 出库单明细Controller
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
@RestController
@RequestMapping({"/stock/outItem", "/edu/outItem"})
public class StockOutItemController extends BaseController
{
    @Autowired
    private IStockOutItemService stockOutItemService;

    /**
     * 查询出库单明细列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:outItem:list,edu:outItem:list')")
    @GetMapping("/list")
    public TableDataInfo list(StockOutItem stockOutItem)
    {
        startPage();
        List<StockOutItem> list = stockOutItemService.selectEduStockOutItemList(stockOutItem);
        return getDataTable(list);
    }

    /**
     * 导出出库单明细列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:outItem:export,edu:outItem:export')")
    @Log(title = "出库单明细", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, StockOutItem stockOutItem)
    {
        List<StockOutItem> list = stockOutItemService.selectEduStockOutItemList(stockOutItem);
        ExcelUtil<StockOutItem> util = new ExcelUtil<StockOutItem>(StockOutItem.class);
        util.exportExcel(response, list, "出库单明细数据");
    }

    /**
     * 获取出库单明细详细信息
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:outItem:query,edu:outItem:query')")
    @GetMapping(value = "/{itemId}")
    public AjaxResult getInfo(@PathVariable("itemId") Long itemId)
    {
        return success(stockOutItemService.selectEduStockOutItemByItemId(itemId));
    }

    /**
     * 新增出库单明细
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:outItem:add,edu:outItem:add')")
    @Log(title = "出库单明细", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody StockOutItem stockOutItem)
    {
        return toAjax(stockOutItemService.insertEduStockOutItem(stockOutItem));
    }

    /**
     * 修改出库单明细
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:outItem:edit,edu:outItem:edit')")
    @Log(title = "出库单明细", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody StockOutItem stockOutItem)
    {
        return toAjax(stockOutItemService.updateEduStockOutItem(stockOutItem));
    }

    /**
     * 删除出库单明细
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:outItem:remove,edu:outItem:remove')")
    @Log(title = "出库单明细", businessType = BusinessType.DELETE)
	@DeleteMapping("/{itemIds}")
    public AjaxResult remove(@PathVariable Long[] itemIds)
    {
        return toAjax(stockOutItemService.deleteEduStockOutItemByItemIds(itemIds));
    }
}
