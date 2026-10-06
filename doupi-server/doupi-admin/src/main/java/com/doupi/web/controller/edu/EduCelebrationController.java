package com.doupi.web.controller.edu;

import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.core.page.TableDataInfo;
import com.doupi.common.enums.BusinessType;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.edu.domain.EduCelebration;
import com.doupi.edu.service.IEduCelebrationService;

/**
 * 提分喜报 Controller
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/edu/celebration")
public class EduCelebrationController extends BaseController
{
    @Autowired
    private IEduCelebrationService celebrationService;

    /**
     * 查询提分喜报列表 (后台管理分页)
     */
    @PreAuthorize("@ss.hasPermi('edu:celebration:list')")
    @GetMapping("/list")
    public TableDataInfo list(EduCelebration eduCelebration)
    {
        startPage();
        List<EduCelebration> list = celebrationService.selectEduCelebrationList(eduCelebration);
        return getDataTable(list);
    }

    /**
     * 查询全量提分喜报 (大屏全屏滚动无分页)
     */
    @GetMapping("/all")
    public AjaxResult all(EduCelebration eduCelebration)
    {
        eduCelebration.setStatus("0");
        List<EduCelebration> list = celebrationService.selectEduCelebrationList(eduCelebration);
        return success(list);
    }

    /**
     * 获取喜报全局统计指标
     */
    @GetMapping("/summary")
    public AjaxResult summary(@RequestParam(value = "batchTitle", required = false) String batchTitle)
    {
        Map<String, Object> summary = celebrationService.selectCelebrationSummary(batchTitle);
        return success(summary);
    }

    /**
     * 获取所有考试批次列表 (用于考试切换选择)
     */
    @GetMapping("/batches")
    public AjaxResult batches()
    {
        return success(celebrationService.selectCelebrationBatchList());
    }

    /**
     * 获取提分喜报详细信息
     */
    @PreAuthorize("@ss.hasPermi('edu:celebration:list')")
    @GetMapping(value = "/{celebrationId}")
    public AjaxResult getInfo(@PathVariable("celebrationId") Long celebrationId)
    {
        return success(celebrationService.selectEduCelebrationById(celebrationId));
    }

    /**
     * 新增提分光荣榜学子
     */
    @PreAuthorize("@ss.hasAnyPermi('edu:celebration:add,edu:celebration:list')")
    @Log(title = "提分光荣榜", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody EduCelebration eduCelebration)
    {
        eduCelebration.setCreateBy(getUsername());
        return toAjax(celebrationService.insertEduCelebration(eduCelebration));
    }

    /**
     * 修改提分光荣榜学子
     */
    @PreAuthorize("@ss.hasAnyPermi('edu:celebration:edit,edu:celebration:list')")
    @Log(title = "提分光荣榜", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody EduCelebration eduCelebration)
    {
        eduCelebration.setUpdateBy(getUsername());
        return toAjax(celebrationService.updateEduCelebration(eduCelebration));
    }

    /**
     * 删除提分光荣榜学子
     */
    @PreAuthorize("@ss.hasAnyPermi('edu:celebration:remove,edu:celebration:list')")
    @Log(title = "提分光荣榜", businessType = BusinessType.DELETE)
    @DeleteMapping("/{celebrationIds}")
    public AjaxResult remove(@PathVariable Long[] celebrationIds)
    {
        return toAjax(celebrationService.deleteEduCelebrationByIds(celebrationIds));
    }

    /**
     * 一键清空提分光荣榜
     */
    @PreAuthorize("@ss.hasPermi('edu:celebration:list')")
    @Log(title = "提分光荣榜", businessType = BusinessType.CLEAN)
    @DeleteMapping("/clean")
    public AjaxResult clean()
    {
        celebrationService.cleanEduCelebration();
        return success("提分光荣榜数据已全部清空");
    }

    /**
     * 导入学生成绩 Excel
     */
    @Log(title = "提分光荣榜", businessType = BusinessType.IMPORT)
    @PreAuthorize("@ss.hasPermi('edu:celebration:list')")
    @PostMapping("/importData")
    public AjaxResult importData(MultipartFile file, 
                                 @RequestParam(value = "updateSupport", defaultValue = "false") boolean updateSupport,
                                 @RequestParam(value = "batchTitle", defaultValue = "2026年高考提分光荣榜") String batchTitle) throws Exception
    {
        String message = celebrationService.importCelebration(file.getInputStream(), updateSupport, getUsername(), batchTitle);
        return success(message);
    }

    /**
     * 下载导入模板
     */
    @PostMapping("/importTemplate")
    public void importTemplate(HttpServletResponse response)
    {
        ExcelUtil<EduCelebration> util = new ExcelUtil<EduCelebration>(EduCelebration.class);
        util.importTemplateExcel(response, "提分成绩导入模板");
    }

    /**
     * 导出提分光荣榜数据
     */
    @PreAuthorize("@ss.hasPermi('edu:celebration:list')")
    @Log(title = "提分光荣榜", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, EduCelebration eduCelebration)
    {
        List<EduCelebration> list = celebrationService.selectEduCelebrationList(eduCelebration);
        ExcelUtil<EduCelebration> util = new ExcelUtil<EduCelebration>(EduCelebration.class);
        util.exportExcel(response, list, "提分光荣榜名单");
    }
}
