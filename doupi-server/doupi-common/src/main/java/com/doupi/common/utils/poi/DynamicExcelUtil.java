package com.doupi.common.utils.poi;

import java.io.InputStream;
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
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.apache.poi.xssf.streaming.SXSSFSheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.multipart.MultipartFile;
import com.doupi.common.exception.ServiceException;
import com.doupi.common.utils.StringUtils;

/**
 * 动态高灵活 Excel 导入导出增强工具类
 * 支持任意 Map 结构与无实体对象的零约束导出/导入
 * 
 * @author doupi
 */
public class DynamicExcelUtil
{
    private static final Logger log = LoggerFactory.getLogger(DynamicExcelUtil.class);

    private static final String EXCEL_XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8";

    /**
     * 动态导出 Map 列表为 Excel 表格
     * 
     * @param response HTTP响应对象
     * @param fileName 导出的下载文件名 (例如: "招生预约报表")
     * @param sheetName 工作表名称
     * @param headers 表头中文显示名数组 (例如: ["预约单号", "家长姓名", "学生姓名", "预约时间"])
     * @param fieldKeys 数据源 Map 中的 key 数组 (例如: ["appointmentNo", "parentName", "studentName", "visitDate"])
     * @param dataList 数据列表
     */
    public static void exportMapList(HttpServletResponse response, String fileName, String sheetName,
            List<String> headers, List<String> fieldKeys, List<Map<String, Object>> dataList)
    {
        if (headers == null || fieldKeys == null || headers.size() != fieldKeys.size())
        {
            throw new ServiceException("导出的表头列表与字段列表长度不一致");
        }

        // 使用 SXSSFWorkbook 流式输出，仅保留 100 行在内存，极度节约内存并防止 OOM
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(100))
        {
            workbook.setCompressTempFiles(true);
            SXSSFSheet sheet = workbook.createSheet(StringUtils.isNotEmpty(sheetName) ? sheetName : "Sheet1");
            sheet.trackAllColumnsForAutoSizing();

            // 1. 创建表头样式
            CellStyle headerStyle = createHeaderStyle(workbook);
            CellStyle dataStyle = createDataStyle(workbook);

            // 2. 写入表头行
            Row headerRow = sheet.createRow(0);
            headerRow.setHeightInPoints(24);
            for (int i = 0; i < headers.size(); i++)
            {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers.get(i));
                cell.setCellStyle(headerStyle);
            }

            // 3. 写入数据行
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");
            if (dataList != null && !dataList.isEmpty())
            {
                for (int rowIdx = 0; rowIdx < dataList.size(); rowIdx++)
                {
                    Row row = sheet.createRow(rowIdx + 1);
                    row.setHeightInPoints(20);
                    Map<String, Object> rowMap = dataList.get(rowIdx);

                    for (int colIdx = 0; colIdx < fieldKeys.size(); colIdx++)
                    {
                        Cell cell = row.createCell(colIdx);
                        cell.setCellStyle(dataStyle);

                        if (rowMap != null)
                        {
                            Object val = rowMap.get(fieldKeys.get(colIdx));
                            setCellValue(cell, val, sdf);
                        }
                    }
                }
            }

            // 4. 自适应列宽
            for (int i = 0; i < headers.size(); i++)
            {
                sheet.autoSizeColumn(i);
                int currentWidth = sheet.getColumnWidth(i);
                sheet.setColumnWidth(i, Math.min(Math.max(currentWidth + 1200, 3500), 20000));
            }

            // 5. 设置 HTTP 下载响应头
            String finalFileName = StringUtils.isNotEmpty(fileName) ? fileName : ("export_" + System.currentTimeMillis());
            if (!finalFileName.endsWith(".xlsx"))
            {
                finalFileName += ".xlsx";
            }
            String encodedName = URLEncoder.encode(finalFileName, StandardCharsets.UTF_8.name()).replaceAll("\\+", "%20");

            response.setContentType(EXCEL_XLSX_MIME);
            response.setHeader("Content-Disposition", "attachment; filename=" + encodedName);
            response.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

