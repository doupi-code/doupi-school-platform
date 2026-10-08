package com.doupi.edu.service;

import java.util.List;
import com.doupi.edu.domain.EduPrintRecord;

/**
 * 印刷登记Service接口
 * 
 * @author doupi
 * @date 2026-09-25
 */
public interface IEduPrintRecordService 
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
     * 批量删除印刷登记
     * 
     * @param printIds 需要删除的印刷登记主键集合
     * @return 结果
     */
    public int deleteEduPrintRecordByPrintIds(Long[] printIds);

    /**
     * 删除印刷登记信息
     * 
     * @param printId 印刷登记主键
     * @return 结果
     */
    public int deleteEduPrintRecordByPrintId(Long printId);

    /**
     * 作废印刷登记（同步作废关联耗材出库单并回退库存）
     * 
     * @param printId 印刷登记主键
     * @return 结果
     */
    public int cancelEduPrintRecord(Long printId);

    /**
     * 批量完成印刷登记（将选中记录标记为已完成）
     * 
     * @param printIds 需要完成的印刷登记主键集合
     * @return 结果
     */
    public int completeEduPrintRecordByPrintIds(Long[] printIds);

    /**
     * 批量作废印刷登记（同步作废关联耗材出库单并回退库存）
     * 
     * @param printIds 需要作废的印刷登记主键集合
     * @return 结果
     */
    public int cancelEduPrintRecordByPrintIds(Long[] printIds);

    /**
     * 记录印刷错误（创建错误出库单扣减库存，回写 error_count/error_out_id）
     * 
     * @param eduPrintRecord 包含 printId、errorCount、errorRemark
     * @return 结果
     */
    public int recordPrintError(EduPrintRecord eduPrintRecord);

    /**
     * 获取文印统计报表数据
     * 
     * @param eduPrintRecord 查询条件
     * @return 文印统计报表数据
     */
    public com.doupi.edu.domain.vo.EduPrintReportVo getPrintReport(EduPrintRecord eduPrintRecord);
}
