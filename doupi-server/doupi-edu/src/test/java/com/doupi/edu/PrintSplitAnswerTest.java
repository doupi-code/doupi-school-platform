package com.doupi.edu;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 试卷与答案合并文件拆分录入业务逻辑与智能探测单元测试
 */
public class PrintSplitAnswerTest {

    /**
     * 测试纸张张数计算算法（与前端 calculateTotalSheets 和后端 insertEduPrintRecord 完全一致）
     */
    private long calculateSheets(long count, long pages, String side) {
        long p = Math.max(1, pages);
        long c = Math.max(0, count);
        if ("2".equals(side)) {
            return c * ((p + 1) / 2);
        }
        return c * p;
    }

    @Test
    public void testExamAndAnswerPaperCalculation() {
        // 场景 1：总共4页文件，3页试卷（双面印，60份），1页答案（单面印，2份供教师批阅）
        long totalPages = 4;
        long answerPages = 1;
        long examPages = totalPages - answerPages; // 3页
        assertEquals(3, examPages);

        long examCount = 60;
        String examSide = "2"; // 双面
        long examSheets = calculateSheets(examCount, examPages, examSide);
        // 双面3页，每份占用 (3+1)/2 = 2张纸。60份 = 120张
        assertEquals(120, examSheets);

        long answerCount = 2;
        String answerSide = "1"; // 单面
        long answerSheets = calculateSheets(answerCount, answerPages, answerSide);
        // 单面1页，每份占用 1张纸。2份 = 2张
        assertEquals(2, answerSheets);

        // 合计耗纸
        long combinedSheets = examSheets + answerSheets;
        assertEquals(122, combinedSheets);
    }

    @Test
    public void testExamAndAnswerMultiPageCalculation() {
        // 场景 2：总共8页，6页试卷（双面印，50份），2页答案（双面印，2份）
        long totalPages = 8;
        long answerPages = 2;
        long examPages = totalPages - answerPages; // 6页

        long examCount = 50;
        String examSide = "2"; // 双面
        long examSheets = calculateSheets(examCount, examPages, examSide);
        // 双面6页，每份占用 3张纸。50份 = 150张
        assertEquals(150, examSheets);

        long answerCount = 2;
        String answerSide = "2"; // 双面
        long answerSheets = calculateSheets(answerCount, answerPages, answerSide);
        // 双面2页，每份占用 1张纸。2份 = 2张
        assertEquals(2, answerSheets);

        assertEquals(152, examSheets + answerSheets);
    }

    @Test
    public void testTextPatternDetection() {
        // 验证针对“最后一页是答案”的智能识别正则
        String text1 = "高三语文模拟卷共4页，最后一页是答案，试卷60份，答案2份";
        Pattern lastPagePattern = Pattern.compile("(?:最后一页|末页)(?:是|为)?(?:参考)?答案");
        assertTrue(lastPagePattern.matcher(text1).find());

        // 验证针对“答案X份”的智能识别正则
        Pattern ansCountPattern = Pattern.compile("(?:参考)?答案\\s*(?:打|印|需要|共)?\\s*([0-9]{1,4}|[一两二三四五])\\s*(?:份|分)");
        Matcher m1 = ansCountPattern.matcher(text1);
        assertTrue(m1.find());
        assertEquals("2", m1.group(1));

        // 验证针对“其中答案1页”的智能识别正则
        String text2 = "高二年级物理测试卷（共4页，含答案1页），试卷50份，答案印2份";
        Pattern ansPagePattern = Pattern.compile("(?:其中|含|包含)?(?:参考)?答案\\s*([0-9]{1,2}|[一两二三四五])\\s*页");
        Matcher m2 = ansPagePattern.matcher(text2);
        assertTrue(m2.find());
        assertEquals("1", m2.group(1));
    }
}
