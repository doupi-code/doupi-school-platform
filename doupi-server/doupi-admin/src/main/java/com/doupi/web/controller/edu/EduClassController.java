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
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.enums.BusinessType;
import com.doupi.edu.domain.EduClass;
import com.doupi.edu.service.IEduClassService;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.common.core.page.TableDataInfo;

/**
 * 班级档案Controller
 * 
 * @author doupi
 * @date 2026-09-25
 */
@RestController
@RequestMapping("/edu/class")
public class EduClassController extends BaseController
{
    @Autowired
    private IEduClassService eduClassService;

    /**
     * 查询班级档案列表
     */
    @PreAuthorize("@ss.hasPermi('edu:class:list')")
    @GetMapping("/list")
    public TableDataInfo list(EduClass eduClass)
    {
        startPage();
        List<EduClass> list = eduClassService.selectEduClassList(eduClass);
        return getDataTable(list);
    }

    /**
     * 导出班级档案列表
     */
    @PreAuthorize("@ss.hasPermi('edu:class:export')")
    @Log(title = "班级档案", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, EduClass eduClass)
    {
        List<EduClass> list = eduClassService.selectEduClassList(eduClass);
        ExcelUtil<EduClass> util = new ExcelUtil<EduClass>(EduClass.class);
        util.exportExcel(response, list, "班级档案数据");
    }

    /**
     * 获取班级档案详细信息
     */
    @PreAuthorize("@ss.hasPermi('edu:class:query')")
    @GetMapping(value = "/{classId}")
    public AjaxResult getInfo(@PathVariable("classId") Long classId)
    {
        return success(eduClassService.selectEduClassByClassId(classId));
    }

    /**
     * 新增班级档案
     */
    @PreAuthorize("@ss.hasPermi('edu:class:add')")
    @Log(title = "班级档案", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody EduClass eduClass)
    {
        return toAjax(eduClassService.insertEduClass(eduClass));
    }

    /**
     * 修改班级档案
     */
    @PreAuthorize("@ss.hasPermi('edu:class:edit')")
    @Log(title = "班级档案", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody EduClass eduClass)
    {
        return toAjax(eduClassService.updateEduClass(eduClass));
    }

    /**
     * 删除班级档案
     */
    @PreAuthorize("@ss.hasPermi('edu:class:remove')")
    @Log(title = "班级档案", businessType = BusinessType.DELETE)
	@DeleteMapping("/{classIds}")
    public AjaxResult remove(@PathVariable Long[] classIds)
    {
        return toAjax(eduClassService.deleteEduClassByClassIds(classIds));
    }
}
