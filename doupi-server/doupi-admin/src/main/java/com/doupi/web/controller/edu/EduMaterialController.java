package com.doupi.web.controller.edu;

import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.core.page.TableDataInfo;
import com.doupi.common.enums.BusinessType;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.edu.domain.EduMaterialRecord;
import com.doupi.edu.service.IEduMaterialRecordService;

/**
 * 教务日常物资领退工作台Controller
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/edu/material")
public class EduMaterialController extends BaseController
{
    @Autowired
    private IEduMaterialRecordService eduMaterialRecordService;

    /**
     * 查询教务日常领退流水列表
     */
    @PreAuthorize("@ss.hasPermi('edu:material:list')")
    @GetMapping("/list")
    public TableDataInfo list(EduMaterialRecord record)
    {
        startPage();
        List<EduMaterialRecord> list = eduMaterialRecordService.selectEduMaterialRecordList(record);
        return getDataTable(list);
    }

    /**
     * 获取领退记录详细信息（含明细物品）
     */
    @PreAuthorize("@ss.hasPermi('edu:material:query')")
    @GetMapping(value = "/{recordId}")
    public AjaxResult getInfo(@PathVariable("recordId") Long recordId)
    {
        return success(eduMaterialRecordService.selectEduMaterialRecordById(recordId));
    }

    /**
     * 教务物资发放登记（教师办公品/日常零星文具/学生发书，严格事务扣减库存，生成流水）
     */
    @PreAuthorize("@ss.hasPermi('edu:material:grant')")
    @Log(title = "教务物资发放", businessType = BusinessType.INSERT)
    @PostMapping("/grant")
    public AjaxResult grant(@RequestBody EduMaterialRecord record)
    {
        record.setCreateBy(getUsername());
        return toAjax(eduMaterialRecordService.grantMaterial(record));
    }

    /**
     * 教务物资退还回收登记（离职收回/退学退书，完好品自动累加库存）
     */
    @PreAuthorize("@ss.hasPermi('edu:material:recovery')")
    @Log(title = "教务物资回收", businessType = BusinessType.INSERT)
    @PostMapping("/recovery")
    public AjaxResult recovery(@RequestBody EduMaterialRecord record)
    {
        record.setCreateBy(getUsername());
        return toAjax(eduMaterialRecordService.returnMaterial(record));
    }

    /**
     * 撤销领退单（自动回滚库存）
     */
    @PreAuthorize("@ss.hasPermi('edu:material:edit')")
    @Log(title = "撤销领退单", businessType = BusinessType.UPDATE)
    @PutMapping("/cancel/{recordId}")
    public AjaxResult cancel(@PathVariable("recordId") Long recordId)
    {
        return toAjax(eduMaterialRecordService.cancelRecord(recordId));
    }

    /**
     * 获取日常领退看板统计数据
     */
    @PreAuthorize("@ss.hasPermi('edu:material:list')")
    @GetMapping("/stats")
    public AjaxResult getStats()
    {
        return success(eduMaterialRecordService.selectMaterialDashboardStats());
    }

    /**
     * 导出领退流水数据
     */
    @PreAuthorize("@ss.hasPermi('edu:material:export')")
    @Log(title = "教务物资领退台账", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, EduMaterialRecord record)
    {
        List<EduMaterialRecord> list = eduMaterialRecordService.selectEduMaterialRecordList(record);
        ExcelUtil<EduMaterialRecord> util = new ExcelUtil<EduMaterialRecord>(EduMaterialRecord.class);
        util.exportExcel(response, list, "教务日常物资领退台账");
    }

    /**
     * 获取物资领退统计大屏概览与图表数据
     */
    @PreAuthorize("@ss.hasPermi('edu:material:list')")
    @GetMapping("/report/summary")
    public AjaxResult getReportSummary(@org.springframework.web.bind.annotation.RequestParam Map<String, Object> params)
    {
        return success(eduMaterialRecordService.selectReportSummary(params));
    }

    /**
     * 查询最细化领退台账（单品穿透到各班、个人、各个物资）
     */
    @PreAuthorize("@ss.hasPermi('edu:material:list')")
    @GetMapping("/report/detail")
    public TableDataInfo getReportDetailList(@org.springframework.web.bind.annotation.RequestParam Map<String, Object> params)
    {
        startPage();
        List<com.doupi.edu.domain.vo.EduMaterialDetailReportVo> list = eduMaterialRecordService.selectDetailReportList(params);
        return getDataTable(list);
    }

    /**
     * 导出最细化领退台账（各班、个人、各个物资穿透Excel）
     */
    @PreAuthorize("@ss.hasPermi('edu:material:export')")
    @Log(title = "物资领用最细化穿透台账", businessType = BusinessType.EXPORT)
    @PostMapping("/report/export/detail")
    public void exportReportDetail(HttpServletResponse response, @org.springframework.web.bind.annotation.RequestParam Map<String, Object> params)
    {
        List<com.doupi.edu.domain.vo.EduMaterialDetailReportVo> list = eduMaterialRecordService.selectDetailReportList(params);
        ExcelUtil<com.doupi.edu.domain.vo.EduMaterialDetailReportVo> util = new ExcelUtil<>(com.doupi.edu.domain.vo.EduMaterialDetailReportVo.class);
        util.exportExcel(response, list, "物资领用最细化穿透台账");
    }

    /**
     * 查询各班级物资领用汇总透视列表
     */
    @PreAuthorize("@ss.hasPermi('edu:material:list')")
    @GetMapping("/report/by-class")
    public TableDataInfo getReportByClass(@org.springframework.web.bind.annotation.RequestParam Map<String, Object> params)
    {
        startPage();
        List<com.doupi.edu.domain.vo.EduMaterialClassStatVo> list = eduMaterialRecordService.selectClassStatList(params);
        return getDataTable(list);
    }

    /**
     * 导出各班级物资领用汇总透视表
     */
    @PreAuthorize("@ss.hasPermi('edu:material:export')")
    @Log(title = "各班级物资领用透视表", businessType = BusinessType.EXPORT)
    @PostMapping("/report/export/by-class")
    public void exportReportByClass(HttpServletResponse response, @org.springframework.web.bind.annotation.RequestParam Map<String, Object> params)
    {
        eduMaterialRecordService.exportClassReport(response, params);
    }

    /**
     * 查询个人(教师/学生)物资领用汇总透视列表
     */
    @PreAuthorize("@ss.hasPermi('edu:material:list')")
    @GetMapping("/report/by-person")
    public TableDataInfo getReportByPerson(@org.springframework.web.bind.annotation.RequestParam Map<String, Object> params)
    {
        startPage();
        List<com.doupi.edu.domain.vo.EduMaterialPersonStatVo> list = eduMaterialRecordService.selectPersonStatList(params);
        return getDataTable(list);
    }

    /**
     * 导出个人物资领用汇总表
     */
    @PreAuthorize("@ss.hasPermi('edu:material:export')")
    @Log(title = "个人物资领用汇总表", businessType = BusinessType.EXPORT)
    @PostMapping("/report/export/by-person")
    public void exportReportByPerson(HttpServletResponse response, @org.springframework.web.bind.annotation.RequestParam Map<String, Object> params)
    {
        eduMaterialRecordService.exportPersonReport(response, params);
    }

    /**
     * 导出多工作表(Workbook)全维度综合审计报表
     */
    @PreAuthorize("@ss.hasPermi('edu:material:export')")
    @Log(title = "物资领用综合审计报表", businessType = BusinessType.EXPORT)
    @PostMapping("/report/export/comprehensive")
    public void exportReportComprehensive(HttpServletResponse response, @org.springframework.web.bind.annotation.RequestParam Map<String, Object> params)
    {
        eduMaterialRecordService.exportComprehensiveReport(response, params);
    }
}
