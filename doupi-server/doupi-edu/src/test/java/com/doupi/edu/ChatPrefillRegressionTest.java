package com.doupi.edu;

import com.doupi.edu.domain.dto.EduPrintOcrResult;
import com.doupi.edu.service.impl.EduOcrServiceImpl;
import org.junit.jupiter.api.Test;
import java.lang.reflect.Method;
import java.nio.charset.StandardCharsets;
import static org.junit.jupiter.api.Assertions.*;

class ChatPrefillRegressionTest {
    private EduPrintOcrResult parse(String text) throws Exception {
        Method factory = OcrParseTest.class.getDeclaredMethod("getMockedService");
        factory.setAccessible(true);
        return ((EduOcrServiceImpl) factory.invoke(new OcrParseTest())).extractInfoFromText(text);
    }

    @Test void keepsUnknownFieldsAndFilelessRequests() throws Exception {
        var r = parse("洛卡\n2026年08月03日 11:33\n[文件] 教材.pdf\n洛卡\n2026年08月04日 11:33\n帮忙打印昨天的练习30份");
        assertEquals(2, r.getTaskList().size());
        assertNull(r.getTaskList().get(0).getPrintCount());
        assertNull(r.getTaskList().get(0).getPageCount());
        assertNull(r.getTaskList().get(0).getPrintSide());
        assertEquals(30L, r.getTaskList().get(1).getPrintCount());
    }

    @Test void fullConversation() throws Exception {
        String input = new String(getClass().getResourceAsStream("/chat-prefill-luoka.txt").readAllBytes(), StandardCharsets.UTF_8);
        var tasks = parse(input).getTaskList();
        Long[] counts = {33L,1L,100L,4L,5L,120L,120L,90L,125L,120L,null,18L,18L,18L,18L,125L,20L,6L,20L,20L,1L,20L,20L,50L,22L,null};
        assertEquals(counts.length, tasks.size());
        for (int i=0; i<counts.length; i++) assertEquals(counts[i], tasks.get(i).getPrintCount(), "task " + i + ": " + tasks.get(i).getPrintName());
        assertTrue(tasks.get(17).getRemark().contains("彩色"));
        assertFalse(String.valueOf(tasks.get(16).getRemark()).contains("彩色"));
        assertTrue(tasks.get(14).getRemark().contains("1-4页"));
        assertNull(tasks.get(11).getPageCount());
    }

    @Test void sameNameDifferentDaysDoesNotShareCount() throws Exception {
        var tasks = parse("甲老师\n2026年07月20日 7:49\n[文件] 练习.docm\n打33份\n2026年07月21日 7:49\n[文件] 练习.docm\n这个打4份").getTaskList();
        assertEquals(2, tasks.size());
        assertEquals(33L, tasks.get(0).getPrintCount());
        assertEquals(4L, tasks.get(1).getPrintCount());
    }

    @Test void preposedInstructionsDoNotOverwriteCompletedRequests() throws Exception {
        var t=parse("打印30份\n[文件] A.pdf\n打印50份\n[文件] B.pdf").getTaskList();
        assertEquals(2,t.size()); assertEquals(30L,t.get(0).getPrintCount()); assertEquals(50L,t.get(1).getPrintCount());
    }
    @Test void timeOnlyEnvelopesRemainOneConversation() throws Exception {
        var t=parse("甲\n9:30\n[文件] A.pdf\n甲\n9:31\n打印30份").getTaskList();
        assertEquals(1,t.size()); assertEquals(30L,t.get(0).getPrintCount());
    }
    @Test void explicitPagesWithoutCountArePreserved() throws Exception {
        var t=parse("[文件] A.pdf\n共5页").getTaskList();
        assertEquals(1,t.size()); assertEquals(5L,t.get(0).getPageCount()); assertNull(t.get(0).getPrintCount());
    }

    @Test void multipartPreposedRequestAndOperatorReplyStayAssociated() throws Exception {
        var t=parse("甲\n2026年10月10日 9:30\n打印30份\n双面\n[文件] A.pdf\n乙\n2026年10月10日 9:31\n好的\n甲\n2026年10月10日 9:32\n改成40份").getTaskList();
        assertEquals(1,t.size()); assertEquals(40L,t.get(0).getPrintCount()); assertEquals("2",t.get(0).getPrintSide());
    }
}
