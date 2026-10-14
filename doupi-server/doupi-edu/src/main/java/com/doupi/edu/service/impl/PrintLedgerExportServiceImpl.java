package com.doupi.edu.service.impl;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.DataFormat;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import com.doupi.common.utils.StringUtils;
import com.doupi.edu.domain.EduPrintRecord;
import com.doupi.edu.service.IPrintLedgerExportService;

/**
 * 生产文印双Sheet台账导出服务实现
 * 
 * @author doupi
 * @date 2026-10-14
 */
@Service
public class PrintLedgerExportServiceImpl implements IPrintLedgerExportService
{
    private static final String DEFAULT_MISSING_NAME = "名称缺失／待核实";

    @Override
    public void exportLedger(HttpServletResponse response, List<EduPrintRecord> list) throws IOException
    {
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setCharacterEncoding("utf-8");
        String filename = URLEncoder.encode("文印耗材用量流水明细台账_" + new SimpleDateFormat("yyyyMMddHHmmss").format(new Date()), StandardCharsets.UTF_8).replaceAll("\\+", "%20");
        response.setHeader("Content-disposition", "attachment;filename*=utf-8''" + filename + ".xlsx");

        exportLedgerToStream(response.getOutputStream(), list);
    }

    @Override
    public void exportLedgerToStream(OutputStream outputStream, List<EduPrintRecord> list) throws IOException
    {
        if (list == null)
        {
            list = new ArrayList<>();
        }

        try (Workbook workbook = new XSSFWorkbook())
        {
            // 样式准备
            Styles styles = new Styles(workbook);

            // 1. 构建 Sheet 0: "总览"
            buildOverviewSheet(workbook, list, styles);

            // 2. 构建 Sheet 1: "明细"
            buildDetailsSheet(workbook, list, styles);

            workbook.write(outputStream);
            outputStream.flush();
        }
    }

    /**
     * 构建第一个Sheet: "总览"
     */
    private void buildOverviewSheet(Workbook workbook, List<EduPrintRecord> list, Styles styles)
    {
        Sheet sheet = workbook.createSheet("总览");
        sheet.createFreezePane(0, 1);

        String[] headers = {
            "教师姓名",
            "已完成登记次数",
            "待打印登记次数",
            "已完成印刷份数",
            "8K已完成耗纸（张）",
            "16K已完成耗纸（张）",
            "其他纸张已完成耗纸（张）",
            "已完成总耗纸（张）",
            "待打印预占（张）",
            "估算修正记录数"
        };

        // 表头
        Row headerRow = sheet.createRow(0);
        headerRow.setHeightInPoints(26);
        for (int i = 0; i < headers.length; i++)
        {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(styles.headerStyle);
        }

        // 按教师聚合统计
        Map<String, TeacherStat> statMap = new LinkedHashMap<>();
        for (EduPrintRecord r : list)
        {
            String teacherKey = resolveTeacherKey(r);
            TeacherStat stat = statMap.computeIfAbsent(teacherKey, k -> new TeacherStat(resolveTeacherDisplayName(r)));
            stat.accumulate(r);
        }

        int rowIdx = 1;
        long sumCompletedJobs = 0;
        long sumPendingJobs = 0;
        long sumCompletedPrintCount = 0;
        long sum8kSheets = 0;
        long sum16kSheets = 0;
        long sumOtherSheets = 0;
        long sumTotalSheets = 0;
        long sumPendingReserved = 0;
        long sumEstimatedRecords = 0;

        for (TeacherStat stat : statMap.values())
        {
            Row row = sheet.createRow(rowIdx++);
            row.setHeightInPoints(20);

            writeTextCell(row, 0, stat.teacherName, styles.textStyle);
            writeNumericCell(row, 1, stat.completedJobs, styles.numberStyle);
            writeNumericCell(row, 2, stat.pendingJobs, styles.numberStyle);
            writeNumericCell(row, 3, stat.completedPrintCount, styles.numberStyle);
            writeNumericCell(row, 4, stat.completed8kSheets, styles.numberStyle);
            writeNumericCell(row, 5, stat.completed16kSheets, styles.numberStyle);
            writeNumericCell(row, 6, stat.completedOtherSheets, styles.numberStyle);
            writeNumericCell(row, 7, stat.completedTotalSheets, styles.numberStyle);
            writeNumericCell(row, 8, stat.pendingReservedSheets, styles.numberStyle);
            writeNumericCell(row, 9, stat.estimatedRecordsCount, styles.numberStyle);

            sumCompletedJobs += stat.completedJobs;
            sumPendingJobs += stat.pendingJobs;
            sumCompletedPrintCount += stat.completedPrintCount;
            sum8kSheets += stat.completed8kSheets;
            sum16kSheets += stat.completed16kSheets;
            sumOtherSheets += stat.completedOtherSheets;
            sumTotalSheets += stat.completedTotalSheets;
            sumPendingReserved += stat.pendingReservedSheets;
            sumEstimatedRecords += stat.estimatedRecordsCount;
        }

        // 合计行
        Row totalRow = sheet.createRow(rowIdx);
        totalRow.setHeightInPoints(22);
        writeTextCell(totalRow, 0, "合计", styles.totalStyle);
        writeNumericCell(totalRow, 1, sumCompletedJobs, styles.totalNumberStyle);
        writeNumericCell(totalRow, 2, sumPendingJobs, styles.totalNumberStyle);
        writeNumericCell(totalRow, 3, sumCompletedPrintCount, styles.totalNumberStyle);
        writeNumericCell(totalRow, 4, sum8kSheets, styles.totalNumberStyle);
        writeNumericCell(totalRow, 5, sum16kSheets, styles.totalNumberStyle);
        writeNumericCell(totalRow, 6, sumOtherSheets, styles.totalNumberStyle);
        writeNumericCell(totalRow, 7, sumTotalSheets, styles.totalNumberStyle);
        writeNumericCell(totalRow, 8, sumPendingReserved, styles.totalNumberStyle);
        writeNumericCell(totalRow, 9, sumEstimatedRecords, styles.totalNumberStyle);

        // 自动筛选
        if (rowIdx > 1)
        {
            sheet.setAutoFilter(new CellRangeAddress(0, rowIdx - 1, 0, headers.length - 1));
        }

        // 列宽自适应
        for (int i = 0; i < headers.length; i++)
        {
            sheet.setColumnWidth(i, Math.max(16 * 256, (headers[i].length() + 6) * 256));
        }
    }