            workbook.write(response.getOutputStream());
            response.getOutputStream().flush();
            workbook.dispose();
        }
        catch (Exception e)
        {
            log.error("动态导出 Excel 失败: {}", e.getMessage(), e);
            throw new ServiceException("导出 Excel 异常: " + e.getMessage());
        }
    }

    /**
     * 将任意上传的 Excel 文件动态解析为 List<Map<String, Object>>
     * 默认第一行为列头名称
     * 
     * @param file 上传的 MultipartFile
     * @return 解析后的 Map 列表
     */
    public static List<Map<String, Object>> importToMapList(MultipartFile file)
    {
        try (InputStream is = file.getInputStream())
        {
            return importToMapList(is);
        }
        catch (Exception e)
        {
            log.error("解析 Excel 文件流异常: {}", e.getMessage(), e);
            throw new ServiceException("解析 Excel 文件失败: " + e.getMessage());
        }
    }

    /**
     * 将 InputStream 动态解析为 List<Map<String, Object>>
     * 
     * @param is 输入流
     * @return 解析后的 Map 列表
     */
    public static List<Map<String, Object>> importToMapList(InputStream is)
    {
        List<Map<String, Object>> resultList = new ArrayList<>();
        DataFormatter formatter = new DataFormatter();

        try (Workbook workbook = WorkbookFactory.create(is))
        {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null || sheet.getLastRowNum() < 0)
            {
                return resultList;
            }

            // 读取第一行表头
            Row headerRow = sheet.getRow(0);
            if (headerRow == null)
            {
                return resultList;
            }

            int colCount = headerRow.getLastCellNum();
            List<String> headerNames = new ArrayList<>(colCount);
            for (int c = 0; c < colCount; c++)
            {
                Cell cell = headerRow.getCell(c);
                String header = cell != null ? formatter.formatCellValue(cell).trim() : ("col_" + c);
                headerNames.add(StringUtils.isNotEmpty(header) ? header : ("col_" + c));
            }

            // 读取数据行
            for (int r = 1; r <= sheet.getLastRowNum(); r++)
            {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                Map<String, Object> rowMap = new LinkedHashMap<>();
                boolean allEmpty = true;

                for (int c = 0; c < colCount; c++)
                {
                    Cell cell = row.getCell(c);
                    Object val = getCellValue(cell, formatter);
                    if (val != null && StringUtils.isNotEmpty(val.toString()))
                    {
                        allEmpty = false;
                    }
                    rowMap.put(headerNames.get(c), val);
                }

                if (!allEmpty)
                {
                    resultList.add(rowMap);
                }
            }
        }
        catch (Exception e)
        {
            log.error("导入 Excel 失败: {}", e.getMessage(), e);
            throw new ServiceException("导入 Excel 失败: " + e.getMessage());
        }
        return resultList;
    }

    /**
     * 极简单行导出注解实体类
     * 
     * @param response HTTP响应
     * @param sheetName Sheet名
     * @param list 实体列表
     * @param clazz 实体类 Class
     */
    public static <T> void exportEntities(HttpServletResponse response, String sheetName, List<T> list, Class<T> clazz)
    {
        ExcelUtil<T> util = new ExcelUtil<>(clazz);
        util.exportExcel(response, list, sheetName);
    }

    /**
     * 极简单行导入注解实体类
     * 
     * @param file 文件
     * @param clazz 实体类 Class
     * @return 实体列表
     */
    public static <T> List<T> importEntities(MultipartFile file, Class<T> clazz)
    {
        try
        {
            ExcelUtil<T> util = new ExcelUtil<>(clazz);
            return util.importExcel(file.getInputStream());
        }
        catch (Exception e)
        {
            log.error("导入实体 Excel 失败: {}", e.getMessage(), e);
            throw new ServiceException("导入数据失败: " + e.getMessage());
        }
    }

    private static void setCellValue(Cell cell, Object val, SimpleDateFormat sdf)
    {
        if (val == null)
        {
            cell.setCellValue("");
        }
        else if (val instanceof Number)
        {
            cell.setCellValue(((Number) val).doubleValue());
        }
        else if (val instanceof Boolean)
        {
            cell.setCellValue((Boolean) val);
        }
        else if (val instanceof Date)
        {
            cell.setCellValue(sdf.format((Date) val));
        }
        else
        {
            cell.setCellValue(val.toString());
        }
    }

    private static Object getCellValue(Cell cell, DataFormatter formatter)
    {
        if (cell == null) return null;
        CellType type = cell.getCellType();
        if (type == CellType.BLANK) return null;
        if (type == CellType.BOOLEAN) return cell.getBooleanCellValue();
        if (type == CellType.NUMERIC)
        {
            return formatter.formatCellValue(cell);
        }
        return formatter.formatCellValue(cell);
    }

    private static CellStyle createHeaderStyle(Workbook wb)
    {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        font.setFontHeightInPoints((short) 11);
        font.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(font);

        style.setFillForegroundColor(IndexedColors.ROYAL_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        style.setAlignment(HorizontalAlignment.CENTER);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBorderTop(BorderStyle.THIN);
        style.setBorderLeft(BorderStyle.THIN);
        style.setBorderRight(BorderStyle.THIN);
        return style;
    }

    private static CellStyle createDataStyle(Workbook wb)
    {
        CellStyle style = wb.createCellStyle();
        style.setAlignment(HorizontalAlignment.LEFT);
        style.setVerticalAlignment(VerticalAlignment.CENTER);
        style.setBorderBottom(BorderStyle.THIN);
        style.setBottomBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setBorderTop(BorderStyle.THIN);
        style.setTopBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setBorderLeft(BorderStyle.THIN);
        style.setLeftBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        style.setBorderRight(BorderStyle.THIN);
        style.setRightBorderColor(IndexedColors.GREY_25_PERCENT.getIndex());
        return style;
    }
}
