package com.doupi.recruit.controller;

import java.util.List;
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
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.core.page.TableDataInfo;
import com.doupi.common.enums.BusinessType;
import com.doupi.common.utils.SecurityUtils;
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.recruit.domain.DoupiRecruitAppointment;
import com.doupi.recruit.service.IDoupiRecruitAppointmentService;

/**
 * 访校预约Controller
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/recruit/appointment")
public class DoupiRecruitAppointmentController extends BaseController
{
    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    /**
     * 查询访校预约列表
     */
    @PreAuthorize("@ss.hasPermi('recruit:appointment:list')")
    @GetMapping("/list")
    public TableDataInfo list(DoupiRecruitAppointment appointment)
    {
        startPage();
        List<DoupiRecruitAppointment> list = appointmentService.selectDoupiRecruitAppointmentList(appointment);
        return getDataTable(list);
    }

    /**
     * 导出访校预约列表
     */
    @PreAuthorize("@ss.hasPermi('recruit:appointment:export')")
    @Log(title = "访校预约", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, DoupiRecruitAppointment appointment)
    {
        List<DoupiRecruitAppointment> list = appointmentService.selectDoupiRecruitAppointmentList(appointment);
        ExcelUtil<DoupiRecruitAppointment> util = new ExcelUtil<DoupiRecruitAppointment>(DoupiRecruitAppointment.class);
        util.exportExcel(response, list, "访校预约数据");
    }

    /**
     * 获取访校预约详细信息
     */
    @PreAuthorize("@ss.hasPermi('recruit:appointment:query')")
    @GetMapping(value = "/{appointmentId}")
    public AjaxResult getInfo(@PathVariable("appointmentId") Long appointmentId)
    {
        return success(appointmentService.selectDoupiRecruitAppointmentById(appointmentId));
    }

    /**
     * 新增访校预约
     */
    @PreAuthorize("@ss.hasPermi('recruit:appointment:add')")
    @Log(title = "访校预约", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody DoupiRecruitAppointment appointment)
    {
        appointment.setCreateBy(SecurityUtils.getUsername());
        return toAjax(appointmentService.insertDoupiRecruitAppointment(appointment));
    }

    /**
     * 修改访校预约
     */
    @PreAuthorize("@ss.hasPermi('recruit:appointment:edit')")
    @Log(title = "访校预约", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody DoupiRecruitAppointment appointment)
    {
        appointment.setUpdateBy(SecurityUtils.getUsername());
        return toAjax(appointmentService.updateDoupiRecruitAppointment(appointment));
    }

    /**
     * 删除访校预约
     */
    @PreAuthorize("@ss.hasPermi('recruit:appointment:remove')")
    @Log(title = "访校预约", businessType = BusinessType.DELETE)
	@DeleteMapping("/{appointmentIds}")
    public AjaxResult remove(@PathVariable Long[] appointmentIds)
    {
        return toAjax(appointmentService.deleteDoupiRecruitAppointmentByIds(appointmentIds));
    }

    /**
     * 现场核销操作
     */
    @PreAuthorize("@ss.hasPermi('recruit:verify:edit')")
    @Log(title = "访校核销", businessType = BusinessType.UPDATE)
    @PostMapping("/verify")
    public AjaxResult verify(@RequestBody DoupiRecruitAppointment req)
    {
        String checkInCode = req.getCheckInCode();
        boolean ok = appointmentService.verifyAppointment(checkInCode, SecurityUtils.getUsername());
        if (ok)
        {
            return success("核销成功！已完成到校核验。");
        }
        else
        {
            return error("核销失败：未找到有效核销码或该预约已取消");
        }
    }
}
