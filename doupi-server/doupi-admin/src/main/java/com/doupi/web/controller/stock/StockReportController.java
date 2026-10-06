package com.doupi.web.controller.stock;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.core.page.TableDataInfo;
import com.doupi.common.enums.BusinessType;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.stock.domain.vo.StockDashboardVo;
import com.doupi.stock.domain.vo.StockMonthlyReportVo;
import com.doupi.stock.domain.vo.StockDetailVo;
import com.doupi.stock.service.IStockReportService;

/**
 * 统计报表Controller
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
@RestController
@RequestMapping({"/stock/report", "/edu/report"})
public class StockReportController extends BaseController
{
    @Autowired
    private IStockReportService stockReportService;

    /**
     * 获取首页数据看板统计
     */
    @GetMapping("/dashboard")
    public AjaxResult getDashboard()
    {
        StockDashboardVo data = stockReportService.getDashboardData();
        return success(data);
    }

    /**
     * 查询出入库明细报表列表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:report:detail,edu:report:detail')")
    @GetMapping("/detail")
    public TableDataInfo detailList(@RequestParam(value = "docType", required = false) String docType,
                                    @RequestParam(value = "category", required = false) String category,
                                    @RequestParam(value = "goodsName", required = false) String goodsName,
                                    @RequestParam(value = "operator", required = false) String operator,
                                    @RequestParam(value = "beginTime", required = false) String beginTime,
                                    @RequestParam(value = "endTime", required = false) String endTime)
    {
        Map<String, Object> params = new HashMap<>();
        params.put("docType", docType);
        params.put("category", category);
        params.put("goodsName", goodsName);
        params.put("operator", operator);
        
        Map<String, Object> dateParams = new HashMap<>();
        dateParams.put("beginTime", beginTime);
        dateParams.put("endTime", endTime);
        params.put("params", dateParams);

        startPage();
        List<StockDetailVo> list = stockReportService.selectStockDetailList(params);
        return getDataTable(list);
    }

    /**
     * 导出出入库明细报表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:report:detail,edu:report:detail')")
    @Log(title = "出入库明细报表", businessType = BusinessType.EXPORT)
    @PostMapping("/detail/export")
    public void exportDetail(HttpServletResponse response,
                             @RequestParam(value = "docType", required = false) String docType,
                             @RequestParam(value = "category", required = false) String category,
                             @RequestParam(value = "goodsName", required = false) String goodsName,
                             @RequestParam(value = "operator", required = false) String operator,
                             @RequestParam(value = "beginTime", required = false) String beginTime,
                             @RequestParam(value = "endTime", required = false) String endTime)
    {
        Map<String, Object> params = new HashMap<>();
        params.put("docType", docType);
        params.put("category", category);
        params.put("goodsName", goodsName);
        params.put("operator", operator);

        Map<String, Object> dateParams = new HashMap<>();
        dateParams.put("beginTime", beginTime);
        dateParams.put("endTime", endTime);
        params.put("params", dateParams);

        List<StockDetailVo> list = stockReportService.selectStockDetailList(params);
        ExcelUtil<StockDetailVo> util = new ExcelUtil<>(StockDetailVo.class);
        util.exportExcel(response, list, "出入库明细报表");
    }

    /**
     * 查询月度统计报表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:report:monthly,edu:report:monthly')")
    @GetMapping("/monthly")
    public AjaxResult monthlyList(@RequestParam(value = "year", required = false) String year)
    {
        List<StockMonthlyReportVo> list = stockReportService.selectMonthlyReportList(year);
        return success(list);
    }

    /**
     * 导出月度统计报表
     */
    @PreAuthorize("@ss.hasAnyPermi('stock:report:monthly,edu:report:monthly')")
    @Log(title = "月度统计报表", businessType = BusinessType.EXPORT)
    @PostMapping("/monthly/export")
    public void exportMonthly(HttpServletResponse response,
                              @RequestParam(value = "year", required = false) String year)
    {
        List<StockMonthlyReportVo> list = stockReportService.selectMonthlyReportList(year);
        ExcelUtil<StockMonthlyReportVo> util = new ExcelUtil<>(StockMonthlyReportVo.class);
        util.exportExcel(response, list, "月度出入库统计报表");
    }
}
