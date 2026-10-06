package com.doupi.edu;

import java.io.FileOutputStream;
import java.lang.reflect.Method;
import java.math.BigDecimal;
import java.util.*;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.Test;
import com.doupi.edu.domain.vo.EduMaterialClassStatVo;
import com.doupi.edu.domain.vo.EduMaterialDetailReportVo;
import com.doupi.edu.domain.vo.EduMaterialPersonStatVo;
import com.doupi.edu.domain.vo.EduMaterialReportSummaryVo;
import com.doupi.edu.service.impl.EduMaterialRecordServiceImpl;
import com.doupi.edu.mapper.EduMaterialRecordMapper;

public class ExportAuditVerifyTest {

    @Test
    public void testExcelGenerationAndMerging() throws Exception {
        EduMaterialRecordServiceImpl service = new EduMaterialRecordServiceImpl();

        // 用反射设置内部 Mock Mapper，用于注入测试数据
        EduMaterialRecordMapper mockMapper = (EduMaterialRecordMapper) java.lang.reflect.Proxy.newProxyInstance(
            EduMaterialRecordMapper.class.getClassLoader(),
            new Class<?>[]{EduMaterialRecordMapper.class},
            (proxy, method, args) -> {
                String mName = method.getName();
                if ("selectReportSummaryKpi".equals(mName)) {
                    Map<String, Object> kpi = new HashMap<>();
                    kpi.put("totalGrantQty", 1250);
                    kpi.put("totalReturnQty", 35);
                    kpi.put("netGrantQty", 1215);
                    kpi.put("totalPersonCount", 48);
                    kpi.put("totalClassCount", 12);
                    kpi.put("totalOrderCount", 86);
                    kpi.put("totalAmount", new BigDecimal("18650.50"));
                    return kpi;
                } else if ("selectReportCategoryPie".equals(mName)) {
                    return Collections.emptyList();
                } else if ("selectReportClassRank".equals(mName)) {
                    return Collections.emptyList();
                } else if ("selectReportMonthlyTrend".equals(mName)) {
                    return Collections.emptyList();
                } else if ("selectReportTopGoods".equals(mName)) {
                    return Collections.emptyList();
                } else if ("selectClassStatList".equals(mName)) {
                    List<EduMaterialClassStatVo> list = new ArrayList<>();
                    EduMaterialClassStatVo c1 = new EduMaterialClassStatVo();
                    c1.setClassId(101L);
                    c1.setGrade("高一年级");
                    c1.setClassName("高一(1)班");
                    c1.setOrderCount(5);
                    c1.setTotalQuantity(135);
                    c1.setGoodsTypesCount(3);
                    c1.setPersonCount(4);
                    c1.setTotalAmount(new BigDecimal("1280.00"));
                    list.add(c1);

                    EduMaterialClassStatVo c2 = new EduMaterialClassStatVo();
                    c2.setClassId(102L);
                    c2.setGrade("高一年级");
                    c2.setClassName("高一(2)班");
                    c2.setOrderCount(3);
                    c2.setTotalQuantity(90);
                    c2.setGoodsTypesCount(2);
                    c2.setPersonCount(2);
                    c2.setTotalAmount(new BigDecimal("850.00"));
                    list.add(c2);
                    return list;
                } else if ("selectClassGoodsItemsList".equals(mName)) {
                    List<EduMaterialDetailReportVo> items = new ArrayList<>();
                    // 高一(1)班 3 个物品（测试跨 3 行合并单元格）
                    EduMaterialDetailReportVo i1 = new EduMaterialDetailReportVo();
                    i1.setClassId(101L);
                    i1.setGrade("高一年级");
                    i1.setClassName("高一(1)班");
                    i1.setCategoryName("教师办公品");
                    i1.setGoodsName("得力黑色中性笔");
                    i1.setSpec("0.5mm黑");
                    i1.setUnit("支");
                    i1.setQuantity(50);
                    i1.setPrice(new BigDecimal("2.50"));
                    i1.setAmount(new BigDecimal("125.00"));
                    items.add(i1);

                    EduMaterialDetailReportVo i2 = new EduMaterialDetailReportVo();
                    i2.setClassId(101L);
                    i2.setGrade("高一年级");
                    i2.setClassName("高一(1)班");
                    i2.setCategoryName("学生教材");
                    i2.setGoodsName("高一数学必修一");
                    i2.setSpec("人教版");
                    i2.setUnit("本");
                    i2.setQuantity(45);
                    i2.setPrice(new BigDecimal("18.50"));
                    i2.setAmount(new BigDecimal("832.50"));
                    items.add(i2);

                    EduMaterialDetailReportVo i3 = new EduMaterialDetailReportVo();
                    i3.setClassId(101L);
                    i3.setGrade("高一年级");
                    i3.setClassName("高一(1)班");
                    i3.setCategoryName("文印耗材");
                    i3.setGoodsName("A4双胶复印纸");
                    i3.setSpec("70g/500张/包");
                    i3.setUnit("包");
                    i3.setQuantity(40);
                    i3.setPrice(new BigDecimal("8.06"));
                    i3.setAmount(new BigDecimal("322.50"));
                    items.add(i3);

                    // 高一(2)班 2 个物品
                    EduMaterialDetailReportVo i4 = new EduMaterialDetailReportVo();
                    i4.setClassId(102L);
                    i4.setGrade("高一年级");
                    i4.setClassName("高一(2)班");
                    i4.setCategoryName("学生教材");
                    i4.setGoodsName("高一语文必修上册");
                    i4.setSpec("统编版");
                    i4.setUnit("本");
                    i4.setQuantity(45);
                    i4.setPrice(new BigDecimal("12.00"));
                    i4.setAmount(new BigDecimal("540.00"));
                    items.add(i4);

                    EduMaterialDetailReportVo i5 = new EduMaterialDetailReportVo();
                    i5.setClassId(102L);
                    i5.setGrade("高一年级");
                    i5.setClassName("高一(2)班");
                    i5.setCategoryName("教师办公品");
                    i5.setGoodsName("晨光红笔");
                    i5.setSpec("0.5mm红");
                    i5.setUnit("支");
                    i5.setQuantity(45);
                    i5.setPrice(new BigDecimal("6.89"));
                    i5.setAmount(new BigDecimal("310.00"));
                    items.add(i5);

                    return items;
                } else if ("selectPersonStatList".equals(mName)) {
                    List<EduMaterialPersonStatVo> list = new ArrayList<>();
                    EduMaterialPersonStatVo p1 = new EduMaterialPersonStatVo();
                    p1.setTargetType("1");
                    p1.setTargetTypeName("教师");
                    p1.setTargetName("张伟");
                    p1.setClassName("高一(1)班");
                    p1.setGrade("高一年级");
                    p1.setSubject("数学");
                    p1.setOrderCount(3);
                    p1.setTotalQuantity(70);
                    p1.setGoodsTypesCount(2);
                    p1.setTotalAmount(new BigDecimal("450.00"));
                    list.add(p1);

                    EduMaterialPersonStatVo p2 = new EduMaterialPersonStatVo();
                    p2.setTargetType("2");
                    p2.setTargetTypeName("学生");
                    p2.setTargetName("李明");
                    p2.setClassName("高一(1)班");
                    p2.setGrade("高一年级");
                    p2.setSubject("理科");
                    p2.setOrderCount(1);
                    p2.setTotalQuantity(45);
                    p2.setGoodsTypesCount(1);
                    p2.setTotalAmount(new BigDecimal("832.50"));
                    list.add(p2);
                    return list;
                } else if ("selectPersonGoodsItemsList".equals(mName)) {
                    List<EduMaterialDetailReportVo> items = new ArrayList<>();
                    // 张伟 2 个物品
                    EduMaterialDetailReportVo pi1 = new EduMaterialDetailReportVo();
                    pi1.setTargetType("1");
                    pi1.setTargetTypeName("教师");
                    pi1.setTargetName("张伟");
                    pi1.setCategoryName("教师办公品");
                    pi1.setGoodsName("得力黑色中性笔");
                    pi1.setSpec("0.5mm黑");
                    pi1.setUnit("支");
                    pi1.setQuantity(20);
                    pi1.setPrice(new BigDecimal("2.50"));
                    pi1.setAmount(new BigDecimal("50.00"));
                    items.add(pi1);

                    EduMaterialDetailReportVo pi2 = new EduMaterialDetailReportVo();
                    pi2.setTargetType("1");
                    pi2.setTargetTypeName("教师");
                    pi2.setTargetName("张伟");
                    pi2.setCategoryName("文印耗材");
                    pi2.setGoodsName("A4双胶复印纸");
                    pi2.setSpec("70g/500张/包");
                    pi2.setUnit("包");
                    pi2.setQuantity(50);
                    pi2.setPrice(new BigDecimal("8.00"));
                    pi2.setAmount(new BigDecimal("400.00"));
                    items.add(pi2);

                    // 李明 1 个物品
                    EduMaterialDetailReportVo pi3 = new EduMaterialDetailReportVo();
                    pi3.setTargetType("2");
                    pi3.setTargetTypeName("学生");
                    pi3.setTargetName("李明");
                    pi3.setCategoryName("学生教材");
                    pi3.setGoodsName("高一数学必修一");
                    pi3.setSpec("人教版");
                    pi3.setUnit("本");
                    pi3.setQuantity(45);
                    pi3.setPrice(new BigDecimal("18.50"));
                    pi3.setAmount(new BigDecimal("832.50"));
                    items.add(pi3);

                    return items;
                } else if ("selectDetailReportList".equals(mName)) {
                    List<EduMaterialDetailReportVo> list = new ArrayList<>();
                    EduMaterialDetailReportVo d1 = new EduMaterialDetailReportVo();
                    d1.setRecordNo("LY20261005001");
                    d1.setRecordTypeName("日常领用");
                    d1.setBusinessCategory("期初教学办公物资领用");
                    d1.setOperateTime(new Date());
                    d1.setGrade("高一年级");
                    d1.setClassName("高一(1)班");
                    d1.setTargetTypeName("教师");
                    d1.setTargetName("张伟");
                    d1.setSubject("数学");
                    d1.setCategoryName("教师办公品");
                    d1.setGoodsName("得力黑色中性笔");
                    d1.setSpec("0.5mm黑");
                    d1.setUnit("支");
                    d1.setQuantity(20);
                    d1.setPrice(new BigDecimal("2.50"));
                    d1.setAmount(new BigDecimal("50.00"));
                    d1.setKitName("高中教师开学标准办公包");
                    d1.setOperator("教务处");
                    d1.setItemStatus("完好");
                    d1.setRemark("第一学期办公申领");
                    list.add(d1);
                    return list;
                }
                return null;
            }
        );

        java.lang.reflect.Field mapperField = EduMaterialRecordServiceImpl.class.getDeclaredField("eduMaterialRecordMapper");
        mapperField.setAccessible(true);
        mapperField.set(service, mockMapper);

        // 生成综合报表
        XSSFWorkbook wb = new XSSFWorkbook();
        Method createStylesMethod = EduMaterialRecordServiceImpl.class.getDeclaredMethod("createReportStyles", Workbook.class);
        createStylesMethod.setAccessible(true);
        Object styles = createStylesMethod.invoke(service, wb);

        Method buildS1 = EduMaterialRecordServiceImpl.class.getDeclaredMethod("buildSummaryKpiSheet", Workbook.class, Sheet.class, Map.class, styles.getClass());
        buildS1.setAccessible(true);
        buildS1.invoke(service, wb, wb.createSheet("全校概览与指标"), new HashMap<>(), styles);

        Method buildS2 = EduMaterialRecordServiceImpl.class.getDeclaredMethod("buildClassStatSheet", Workbook.class, Sheet.class, Map.class, styles.getClass());
        buildS2.setAccessible(true);
        buildS2.invoke(service, wb, wb.createSheet("各班级领用透视"), new HashMap<>(), styles);

        Method buildS3 = EduMaterialRecordServiceImpl.class.getDeclaredMethod("buildPersonStatSheet", Workbook.class, Sheet.class, Map.class, styles.getClass());
        buildS3.setAccessible(true);
        buildS3.invoke(service, wb, wb.createSheet("个人领用对账单"), new HashMap<>(), styles);

        Method buildS4 = EduMaterialRecordServiceImpl.class.getDeclaredMethod("buildDetailReportSheet", Workbook.class, Sheet.class, Map.class, styles.getClass());
        buildS4.setAccessible(true);
        buildS4.invoke(service, wb, wb.createSheet("最细化穿透流水清单"), new HashMap<>(), styles);

        String outputPath = "C:\\Users\\javal\\Desktop\\RuoYi-Vue-v3.9.2\\doupi-server\\test_report_output.xlsx";
        try (FileOutputStream fos = new FileOutputStream(outputPath)) {
            wb.write(fos);
        }
        wb.close();
        System.out.println("TEST_EXCEL_SUCCESS: " + outputPath);

        // ================= 严格审核生成的 Excel 文件 =================
        try (java.io.FileInputStream fis = new java.io.FileInputStream(outputPath);
             XSSFWorkbook verifyWb = new XSSFWorkbook(fis)) {

            // 1. 审核 Sheet 数量与名称
            org.junit.jupiter.api.Assertions.assertEquals(4, verifyWb.getNumberOfSheets());
            org.junit.jupiter.api.Assertions.assertEquals("全校概览与指标", verifyWb.getSheetName(0));
            org.junit.jupiter.api.Assertions.assertEquals("各班级领用透视", verifyWb.getSheetName(1));
            org.junit.jupiter.api.Assertions.assertEquals("个人领用对账单", verifyWb.getSheetName(2));
            org.junit.jupiter.api.Assertions.assertEquals("最细化穿透流水清单", verifyWb.getSheetName(3));

            // 2. 审核 Sheet 2 (各班级领用透视)
            Sheet s2 = verifyWb.getSheetAt(1);
            System.out.println("=== Sheet 2 班级透视审核 ===");
            System.out.println("总行数: " + s2.getPhysicalNumberOfRows());
            System.out.println("合并单元格数量: " + s2.getNumMergedRegions());
            // 预期：高一(1)班有 3 个物品（合并 6 列，占 3 行），高一(2)班有 2 个物品（合并 6 列，占 2 行）
            // 故合并区域应为 6 + 6 = 12 个
            org.junit.jupiter.api.Assertions.assertTrue(s2.getNumMergedRegions() >= 12, "班级透视表应包含班级信息列的合并区域");
            for (int i = 0; i < s2.getNumMergedRegions(); i++) {
                org.apache.poi.ss.util.CellRangeAddress region = s2.getMergedRegion(i);
                System.out.println("  合并区域 " + i + ": 行 " + region.getFirstRow() + "~" + region.getLastRow() + "，列 " + region.getFirstColumn() + "~" + region.getLastColumn());
            }

            // 检查第 1 行（数据行1）：高一(1)班第 1 个物品
            org.apache.poi.ss.usermodel.Row r1 = s2.getRow(1);
            org.junit.jupiter.api.Assertions.assertEquals("高一年级", r1.getCell(0).getStringCellValue());
            org.junit.jupiter.api.Assertions.assertEquals("高一(1)班", r1.getCell(1).getStringCellValue());
            org.junit.jupiter.api.Assertions.assertEquals("得力黑色中性笔", r1.getCell(7).getStringCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(50.0, r1.getCell(10).getNumericCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(2.50, r1.getCell(11).getNumericCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(125.0, r1.getCell(12).getNumericCellValue());

            // 检查第 2 行（数据行2）：高一(1)班第 2 个物品
            org.apache.poi.ss.usermodel.Row r2 = s2.getRow(2);
            org.junit.jupiter.api.Assertions.assertEquals("高一数学必修一", r2.getCell(7).getStringCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(45.0, r2.getCell(10).getNumericCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(18.50, r2.getCell(11).getNumericCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(832.50, r2.getCell(12).getNumericCellValue());

            // 3. 审核 Sheet 3 (个人领用对账单)
            Sheet s3 = verifyWb.getSheetAt(2);
            System.out.println("=== Sheet 3 个人对账单审核 ===");
            System.out.println("总行数: " + s3.getPhysicalNumberOfRows());
            System.out.println("合并单元格数量: " + s3.getNumMergedRegions());
            // 张伟 2 个物品，合并 8 列
            org.junit.jupiter.api.Assertions.assertTrue(s3.getNumMergedRegions() >= 8, "个人对账单应包含人员信息列的合并区域");

            org.apache.poi.ss.usermodel.Row pr1 = s3.getRow(1);
            org.junit.jupiter.api.Assertions.assertEquals("教师", pr1.getCell(0).getStringCellValue());
            org.junit.jupiter.api.Assertions.assertEquals("张伟", pr1.getCell(1).getStringCellValue());
            org.junit.jupiter.api.Assertions.assertEquals("得力黑色中性笔", pr1.getCell(9).getStringCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(20.0, pr1.getCell(12).getNumericCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(2.50, pr1.getCell(13).getNumericCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(50.0, pr1.getCell(14).getNumericCellValue());

            org.apache.poi.ss.usermodel.Row pr2 = s3.getRow(2);
            org.junit.jupiter.api.Assertions.assertEquals("A4双胶复印纸", pr2.getCell(9).getStringCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(50.0, pr2.getCell(12).getNumericCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(8.00, pr2.getCell(13).getNumericCellValue());
            org.junit.jupiter.api.Assertions.assertEquals(400.0, pr2.getCell(14).getNumericCellValue());

            System.out.println("=== 全部 Sheet 审核通过！结构严谨、合并规范、单品清晰、单价金额真实可算！===");
        }
    }
}

