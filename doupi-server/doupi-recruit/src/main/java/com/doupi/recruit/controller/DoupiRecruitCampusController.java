package com.doupi.recruit.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.annotation.Log;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.enums.BusinessType;
import com.doupi.recruit.domain.DoupiRecruitCampus;
import com.doupi.recruit.service.IDoupiRecruitCampusService;

/**
 * 校区信息Controller
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/recruit/campus")
public class DoupiRecruitCampusController extends BaseController
{
    @Autowired
    private IDoupiRecruitCampusService campusService;

    /**
     * 获取校区信息列表
     */
    @PreAuthorize("@ss.hasAnyPermi('recruit:campus:list,recruit:campus:edit')")
    @GetMapping("/list")
    public AjaxResult list()
    {
        List<DoupiRecruitCampus> list = campusService.selectDoupiRecruitCampusList(new DoupiRecruitCampus());
        return success(list);
    }

    /**
     * 获取默认/指定校区详细信息
     */
    @GetMapping(value = {"", "/{campusId}"})
    public AjaxResult getInfo(@PathVariable(value = "campusId", required = false) String campusId)
    {
        if (campusId == null || "".equals(campusId))
        {
            campusId = "default";
        }
        DoupiRecruitCampus campus = campusService.selectDoupiRecruitCampusById(campusId);
        return success(campus);
    }

    /**
     * 修改校区信息
     */
    @PreAuthorize("@ss.hasPermi('recruit:campus:edit')")
    @Log(title = "校区信息", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody DoupiRecruitCampus campus)
    {
        return toAjax(campusService.updateDoupiRecruitCampus(campus));
    }
}
