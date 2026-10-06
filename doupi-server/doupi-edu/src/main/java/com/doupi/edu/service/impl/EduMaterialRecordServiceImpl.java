package com.doupi.edu.service.impl;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.doupi.common.exception.ServiceException;
import com.doupi.common.utils.DateUtils;
import com.doupi.common.utils.StringUtils;
import com.doupi.edu.domain.EduMaterialRecord;
import com.doupi.edu.domain.EduMaterialRecordItem;
import com.doupi.edu.domain.vo.EduMaterialClassStatVo;
import com.doupi.edu.domain.vo.EduMaterialDetailReportVo;
import com.doupi.edu.domain.vo.EduMaterialPersonStatVo;
import com.doupi.edu.domain.vo.EduMaterialReportSummaryVo;
import com.doupi.edu.mapper.EduMaterialRecordItemMapper;
import com.doupi.edu.mapper.EduMaterialRecordMapper;
import com.doupi.edu.service.IEduMaterialRecordService;
import com.doupi.stock.domain.StockGoods;
import com.doupi.stock.domain.StockOut;
import com.doupi.stock.domain.StockOutItem;
import com.doupi.stock.mapper.StockGoodsMapper;
import com.doupi.stock.mapper.StockOutItemMapper;
import com.doupi.stock.mapper.StockOutMapper;
import com.doupi.stock.service.IStockSeqService;

/**
 * 教务日常物资领退Service业务层处理
 * 
 * @author doupi
 */
@Service
public class EduMaterialRecordServiceImpl implements IEduMaterialRecordService 
{
    @Autowired
    private EduMaterialRecordMapper eduMaterialRecordMapper;

    @Autowired
    private EduMaterialRecordItemMapper eduMaterialRecordItemMapper;

    @Autowired
    private StockGoodsMapper stockGoodsMapper;

    @Autowired
    private StockOutMapper stockOutMapper;

    @Autowired
    private StockOutItemMapper stockOutItemMapper;

    @Autowired
    private IStockSeqService stockSeqService;

    @Override
    public EduMaterialRecord selectEduMaterialRecordById(Long recordId)
    {
        EduMaterialRecord record = eduMaterialRecordMapper.selectEduMaterialRecordById(recordId);
        if (record != null)
        {
            List<EduMaterialRecordItem> items = eduMaterialRecordItemMapper.selectItemsByRecordId(recordId);
            record.setItemList(items);
        }
        return record;
    }

