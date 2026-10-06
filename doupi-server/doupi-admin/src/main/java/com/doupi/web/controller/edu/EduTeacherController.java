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
import com.doupi.edu.domain.EduTeacher;
import com.doupi.edu.service.IEduTeacherService;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.common.core.page.TableDataInfo;

/**
 * 教职工档案Controller
 * 
 * @author doupi
 * @date 2026-09-25
 */
@RestController
@RequestMapping("/edu/teacher")
public class EduTeacherController extends BaseController
{
    @Autowired
    private IEduTeacherService eduTeacherService;

    /**
     * 查询教职工档案列表
     */
    @PreAuthorize("@ss.hasPermi('edu:teacher:list')")
    @GetMapping("/list")
    public TableDataInfo list(EduTeacher eduTeacher)
    {
        startPage();
        List<EduTeacher> list = eduTeacherService.selectEduTeacherList(eduTeacher);
        return getDataTable(list);
    }

    /**
     * 导出教职工档案列表
     */
    @PreAuthorize("@ss.hasPermi('edu:teacher:export')")
    @Log(title = "教职工档案", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, EduTeacher eduTeacher)
    {
        List<EduTeacher> list = eduTeacherService.selectEduTeacherList(eduTeacher);
        ExcelUtil<EduTeacher> util = new ExcelUtil<EduTeacher>(EduTeacher.class);
        util.exportExcel(response, list, "教职工档案数据");
    }

    /**
     * 获取教职工档案详细信息
     */
    @PreAuthorize("@ss.hasPermi('edu:teacher:query')")
    @GetMapping(value = "/{teacherId}")
    public AjaxResult getInfo(@PathVariable("teacherId") Long teacherId)
    {
        return success(eduTeacherService.selectEduTeacherByTeacherId(teacherId));
    }

    /**
     * 新增教职工档案
     */
    @PreAuthorize("@ss.hasPermi('edu:teacher:add')")
    @Log(title = "教职工档案", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody EduTeacher eduTeacher)
    {
        return toAjax(eduTeacherService.insertEduTeacher(eduTeacher));
    }

    /**
     * 修改教职工档案
     */
    @PreAuthorize("@ss.hasPermi('edu:teacher:edit')")
    @Log(title = "教职工档案", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody EduTeacher eduTeacher)
    {
        return toAjax(eduTeacherService.updateEduTeacher(eduTeacher));
    }

    /**
     * 删除教职工档案
     */
    @PreAuthorize("@ss.hasPermi('edu:teacher:remove')")
    @Log(title = "教职工档案", businessType = BusinessType.DELETE)
	@DeleteMapping("/{teacherIds}")
    public AjaxResult remove(@PathVariable Long[] teacherIds)
    {
        return toAjax(eduTeacherService.deleteEduTeacherByTeacherIds(teacherIds));
    }
}