    /**
     * 构建第二个Sheet: "明细"
     */
    private void buildDetailsSheet(Workbook workbook, List<EduPrintRecord> list, Styles styles)
    {
        Sheet sheet = workbook.createSheet("明细");
        sheet.createFreezePane(0, 1);

        String[] headers = {
            "打印时间",
            "教师姓名",
            "年级",
            "班级",
            "印刷名称",
            "纸张名称",
            "纸张类型",
            "印刷份数",
            "每份页数",
            "单/双面",
            "正式用纸（张）",
            "模板用纸（张）",
            "预览用纸（张）",
            "登记耗纸（张）",
            "错误损耗（张）",
            "合计耗纸（张）",
            "状态",
            "数据说明",
            "备注"
        };

        // 表头
        Row headerRow = sheet.createRow(0);
        headerRow.setHeightInPoints(26);
        for (int i = 0; i < headers.length; i++)
        {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(styles.headerStyle);
        }

        // 排序规则：print_time DESC, print_id DESC（null时间放最后）
        List<EduPrintRecord> sortedList = new ArrayList<>(list);
        sortedList.sort((a, b) -> {
            Date t1 = a.getPrintTime();
            Date t2 = b.getPrintTime();
            if (t1 == null && t2 == null)
            {
                return compareIdDesc(a.getPrintId(), b.getPrintId());
            }
            if (t1 == null) return 1;
            if (t2 == null) return -1;
            int c = t2.compareTo(t1);
            if (c != 0) return c;
            return compareIdDesc(a.getPrintId(), b.getPrintId());
        });

        int rowIdx = 1;
        long sumCopies = 0;
        long sumFormalSheets = 0;
        long sumTemplateSheets = 0;
        long sumPreviewSheets = 0;
        long sumRegisteredSheets = 0;
        long sumErrorSheets = 0;
        long sumGrandTotalSheets = 0;

        for (EduPrintRecord r : sortedList)
        {
            Row row = sheet.createRow(rowIdx++);
            row.setHeightInPoints(20);

            long printCount = r.getPrintCount() != null ? r.getPrintCount() : 0L;
            long pageCount = r.getPageCount() != null ? r.getPageCount() : 1L;
            long totalPages = r.getTotalPages() != null ? r.getTotalPages() : 0L;
            long template = r.getTemplatePaperCount() != null ? r.getTemplatePaperCount() : 0L;
            long preview = r.getPreviewPaperCount() != null ? r.getPreviewPaperCount() : 0L;
            long errorCount = r.getErrorCount() != null ? r.getErrorCount() : 0L;
            long formalSheets = Math.max(0L, totalPages - template - preview);
            long lineTotalSheets = totalPages + errorCount;

            // 0: 打印时间
            if (r.getPrintTime() != null)
            {
                Cell dateCell = row.createCell(0);
                dateCell.setCellValue(r.getPrintTime());
                dateCell.setCellStyle(styles.dateStyle);
            }
            else
            {
                writeTextCell(row, 0, "", styles.textCenterStyle);
            }

            // 1: 教师姓名
            writeTextCell(row, 1, resolveTeacherDisplayName(r), styles.textStyle);
            // 2: 年级
            writeTextCell(row, 2, StringUtils.isNotEmpty(r.getGrade()) ? r.getGrade() : DEFAULT_MISSING_NAME, styles.textCenterStyle);
            // 3: 班级
            writeTextCell(row, 3, StringUtils.isNotEmpty(r.getClassName()) ? r.getClassName() : DEFAULT_MISSING_NAME, styles.textStyle);
            // 4: 印刷名称
            writeTextCell(row, 4, StringUtils.isNotEmpty(r.getPrintName()) ? r.getPrintName() : DEFAULT_MISSING_NAME, styles.textStyle);
            // 5: 纸张名称
            writeTextCell(row, 5, StringUtils.isNotEmpty(r.getPaperGoodsName()) ? r.getPaperGoodsName() : DEFAULT_MISSING_NAME, styles.textStyle);
            // 6: 纸张类型
            writeTextCell(row, 6, StringUtils.isNotEmpty(r.getPaperType()) ? r.getPaperType() : DEFAULT_MISSING_NAME, styles.textCenterStyle);
            // 7: 印刷份数
            writeNumericCell(row, 7, printCount, styles.numberStyle);
            // 8: 每份页数
            writeNumericCell(row, 8, pageCount, styles.numberStyle);
            // 9: 单/双面
            writeTextCell(row, 9, "2".equals(r.getPrintSide()) ? "双页印刷" : "单页印刷", styles.textCenterStyle);
            // 10: 正式用纸
            writeNumericCell(row, 10, formalSheets, styles.numberStyle);
            // 11: 模板用纸
            writeNumericCell(row, 11, template, styles.numberStyle);
            // 12: 预览用纸
            writeNumericCell(row, 12, preview, styles.numberStyle);
            // 13: 登记耗纸
            writeNumericCell(row, 13, totalPages, styles.numberStyle);
            // 14: 错误损耗
            writeNumericCell(row, 14, errorCount, styles.numberStyle);
            // 15: 合计耗纸
            writeNumericCell(row, 15, lineTotalSheets, styles.numberStyle);
            // 16: 状态
            writeTextCell(row, 16, resolveStatusText(r.getStatus()), styles.textCenterStyle);
            // 17: 数据说明
            writeTextCell(row, 17, resolveDataRemark(r), styles.textStyle);
            // 18: 备注
            writeTextCell(row, 18, StringUtils.isNotEmpty(r.getRemark()) ? r.getRemark() : "", styles.textStyle);

            // 仅对有效记录计入合计行
            if (!"2".equals(r.getStatus()))
            {
                sumCopies += printCount;
                sumFormalSheets += formalSheets;
                sumTemplateSheets += template;
                sumPreviewSheets += preview;
                sumRegisteredSheets += totalPages;
                sumErrorSheets += errorCount;
                sumGrandTotalSheets += lineTotalSheets;
            }
        }

        // 明细合计行
        Row totalRow = sheet.createRow(rowIdx);
        totalRow.setHeightInPoints(22);
        writeTextCell(totalRow, 0, "有效记录合计", styles.totalStyle);
        for (int i = 1; i <= 6; i++)
        {
            writeTextCell(totalRow, i, "", styles.totalStyle);
        }
        writeNumericCell(totalRow, 7, sumCopies, styles.totalNumberStyle);
        writeTextCell(totalRow, 8, "-", styles.totalCenterStyle);
        writeTextCell(totalRow, 9, "-", styles.totalCenterStyle);
        writeNumericCell(totalRow, 10, sumFormalSheets, styles.totalNumberStyle);
        writeNumericCell(totalRow, 11, sumTemplateSheets, styles.totalNumberStyle);
        writeNumericCell(totalRow, 12, sumPreviewSheets, styles.totalNumberStyle);
        writeNumericCell(totalRow, 13, sumRegisteredSheets, styles.totalNumberStyle);
        writeNumericCell(totalRow, 14, sumErrorSheets, styles.totalNumberStyle);
        writeNumericCell(totalRow, 15, sumGrandTotalSheets, styles.totalNumberStyle);
        writeTextCell(totalRow, 16, "", styles.totalStyle);
        writeTextCell(totalRow, 17, "", styles.totalStyle);
        writeTextCell(totalRow, 18, "", styles.totalStyle);

        // 自动筛选
        if (rowIdx > 1)
        {
            sheet.setAutoFilter(new CellRangeAddress(0, rowIdx - 1, 0, headers.length - 1));
        }

        // 列宽合理化设置
        int[] minWidths = {20, 14, 10, 14, 28, 18, 12, 10, 10, 12, 14, 14, 14, 14, 14, 14, 10, 16, 24};
        for (int i = 0; i < headers.length; i++)
        {
            sheet.setColumnWidth(i, minWidths[i] * 256);
        }
    }

