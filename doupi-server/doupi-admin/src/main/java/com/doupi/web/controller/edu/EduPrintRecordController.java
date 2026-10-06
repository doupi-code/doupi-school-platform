package com.doupi.web.controller.edu;

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
import org.springframework.web.multipart.MultipartFile;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.enums.BusinessType;
import com.doupi.edu.domain.EduPrintRecord;
import com.doupi.edu.domain.dto.EduPrintOcrResult;
import com.doupi.edu.service.IEduOcrService;
import com.doupi.edu.service.IEduPrintRecordService;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.common.core.page.TableDataInfo;

/**
 * 印刷登记Controller
 * 
 * @author doupi
 * @date 2026-09-25
 */
@RestController
@RequestMapping("/edu/record")
public class EduPrintRecordController extends BaseController
{
    @Autowired
    private IEduPrintRecordService eduPrintRecordService;

    @Autowired
    private IEduOcrService eduOcrService;

    /**
     * 查询印刷登记列表
     */
    @PreAuthorize("@ss.hasPermi('edu:record:list')")
    @GetMapping("/list")
    public TableDataInfo list(EduPrintRecord eduPrintRecord)
    {
        startPage();
        List<EduPrintRecord> list = eduPrintRecordService.selectEduPrintRecordList(eduPrintRecord);
        return getDataTable(list);
    }

    /**
     * 导出印刷登记列表
     */
    @PreAuthorize("@ss.hasPermi('edu:record:export')")
    @Log(title = "印刷登记", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, EduPrintRecord eduPrintRecord)
    {
        List<EduPrintRecord> list = eduPrintRecordService.selectEduPrintRecordList(eduPrintRecord);
        ExcelUtil<EduPrintRecord> util = new ExcelUtil<EduPrintRecord>(EduPrintRecord.class);
        util.exportExcel(response, list, "印刷登记数据");
    }

    /**
     * 获取印刷登记详细信息
     */
    @PreAuthorize("@ss.hasPermi('edu:record:query')")
    @GetMapping(value = "/{printId}")
    public AjaxResult getInfo(@PathVariable("printId") Long printId)
    {
        return success(eduPrintRecordService.selectEduPrintRecordByPrintId(printId));
    }

    /**
     * 根据关联出库单ID获取印刷登记详细信息
     */
    @PreAuthorize("@ss.hasAnyPermi('edu:record:query,stock:out:query,edu:out:query')")
    @GetMapping(value = "/byOut/{outId}")
    public AjaxResult getByOutId(@PathVariable("outId") Long outId)
    {
        return success(eduPrintRecordService.selectEduPrintRecordByOutId(outId));
    }

    /**
     * 新增印刷登记（自动生成耗材出库单联动扣减库存）
     */
    @PreAuthorize("@ss.hasPermi('edu:record:add')")
    @Log(title = "印刷登记", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody EduPrintRecord eduPrintRecord)
    {
        return toAjax(eduPrintRecordService.insertEduPrintRecord(eduPrintRecord));
    }

    /**
     * 修改印刷登记
     */
    @PreAuthorize("@ss.hasPermi('edu:record:edit')")
    @Log(title = "印刷登记", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody EduPrintRecord eduPrintRecord)
    {
        return toAjax(eduPrintRecordService.updateEduPrintRecord(eduPrintRecord));
    }

    /**
     * 完成印刷登记（更新状态为已完成，并保存印刷效果实物图）
     */
    @PreAuthorize("@ss.hasPermi('edu:record:edit')")
    @Log(title = "完成印刷", businessType = BusinessType.UPDATE)
    @PutMapping("/complete")
    public AjaxResult complete(@RequestBody EduPrintRecord eduPrintRecord)
    {
        eduPrintRecord.setStatus("1"); // 1-已完成
        return toAjax(eduPrintRecordService.updateEduPrintRecord(eduPrintRecord));
    }

    /**
     * 作废印刷登记（同步作废关联耗材出库单并回退库存）
     */
    @PreAuthorize("@ss.hasPermi('edu:record:edit')")
    @Log(title = "作废印刷登记", businessType = BusinessType.UPDATE)
    @PutMapping("/cancel/{printId}")
    public AjaxResult cancel(@PathVariable Long printId)
    {
        return toAjax(eduPrintRecordService.cancelEduPrintRecord(printId));
    }

    /**
     * 本地离线OCR微信截图智能解析预填
     */
    @PreAuthorize("@ss.hasPermi('edu:record:add')")
    @PostMapping("/ocr-parse")
    public AjaxResult ocrParse(@RequestParam("file") MultipartFile file)
    {
        EduPrintOcrResult result = eduOcrService.parseScreenshot(file);
        return success(result);
    }

    /**
     * 微信聊天文本智能解析预填（支持直接粘贴微信对话文字）
     */
    @PreAuthorize("@ss.hasPermi('edu:record:add')")
    @PostMapping("/text-parse")
    public AjaxResult textParse(@RequestBody java.util.Map<String, String> body)
    {
        String text = body != null ? body.get("text") : "";
        EduPrintOcrResult result = eduOcrService.extractInfoFromText(text);
        result.setSuccess(true);
        result.setMsg("文本信息智能提取完成！");
        return success(result);
    }

    /**
     * 删除印刷登记
     */
    @PreAuthorize("@ss.hasPermi('edu:record:remove')")
    @Log(title = "印刷登记", businessType = BusinessType.DELETE)
	@DeleteMapping("/{printIds}")
    public AjaxResult remove(@PathVariable Long[] printIds)
    {
        return toAjax(eduPrintRecordService.deleteEduPrintRecordByPrintIds(printIds));
    }

    /**
     * 获取文印统计报表
     */
    @PreAuthorize("@ss.hasAnyPermi('edu:record:list,edu:report:list')")
    @GetMapping("/report")
    public AjaxResult report(EduPrintRecord eduPrintRecord)
    {
        return success(eduPrintRecordService.getPrintReport(eduPrintRecord));
    }
}
