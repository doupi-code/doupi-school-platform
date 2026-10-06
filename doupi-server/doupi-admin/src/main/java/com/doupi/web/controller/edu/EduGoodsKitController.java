package com.doupi.web.controller.edu;

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
import com.doupi.common.utils.poi.ExcelUtil;
import com.doupi.edu.domain.EduGoodsKit;
import com.doupi.edu.service.IEduGoodsKitService;

/**
 * 教务物资套装模版Controller
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/edu/kit")
public class EduGoodsKitController extends BaseController
{
    @Autowired
    private IEduGoodsKitService eduGoodsKitService;

    /**
     * 查询套装模版列表
     */
    @PreAuthorize("@ss.hasAnyPermi('edu:kit:list,edu:material:list')")
    @GetMapping("/list")
    public TableDataInfo list(EduGoodsKit eduGoodsKit)
    {
        startPage();
        List<EduGoodsKit> list = eduGoodsKitService.selectEduGoodsKitList(eduGoodsKit);
        return getDataTable(list);
    }

    /**
     * 获取套装模版详细信息（含明细物品）
     */
    @PreAuthorize("@ss.hasAnyPermi('edu:kit:query,edu:material:list')")
    @GetMapping(value = "/{kitId}")
    public AjaxResult getInfo(@PathVariable("kitId") Long kitId)
    {
        return success(eduGoodsKitService.selectEduGoodsKitByKitId(kitId));
    }

    /**
     * 新增套装模版
     */
    @PreAuthorize("@ss.hasPermi('edu:kit:add')")
    @Log(title = "物资套装模版", businessType = BusinessType.INSERT)
    @PostMapping
    public AjaxResult add(@RequestBody EduGoodsKit eduGoodsKit)
    {
        eduGoodsKit.setCreateBy(getUsername());
        return toAjax(eduGoodsKitService.insertEduGoodsKit(eduGoodsKit));
    }

    /**
     * 修改套装模版
     */
    @PreAuthorize("@ss.hasPermi('edu:kit:edit')")
    @Log(title = "物资套装模版", businessType = BusinessType.UPDATE)
    @PutMapping
    public AjaxResult edit(@RequestBody EduGoodsKit eduGoodsKit)
    {
        eduGoodsKit.setUpdateBy(getUsername());
        return toAjax(eduGoodsKitService.updateEduGoodsKit(eduGoodsKit));
    }

    /**
     * 删除套装模版
     */
    @PreAuthorize("@ss.hasPermi('edu:kit:remove')")
    @Log(title = "物资套装模版", businessType = BusinessType.DELETE)
    @DeleteMapping("/{kitIds}")
    public AjaxResult remove(@PathVariable Long[] kitIds)
    {
        return toAjax(eduGoodsKitService.deleteEduGoodsKitByKitIds(kitIds));
    }

    /**
     * 导出套装模版列表
     */
    @PreAuthorize("@ss.hasPermi('edu:kit:export')")
    @Log(title = "物资套装模版", businessType = BusinessType.EXPORT)
    @PostMapping("/export")
    public void export(HttpServletResponse response, EduGoodsKit eduGoodsKit)
    {
        List<EduGoodsKit> list = eduGoodsKitService.selectEduGoodsKitList(eduGoodsKit);
        ExcelUtil<EduGoodsKit> util = new ExcelUtil<EduGoodsKit>(EduGoodsKit.class);
        util.exportExcel(response, list, "物资套装数据");
    }
}
