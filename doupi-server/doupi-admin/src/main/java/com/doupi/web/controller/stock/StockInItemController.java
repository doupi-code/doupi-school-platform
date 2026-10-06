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
import com.doupi.stock.domain.StockInItem;
import com.doupi.stock.service.IStockInItemService;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.common.core.page.TableDataInfo;

/**
 * 入库单明细Controller
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
@RestController
@RequestMapping({"/stock/inItem", "/edu/inItem"})
public class StockInItemController extends BaseController
{
    @Autowired
    private IStockInItemService stockInItemService;

    /**
     * 查询入库单明细列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:inItem:list,edu:inItem:list')")
    @GetMapping("/list")
    public TableDataInfo list(StockInItem stockInItem)
    {
        startPage();
        List<StockInItem> list = stockInItemService.selectEduStockInItemList(stockInItem);
        return getDataTable(list);
    }

    /**
     * 导出入库单明细列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:inItem:export,edu:inItem:export')")
    @Log(title = "入库单明细", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, StockInItem stockInItem)
    {
        List<StockInItem> list = stockInItemService.selectEduStockInItemList(stockInItem);
        ExcelUtil<StockInItem> util = new ExcelUtil<StockInItem>(StockInItem.class);
        util.exportExcel(response, list, "入库单明细数据");
    }

    /**
     * 获取入库单明细详细信息
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:inItem:query,edu:inItem:query')")
    @GetMapping(value = "/{itemId}")
    public AjaxResult getInfo(@PathVariable("itemId") Long itemId)
    {
        return success(stockInItemService.selectEduStockInItemByItemId(itemId));
    }

    /**
     * 新增入库单明细
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:inItem:add,edu:inItem:add')")
    @Log(title = "入库单明细", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody StockInItem stockInItem)
    {
        return toAjax(stockInItemService.insertEduStockInItem(stockInItem));
    }

    /**
     * 修改入库单明细
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:inItem:edit,edu:inItem:edit')")
    @Log(title = "入库单明细", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody StockInItem stockInItem)
    {
        return toAjax(stockInItemService.updateEduStockInItem(stockInItem));
    }

    /**
     * 删除入库单明细
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:inItem:remove,edu:inItem:remove')")
    @Log(title = "入库单明细", businessType = BusinessType.DELETE)
	@DeleteMapping("/{itemIds}")
    public AjaxResult remove(@PathVariable Long[] itemIds)
    {
        return toAjax(stockInItemService.deleteEduStockInItemByItemIds(itemIds));
    }
}
