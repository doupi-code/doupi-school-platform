package com.doupi.edu;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import com.doupi.edu.domain.EduPrintRecord;
import com.doupi.edu.service.impl.PrintLedgerExportServiceImpl;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 文印双Sheet台账导出服务单元测试
 * 
 * @author doupi
 * @date 2026-10-14
 */
public class PrintLedgerExportServiceTest
{
    @Test
    public void testDoubleSheetExportStructureAndFormulas() throws IOException
    {
        PrintLedgerExportServiceImpl exportService = new PrintLedgerExportServiceImpl();

        List<EduPrintRecord> testData = new ArrayList<>();

        // 记录1：正常已完成8K
        EduPrintRecord r1 = new EduPrintRecord();
        r1.setPrintId(101L);
        r1.setPrintName("高三第一次联考数学卷");
        r1.setTeacherId(10L);
        r1.setTeacherName("张三");
        r1.setGrade("高三");
        r1.setClassName("高三(1)班");
        r1.setPaperGoodsName("8K纸");
        r1.setPaperType("8K");
        r1.setPrintCount(100L);
        r1.setPageCount(4L);
        r1.setPrintSide("2"); // 双面: 2张/份 -> 200张
        r1.setTemplatePaperCount(1L);
        r1.setPreviewPaperCount(1L);
        r1.setTotalPages(202L);
        r1.setErrorCount(2L);
        r1.setStatus("1"); // 已完成
        r1.setPrintTime(new Date(1728892800000L));
        r1.setRemark("正常印刷");
        testData.add(r1);

        // 记录2：待打印16K
        EduPrintRecord r2 = new EduPrintRecord();
        r2.setPrintId(102L);
        r2.setPrintName("高三化学周测试卷");
        r2.setTeacherId(10L);
        r2.setTeacherName("张三");
        r2.setGrade("高三");
        r2.setClassName("高三(2)班");
        r2.setPaperGoodsName("16K纸");
        r2.setPaperType("16K");
        r2.setPrintCount(50L);
        r2.setPageCount(2L);
        r2.setPrintSide("1");
        r2.setTemplatePaperCount(1L);
        r2.setPreviewPaperCount(1L);
        r2.setTotalPages(102L);
        r2.setErrorCount(0L);
        r2.setStatus("0"); // 待打印
        r2.setPrintTime(new Date(1728896400000L));
        r2.setRemark("=SUM(A1:A10)"); // 测试防公式注入
        testData.add(r2);

        // 记录3：缺失教师和班级信息的作废记录
        EduPrintRecord r3 = new EduPrintRecord();
        r3.setPrintId(103L);
        r3.setPrintName(null);
        r3.setTeacherId(null);
        r3.setTeacherName(null);
        r3.setGrade(null);
        r3.setClassName(null);
        r3.setPaperGoodsName("8K纸");
        r3.setPaperType("8K");
        r3.setPrintCount(10L);
        r3.setPageCount(1L);
        r3.setPrintSide("1");
        r3.setTemplatePaperCount(0L);
        r3.setPreviewPaperCount(0L);
        r3.setTotalPages(10L);
        r3.setStatus("2"); // 已作废
        r3.setPrintTime(null);
        r3.setRemark("废弃任务，估算数据");
        testData.add(r3);

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        exportService.exportLedgerToStream(out, testData);

        assertTrue(out.size() > 0, "导出字节流不应为空");

        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(out.toByteArray())))
        {
            assertEquals(2, wb.getNumberOfSheets(), "必须包含恰好两个Sheet");
            assertEquals("总览", wb.getSheetName(0));
            assertEquals("明细", wb.getSheetName(1));

            // 断言首行冻结
            Sheet overview = wb.getSheetAt(0);
            Sheet details = wb.getSheetAt(1);

            assertNotNull(overview.getPaneInformation(), "总览Sheet必须配置冻结窗格");
            assertEquals(1, overview.getPaneInformation().getHorizontalSplitPosition(), "总览第一行必须冻结");

            assertNotNull(details.getPaneInformation(), "明细Sheet必须配置冻结窗格");
            assertEquals(1, details.getPaneInformation().getHorizontalSplitPosition(), "明细第一行必须冻结");

            // 检查表头中绝不含技术内部ID
            Row detailHeader = details.getRow(0);
            for (int i = 0; i < detailHeader.getLastCellNum(); i++)
            {
                String header = detailHeader.getCell(i).getStringCellValue();
                assertFalse(header.contains("ID"), "明细表头不应包含任何内部ID: " + header);
                assertFalse(header.contains("出库单号"), "明细表头不应暴露技术出库单号: " + header);
            }

            // 检查明细数据行
            Row row1 = details.getRow(1);
            assertNotNull(row1);

            // 检查防公式注入
            boolean formulaEscapedFound = false;
            for (int r = 1; r <= details.getLastRowNum(); r++)
            {
                Row row = details.getRow(r);
                if (row != null && row.getCell(18) != null)
                {
                    String remarkVal = row.getCell(18).getStringCellValue();
                    if (remarkVal.contains("=SUM"))
                    {
                        assertTrue(remarkVal.startsWith("'="), "以公式开头的备注必须被单引号转义，防止Excel宏/公式注入");
                        formulaEscapedFound = true;
                    }
                }
            }
            assertTrue(formulaEscapedFound, "必须找到被转义的测试公式备注");

            // 检查空值兜底不为数字
            boolean missingFallbackFound = false;
            for (int r = 1; r <= details.getLastRowNum(); r++)
            {
                Row row = details.getRow(r);
                if (row != null && row.getCell(1) != null)
                {
                    String teacherVal = row.getCell(1).getStringCellValue();
                    if ("名称缺失／待核实".equals(teacherVal))
                    {
                        missingFallbackFound = true;
                    }
                }
            }
            assertTrue(missingFallbackFound, "缺失教师姓名的行必须显示'名称缺失／待核实'");

            // 检查总览数值合计守恒
            Row overviewTotalRow = overview.getRow(overview.getLastRowNum());
            assertNotNull(overviewTotalRow);
            assertEquals("合计", overviewTotalRow.getCell(0).getStringCellValue());
            assertEquals(1.0, overviewTotalRow.getCell(1).getNumericCellValue(), "已完成登记次数应为1");
            assertEquals(1.0, overviewTotalRow.getCell(2).getNumericCellValue(), "待打印登记次数应为1");
            assertEquals(100.0, overviewTotalRow.getCell(3).getNumericCellValue(), "已完成印刷份数应为100");
            assertEquals(204.0, overviewTotalRow.getCell(4).getNumericCellValue(), "8K已完成耗纸(含错误损耗)应为204张");
            assertEquals(102.0, overviewTotalRow.getCell(8).getNumericCellValue(), "待打印预占应为102张");
        }
    }

    @Test
    public void testEmptyListExport() throws IOException
    {
        PrintLedgerExportServiceImpl exportService = new PrintLedgerExportServiceImpl();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        exportService.exportLedgerToStream(out, new ArrayList<>());

        assertTrue(out.size() > 0);
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(out.toByteArray())))
        {
            assertEquals(2, wb.getNumberOfSheets());
            assertEquals("总览", wb.getSheetName(0));
            assertEquals("明细", wb.getSheetName(1));
        }
    }
}