    private static int compareIdDesc(Long id1, Long id2)
    {
        long v1 = id1 != null ? id1 : 0L;
        long v2 = id2 != null ? id2 : 0L;
        return Long.compare(v2, v1);
    }

    private static String resolveTeacherKey(EduPrintRecord r)
    {
        if (r.getTeacherId() != null)
        {
            return "TID_" + r.getTeacherId();
        }
        if (StringUtils.isNotEmpty(r.getTeacherName()))
        {
            return "NAME_" + r.getTeacherName().trim();
        }
        return "UNKNOWN";
    }

    private static String resolveTeacherDisplayName(EduPrintRecord r)
    {
        if (StringUtils.isNotEmpty(r.getTeacherName()))
        {
            return r.getTeacherName().trim();
        }
        return DEFAULT_MISSING_NAME;
    }

    private static String resolveStatusText(String status)
    {
        if ("1".equals(status)) return "已完成";
        if ("0".equals(status)) return "待打印";
        if ("2".equals(status)) return "已作废";
        return status != null ? status : "未知";
    }

    private static String resolveDataRemark(EduPrintRecord r)
    {
        String remark = r.getRemark() != null ? r.getRemark() : "";
        if (remark.contains("估算"))
        {
            return "估算修正";
        }
        long template = r.getTemplatePaperCount() != null ? r.getTemplatePaperCount() : 0L;
        long preview = r.getPreviewPaperCount() != null ? r.getPreviewPaperCount() : 0L;
        if (template == 0L && preview == 0L)
        {
            return "旧规则耗纸";
        }
        return "正常登记";
    }

