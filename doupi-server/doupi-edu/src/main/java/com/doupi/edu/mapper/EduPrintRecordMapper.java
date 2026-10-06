package com.doupi.edu.mapper;

import java.util.List;
import com.doupi.edu.domain.EduPrintRecord;

/**
 * 印刷登记Mapper接口
 * 
 * @author doupi
 * @date 2026-09-25
 */
public interface EduPrintRecordMapper 
{
    /**
     * 查询印刷登记
     * 
     * @param printId 印刷登记主键
     * @return 印刷登记
     */
    public EduPrintRecord selectEduPrintRecordByPrintId(Long printId);

    /**
     * 根据出库单ID查询关联印刷登记
     * 
     * @param outId 出库单主键
     * @return 印刷登记
     */
    public EduPrintRecord selectEduPrintRecordByOutId(Long outId);

    /**
     * 查询印刷登记列表
     * 
     * @param eduPrintRecord 印刷登记
     * @return 印刷登记集合
     */
    public List<EduPrintRecord> selectEduPrintRecordList(EduPrintRecord eduPrintRecord);

    /**
     * 新增印刷登记
     * 
     * @param eduPrintRecord 印刷登记
     * @return 结果
     */
    public int insertEduPrintRecord(EduPrintRecord eduPrintRecord);

    /**
     * 修改印刷登记
     * 
     * @param eduPrintRecord 印刷登记
     * @return 结果
     */
    public int updateEduPrintRecord(EduPrintRecord eduPrintRecord);

    /**
     * 删除印刷登记
     * 
     * @param printId 印刷登记主键
     * @return 结果
     */
    public int deleteEduPrintRecordByPrintId(Long printId);

    /**
     * 批量删除印刷登记
     * 
     * @param printIds 需要删除的数据主键集合
     * @return 结果
     */
    public int deleteEduPrintRecordByPrintIds(Long[] printIds);

    /**
     * 统计文印总指标（总批次、总印数、总耗纸）
     */
    public java.util.Map<String, Object> selectPrintSummary(EduPrintRecord eduPrintRecord);

    /**
     * 统计纸张型号分布
     */
    public java.util.List<java.util.Map<String, Object>> selectPaperTypeStats(EduPrintRecord eduPrintRecord);

    /**
     * 统计各年级文印量
     */
    public java.util.List<java.util.Map<String, Object>> selectGradePrintStats(EduPrintRecord eduPrintRecord);

    /**
     * 统计教师文印排行
     */
    public java.util.List<java.util.Map<String, Object>> selectTeacherPrintStats(EduPrintRecord eduPrintRecord);

    /**
     * 统计近6个月文印耗纸走势
     */
    public java.util.List<java.util.Map<String, Object>> selectMonthlyPrintStats();
}
