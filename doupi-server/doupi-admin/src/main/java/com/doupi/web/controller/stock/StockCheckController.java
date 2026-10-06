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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.enums.BusinessType;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.common.core.page.TableDataInfo;
import com.doupi.stock.domain.StockCheck;
import com.doupi.stock.domain.StockCheckItem;
import com.doupi.stock.service.IStockCheckService;

/**
 * 库存盘点Controller
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
@RestController
@RequestMapping({"/stock/check", "/edu/check"})
public class StockCheckController extends BaseController
{
    @Autowired
    private IStockCheckService stockCheckService;

    /**
     * 查询库存盘点列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:check:list,edu:check:list')")
    @GetMapping("/list")
    public TableDataInfo list(StockCheck stockCheck)
    {
        startPage();
        List<StockCheck> list = stockCheckService.selectEduStockCheckList(stockCheck);
        return getDataTable(list);
    }

    /**
     * 导出库存盘点列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:check:export,edu:check:export')")
    @Log(title = "库存盘点", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, StockCheck stockCheck)
    {
        List<StockCheck> list = stockCheckService.selectEduStockCheckList(stockCheck);
        ExcelUtil<StockCheck> util = new ExcelUtil<StockCheck>(StockCheck.class);
        util.exportExcel(response, list, "库存盘点数据");
    }

    /**
     * 获取库存盘点详细信息
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:check:query,edu:check:query')")
    @GetMapping(value = "/{checkId}")
    public AjaxResult getInfo(@PathVariable("checkId") Long checkId)
    {
        return success(stockCheckService.selectEduStockCheckByCheckId(checkId));
    }

    /**
     * 获取盘点预载明细（账面库存）
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:check:add,edu:check:add')")
    @GetMapping("/prepare-items")
    public AjaxResult prepareItems(@RequestParam("checkType") String checkType,
                                   @RequestParam(value = "category", required = false) String category)
    {
        List<StockCheckItem> items = stockCheckService.prepareCheckItems(checkType, category);
        return success(items);
    }

    /**
     * 新增库存盘点
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:check:add,edu:check:add')")
    @Log(title = "库存盘点", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody StockCheck stockCheck)
    {
        if (stockCheck.getOperator() == null || stockCheck.getOperator().trim().isEmpty())
        {
            stockCheck.setOperator(getUsername());
        }
        return toAjax(stockCheckService.insertEduStockCheck(stockCheck));
    }

    /**
     * 修改库存盘点
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:check:edit,edu:check:edit')")
    @Log(title = "库存盘点", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody StockCheck stockCheck)
    {
        return toAjax(stockCheckService.updateEduStockCheck(stockCheck));
    }

    /**
     * 审核库存盘点（调整实际库存）
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:check:audit,edu:check:audit')")
    @Log(title = "审核库存盘点", businessType = BusinessType.UPDATE)
    @PutMapping("/audit/{checkId}")
    public AjaxResult audit(@PathVariable Long checkId)
    {
        return toAjax(stockCheckService.auditEduStockCheck(checkId));
    }

    /**
     * 作废库存盘点
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:check:cancel,edu:check:cancel')")
    @Log(title = "作废库存盘点", businessType = BusinessType.UPDATE)
    @PutMapping("/cancel/{checkId}")
    public AjaxResult cancel(@PathVariable Long checkId)
    {
        return toAjax(stockCheckService.cancelEduStockCheck(checkId));
    }

    /**
     * 删除库存盘点
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:check:remove,edu:check:remove')")
    @Log(title = "库存盘点", businessType = BusinessType.DELETE)
    @DeleteMapping("/{checkIds}")
    public AjaxResult remove(@PathVariable Long[] checkIds)
    {
        return toAjax(stockCheckService.deleteEduStockCheckByCheckIds(checkIds));
    }
}
