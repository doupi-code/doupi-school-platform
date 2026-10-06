package com.doupi.edu.service;

import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import com.doupi.edu.domain.EduMaterialRecord;
import com.doupi.edu.domain.vo.EduMaterialClassStatVo;
import com.doupi.edu.domain.vo.EduMaterialDetailReportVo;
import com.doupi.edu.domain.vo.EduMaterialPersonStatVo;
import com.doupi.edu.domain.vo.EduMaterialReportSummaryVo;

/**
 * 教务日常物资领退Service接口
 * 
 * @author doupi
 */
public interface IEduMaterialRecordService 
{
    /**
     * 查询领退记录详情（含明细）
     */
    public EduMaterialRecord selectEduMaterialRecordById(Long recordId);

    /**
     * 查询领退记录列表
     */
    public List<EduMaterialRecord> selectEduMaterialRecordList(EduMaterialRecord record);

    /**
     * 教务物资发放登记（日常零星领用/整套办公用品申领/学生教材发放，严格事务扣减库存，生成流水）
     */
    public int grantMaterial(EduMaterialRecord record);

    /**
     * 教务物资退还回收登记（离职收回/退学退书，完好品自动累加库存）
     */
    public int returnMaterial(EduMaterialRecord record);

    /**
     * 撤销领退记录（回滚库存）
     */
    public int cancelRecord(Long recordId);

    /**
     * 领退工作台看板数据统计
     */
    public Map<String, Object> selectMaterialDashboardStats();

    /**
     * 查询最细化明细台账（细化到各班、个人、各个物资）
     */
    public List<EduMaterialDetailReportVo> selectDetailReportList(Map<String, Object> params);

    /**
     * 查询各班级物资领用汇总透视列表
     */
    public List<EduMaterialClassStatVo> selectClassStatList(Map<String, Object> params);

    /**
     * 查询个人(教师/学生)物资领用汇总透视列表
     */
    public List<EduMaterialPersonStatVo> selectPersonStatList(Map<String, Object> params);

    /**
     * 查询统计报表顶部综合概览与图表数据
     */
    public EduMaterialReportSummaryVo selectReportSummary(Map<String, Object> params);

    /**
     * 导出多工作表(Workbook)综合审计报表（总览+班级透视+个人台账+最细明细）
     */
    public void exportComprehensiveReport(HttpServletResponse response, Map<String, Object> params);

    /**
     * 导出各班级物资领用汇总透视报表（每品一行，班级信息合并单元格）
     */
    public void exportClassReport(HttpServletResponse response, Map<String, Object> params);

    /**
     * 导出个人(教师/学生)物资领用对账单（每品一行，人员信息合并单元格）
     */
    public void exportPersonReport(HttpServletResponse response, Map<String, Object> params);
}
