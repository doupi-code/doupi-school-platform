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
import com.doupi.stock.domain.StockGoods;
import com.doupi.stock.service.IStockGoodsService;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.common.core.page.TableDataInfo;

/**
 * 物品档案Controller
 * 
 * @author doupi
 * @date 2026-09-25
 */
@RestController
@RequestMapping({"/stock/goods", "/edu/goods"})
public class StockGoodsController extends BaseController
{
    @Autowired
    private IStockGoodsService stockGoodsService;

    /**
     * 查询物品档案列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:goods:list,edu:goods:list')")
    @GetMapping("/list")
    public TableDataInfo list(StockGoods stockGoods)
    {
        startPage();
        List<StockGoods> list = stockGoodsService.selectEduGoodsList(stockGoods);
        return getDataTable(list);
    }

    /**
     * 导出物品档案列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:goods:export,edu:goods:export')")
    @Log(title = "物品档案", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, StockGoods stockGoods)
    {
        List<StockGoods> list = stockGoodsService.selectEduGoodsList(stockGoods);
        ExcelUtil<StockGoods> util = new ExcelUtil<StockGoods>(StockGoods.class);
        util.exportExcel(response, list, "物品档案数据");
    }

    /**
     * 获取物品档案详细信息
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:goods:query,edu:goods:query')")
    @GetMapping(value = "/{goodsId}")
    public AjaxResult getInfo(@PathVariable("goodsId") Long goodsId)
    {
        return success(stockGoodsService.selectEduGoodsByGoodsId(goodsId));
    }

    /**
     * 新增物品档案
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:goods:add,edu:goods:add')")
    @Log(title = "物品档案", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody StockGoods stockGoods)
    {
        return toAjax(stockGoodsService.insertEduGoods(stockGoods));
    }

    /**
     * 修改物品档案
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:goods:edit,edu:goods:edit')")
    @Log(title = "物品档案", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody StockGoods stockGoods)
    {
        return toAjax(stockGoodsService.updateEduGoods(stockGoods));
    }

    /**
     * 删除物品档案
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:goods:remove,edu:goods:remove')")
    @Log(title = "物品档案", businessType = BusinessType.DELETE)
	@DeleteMapping("/{goodsIds}")
    public AjaxResult remove(@PathVariable Long[] goodsIds)
    {
        return toAjax(stockGoodsService.deleteEduGoodsByGoodsIds(goodsIds));
    }
}
