package com.doupi.edu.mapper;

import java.util.List;
import java.util.Map;
import com.doupi.edu.domain.EduMaterialRecord;
import com.doupi.edu.domain.vo.EduMaterialClassStatVo;
import com.doupi.edu.domain.vo.EduMaterialDetailReportVo;
import com.doupi.edu.domain.vo.EduMaterialPersonStatVo;

/**
 * 教务日常物资领退记录Mapper接口
 * 
 * @author doupi
 */
public interface EduMaterialRecordMapper 
{
    /**
     * 查询记录详情
     */
    public EduMaterialRecord selectEduMaterialRecordById(Long recordId);

    /**
     * 查询记录列表
     */
    public List<EduMaterialRecord> selectEduMaterialRecordList(EduMaterialRecord record);

    /**
     * 新增领退记录
     */
    public int insertEduMaterialRecord(EduMaterialRecord record);

    /**
     * 撤销/修改记录状态
     */
    public int updateEduMaterialRecord(EduMaterialRecord record);

    /**
     * 统计工作台实时数据
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
     * 查询各班级物资明细单项列表（用于Excel合并单元格展开导出）
     */
    public List<EduMaterialDetailReportVo> selectClassGoodsItemsList(Map<String, Object> params);

    /**
     * 查询个人(教师/学生)物资领用汇总透视列表
     */
    public List<EduMaterialPersonStatVo> selectPersonStatList(Map<String, Object> params);

    /**
     * 查询个人物资明细单项列表（用于Excel合并单元格展开导出）
     */
    public List<EduMaterialDetailReportVo> selectPersonGoodsItemsList(Map<String, Object> params);

    /**
     * 查询大屏概览KPI汇总指标
     */
    public Map<String, Object> selectReportSummaryKpi(Map<String, Object> params);

    /**
     * 查询物资品类分布
     */
    public List<Map<String, Object>> selectReportCategoryPie(Map<String, Object> params);

    /**
     * 查询各班级领用数量排行TOP10
     */
    public List<Map<String, Object>> selectReportClassRank(Map<String, Object> params);

    /**
     * 查询月度领退走势
     */
    public List<Map<String, Object>> selectReportMonthlyTrend(Map<String, Object> params);

    /**
     * 查询高频领用物资TOP8
     */
    public List<Map<String, Object>> selectReportTopGoods(Map<String, Object> params);
}