    @Override
    public List<EduMaterialRecord> selectEduMaterialRecordList(EduMaterialRecord record)
    {
        return eduMaterialRecordMapper.selectEduMaterialRecordList(record);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int grantMaterial(EduMaterialRecord record)
    {
        List<EduMaterialRecordItem> items = record.getItemList();
        if (items == null || items.isEmpty())
        {
            throw new ServiceException("领用发放物品明细不能为空！");
        }
        if (StringUtils.isEmpty(record.getTargetName()))
        {
            throw new ServiceException("领用人姓名不能为空！");
        }

        // 1. 严格校验物资与库存
        int totalQty = 0;
        for (EduMaterialRecordItem item : items)
        {
            if (item.getGoodsId() == null)
            {
                throw new ServiceException("明细中必须选择物资！");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0)
            {
                throw new ServiceException("物资【" + (item.getGoodsName() != null ? item.getGoodsName() : item.getGoodsId()) + "】领用数量必须大于0！");
            }
            StockGoods goods = stockGoodsMapper.selectEduGoodsByGoodsId(item.getGoodsId());
            if (goods == null)
            {
                throw new ServiceException("物资ID【" + item.getGoodsId() + "】不存在！");
            }
            long curStock = goods.getStockNum() == null ? 0L : goods.getStockNum();
            if (curStock < item.getQuantity())
            {
                throw new ServiceException("物资【" + goods.getGoodsName() + "】当前库存不足(仅剩" + curStock + " " + goods.getUnit() + ")，无法发放" + item.getQuantity() + " " + goods.getUnit() + "！");
            }
            item.setGoodsName(goods.getGoodsName());
            item.setSpec(goods.getSpec());
            item.setUnit(goods.getUnit());
            totalQty += item.getQuantity();
        }

        // 2. 初始化主记录信息
        String recordNo = stockSeqService.generateNo("LY");
        record.setRecordNo(recordNo);
        record.setRecordType("1"); // 1-发放领取
        record.setStatus("0"); // 0-正常
        record.setDelFlag("0");
        record.setTotalQuantity(totalQty);
        if (record.getOperateTime() == null)
        {
            record.setOperateTime(DateUtils.getNowDate());
        }
        if (StringUtils.isEmpty(record.getOperator()))
        {
            record.setOperator(StringUtils.isNotEmpty(record.getCreateBy()) ? record.getCreateBy() : "教务处");
        }
        record.setCreateTime(DateUtils.getNowDate());

        int rows = eduMaterialRecordMapper.insertEduMaterialRecord(record);

        // 3. 扣减库存并插入领用明细
        for (EduMaterialRecordItem item : items)
        {
            item.setRecordId(record.getRecordId());
            item.setItemStatus("已领用");
            int deductRows = stockGoodsMapper.deductStock(item.getGoodsId(), item.getQuantity().longValue());
            if (deductRows == 0)
            {
                throw new ServiceException("物资【" + item.getGoodsName() + "】扣减库存失败，可能已被他人同时领用！");
            }
        }
        eduMaterialRecordItemMapper.batchInsertRecordItems(items);

        // 4. 同步生成对应库存出库单流水（确保全校大盘出库台账与报表一致）
        try
        {
            StockOut stockOut = new StockOut();
            stockOut.setOutNo(stockSeqService.generateNo("CK"));
            // 教师领用 1，学生领书 2
            stockOut.setOutType("2".equals(record.getTargetType()) ? "2" : "1");
            stockOut.setReceiver(record.getTargetName());
            stockOut.setClassId(record.getClassId());
            stockOut.setClassName(record.getClassName());
            stockOut.setGrade(record.getGrade());
            stockOut.setOutTime(record.getOperateTime());
            stockOut.setOperator(record.getOperator());
            stockOut.setStatus("1"); // 1-正常
            stockOut.setDelFlag("0");
            stockOut.setCreateBy(record.getCreateBy());
            stockOut.setCreateTime(new Date());
            String remark = "教务日常发放流水单: " + recordNo;
            if (StringUtils.isNotEmpty(record.getKitName()))
            {
                remark += " (套装: " + record.getKitName() + ")";
            }
            stockOut.setRemark(remark);
            stockOutMapper.insertEduStockOut(stockOut);

            List<StockOutItem> outItems = new java.util.ArrayList<>();
            for (EduMaterialRecordItem item : items)
            {
                StockOutItem outItem = new StockOutItem();
                outItem.setOutId(stockOut.getOutId());
                outItem.setGoodsId(item.getGoodsId());
                outItem.setQuantity(item.getQuantity().longValue());
                outItem.setCreateTime(new Date());
                outItems.add(outItem);
            }
            stockOutItemMapper.batchInsertStockOutItems(outItems);
        }
        catch (Exception e)
        {
            // 出库单同步若失败不影响主流程，仅记录
        }

        return rows;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int returnMaterial(EduMaterialRecord record)
    {
        List<EduMaterialRecordItem> items = record.getItemList();
        if (items == null || items.isEmpty())
        {
            throw new ServiceException("退还回收物品明细不能为空！");
        }
        if (StringUtils.isEmpty(record.getTargetName()))
        {
            throw new ServiceException("归还人姓名不能为空！");
        }

        int totalQty = 0;
        for (EduMaterialRecordItem item : items)
        {
            if (item.getGoodsId() == null)
            {
                throw new ServiceException("明细中必须选择物资！");
            }
            if (item.getQuantity() == null || item.getQuantity() <= 0)
            {
                throw new ServiceException("退还数量必须大于0！");
            }
            StockGoods goods = stockGoodsMapper.selectEduGoodsByGoodsId(item.getGoodsId());
            if (goods != null)
            {
                item.setGoodsName(goods.getGoodsName());
                item.setSpec(goods.getSpec());
                item.setUnit(goods.getUnit());
            }
            totalQty += item.getQuantity();
        }

        String recordNo = stockSeqService.generateNo("HS");
        record.setRecordNo(recordNo);
        record.setRecordType("2"); // 2-退还回收
        record.setStatus("0");
        record.setDelFlag("0");
        record.setTotalQuantity(totalQty);
        if (record.getOperateTime() == null)
        {
            record.setOperateTime(DateUtils.getNowDate());
        }
        if (StringUtils.isEmpty(record.getOperator()))
        {
            record.setOperator(StringUtils.isNotEmpty(record.getCreateBy()) ? record.getCreateBy() : "教务处");
        }
        record.setCreateTime(DateUtils.getNowDate());

        int rows = eduMaterialRecordMapper.insertEduMaterialRecord(record);

        // 完好物品自动累加库存回仓
        for (EduMaterialRecordItem item : items)
        {
            item.setRecordId(record.getRecordId());
            String status = item.getItemStatus();
            if (StringUtils.isEmpty(status) || "完好".equals(status) || "可再用".equals(status))
            {
                stockGoodsMapper.addStock(item.getGoodsId(), item.getQuantity().longValue());
            }
        }
        eduMaterialRecordItemMapper.batchInsertRecordItems(items);

        return rows;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int cancelRecord(Long recordId)
    {
        EduMaterialRecord record = eduMaterialRecordMapper.selectEduMaterialRecordById(recordId);
        if (record == null)
        {
            throw new ServiceException("领退记录不存在！");
        }
        if ("1".equals(record.getStatus()))
        {
            throw new ServiceException("该记录已处于撤销作废状态，无需重复操作！");
        }

        List<EduMaterialRecordItem> items = eduMaterialRecordItemMapper.selectItemsByRecordId(recordId);
        if ("1".equals(record.getRecordType()))
        {
            // 撤销发放单：把扣减的库存加回来
            for (EduMaterialRecordItem item : items)
            {
                stockGoodsMapper.addStock(item.getGoodsId(), item.getQuantity().longValue());
            }
        }
        else if ("2".equals(record.getRecordType()))
        {
            // 撤销回收单：把完好累加的库存重新扣回去
            for (EduMaterialRecordItem item : items)
            {
                String status = item.getItemStatus();
                if (StringUtils.isEmpty(status) || "完好".equals(status) || "可再用".equals(status))
                {
                    stockGoodsMapper.deductStock(item.getGoodsId(), item.getQuantity().longValue());
                }
            }
        }

        record.setStatus("1"); // 1-已撤销
        record.setUpdateTime(DateUtils.getNowDate());
        return eduMaterialRecordMapper.updateEduMaterialRecord(record);
    }

    @Override
    public Map<String, Object> selectMaterialDashboardStats()
    {
        return eduMaterialRecordMapper.selectMaterialDashboardStats();
    }

    @Override
    public List<EduMaterialDetailReportVo> selectDetailReportList(Map<String, Object> params)
    {
        return eduMaterialRecordMapper.selectDetailReportList(params);
    }

    @Override
    public List<EduMaterialClassStatVo> selectClassStatList(Map<String, Object> params)
    {
        return eduMaterialRecordMapper.selectClassStatList(params);
    }

    @Override
    public List<EduMaterialPersonStatVo> selectPersonStatList(Map<String, Object> params)
    {
        return eduMaterialRecordMapper.selectPersonStatList(params);
    }

    @Override
    public EduMaterialReportSummaryVo selectReportSummary(Map<String, Object> params)
    {
        EduMaterialReportSummaryVo vo = new EduMaterialReportSummaryVo();
        Map<String, Object> kpi = eduMaterialRecordMapper.selectReportSummaryKpi(params);
        if (kpi != null)
        {
            vo.setTotalGrantQty(((Number) kpi.getOrDefault("totalGrantQty", 0)).intValue());
            vo.setTotalReturnQty(((Number) kpi.getOrDefault("totalReturnQty", 0)).intValue());
            vo.setNetGrantQty(((Number) kpi.getOrDefault("netGrantQty", 0)).intValue());
            vo.setTotalPersonCount(((Number) kpi.getOrDefault("totalPersonCount", 0)).intValue());
            vo.setTotalClassCount(((Number) kpi.getOrDefault("totalClassCount", 0)).intValue());
            vo.setTotalOrderCount(((Number) kpi.getOrDefault("totalOrderCount", 0)).intValue());
            Object totalAmountObj = kpi.get("totalAmount");
            if (totalAmountObj instanceof java.math.BigDecimal)
            {
                vo.setTotalAmount((java.math.BigDecimal) totalAmountObj);
            }
            else if (totalAmountObj instanceof Number)
            {
                vo.setTotalAmount(java.math.BigDecimal.valueOf(((Number) totalAmountObj).doubleValue()));
            }
            else
            {
                vo.setTotalAmount(java.math.BigDecimal.ZERO);
            }
        }
        vo.setCategoryPieData(eduMaterialRecordMapper.selectReportCategoryPie(params));
        vo.setClassRankData(eduMaterialRecordMapper.selectReportClassRank(params));
        vo.setMonthlyTrendData(eduMaterialRecordMapper.selectReportMonthlyTrend(params));
        vo.setTopGoodsList(eduMaterialRecordMapper.selectReportTopGoods(params));
        return vo;
    }

    @Override
    public void exportComprehensiveReport(jakarta.servlet.http.HttpServletResponse response, Map<String, Object> params)
    {
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook())
        {
            ReportStyles styles = createReportStyles(workbook);

            // Sheet 1: 全校概览与关键指标
            buildSummaryKpiSheet(workbook, workbook.createSheet("全校概览与指标"), params, styles);

            // Sheet 2: 各班级物资领用汇总透视（每个物品一行，班级信息合并单元格）
            buildClassStatSheet(workbook, workbook.createSheet("各班级领用透视"), params, styles);

            // Sheet 3: 个人(教师/学生)领用对账单（每个物品一行，人员信息合并单元格）
            buildPersonStatSheet(workbook, workbook.createSheet("个人领用对账单"), params, styles);

            // Sheet 4: 最细化单品穿透流水台账
            buildDetailReportSheet(workbook, workbook.createSheet("最细化穿透流水清单"), params, styles);

            writeWorkbookToResponse(response, workbook, "教务物资领退全维度综合审计报表_" + System.currentTimeMillis());
        }
        catch (Exception e)
        {
            throw new ServiceException("生成综合审计报表失败: " + e.getMessage());
        }
    }

    @Override
    public void exportClassReport(jakarta.servlet.http.HttpServletResponse response, Map<String, Object> params)
    {
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook())
        {
            ReportStyles styles = createReportStyles(workbook);
            buildClassStatSheet(workbook, workbook.createSheet("各班级物资领用透视表"), params, styles);
            writeWorkbookToResponse(response, workbook, "各班级物资领用透视表_" + System.currentTimeMillis());
        }
        catch (Exception e)
        {
            throw new ServiceException("生成班级领用透视报表失败: " + e.getMessage());
        }
    }

    @Override
    public void exportPersonReport(jakarta.servlet.http.HttpServletResponse response, Map<String, Object> params)
    {
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook())
        {
            ReportStyles styles = createReportStyles(workbook);
            buildPersonStatSheet(workbook, workbook.createSheet("个人物资领用对账单"), params, styles);
            writeWorkbookToResponse(response, workbook, "个人物资领用对账单_" + System.currentTimeMillis());
        }
        catch (Exception e)
        {
            throw new ServiceException("生成个人物资领用对账单失败: " + e.getMessage());
        }
    }

