package com.doupi.edu.service.impl;

import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.doupi.common.exception.ServiceException;
import com.doupi.common.utils.DateUtils;
import com.doupi.common.utils.StringUtils;
import com.doupi.edu.domain.EduClass;
import com.doupi.edu.domain.EduPrintRecord;
import com.doupi.edu.domain.EduTeacher;
import com.doupi.edu.mapper.EduClassMapper;
import com.doupi.edu.mapper.EduPrintRecordMapper;
import com.doupi.edu.mapper.EduTeacherMapper;
import com.doupi.edu.service.IEduPrintRecordService;
import com.doupi.stock.domain.StockGoods;
import com.doupi.stock.domain.StockOut;
import com.doupi.stock.domain.StockOutItem;
import com.doupi.stock.mapper.StockGoodsMapper;
import com.doupi.stock.service.IStockOutService;
import com.doupi.system.service.ISysConfigService;

/**
 * 印刷登记Service业务层处理
 * 
 * @author doupi
 * @date 2026-09-25
 */
@Service
public class EduPrintRecordServiceImpl implements IEduPrintRecordService 
{
    @Autowired
    private EduPrintRecordMapper eduPrintRecordMapper;

    @Autowired
    private IStockOutService stockOutService;

    @Autowired
    private StockGoodsMapper stockGoodsMapper;

    @Autowired
    private EduTeacherMapper eduTeacherMapper;

    @Autowired(required = false)
    private EduClassMapper eduClassMapper;

    @Autowired(required = false)
    private ISysConfigService configService;

    /**
     * 查询印刷登记
     * 
     * @param printId 印刷登记主键
     * @return 印刷登记
     */
    @Override
    public EduPrintRecord selectEduPrintRecordByPrintId(Long printId)
    {
        return eduPrintRecordMapper.selectEduPrintRecordByPrintId(printId);
    }

    /**
     * 根据出库单ID查询关联印刷登记
     * 
     * @param outId 出库单主键
     * @return 印刷登记
     */
    @Override
    public EduPrintRecord selectEduPrintRecordByOutId(Long outId)
    {
        return eduPrintRecordMapper.selectEduPrintRecordByOutId(outId);
    }

    /**
     * 查询印刷登记列表
     * 
     * @param eduPrintRecord 印刷登记
     * @return 印刷登记
     */
    @Override
    public List<EduPrintRecord> selectEduPrintRecordList(EduPrintRecord eduPrintRecord)
    {
        return eduPrintRecordMapper.selectEduPrintRecordList(eduPrintRecord);
    }