    private static void writeTextCell(Row row, int col, String value, CellStyle style)
    {
        Cell cell = row.createCell(col);
        // 防 Excel 公式注入 (=, +, -, @)
        String safeValue = sanitizeFormulaText(value);
        cell.setCellValue(safeValue);
        cell.setCellStyle(style);
    }

    private static void writeNumericCell(Row row, int col, long value, CellStyle style)
    {
        Cell cell = row.createCell(col);
        cell.setCellValue((double) value);
        cell.setCellStyle(style);
    }

    private static String sanitizeFormulaText(String text)
    {
        if (text == null)
        {
            return "";
        }
        if (text.startsWith("=") || text.startsWith("+") || text.startsWith("-") || text.startsWith("@"))
        {
            return "'" + text;
        }
        return text;
    }

    /**
     * 内部样式辅助类
     */
    private static class Styles
    {
        final CellStyle headerStyle;
        final CellStyle textStyle;
        final CellStyle textCenterStyle;
        final CellStyle numberStyle;
        final CellStyle dateStyle;
        final CellStyle totalStyle;
        final CellStyle totalCenterStyle;
        final CellStyle totalNumberStyle;

        Styles(Workbook wb)
        {
            DataFormat format = wb.createDataFormat();

            Font regularFont = wb.createFont();
            regularFont.setFontName("Microsoft YaHei");
            regularFont.setFontHeightInPoints((short) 10);

            Font boldFont = wb.createFont();
            boldFont.setFontName("Microsoft YaHei");
            boldFont.setFontHeightInPoints((short) 10);
            boldFont.setBold(true);

            // 表头样式
            headerStyle = wb.createCellStyle();
            headerStyle.setFont(boldFont);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setBorders(headerStyle);

            // 文本样式
            textStyle = wb.createCellStyle();
            textStyle.setFont(regularFont);
            textStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorders(textStyle);

            textCenterStyle = wb.createCellStyle();
            textCenterStyle.setFont(regularFont);
            textCenterStyle.setAlignment(HorizontalAlignment.CENTER);
            textCenterStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            setBorders(textCenterStyle);

            // 数字样式
            numberStyle = wb.createCellStyle();
            numberStyle.setFont(regularFont);
            numberStyle.setAlignment(HorizontalAlignment.RIGHT);
            numberStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            numberStyle.setDataFormat(format.getFormat("#,##0"));
            setBorders(numberStyle);

            // 日期样式
            dateStyle = wb.createCellStyle();
            dateStyle.setFont(regularFont);
            dateStyle.setAlignment(HorizontalAlignment.CENTER);
            dateStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            dateStyle.setDataFormat(format.getFormat("yyyy-mm-dd hh:mm:ss"));
            setBorders(dateStyle);

            // 合计行样式
            totalStyle = wb.createCellStyle();
            totalStyle.setFont(boldFont);
            totalStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            totalStyle.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
            totalStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setBorders(totalStyle);

            totalCenterStyle = wb.createCellStyle();
            totalCenterStyle.setFont(boldFont);
            totalCenterStyle.setAlignment(HorizontalAlignment.CENTER);
            totalCenterStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            totalCenterStyle.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
            totalCenterStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setBorders(totalCenterStyle);

            totalNumberStyle = wb.createCellStyle();
            totalNumberStyle.setFont(boldFont);
            totalNumberStyle.setAlignment(HorizontalAlignment.RIGHT);
            totalNumberStyle.setVerticalAlignment(VerticalAlignment.CENTER);
            totalNumberStyle.setDataFormat(format.getFormat("#,##0"));
            totalNumberStyle.setFillForegroundColor(IndexedColors.LEMON_CHIFFON.getIndex());
            totalNumberStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            setBorders(totalNumberStyle);
        }