    /**
     * 报表通用样式容器
     */
    private static class ReportStyles {
        org.apache.poi.ss.usermodel.CellStyle titleStyle;
        org.apache.poi.ss.usermodel.CellStyle headerStyle;
        org.apache.poi.ss.usermodel.CellStyle centerStyle;
        org.apache.poi.ss.usermodel.CellStyle textStyle;
        org.apache.poi.ss.usermodel.CellStyle intStyle;
        org.apache.poi.ss.usermodel.CellStyle moneyStyle;
    }

    private ReportStyles createReportStyles(org.apache.poi.ss.usermodel.Workbook workbook)
    {
        ReportStyles s = new ReportStyles();
        org.apache.poi.ss.usermodel.DataFormat df = workbook.createDataFormat();

        // 标题样式
        s.titleStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 15);
        s.titleStyle.setFont(titleFont);
        s.titleStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        s.titleStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);

        // 表头样式（专业藏青蓝背景、白色粗体）
        s.headerStyle = workbook.createCellStyle();
        org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setFontHeightInPoints((short) 11);
        headerFont.setColor(org.apache.poi.ss.usermodel.IndexedColors.WHITE.getIndex());
        s.headerStyle.setFont(headerFont);
        s.headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.ROYAL_BLUE.getIndex());
        s.headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
        s.headerStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        s.headerStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setThinBorders(s.headerStyle);

        // 居中单元格（用于合并单元格和编码/类别等）
        s.centerStyle = workbook.createCellStyle();
        s.centerStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
        s.centerStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setThinBorders(s.centerStyle);

        // 左对齐文本单元格（品名、规格等）
        s.textStyle = workbook.createCellStyle();
        s.textStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.LEFT);
        s.textStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        setThinBorders(s.textStyle);

        // 整数单元格（右对齐）
        s.intStyle = workbook.createCellStyle();
        s.intStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.RIGHT);
        s.intStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        s.intStyle.setDataFormat(df.getFormat("#,##0"));
        setThinBorders(s.intStyle);

        // 金额/单价单元格（两位小数右对齐）
        s.moneyStyle = workbook.createCellStyle();
        s.moneyStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.RIGHT);
        s.moneyStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
        s.moneyStyle.setDataFormat(df.getFormat("#,##0.00"));
        setThinBorders(s.moneyStyle);

        return s;
    }

    private void setThinBorders(org.apache.poi.ss.usermodel.CellStyle style)
    {
        style.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
        style.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);
    }

    /**
     * 构建 Sheet 1: 全校概览与关键指标
     */
    private void buildSummaryKpiSheet(org.apache.poi.ss.usermodel.Workbook workbook, org.apache.poi.ss.usermodel.Sheet sheet, Map<String, Object> params, ReportStyles styles)
    {
        sheet.setDefaultColumnWidth(24);
        sheet.setColumnWidth(0, 22 * 256);
        sheet.setColumnWidth(1, 16 * 256);
        sheet.setColumnWidth(2, 14 * 256);
        sheet.setColumnWidth(3, 40 * 256);

        EduMaterialReportSummaryVo summary = selectReportSummary(params);

        org.apache.poi.ss.usermodel.Row row0 = sheet.createRow(0);
        row0.setHeightInPoints(32);
        org.apache.poi.ss.usermodel.Cell c0 = row0.createCell(0);
        c0.setCellValue("教务物资领退全景审计概览报表");
        c0.setCellStyle(styles.titleStyle);
        for (int i = 1; i <= 3; i++) {
            row0.createCell(i).setCellStyle(styles.titleStyle);
        }
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 3));

        String[] kpiHeaders = {"关键指标名称", "统计数值", "度量单位", "指标业务说明"};
        org.apache.poi.ss.usermodel.Row row2 = sheet.createRow(2);
        row2.setHeightInPoints(26);
        for (int i = 0; i < kpiHeaders.length; i++) {
            org.apache.poi.ss.usermodel.Cell cell = row2.createCell(i);
            cell.setCellValue(kpiHeaders[i]);
            cell.setCellStyle(styles.headerStyle);
        }

        Object[][] kpiData = {
            {"累计发放物资总数", summary.getTotalGrantQty() != null ? summary.getTotalGrantQty() : 0, "件/套/本", "指定统计区间内累计正常发放物资总量"},
            {"累计回收物资总数", summary.getTotalReturnQty() != null ? summary.getTotalReturnQty() : 0, "件/套/本", "教师离职、学生退学或完好物资回收入库量"},
            {"净领用消耗总数", summary.getNetGrantQty() != null ? summary.getNetGrantQty() : 0, "件/套/本", "实际净流出在用物资总数量"},
            {"参与领用总人次", summary.getTotalPersonCount() != null ? summary.getTotalPersonCount() : 0, "人次", "涉及领用登记的独立教师与学生总人数"},
            {"覆盖班级总数", summary.getTotalClassCount() != null ? summary.getTotalClassCount() : 0, "个", "发生过教材、耗材、教具领用的班级数"},
            {"领退业务单据总笔数", summary.getTotalOrderCount() != null ? summary.getTotalOrderCount() : 0, "单", "教务领退流水登记总笔数"},
            {"物资估算总金额", summary.getTotalAmount() != null ? summary.getTotalAmount().doubleValue() : 0.0, "元(RMB)", "按入库加权进价折合的总物资消耗价值"}
        };

        int curR = 3;
        for (Object[] kd : kpiData) {
            org.apache.poi.ss.usermodel.Row r = sheet.createRow(curR++);
            r.setHeightInPoints(22);
            
            org.apache.poi.ss.usermodel.Cell cName = r.createCell(0);
            cName.setCellValue(String.valueOf(kd[0]));
            cName.setCellStyle(styles.centerStyle);

            org.apache.poi.ss.usermodel.Cell cVal = r.createCell(1);
            if (kd[1] instanceof Number) {
                double val = ((Number) kd[1]).doubleValue();
                cVal.setCellValue(val);
                if (kd[0].toString().contains("金额")) {
                    cVal.setCellStyle(styles.moneyStyle);
                } else {
                    cVal.setCellStyle(styles.intStyle);
                }
            } else {
                cVal.setCellValue(String.valueOf(kd[1]));
                cVal.setCellStyle(styles.centerStyle);
            }

            org.apache.poi.ss.usermodel.Cell cUnit = r.createCell(2);
            cUnit.setCellValue(String.valueOf(kd[2]));
            cUnit.setCellStyle(styles.centerStyle);

            org.apache.poi.ss.usermodel.Cell cDesc = r.createCell(3);
            cDesc.setCellValue(String.valueOf(kd[3]));
            cDesc.setCellStyle(styles.textStyle);
        }
    }

    /**
     * 构建 Sheet 2: 各班级物资领用汇总透视（每个物品一行，其他列合并单元格）
     */
    private void buildClassStatSheet(org.apache.poi.ss.usermodel.Workbook workbook, org.apache.poi.ss.usermodel.Sheet sheet, Map<String, Object> params, ReportStyles styles)
    {
        sheet.createFreezePane(0, 1);
        String[] headers = {
            "所属年级", "班级名称", "领用单据数", "班级领用总件数", "物资总估值(元)", "领用人次",
            "物资品类", "物资名称", "规格型号", "单位", "领用数量", "参考单价(元)", "金额小计(元)"
        };
        int[] colWidths = {14, 18, 14, 16, 16, 14, 16, 26, 18, 10, 14, 15, 16};
        for (int i = 0; i < colWidths.length; i++) {
            sheet.setColumnWidth(i, colWidths[i] * 256);
        }

        org.apache.poi.ss.usermodel.Row headRow = sheet.createRow(0);
        headRow.setHeightInPoints(28);
        for (int i = 0; i < headers.length; i++) {
            org.apache.poi.ss.usermodel.Cell cell = headRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(styles.headerStyle);
        }

        List<EduMaterialClassStatVo> classList = selectClassStatList(params);
        List<EduMaterialDetailReportVo> allClassItems = eduMaterialRecordMapper.selectClassGoodsItemsList(params);

        // 按班级聚合明细单项：key = classId + "_" + grade
        Map<String, List<EduMaterialDetailReportVo>> classItemsMap = new LinkedHashMap<>();
        if (allClassItems != null) {
            for (EduMaterialDetailReportVo item : allClassItems) {
                String key = (item.getClassId() != null ? item.getClassId() : 0) + "_" + (item.getGrade() != null ? item.getGrade() : "");
                classItemsMap.computeIfAbsent(key, k -> new ArrayList<>()).add(item);
            }
        }

        int curRow = 1;
        for (EduMaterialClassStatVo cs : classList) {
            String key = (cs.getClassId() != null ? cs.getClassId() : 0) + "_" + (cs.getGrade() != null ? cs.getGrade() : "");
            List<EduMaterialDetailReportVo> items = classItemsMap.get(key);

            if (items == null || items.isEmpty()) {
                // 没有明细物资单项，输出单行
                org.apache.poi.ss.usermodel.Row r = sheet.createRow(curRow++);
                r.setHeightInPoints(22);
                fillClassBaseCells(r, cs, styles);
                fillEmptyGoodsCells(r, 6, styles);
            } else {
                int startRow = curRow;
                int endRow = curRow + items.size() - 1;

                for (int idx = 0; idx < items.size(); idx++) {
                    EduMaterialDetailReportVo item = items.get(idx);
                    org.apache.poi.ss.usermodel.Row r = sheet.createRow(curRow++);
                    r.setHeightInPoints(22);

                    // 填充左侧班级列
                    fillClassBaseCells(r, cs, styles);

                    // 填充右侧单品列（每品一行）
                    fillGoodsItemCells(r, 6, item, styles);
                }

                // 如果该班级领用了多种物资，合并左侧 0~5 列单元格
                if (items.size() > 1) {
                    for (int col = 0; col <= 5; col++) {
                        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(startRow, endRow, col, col));
                    }
                }
            }
        }
    }

    private void fillClassBaseCells(org.apache.poi.ss.usermodel.Row r, EduMaterialClassStatVo cs, ReportStyles styles)
    {
        org.apache.poi.ss.usermodel.Cell c0 = r.createCell(0);
        c0.setCellValue(cs.getGrade() != null ? cs.getGrade() : "-");
        c0.setCellStyle(styles.centerStyle);

        org.apache.poi.ss.usermodel.Cell c1 = r.createCell(1);
        c1.setCellValue(cs.getClassName() != null ? cs.getClassName() : "-");
        c1.setCellStyle(styles.centerStyle);

        org.apache.poi.ss.usermodel.Cell c2 = r.createCell(2);
        c2.setCellValue(cs.getOrderCount() != null ? cs.getOrderCount() : 0);
        c2.setCellStyle(styles.intStyle);

        org.apache.poi.ss.usermodel.Cell c3 = r.createCell(3);
        c3.setCellValue(cs.getTotalQuantity() != null ? cs.getTotalQuantity() : 0);
        c3.setCellStyle(styles.intStyle);

        org.apache.poi.ss.usermodel.Cell c4 = r.createCell(4);
        c4.setCellValue(cs.getTotalAmount() != null ? cs.getTotalAmount().doubleValue() : 0.0);
        c4.setCellStyle(styles.moneyStyle);

        org.apache.poi.ss.usermodel.Cell c5 = r.createCell(5);
        c5.setCellValue(cs.getPersonCount() != null ? cs.getPersonCount() : 0);
        c5.setCellStyle(styles.intStyle);
    }

    /**
     * 构建 Sheet 3: 个人领用对账单（每个物品一行，其他列合并单元格）
     */
    private void buildPersonStatSheet(org.apache.poi.ss.usermodel.Workbook workbook, org.apache.poi.ss.usermodel.Sheet sheet, Map<String, Object> params, ReportStyles styles)
    {
        sheet.createFreezePane(0, 1);
        String[] headers = {
            "人员类型", "领用人姓名", "所在班级/部门", "所属年级", "学科/选科", "经办单据数", "累计领用件数", "物资总估值(元)",
            "物资品类", "物资名称", "规格型号", "单位", "领用数量", "参考单价(元)", "金额小计(元)"
        };
        int[] colWidths = {12, 16, 18, 14, 14, 14, 15, 16, 16, 26, 18, 10, 14, 15, 16};
        for (int i = 0; i < colWidths.length; i++) {
            sheet.setColumnWidth(i, colWidths[i] * 256);
        }

        org.apache.poi.ss.usermodel.Row headRow = sheet.createRow(0);
        headRow.setHeightInPoints(28);
        for (int i = 0; i < headers.length; i++) {
            org.apache.poi.ss.usermodel.Cell cell = headRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(styles.headerStyle);
        }

        List<EduMaterialPersonStatVo> personList = selectPersonStatList(params);
        List<EduMaterialDetailReportVo> allPersonItems = eduMaterialRecordMapper.selectPersonGoodsItemsList(params);

        // 按人员聚合明细单项：key = targetType + "_" + targetName
        Map<String, List<EduMaterialDetailReportVo>> personItemsMap = new LinkedHashMap<>();
        if (allPersonItems != null) {
            for (EduMaterialDetailReportVo item : allPersonItems) {
                String key = (item.getTargetType() != null ? item.getTargetType() : "") + "_" + (item.getTargetName() != null ? item.getTargetName() : "");
                personItemsMap.computeIfAbsent(key, k -> new ArrayList<>()).add(item);
            }
        }

        int curRow = 1;
        for (EduMaterialPersonStatVo ps : personList) {
            String key = (ps.getTargetType() != null ? ps.getTargetType() : "") + "_" + (ps.getTargetName() != null ? ps.getTargetName() : "");
            List<EduMaterialDetailReportVo> items = personItemsMap.get(key);

            if (items == null || items.isEmpty()) {
                org.apache.poi.ss.usermodel.Row r = sheet.createRow(curRow++);
                r.setHeightInPoints(22);
                fillPersonBaseCells(r, ps, styles);
                fillEmptyGoodsCells(r, 8, styles);
            } else {
                int startRow = curRow;
                int endRow = curRow + items.size() - 1;

                for (int idx = 0; idx < items.size(); idx++) {
                    EduMaterialDetailReportVo item = items.get(idx);
                    org.apache.poi.ss.usermodel.Row r = sheet.createRow(curRow++);
                    r.setHeightInPoints(22);

                    // 填充左侧人员信息
                    fillPersonBaseCells(r, ps, styles);

                    // 填充右侧单品明细（每品一行）
                    fillGoodsItemCells(r, 8, item, styles);
                }

                // 如果该人员领用了多种物资，合并左侧 0~7 列单元格
                if (items.size() > 1) {
                    for (int col = 0; col <= 7; col++) {
                        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(startRow, endRow, col, col));
                    }
                }
            }
        }
    }

    private void fillPersonBaseCells(org.apache.poi.ss.usermodel.Row r, EduMaterialPersonStatVo ps, ReportStyles styles)
    {
        org.apache.poi.ss.usermodel.Cell c0 = r.createCell(0);
        c0.setCellValue(ps.getTargetTypeName() != null ? ps.getTargetTypeName() : "-");
        c0.setCellStyle(styles.centerStyle);

        org.apache.poi.ss.usermodel.Cell c1 = r.createCell(1);
        c1.setCellValue(ps.getTargetName() != null ? ps.getTargetName() : "-");
        c1.setCellStyle(styles.centerStyle);

        org.apache.poi.ss.usermodel.Cell c2 = r.createCell(2);
        c2.setCellValue(ps.getClassName() != null ? ps.getClassName() : "-");
        c2.setCellStyle(styles.centerStyle);

        org.apache.poi.ss.usermodel.Cell c3 = r.createCell(3);
        c3.setCellValue(ps.getGrade() != null ? ps.getGrade() : "-");
        c3.setCellStyle(styles.centerStyle);

        org.apache.poi.ss.usermodel.Cell c4 = r.createCell(4);
        c4.setCellValue(ps.getSubject() != null ? ps.getSubject() : "-");
        c4.setCellStyle(styles.centerStyle);

        org.apache.poi.ss.usermodel.Cell c5 = r.createCell(5);
        c5.setCellValue(ps.getOrderCount() != null ? ps.getOrderCount() : 0);
        c5.setCellStyle(styles.intStyle);

        org.apache.poi.ss.usermodel.Cell c6 = r.createCell(6);
        c6.setCellValue(ps.getTotalQuantity() != null ? ps.getTotalQuantity() : 0);
        c6.setCellStyle(styles.intStyle);

        org.apache.poi.ss.usermodel.Cell c7 = r.createCell(7);
        c7.setCellValue(ps.getTotalAmount() != null ? ps.getTotalAmount().doubleValue() : 0.0);
        c7.setCellStyle(styles.moneyStyle);
    }

    private void fillGoodsItemCells(org.apache.poi.ss.usermodel.Row r, int startCol, EduMaterialDetailReportVo item, ReportStyles styles)
    {
        org.apache.poi.ss.usermodel.Cell c0 = r.createCell(startCol);
        c0.setCellValue(item.getCategoryName() != null ? item.getCategoryName() : "-");
        c0.setCellStyle(styles.centerStyle);

        org.apache.poi.ss.usermodel.Cell c1 = r.createCell(startCol + 1);
        c1.setCellValue(item.getGoodsName() != null ? item.getGoodsName() : "-");
        c1.setCellStyle(styles.textStyle);

        org.apache.poi.ss.usermodel.Cell c2 = r.createCell(startCol + 2);
        c2.setCellValue(item.getSpec() != null ? item.getSpec() : "-");
        c2.setCellStyle(styles.centerStyle);

        org.apache.poi.ss.usermodel.Cell c3 = r.createCell(startCol + 3);
        c3.setCellValue(item.getUnit() != null ? item.getUnit() : "件");
        c3.setCellStyle(styles.centerStyle);

        org.apache.poi.ss.usermodel.Cell c4 = r.createCell(startCol + 4);
        c4.setCellValue(item.getQuantity() != null ? item.getQuantity() : 0);
        c4.setCellStyle(styles.intStyle);

        org.apache.poi.ss.usermodel.Cell c5 = r.createCell(startCol + 5);
        c5.setCellValue(item.getPrice() != null ? item.getPrice().doubleValue() : 0.0);
        c5.setCellStyle(styles.moneyStyle);

        org.apache.poi.ss.usermodel.Cell c6 = r.createCell(startCol + 6);
        c6.setCellValue(item.getAmount() != null ? item.getAmount().doubleValue() : 0.0);
        c6.setCellStyle(styles.moneyStyle);
    }

    private void fillEmptyGoodsCells(org.apache.poi.ss.usermodel.Row r, int startCol, ReportStyles styles)
    {
        for (int i = 0; i < 4; i++) {
            org.apache.poi.ss.usermodel.Cell cell = r.createCell(startCol + i);
            cell.setCellValue("-");
            cell.setCellStyle(styles.centerStyle);
        }
        org.apache.poi.ss.usermodel.Cell cQty = r.createCell(startCol + 4);
        cQty.setCellValue(0);
        cQty.setCellStyle(styles.intStyle);

        org.apache.poi.ss.usermodel.Cell cPrice = r.createCell(startCol + 5);
        cPrice.setCellValue(0.0);
        cPrice.setCellStyle(styles.moneyStyle);

        org.apache.poi.ss.usermodel.Cell cAmount = r.createCell(startCol + 6);
        cAmount.setCellValue(0.0);
        cAmount.setCellStyle(styles.moneyStyle);
    }

    /**
     * 构建 Sheet 4: 最细化单品穿透流水台账（20列全字段流水）
     */
    private void buildDetailReportSheet(org.apache.poi.ss.usermodel.Workbook workbook, org.apache.poi.ss.usermodel.Sheet sheet, Map<String, Object> params, ReportStyles styles)
    {
        sheet.createFreezePane(0, 1);
        String[] detailHeaders = {
            "流水单号", "业务类型", "业务场景", "经办领用时间", "所属年级", "班级名称", "领用类型", "领用人姓名", 
            "学科/选科", "物资分类", "物资名称", "规格型号", "单位", "领退数量", "参考单价(元)", "金额估算(元)", 
            "引用套装", "经办教务", "物资状态", "备注说明"
        };
        int[] colWidths = {22, 12, 16, 20, 14, 16, 12, 14, 14, 15, 24, 18, 10, 12, 15, 16, 18, 14, 12, 25};
        for (int i = 0; i < colWidths.length; i++) {
            sheet.setColumnWidth(i, colWidths[i] * 256);
        }

        org.apache.poi.ss.usermodel.Row s4Head = sheet.createRow(0);
        s4Head.setHeightInPoints(28);
        for (int i = 0; i < detailHeaders.length; i++) {
            org.apache.poi.ss.usermodel.Cell cell = s4Head.createCell(i);
            cell.setCellValue(detailHeaders[i]);
            cell.setCellStyle(styles.headerStyle);
        }

        List<EduMaterialDetailReportVo> detailList = selectDetailReportList(params);
        int r4 = 1;
        java.text.SimpleDateFormat sdf = new java.text.SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

        for (EduMaterialDetailReportVo dt : detailList) {
            org.apache.poi.ss.usermodel.Row r = sheet.createRow(r4++);
            r.setHeightInPoints(22);

            createCellWithStyle(r, 0, dt.getRecordNo() != null ? dt.getRecordNo() : "-", styles.centerStyle);
            createCellWithStyle(r, 1, dt.getRecordTypeName() != null ? dt.getRecordTypeName() : "-", styles.centerStyle);
            createCellWithStyle(r, 2, dt.getBusinessCategory() != null ? dt.getBusinessCategory() : "-", styles.centerStyle);
            createCellWithStyle(r, 3, dt.getOperateTime() != null ? sdf.format(dt.getOperateTime()) : "-", styles.centerStyle);
            createCellWithStyle(r, 4, dt.getGrade() != null ? dt.getGrade() : "-", styles.centerStyle);
            createCellWithStyle(r, 5, dt.getClassName() != null ? dt.getClassName() : "-", styles.centerStyle);
            createCellWithStyle(r, 6, dt.getTargetTypeName() != null ? dt.getTargetTypeName() : "-", styles.centerStyle);
            createCellWithStyle(r, 7, dt.getTargetName() != null ? dt.getTargetName() : "-", styles.centerStyle);
            createCellWithStyle(r, 8, dt.getSubject() != null ? dt.getSubject() : "-", styles.centerStyle);
            createCellWithStyle(r, 9, dt.getCategoryName() != null ? dt.getCategoryName() : "-", styles.centerStyle);
            createCellWithStyle(r, 10, dt.getGoodsName() != null ? dt.getGoodsName() : "-", styles.textStyle);
            createCellWithStyle(r, 11, dt.getSpec() != null ? dt.getSpec() : "-", styles.centerStyle);
            createCellWithStyle(r, 12, dt.getUnit() != null ? dt.getUnit() : "件", styles.centerStyle);

            org.apache.poi.ss.usermodel.Cell c13 = r.createCell(13);
            c13.setCellValue(dt.getQuantity() != null ? dt.getQuantity() : 0);
            c13.setCellStyle(styles.intStyle);

            org.apache.poi.ss.usermodel.Cell c14 = r.createCell(14);
            c14.setCellValue(dt.getPrice() != null ? dt.getPrice().doubleValue() : 0.0);
            c14.setCellStyle(styles.moneyStyle);

            org.apache.poi.ss.usermodel.Cell c15 = r.createCell(15);
            c15.setCellValue(dt.getAmount() != null ? dt.getAmount().doubleValue() : 0.0);
            c15.setCellStyle(styles.moneyStyle);

            createCellWithStyle(r, 16, dt.getKitName() != null ? dt.getKitName() : "-", styles.centerStyle);
            createCellWithStyle(r, 17, dt.getOperator() != null ? dt.getOperator() : "-", styles.centerStyle);
            createCellWithStyle(r, 18, dt.getItemStatus() != null ? dt.getItemStatus() : "-", styles.centerStyle);
            createCellWithStyle(r, 19, dt.getRemark() != null ? dt.getRemark() : "", styles.textStyle);
        }
    }

    private void createCellWithStyle(org.apache.poi.ss.usermodel.Row row, int col, String val, org.apache.poi.ss.usermodel.CellStyle style)
    {
        org.apache.poi.ss.usermodel.Cell c = row.createCell(col);
        c.setCellValue(val);
        c.setCellStyle(style);
    }

    private void writeWorkbookToResponse(jakarta.servlet.http.HttpServletResponse response, org.apache.poi.ss.usermodel.Workbook workbook, String baseName) throws Exception
    {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding("utf-8");
        String fileName = java.net.URLEncoder.encode(baseName, "UTF-8").replaceAll("\\+", "%20");
        response.setHeader("Content-disposition", "attachment;filename*=utf-8''" + fileName + ".xlsx");
        workbook.write(response.getOutputStream());
        response.getOutputStream().flush();
    }
}