    /**
     * 新增印刷登记（自动生成耗材出库单并扣减对应纸张库存）
     * 
     * @param eduPrintRecord 印刷登记
     * @return 结果
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int insertEduPrintRecord(EduPrintRecord eduPrintRecord)
    {
        if (eduPrintRecord.getPaperGoodsId() == null && StringUtils.isNotEmpty(eduPrintRecord.getPaperType()))
        {
            StockGoods query = new StockGoods();
            List<StockGoods> allGoods = stockGoodsMapper.selectEduGoodsList(query);
            if (allGoods != null && !allGoods.isEmpty())
            {
                String pType = eduPrintRecord.getPaperType().toUpperCase();
                StockGoods matched = null;
                for (StockGoods g : allGoods)
                {
                    String name = g.getGoodsName() != null ? g.getGoodsName().toUpperCase() : "";
                    String spec = g.getSpec() != null ? g.getSpec().toUpperCase() : "";
                    if (name.contains(pType) || spec.contains(pType))
                    {
                        matched = g;
                        break;
                    }
                }
                if (matched == null)
                {
                    for (StockGoods g : allGoods)
                    {
                        String cat = g.getCategory() != null ? g.getCategory() : "";
                        String name = g.getGoodsName() != null ? g.getGoodsName() : "";
                        if ("1".equals(cat) || "3".equals(cat) || "纸张耗材".equals(cat) || name.contains("纸"))
                        {
                            matched = g;
                            break;
                        }
                    }
                }
                if (matched == null)
                {
                    matched = allGoods.get(0);
                }
                eduPrintRecord.setPaperGoodsId(matched.getGoodsId());
            }
        }
        if (eduPrintRecord.getPaperGoodsId() == null)
        {
            throw new ServiceException("必须选择用纸物品！请在仓储物资中添加对应纸张耗材");
        }
        if (eduPrintRecord.getPrintCount() == null || eduPrintRecord.getPrintCount() <= 0)
        {
            throw new ServiceException("印刷份数必须大于0！");
        }

        // 校验并计算每份页数与消耗总用纸量（支持单页印刷与双页印刷）
        Long pageCount = eduPrintRecord.getPageCount();
        if (pageCount == null || pageCount <= 0)
        {
            pageCount = 1L;
            eduPrintRecord.setPageCount(1L);
        }
        String printSide = StringUtils.isNotEmpty(eduPrintRecord.getPrintSide()) ? eduPrintRecord.getPrintSide() : "1";
        eduPrintRecord.setPrintSide(printSide);

        // 每份耗纸张数：单页印刷为每份 pageCount 张；双页印刷为 (pageCount + 1) / 2 张
        long sheetsPerCopy = "2".equals(printSide) ? ((pageCount + 1) / 2) : pageCount;
        long totalSheets = eduPrintRecord.getPrintCount() * sheetsPerCopy;
        eduPrintRecord.setTotalPages(totalSheets);

        String sideDesc = "2".equals(printSide) ? "双页印刷" : "单页印刷";

        // 校验纸张库存
        StockGoods paperGoods = stockGoodsMapper.selectEduGoodsByGoodsId(eduPrintRecord.getPaperGoodsId());
        if (paperGoods == null)
        {
            throw new ServiceException("选中的用纸物品不存在！");
        }
        long currentStock = paperGoods.getStockNum() == null ? 0L : paperGoods.getStockNum();
        if (currentStock < totalSheets)
        {
            throw new ServiceException("用纸【" + paperGoods.getGoodsName() + "】库存不足，当前库存为 " + currentStock
                    + " 张，本次印刷总耗纸需求为 " + totalSheets + " 张（" + eduPrintRecord.getPrintCount() + "份 × 每份" + pageCount + "页[" + sideDesc + "，耗纸" + sheetsPerCopy + "张/份]）！");
        }

        // 获取申请教师姓名并优先从教师档案补全年级与班级
        String receiver = "文印登记";
        if (eduPrintRecord.getTeacherId() != null)
        {
            EduTeacher teacher = eduTeacherMapper.selectEduTeacherByTeacherId(eduPrintRecord.getTeacherId());
            if (teacher != null)
            {
                receiver = teacher.getTeacherName();
                if (StringUtils.isEmpty(eduPrintRecord.getGrade()) && StringUtils.isNotEmpty(teacher.getGrade()))
                {
                    eduPrintRecord.setGrade(teacher.getGrade());
                }
                if (eduPrintRecord.getClassId() == null && StringUtils.isNotEmpty(teacher.getClassIds()))
                {
                    try
                    {
                        String firstClassId = teacher.getClassIds().split(",")[0].trim();
                        eduPrintRecord.setClassId(Long.parseLong(firstClassId));
                    }
                    catch (Exception ignored) {}
                }
            }
        }
        if (eduPrintRecord.getClassId() != null && eduClassMapper != null)
        {
            EduClass ec = eduClassMapper.selectEduClassByClassId(eduPrintRecord.getClassId());
            if (ec != null)
            {
                if (StringUtils.isEmpty(eduPrintRecord.getClassName()))
                {
                    eduPrintRecord.setClassName(ec.getClassName());
                }
                if (StringUtils.isEmpty(eduPrintRecord.getGrade()) && StringUtils.isNotEmpty(ec.getGrade()))
                {
                    eduPrintRecord.setGrade(ec.getGrade());
                }
            }
        }

        String op = StringUtils.isNotEmpty(eduPrintRecord.getOperator()) ? eduPrintRecord.getOperator() : (StringUtils.isNotEmpty(eduPrintRecord.getCreateBy()) ? eduPrintRecord.getCreateBy() : "文印管理员");
        if (eduPrintRecord.getPrintTime() == null)
        {
            eduPrintRecord.setPrintTime(DateUtils.getNowDate());
        }
        if (StringUtils.isEmpty(eduPrintRecord.getOperator()))
        {
            eduPrintRecord.setOperator(op);
        }

        // 1. 自动生成一条「耗材出库」（out_type = '3'）类型的出库单（出库数量 = 份数 × 每份页数）
        StockOut stockOut = new StockOut();
        stockOut.setOutType("3"); // 3-耗材出库
        stockOut.setReceiver(receiver);
        stockOut.setOperator(op);
        stockOut.setOutTime(eduPrintRecord.getPrintTime());
        stockOut.setRemark("关联印刷登记【" + eduPrintRecord.getPrintName() + "】用纸出库(" + eduPrintRecord.getPrintCount() + "份 × 每份" + pageCount + "页[" + sideDesc + "] = " + totalSheets + "张)");

        List<StockOutItem> items = new ArrayList<>();
        StockOutItem item = new StockOutItem();
        item.setGoodsId(eduPrintRecord.getPaperGoodsId());
        item.setQuantity(totalSheets);
        items.add(item);
        stockOut.setItemList(items);

        // 调用出库服务（内部有强制事务保证单据生成与库存扣减）
        stockOutService.insertEduStockOut(stockOut);

        // 2. 回写关联出库单ID到印刷登记
        eduPrintRecord.setOutId(stockOut.getOutId());
        if (StringUtils.isEmpty(eduPrintRecord.getStatus()))
        {
            eduPrintRecord.setStatus("0"); // 默认 0-待印刷
        }
        eduPrintRecord.setDelFlag("0");
        if (eduPrintRecord.getPrintTime() == null)
        {
            eduPrintRecord.setPrintTime(DateUtils.getNowDate());
        }
        eduPrintRecord.setCreateTime(DateUtils.getNowDate());

        return eduPrintRecordMapper.insertEduPrintRecord(eduPrintRecord);
    }

    /**
     * 修改印刷登记
     * 
     * @param eduPrintRecord 印刷登记
     * @return 结果
     */
    @Override
    public int updateEduPrintRecord(EduPrintRecord eduPrintRecord)
    {
        eduPrintRecord.setUpdateTime(DateUtils.getNowDate());
        if (eduPrintRecord.getClassId() != null && eduClassMapper != null && StringUtils.isEmpty(eduPrintRecord.getClassName()))
        {
            EduClass ec = eduClassMapper.selectEduClassByClassId(eduPrintRecord.getClassId());
            if (ec != null)
            {
                eduPrintRecord.setClassName(ec.getClassName());
                if (StringUtils.isEmpty(eduPrintRecord.getGrade()) && StringUtils.isNotEmpty(ec.getGrade()))
                {
                    eduPrintRecord.setGrade(ec.getGrade());
                }
            }
        }
        return eduPrintRecordMapper.updateEduPrintRecord(eduPrintRecord);
    }

