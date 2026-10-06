package com.doupi.recruit.controller;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.recruit.service.IDoupiRecruitAppointmentService;

/**
 * 招生数据看板Controller
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/recruit/dashboard")
public class DoupiRecruitDashboardController extends BaseController
{
    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    /**
     * 获取招生统计概览数据
     */
    @PreAuthorize("@ss.hasPermi('recruit:dashboard:view')")
    @GetMapping("/stats")
    public AjaxResult getStats()
    {
        Map<String, Object> stats = appointmentService.getDashboardStats();
        return success(stats);
    }
}