        private static void setBorders(CellStyle style)
        {
            style.setBorderBottom(BorderStyle.THIN);
            style.setBottomBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
            style.setBorderTop(BorderStyle.THIN);
            style.setTopBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
            style.setBorderLeft(BorderStyle.THIN);
            style.setLeftBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
            style.setBorderRight(BorderStyle.THIN);
            style.setRightBorderColor(IndexedColors.GREY_40_PERCENT.getIndex());
        }
    }

    /**
     * 教师统计聚合实体
     */
    private static class TeacherStat
    {
        final String teacherName;
        long completedJobs = 0;
        long pendingJobs = 0;
        long cancelledJobs = 0;
        long completedPrintCount = 0;
        long completed8kSheets = 0;
        long completed16kSheets = 0;
        long completedOtherSheets = 0;
        long completedTotalSheets = 0;
        long pendingReservedSheets = 0;
        long estimatedRecordsCount = 0;

        TeacherStat(String teacherName)
        {
            this.teacherName = teacherName;
        }

        void accumulate(EduPrintRecord r)
        {
            String status = r.getStatus();
            long totalPages = r.getTotalPages() != null ? r.getTotalPages() : 0L;
            long errorCount = r.getErrorCount() != null ? r.getErrorCount() : 0L;
            long printCount = r.getPrintCount() != null ? r.getPrintCount() : 0L;
            long effectiveSheets = totalPages + errorCount;

            String paperType = r.getPaperType() != null ? r.getPaperType().toUpperCase() : "";
            String paperName = r.getPaperGoodsName() != null ? r.getPaperGoodsName().toUpperCase() : "";

            boolean is8k = paperType.contains("8K") || paperName.contains("8K");
            boolean is16k = paperType.contains("16K") || paperName.contains("16K");

            String remark = r.getRemark() != null ? r.getRemark() : "";
            if (remark.contains("估算"))
            {
                estimatedRecordsCount++;
            }

            if ("1".equals(status))
            {
                completedJobs++;
                completedPrintCount += printCount;
                if (is8k)
                {
                    completed8kSheets += effectiveSheets;
                }
                else if (is16k)
                {
                    completed16kSheets += effectiveSheets;
                }
                else
                {
                    completedOtherSheets += effectiveSheets;
                }
                completedTotalSheets += effectiveSheets;
            }
            else if ("0".equals(status))
            {
                pendingJobs++;
                pendingReservedSheets += totalPages;
            }
            else if ("2".equals(status))
            {
                cancelledJobs++;
            }
        }
    }
}