    /**
     * 作废印刷登记（同步作废关联耗材出库单并回退库存）
     * 
     * @param printId 印刷登记主键
     * @return 结果
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int cancelEduPrintRecord(Long printId)
    {
        EduPrintRecord record = eduPrintRecordMapper.selectEduPrintRecordByPrintId(printId);
        if (record == null)
        {
            throw new ServiceException("印刷登记记录不存在！");
        }
        if ("2".equals(record.getStatus()))
        {
            throw new ServiceException("该印刷登记已作废，请勿重复操作！");
        }

        // 同步作废关联的出库单，库存自动回退
        if (record.getOutId() != null)
        {
            stockOutService.cancelEduStockOut(record.getOutId());
        }

        EduPrintRecord updateObj = new EduPrintRecord();
        updateObj.setPrintId(printId);
        updateObj.setStatus("2"); // 2-已作废
        updateObj.setUpdateTime(DateUtils.getNowDate());
        return eduPrintRecordMapper.updateEduPrintRecord(updateObj);
    }

    /**
     * 批量删除印刷登记（级联删除关联出库单并自动回退库存）
     * 
     * @param printIds 需要删除的印刷登记主键
     * @return 结果
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int deleteEduPrintRecordByPrintIds(Long[] printIds)
    {
        if (printIds != null && printIds.length > 0)
        {
            for (Long printId : printIds)
            {
                deleteEduPrintRecordByPrintId(printId);
            }
            return printIds.length;
        }
        return 0;
    }

    /**
     * 删除印刷登记信息（级联删除关联出库单并自动回退库存）
     * 
     * @param printId 印刷登记主键
     * @return 结果
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public int deleteEduPrintRecordByPrintId(Long printId)
    {
        EduPrintRecord record = eduPrintRecordMapper.selectEduPrintRecordByPrintId(printId);
        if (record != null && record.getOutId() != null)
        {
            try
            {
                // 级联处理关联出库单（若未作废自动先作废回退库存，并置为删除）
                stockOutService.deleteEduStockOutByOutId(record.getOutId());
            }
            catch (Exception e)
            {
                throw new ServiceException("删除印刷登记失败，关联出库单联动处理异常: " + e.getMessage());
            }
        }
        return eduPrintRecordMapper.deleteEduPrintRecordByPrintId(printId);
    }

    /**
     * 获取文印统计报表数据
     */
    @Override
    public com.doupi.edu.domain.vo.EduPrintReportVo getPrintReport(EduPrintRecord eduPrintRecord)
    {
        com.doupi.edu.domain.vo.EduPrintReportVo vo = new com.doupi.edu.domain.vo.EduPrintReportVo();
        
        // 1. 概览汇总
        java.util.Map<String, Object> summary = eduPrintRecordMapper.selectPrintSummary(eduPrintRecord);
        if (summary == null)
        {
            summary = new java.util.HashMap<>();
            summary.put("totalJobs", 0);
            summary.put("totalPrintCount", 0);
            summary.put("totalPages", 0);
            summary.put("completedJobs", 0);
            summary.put("completedPrintCount", 0);
            summary.put("completedPages", 0);
            summary.put("pendingJobs", 0);
            summary.put("pendingPrintCount", 0);
            summary.put("pendingPages", 0);
            summary.put("cancelledJobs", 0);
            summary.put("cancelledPages", 0);
        }
        long totalPages = summary.get("totalPages") != null ? ((Number) summary.get("totalPages")).longValue() : 0L;
        long completedPages = summary.get("completedPages") != null ? ((Number) summary.get("completedPages")).longValue() : totalPages;
        double unitPrice = 0.06;
        double sheetsPerReam = 500.0;
        if (configService != null)
        {
            String priceStr = configService.selectConfigByKey("edu.print.paperPricePerSheet");
            if (StringUtils.isNotEmpty(priceStr))
            {
                try { unitPrice = Double.parseDouble(priceStr); } catch (Exception ignored) {}
            }
            String reamStr = configService.selectConfigByKey("edu.print.sheetsPerReam");
            if (StringUtils.isNotEmpty(reamStr))
            {
                try { sheetsPerReam = Double.parseDouble(reamStr); } catch (Exception ignored) {}
            }
        }
        double reams = Math.round((completedPages / sheetsPerReam) * 10.0) / 10.0;
        double totalCost = Math.round(completedPages * unitPrice * 100.0) / 100.0;
        summary.put("unitPrice", unitPrice);
        summary.put("sheetsPerReam", sheetsPerReam);
        summary.put("totalReams", reams);
        summary.put("totalCost", totalCost);
        vo.setSummary(summary);

        // 2. 纸张类型分布
        java.util.List<java.util.Map<String, Object>> paperStats = eduPrintRecordMapper.selectPaperTypeStats(eduPrintRecord);
        vo.setPaperTypeStats(paperStats != null ? paperStats : java.util.Collections.emptyList());

        // 3. 各年级文印分布
        java.util.List<java.util.Map<String, Object>> gradeStats = eduPrintRecordMapper.selectGradePrintStats(eduPrintRecord);
        vo.setGradeStats(gradeStats != null ? gradeStats : java.util.Collections.emptyList());

        // 4. 教师文印排行
        java.util.List<java.util.Map<String, Object>> teacherStats = eduPrintRecordMapper.selectTeacherPrintStats(eduPrintRecord);
        vo.setTeacherStats(teacherStats != null ? teacherStats : java.util.Collections.emptyList());

        // 5. 月度走势
        java.util.List<java.util.Map<String, Object>> monthly = eduPrintRecordMapper.selectMonthlyPrintStats();
        vo.setMonthlyTrends(monthly != null ? monthly : java.util.Collections.emptyList());

        return vo;
    }
}
