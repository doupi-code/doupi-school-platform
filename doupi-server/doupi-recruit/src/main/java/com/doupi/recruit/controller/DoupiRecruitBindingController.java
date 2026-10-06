package com.doupi.recruit.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.core.page.TableDataInfo;
import com.doupi.common.enums.BusinessType;
import com.doupi.recruit.domain.DoupiRecruitTeacherBinding;
import com.doupi.recruit.service.IDoupiRecruitTeacherBindingService;

import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;

/**
 * 教师招生绑定Controller
 * 
 * @author doupi
 */
@RestController
@RequestMapping({"/recruit/binding", "/recruit/teacherBinding"})
public class DoupiRecruitBindingController extends BaseController
{
    @Autowired
    private IDoupiRecruitTeacherBindingService bindingService;

    /**
     * 查询教师绑定列表
     */
    @PreAuthorize("@ss.hasAnyPermi('recruit:binding:list,recruit:binding:query')")
    @GetMapping("/list")
    public TableDataInfo list(DoupiRecruitTeacherBinding binding)
    {
        startPage();
        List<DoupiRecruitTeacherBinding> list = bindingService.selectDoupiRecruitTeacherBindingList(binding);
        return getDataTable(list);
    }

    /**
     * 获取教师绑定详细信息
     */
    @PreAuthorize("@ss.hasAnyPermi('recruit:binding:query,recruit:binding:list')")
    @GetMapping(value = "/{bindingId}")
    public AjaxResult getInfo(@PathVariable("bindingId") Long bindingId)
    {
        return success(bindingService.selectDoupiRecruitTeacherBindingById(bindingId));
    }

    /**
     * 新增教师绑定
     */
    @PreAuthorize("@ss.hasAnyPermi('recruit:binding:add,recruit:binding:edit')")
    @Log(title = "教师绑定", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody DoupiRecruitTeacherBinding binding)
    {
        return toAjax(bindingService.insertDoupiRecruitTeacherBinding(binding));
    }

    /**
     * 修改教师绑定
     */
    @PreAuthorize("@ss.hasAnyPermi('recruit:binding:edit,recruit:binding:audit')")
    @Log(title = "教师绑定", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody DoupiRecruitTeacherBinding binding)
    {
        return toAjax(bindingService.updateDoupiRecruitTeacherBinding(binding));
    }

    /**
     * 解除/删除教师绑定
     */
    @PreAuthorize("@ss.hasAnyPermi('recruit:binding:remove,recruit:binding:edit')")
    @Log(title = "教师绑定", businessType = BusinessType.DELETE)
    @DeleteMapping("/{bindingId}")
    public AjaxResult remove(@PathVariable("bindingId") Long bindingId)
    {
        return toAjax(bindingService.deleteDoupiRecruitTeacherBindingById(bindingId));
    }

    /**
     * 审核绑定申请
     */
    @PreAuthorize("@ss.hasAnyPermi('recruit:binding:audit,recruit:binding:edit')")
    @Log(title = "教师绑定审核", businessType = BusinessType.UPDATE)
    @PostMapping("/audit")
    public AjaxResult audit(@RequestBody Map<String, Object> req)
    {
        Long bindingId = Long.valueOf(req.get("bindingId").toString());
        String status = (String) req.get("status");
        String auditRemark = (String) req.get("auditRemark");
        return toAjax(bindingService.auditBinding(bindingId, status, auditRemark));
    }
}
