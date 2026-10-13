package com.doupi.edu;

import com.doupi.common.exception.ServiceException;
import com.doupi.edu.domain.EduPrintRecord;
import com.doupi.edu.domain.dto.EduPrintOcrResult;
import com.doupi.edu.domain.dto.EduPrintOcrResult.PrintTaskItem;
import com.doupi.edu.domain.dto.WechatStructuredParseRequest;
import com.doupi.edu.domain.dto.WechatStructuredParseRequest.ContentData;
import com.doupi.edu.domain.dto.WechatStructuredParseRequest.ConversationItem;
import com.doupi.edu.domain.dto.WechatStructuredParseRequest.MessageItem;
import com.doupi.edu.mapper.EduPrintRecordMapper;
import com.doupi.edu.mapper.EduTeacherMapper;
import com.doupi.edu.service.impl.EduOcrServiceImpl;
import com.doupi.edu.service.impl.EduPrintRecordServiceImpl;
import com.doupi.edu.service.impl.ocr.WechatExportStructuredParser;
import com.doupi.stock.domain.StockGoods;
import com.doupi.stock.domain.StockOut;
import com.doupi.stock.domain.StockOutItem;
import com.doupi.stock.mapper.StockGoodsMapper;
import com.doupi.stock.service.IStockOutService;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 微信导出记录导入与文印额外用纸（模板1张+预览1张）全流程单元与集成验收测试
 */
public class EduPrintExtraPaperAndWechatImportTest
{
    /**
     * 内存态库存与文印登记测试夹具（模拟数据库与库存出库联动）
     */
    private static class InMemoryPrintTestHarness
    {
        final Map<Long, StockGoods> goodsMap = new HashMap<>();
        final Map<Long, StockOut> outMap = new HashMap<>();
        final Map<Long, EduPrintRecord> recordMap = new HashMap<>();
        final AtomicLong outIdSeq = new AtomicLong(1000L);
        final AtomicLong printIdSeq = new AtomicLong(1L);
        final EduPrintRecordServiceImpl service = new EduPrintRecordServiceImpl();

        InMemoryPrintTestHarness(long initialPaperSheets) throws Exception
        {
            StockGoods paper = new StockGoods();
            paper.setGoodsId(8L);
            paper.setGoodsName("8K速印试卷用纸");
            paper.setUnit("包");
            paper.setBaseUnit("张");
            paper.setConversionRate(500);
            paper.setStockNum(initialPaperSheets / 500L);
            paper.setRemainSheets((int) (initialPaperSheets % 500L));
            goodsMap.put(8L, paper);

            StockGoodsMapper goodsMapper = (StockGoodsMapper) Proxy.newProxyInstance(
                    StockGoodsMapper.class.getClassLoader(),
                    new Class<?>[]{StockGoodsMapper.class},
                    (proxy, method, args) -> {
                        if ("selectEduGoodsByGoodsId".equals(method.getName()) || "selectStockGoodsByGoodsId".equals(method.getName()))
                        {
                            return goodsMap.get((Long) args[0]);
                        }
                        return null;
                    }
            );

            IStockOutService stockOutService = (IStockOutService) Proxy.newProxyInstance(
                    IStockOutService.class.getClassLoader(),
                    new Class<?>[]{IStockOutService.class},
                    (proxy, method, args) -> {
                        String name = method.getName();
                        if ("insertEduStockOut".equals(name))
                        {
                            StockOut out = (StockOut) args[0];
                            for (StockOutItem item : out.getItemList())
                            {
                                StockGoods g = goodsMap.get(item.getGoodsId());
                                long rate = g.getConversionRate() != null && g.getConversionRate() > 0 ? g.getConversionRate() : 1L;
                                long avail = (g.getStockNum() != null ? g.getStockNum() : 0L) * rate
                                        + (g.getRemainSheets() != null ? g.getRemainSheets() : 0L);
                                if (avail < item.getQuantity())
                                {
                                    throw new ServiceException("出库扣减失败，库存不足");
                                }
                                long left = avail - item.getQuantity();
                                g.setStockNum(left / rate);
                                g.setRemainSheets((int) (left % rate));
                            }
                            long oid = outIdSeq.incrementAndGet();
                            out.setOutId(oid);
                            out.setStatus("0");
                            outMap.put(oid, out);
                            return 1;
                        }
                        if ("cancelEduStockOut".equals(name))
                        {
                            StockOut out = outMap.get((Long) args[0]);
                            if (out != null && !"1".equals(out.getStatus()))
                            {
                                for (StockOutItem item : out.getItemList())
                                {
                                    StockGoods g = goodsMap.get(item.getGoodsId());
                                    long rate = g.getConversionRate() != null && g.getConversionRate() > 0 ? g.getConversionRate() : 1L;
                                    long avail = (g.getStockNum() != null ? g.getStockNum() : 0L) * rate
                                            + (g.getRemainSheets() != null ? g.getRemainSheets() : 0L)
                                            + item.getQuantity();
                                    g.setStockNum(avail / rate);
                                    g.setRemainSheets((int) (avail % rate));
                                }
                                out.setStatus("1");
                            }
                            return 1;
                        }
                        if ("deleteEduStockOutByOutId".equals(name))
                        {
                            Long oid = (Long) args[0];
                            StockOut out = outMap.remove(oid);
                            if (out != null && !"1".equals(out.getStatus()))
                            {
                                for (StockOutItem item : out.getItemList())
                                {
                                    StockGoods g = goodsMap.get(item.getGoodsId());
                                    long rate = g.getConversionRate() != null && g.getConversionRate() > 0 ? g.getConversionRate() : 1L;
                                    long avail = (g.getStockNum() != null ? g.getStockNum() : 0L) * rate
                                            + (g.getRemainSheets() != null ? g.getRemainSheets() : 0L)
                                            + item.getQuantity();
                                    g.setStockNum(avail / rate);
                                    g.setRemainSheets((int) (avail % rate));
                                }
                            }
                            return 1;
                        }
                        return null;
                    }
            );

            EduPrintRecordMapper recordMapper = (EduPrintRecordMapper) Proxy.newProxyInstance(
                    EduPrintRecordMapper.class.getClassLoader(),
                    new Class<?>[]{EduPrintRecordMapper.class},
                    (proxy, method, args) -> {
                        String name = method.getName();
                        if ("insertEduPrintRecord".equals(name))
                        {
                            EduPrintRecord rec = (EduPrintRecord) args[0];
                            long pid = printIdSeq.incrementAndGet();
                            rec.setPrintId(pid);
                            recordMap.put(pid, cloneRecord(rec));
                            return 1;
                        }
                        if ("selectEduPrintRecordByPrintId".equals(name))
                        {
                            EduPrintRecord r = recordMap.get((Long) args[0]);
                            return r != null ? cloneRecord(r) : null;
                        }
                        if ("updateEduPrintRecord".equals(name))
                        {
                            EduPrintRecord patch = (EduPrintRecord) args[0];
                            EduPrintRecord target = recordMap.get(patch.getPrintId());
                            if (target == null) return 0;
                            if (patch.getPrintName() != null) target.setPrintName(patch.getPrintName());
                            if (patch.getPaperGoodsId() != null) target.setPaperGoodsId(patch.getPaperGoodsId());
                            if (patch.getPaperType() != null) target.setPaperType(patch.getPaperType());
                            if (patch.getPrintCount() != null) target.setPrintCount(patch.getPrintCount());
                            if (patch.getPageCount() != null) target.setPageCount(patch.getPageCount());
                            if (patch.getPrintSide() != null) target.setPrintSide(patch.getPrintSide());
                            if (patch.getTemplatePaperCount() != null) target.setTemplatePaperCount(patch.getTemplatePaperCount());
                            if (patch.getPreviewPaperCount() != null) target.setPreviewPaperCount(patch.getPreviewPaperCount());
                            if (patch.getTotalPages() != null) target.setTotalPages(patch.getTotalPages());
                            if (patch.getOutId() != null) target.setOutId(patch.getOutId());
                            if (patch.getStatus() != null) target.setStatus(patch.getStatus());
                            if (patch.getResultImg() != null) target.setResultImg(patch.getResultImg());
                            return 1;
                        }
                        if ("deleteEduPrintRecordByPrintId".equals(name))
                        {
                            recordMap.remove((Long) args[0]);
                            return 1;
                        }
                        if ("deleteEduPrintRecordByPrintIds".equals(name))
                        {
                            Long[] ids = (Long[]) args[0];
                            for (Long id : ids) recordMap.remove(id);
                            return ids.length;
                        }
                        if ("selectEduPrintRecordList".equals(name) || "selectSourceRecordsForUpdate".equals(name))
                        {
                            EduPrintRecord q = args[0] instanceof EduPrintRecord ? (EduPrintRecord) args[0] : new EduPrintRecord();
                            if (args[0] instanceof String) q.setSourceConversationId((String) args[0]);
                            List<EduPrintRecord> list = new ArrayList<>();
                            for (EduPrintRecord r : recordMap.values())
                            {
                                if (q.getSourceConversationId() != null && !q.getSourceConversationId().equals(r.getSourceConversationId()))
                                {
                                    continue;
                                }
                                if (q.getSourceMessageId() != null && !q.getSourceMessageId().equals(r.getSourceMessageId()))
                                {
                                    continue;
                                }
                                if (q.getPrintName() != null && (r.getPrintName() == null || !r.getPrintName().contains(q.getPrintName())))
                                {
                                    continue;
                                }
                                list.add(cloneRecord(r));
                            }
                            return list;
                        }
                        return null;
                    }
            );

            EduTeacherMapper teacherMapper = (EduTeacherMapper) Proxy.newProxyInstance(
                    EduTeacherMapper.class.getClassLoader(),
                    new Class<?>[]{EduTeacherMapper.class},
                    (proxy, method, args) -> null
            );

            setField(service, "stockGoodsMapper", goodsMapper);
            setField(service, "stockOutService", stockOutService);
            setField(service, "eduPrintRecordMapper", recordMapper);
            setField(service, "eduTeacherMapper", teacherMapper);
        }

        long availableSheets()
        {
            StockGoods g = goodsMap.get(8L);
            return g.getStockNum() * g.getConversionRate() + g.getRemainSheets();
        }

        private static EduPrintRecord cloneRecord(EduPrintRecord src)
        {
            EduPrintRecord dst = new EduPrintRecord();
            dst.setPrintId(src.getPrintId());
            dst.setPrintName(src.getPrintName());
            dst.setTeacherId(src.getTeacherId());
            dst.setTeacherName(src.getTeacherName());
            dst.setPaperGoodsId(src.getPaperGoodsId());
            dst.setPaperType(src.getPaperType());
            dst.setPrintCount(src.getPrintCount());
            dst.setPageCount(src.getPageCount());
            dst.setPrintSide(src.getPrintSide());
            dst.setTemplatePaperCount(src.getTemplatePaperCount());
            dst.setPreviewPaperCount(src.getPreviewPaperCount());
            dst.setTotalPages(src.getTotalPages());
            dst.setOutId(src.getOutId());
            dst.setStatus(src.getStatus());
            dst.setDelFlag(src.getDelFlag() != null ? src.getDelFlag() : "0");
            dst.setPrintTime(src.getPrintTime() != null ? src.getPrintTime() : new Date());
            dst.setSourceConversationId(src.getSourceConversationId());
            dst.setSourceMessageId(src.getSourceMessageId());
            return dst;
        }
    }

    private static void setField(Object target, String fieldName, Object value) throws Exception
    {
        Field f = target.getClass().getDeclaredField(fieldName);
        f.setAccessible(true);
        f.set(target, value);
    }

    @Test
    public void testExtraPaperAcceptanceSingleAndDoubleSided() throws Exception
    {
        // 验收示例：40份、每份3页，单面扣 122 张，双面扣 82 张；后端强制设置 template=1, preview=1
        InMemoryPrintTestHarness harness = new InMemoryPrintTestHarness(500L);

        EduPrintRecord singleRec = new EduPrintRecord();
        singleRec.setPrintName("高三物理周测单面");
        singleRec.setPaperGoodsId(8L);
        singleRec.setPaperType("8K");
        singleRec.setPrintCount(40L);
        singleRec.setPageCount(3L);
        singleRec.setPrintSide("1");
        singleRec.setTemplatePaperCount(0L); // 故意传入0，验证后端强制覆盖为1
        singleRec.setPreviewPaperCount(99L); // 故意传入99，验证后端强制覆盖为1

        harness.service.insertEduPrintRecord(singleRec);
        assertEquals(1L, singleRec.getTemplatePaperCount());
        assertEquals(1L, singleRec.getPreviewPaperCount());
        assertEquals(122L, singleRec.getTotalPages(), "40份×3页单面应为 120 + 1 + 1 = 122 张");
        assertEquals(500L - 122L, harness.availableSheets());
        StockOut singleOut = harness.outMap.get(singleRec.getOutId());
        assertNotNull(singleOut);
        assertEquals(122L, singleOut.getItemList().get(0).getQuantity());
        assertTrue(singleOut.getRemark().contains("模板1张 + 预览1张 = 122张"));

        EduPrintRecord doubleRec = new EduPrintRecord();
        doubleRec.setPrintName("高三物理周测双面");
        doubleRec.setPaperGoodsId(8L);
        doubleRec.setPaperType("8K");
        doubleRec.setPrintCount(40L);
        doubleRec.setPageCount(3L);
        doubleRec.setPrintSide("2");

        harness.service.insertEduPrintRecord(doubleRec);
        assertEquals(1L, doubleRec.getTemplatePaperCount());
        assertEquals(1L, doubleRec.getPreviewPaperCount());
        assertEquals(82L, doubleRec.getTotalPages(), "40份×3页双面应为 40×2 + 1 + 1 = 82 张");
        assertEquals(500L - 122L - 82L, harness.availableSheets());
    }

    @Test
    public void testStockExactAndInsufficientWithExtraPaper() throws Exception
    {
        // 1. 库存仅 120 张（只够正式印刷 40×3 单面，不够模板1+预览1），应报库存不足
        InMemoryPrintTestHarness insufficientHarness = new InMemoryPrintTestHarness(120L);
        EduPrintRecord rec = new EduPrintRecord();
        rec.setPrintName("临界库存测试卷");
        rec.setPaperGoodsId(8L);
        rec.setPaperType("8K");
        rec.setPrintCount(40L);
        rec.setPageCount(3L);
        rec.setPrintSide("1");

        ServiceException ex = assertThrows(ServiceException.class, () -> insufficientHarness.service.insertEduPrintRecord(rec));
        assertTrue(ex.getMessage().contains("122 张"), "错误信息应包含含额外用纸在内的总需求 122 张: " + ex.getMessage());
        assertTrue(ex.getMessage().contains("模板1张 + 预览1张"));
        assertEquals(120L, insufficientHarness.availableSheets(), "校验失败后库存不应被扣减");

        // 2. 库存恰好 122 张，应成功扣减至 0 张
        InMemoryPrintTestHarness exactHarness = new InMemoryPrintTestHarness(122L);
        exactHarness.service.insertEduPrintRecord(rec);
        assertEquals(0L, exactHarness.availableSheets());
    }

    @Test
    public void testSplitExamAndAnswerBatchExtraPaperAndTransactionRollback() throws Exception
    {
        // 验证 insertEduPrintRecordBatch 带有 @Transactional(rollbackFor = Exception.class)
        Method batchMethod = EduPrintRecordServiceImpl.class.getMethod("insertEduPrintRecordBatch", List.class);
        Transactional tx = batchMethod.getAnnotation(Transactional.class);
        assertNotNull(tx, "insertEduPrintRecordBatch 必须声明 @Transactional 保证同一事务");

        // 场景：40份×3页双面试卷（正式80+额外2=82张）+ 2份×1页单面答案（正式2+额外2=4张），合计 86 张（额外用纸共 +4 张）
        InMemoryPrintTestHarness harness = new InMemoryPrintTestHarness(86L);

        EduPrintRecord exam = new EduPrintRecord();
        exam.setPrintName("[试卷] 高三数学周测");
        exam.setPaperGoodsId(8L);
        exam.setPaperType("8K");
        exam.setPrintCount(40L);
        exam.setPageCount(3L);
        exam.setPrintSide("2");

        EduPrintRecord answer = new EduPrintRecord();
        answer.setPrintName("[答案] 高三数学周测");
        answer.setPaperGoodsId(8L);
        answer.setPaperType("8K");
        answer.setPrintCount(2L);
        answer.setPageCount(1L);
        answer.setPrintSide("1");

        int inserted = harness.service.insertEduPrintRecordBatch(List.of(exam, answer));
        assertEquals(2, inserted);
        assertEquals(82L, exam.getTotalPages());
        assertEquals(4L, answer.getTotalPages());
        assertEquals(86L, exam.getTotalPages() + answer.getTotalPages(), "试卷+答案合计应含 4 张额外用纸");
        assertEquals(0L, harness.availableSheets());

        // 若库存只有 84 张（够试卷 82 张，不够答案 4 张），第二条应抛出异常触发事务回滚
        InMemoryPrintTestHarness failHarness = new InMemoryPrintTestHarness(84L);
        assertThrows(ServiceException.class, () -> failHarness.service.insertEduPrintRecordBatch(List.of(exam, answer)));
    }

    @Test
    public void testEditCompleteCancelDeleteAndHistoricalRecordCompatibility() throws Exception
    {
        InMemoryPrintTestHarness harness = new InMemoryPrintTestHarness(500L);

        // 1. 新登记（含额外用纸 1+1）：40份×3页单面 = 122张
        EduPrintRecord newRec = new EduPrintRecord();
        newRec.setPrintName("新规则登记");
        newRec.setPaperGoodsId(8L);
        newRec.setPaperType("8K");
        newRec.setPrintCount(40L);
        newRec.setPageCount(3L);
        newRec.setPrintSide("1");
        harness.service.insertEduPrintRecord(newRec);
        assertEquals(378L, harness.availableSheets()); // 500 - 122 = 378

        // 2. 编辑待印刷的新登记：改为双面（40份×3页双面 = 80 + 1 + 1 = 82张），退回 122 张并重扣 82 张
        EduPrintRecord editNew = new EduPrintRecord();
        editNew.setPrintId(newRec.getPrintId());
        editNew.setPrintSide("2");
        harness.service.updateEduPrintRecord(editNew);
        EduPrintRecord afterEditNew = harness.service.selectEduPrintRecordByPrintId(newRec.getPrintId());
        assertEquals(82L, afterEditNew.getTotalPages());
        assertEquals(1L, afterEditNew.getTemplatePaperCount());
        assertEquals(1L, afterEditNew.getPreviewPaperCount());
        assertEquals(418L, harness.availableSheets()); // 500 - 82 = 418

        // 3. 完成印刷：不再次扣纸
        EduPrintRecord completePatch = new EduPrintRecord();
        completePatch.setPrintId(newRec.getPrintId());
        completePatch.setStatus("1");
        completePatch.setResultImg("/profile/upload/done.jpg");
        harness.service.updateEduPrintRecord(completePatch);
        assertEquals(418L, harness.availableSheets(), "完成印刷不应再次扣减库存");

        // 4. 作废登记：退回实际关联出库数量（82张）
        harness.service.cancelEduPrintRecord(newRec.getPrintId());
        assertEquals(500L, harness.availableSheets(), "作废后应全额退回 82 张（含额外用纸）");

        // 5. 模拟历史旧规则登记（templatePaperCount=0, previewPaperCount=0，40份×3页单面=120张）
        StockOut histOut = new StockOut();
        histOut.setOutType("3");
        StockOutItem histItem = new StockOutItem();
        histItem.setGoodsId(8L);
        histItem.setQuantity(120L);
        histOut.setItemList(List.of(histItem));
        Field outServiceField = EduPrintRecordServiceImpl.class.getDeclaredField("stockOutService");
        outServiceField.setAccessible(true);
        ((IStockOutService) outServiceField.get(harness.service)).insertEduStockOut(histOut);
        assertEquals(380L, harness.availableSheets()); // 500 - 120 = 380

        EduPrintRecord histRec = new EduPrintRecord();
        histRec.setPrintId(99L);
        histRec.setPrintName("历史旧规则记录");
        histRec.setPaperGoodsId(8L);
        histRec.setPaperType("8K");
        histRec.setPrintCount(40L);
        histRec.setPageCount(3L);
        histRec.setPrintSide("1");
        histRec.setTemplatePaperCount(0L);
        histRec.setPreviewPaperCount(0L);
        histRec.setTotalPages(120L);
        histRec.setOutId(histOut.getOutId());
        histRec.setStatus("0");
        harness.recordMap.put(99L, histRec);

        // 编辑历史待印刷记录为双面：应保留 0+0 旧规则，重新计算为 80 张（而非 82 张），不暗中补扣
        EduPrintRecord editHist = new EduPrintRecord();
        editHist.setPrintId(99L);
        editHist.setPrintSide("2");
        harness.service.updateEduPrintRecord(editHist);
        EduPrintRecord afterEditHist = harness.service.selectEduPrintRecordByPrintId(99L);
        assertEquals(0L, afterEditHist.getTemplatePaperCount(), "历史记录编辑后仍保持 templatePaperCount=0");
        assertEquals(0L, afterEditHist.getPreviewPaperCount(), "历史记录编辑后仍保持 previewPaperCount=0");
        assertEquals(80L, afterEditHist.getTotalPages(), "历史记录改为双面后应为 80 张，不补扣 2 张额外用纸");
        assertEquals(420L, harness.availableSheets()); // 500 - 80 = 420

        // 删除历史记录：退回实际出库数量 80 张
        harness.service.deleteEduPrintRecordByPrintIds(new Long[]{99L});
        assertEquals(500L, harness.availableSheets());
    }

    @Test
    public void testStructuredParserAllPatternsAndCrossContactIsolation() throws Exception
    {
        // 构造包含两个同名联系人（不同会话ID）、多天记录、文件在前/要求在后、要求在前/文件在后、引用消息、普通闲聊、无附件需求、缺失附件的请求
        WechatStructuredParseRequest req = new WechatStructuredParseRequest();

        // 会话1：张老师（会话ID: conv_zhang_1）
        ConversationItem conv1 = new ConversationItem();
        conv1.setConversationId("conv_zhang_1");
        conv1.setConversationName("张老师");
        conv1.setFolder("联系人/张老师");

        // 1) 普通闲聊（仅作上下文，不生成候选）
        MessageItem m1 = new MessageItem();
        m1.setId("1");
        m1.setType("普通文本");
        m1.setDatetime("2026/10/01 08:00:00");
        m1.setName("张老师");
        m1.setContent("早上好，龙老师在吗？");

        // 2) 文件在前 + 引用消息要求在后（附件正常，但磁盘文件名有 (1) 后缀，验证使用 contentData.title 作为原文件名、exportMediaUrl 精确匹配）
        MessageItem m2 = new MessageItem();
        m2.setId("2");
        m2.setType("文件");
        m2.setDatetime("2026/10/01 08:01:00");
        m2.setName("张老师");
        ContentData cd2 = new ContentData();
        cd2.setTitle("高一数学国庆作业.pdf");
        m2.setContentData(cd2);
        m2.setExportMediaUrl("files/file_aaaa1111_高一数学国庆作业(1).pdf");

        MessageItem m3 = new MessageItem();
        m3.setId("3");
        m3.setType("引用消息");
        m3.setDatetime("2026/10/01 08:01:30");
        m3.setName("张老师");
        m3.setContent("");
        ContentData cd3 = new ContentData();
        cd3.setTitle("龙老师，这个文档打印45份，双面");
        cd3.setContent("龙老师，这个文档打印45份，双面");
        m3.setContentData(cd3);

        // 3) 跨天记录：要求在前 + 文件在后（且附件缺失 exportMediaError）
        MessageItem m4 = new MessageItem();
        m4.setId("4");
        m4.setType("普通文本");
        m4.setDatetime("2026/10/02 09:10:00");
        m4.setName("张老师");
        m4.setContent("帮忙印30份单面");

        MessageItem m5 = new MessageItem();
        m5.setId("5");
        m5.setType("文件");
        m5.setDatetime("2026/10/02 09:10:05");
        m5.setName("张老师");
        ContentData cd5 = new ContentData();
        cd5.setTitle("高一数学每日一练.docx");
        m5.setContentData(cd5);
        m5.setExportMediaError("本地未找到文件附件：高一数学每日一练.docx");

        // 4) 第三天：无附件打印需求
        MessageItem m6 = new MessageItem();
        m6.setId("6");
        m6.setType("普通文本");
        m6.setDatetime("2026/10/03 10:00:00");
        m6.setName("张老师");
        m6.setContent("龙老师，帮我把昨天的练习再打印15份");

        conv1.setMessages(List.of(m1, m2, m3, m4, m5, m6));

        // 会话2：同名“张老师”（不同会话ID: conv_zhang_2），同一天发送同名附件，验证绝不串联
        ConversationItem conv2 = new ConversationItem();
        conv2.setConversationId("conv_zhang_2");
        conv2.setConversationName("张老师");
        conv2.setFolder("联系人/张老师_2b3c4d5e");

        MessageItem m2_1 = new MessageItem();
        m2_1.setId("2");
        m2_1.setType("文件");
        m2_1.setDatetime("2026/10/01 08:01:10");
        m2_1.setName("张老师");
        ContentData cd2_1 = new ContentData();
        cd2_1.setTitle("高一数学国庆作业.pdf");
        m2_1.setContentData(cd2_1);
        m2_1.setExportMediaUrl("files/file_bbbb2222_高一数学国庆作业.pdf");

        MessageItem m2_2 = new MessageItem();
        m2_2.setId("3");
        m2_2.setType("普通文本");
        m2_2.setDatetime("2026/10/01 08:01:40");
        m2_2.setName("张老师");
        m2_2.setContent("印60份");

        conv2.setMessages(List.of(m2_1, m2_2));
        req.setConversations(List.of(conv1, conv2));

        String expectedM2Id = WechatExportStructuredParser.buildStableMessageId(m2, null, 1, null);
        String expectedM5Id = WechatExportStructuredParser.buildStableMessageId(m5, null, 4, null);
        String expectedM6Id = WechatExportStructuredParser.buildStableMessageId(m6, null, 5, null);
        String expectedM2_1Id = WechatExportStructuredParser.buildStableMessageId(m2_1, null, 0, null);

        // 配置 EduOcrServiceImpl 并模拟 conv_zhang_1 的消息 m2 已经登记过
        EduOcrServiceImpl ocrService = new EduOcrServiceImpl();
        InMemoryPrintTestHarness harness = new InMemoryPrintTestHarness(1000L);
        EduPrintRecord existing = new EduPrintRecord();
        existing.setPrintId(501L);
        existing.setPrintName("高一数学国庆作业");
        existing.setSourceConversationId("conv_zhang_1");
        existing.setSourceMessageId(expectedM2Id);
        existing.setStatus("0");
        existing.setPrintTime(new Date());
        harness.recordMap.put(501L, existing);

        Field mapperField = EduOcrServiceImpl.class.getDeclaredField("eduPrintRecordMapper");
        mapperField.setAccessible(true);
        Field harnessMapperField = EduPrintRecordServiceImpl.class.getDeclaredField("eduPrintRecordMapper");
        harnessMapperField.setAccessible(true);
        mapperField.set(ocrService, harnessMapperField.get(harness.service));

        EduPrintOcrResult res = ocrService.parseStructuredMessages(req);
        assertTrue(Boolean.TRUE.equals(res.getSuccess()));
        List<PrintTaskItem> tasks = res.getTaskList();
        assertEquals(4, tasks.size(), "应生成 4 条候选（conv1 3条 + conv2 1条），普通闲聊不生成候选");

        // Task 0: conv_zhang_1 的文件在前+引用消息在后（已登记）
        PrintTaskItem t0 = tasks.get(0);
        assertEquals("conv_zhang_1", t0.getSourceConversationId());
        assertEquals(expectedM2Id, t0.getSourceMessageId());
        assertEquals("高一数学国庆作业.pdf", t0.getOriginalDocName());
        assertEquals("高一数学国庆作业", t0.getPrintName());
        assertEquals(45L, t0.getPrintCount());
        assertEquals("2", t0.getPrintSide());
        assertEquals("ready", t0.getAttachmentStatus());
        assertEquals("联系人/张老师/files/file_aaaa1111_高一数学国庆作业(1).pdf", t0.getAttachmentRelativePath());
        assertTrue(Boolean.TRUE.equals(t0.getAlreadyRegistered()), "匹配 (sourceConversationId, sourceMessageId) 的记录应标记为已登记");
        assertTrue(t0.getExistingRecordDesc().contains("已登记（来源会话与消息匹配）"));

        // Task 1: conv_zhang_1 的要求在前+文件在后（缺失附件仍保留候选并明确标记）
        PrintTaskItem t1 = tasks.get(1);
        assertEquals("conv_zhang_1", t1.getSourceConversationId());
        assertEquals(expectedM5Id, t1.getSourceMessageId());
        assertEquals("高一数学每日一练.docx", t1.getOriginalDocName());
        assertEquals(30L, t1.getPrintCount());
        assertEquals("1", t1.getPrintSide());
        assertEquals("missing", t1.getAttachmentStatus());
        assertTrue(t1.getReviewReasons().contains("附件缺失"));
        assertFalse(Boolean.TRUE.equals(t1.getAlreadyRegistered()));

        // Task 2: conv_zhang_1 的无附件需求
        PrintTaskItem t2 = tasks.get(2);
        assertEquals("conv_zhang_1", t2.getSourceConversationId());
        assertEquals(expectedM6Id, t2.getSourceMessageId());
        assertNull(t2.getOriginalDocName());
        assertEquals(15L, t2.getPrintCount());
        assertTrue(t2.getReviewReasons().contains("缺少材料名称，请对照聊天填写"));

        // Task 3: conv_zhang_2（同名张老师，不同会话ID，同名附件）：独立解析为60份，且不因 conv_zhang_1 已登记而被误标为 alreadyRegistered
        PrintTaskItem t3 = tasks.get(3);
        assertEquals("conv_zhang_2", t3.getSourceConversationId());
        assertEquals(expectedM2_1Id, t3.getSourceMessageId());
        assertEquals(60L, t3.getPrintCount());
        assertEquals("联系人/张老师_2b3c4d5e/files/file_bbbb2222_高一数学国庆作业.pdf", t3.getAttachmentRelativePath());
        assertFalse(Boolean.TRUE.equals(t3.getAlreadyRegistered()), "不同会话ID的同名附件不应自动标为已登记");
        assertEquals(1, res.getFirstUnregisteredIndex(), "首个未登记索引应跳过已登记的第0条，指向第1条");
    }

    @Test
    public void testSingleDayThenFullHistoryStableMessageIdNoDuplicateOrFalseCollision() throws Exception
    {
        // P1 回归验证：
        // 1) 先只导入 10月1日 一天（此时 localId="1" 在切片中唯一），生成候选并保存登记；
        // 2) 再导入全量历史（包含 10月1日 localId="1" 和 10月2日 另一个分片同为 localId="1" 的消息）；
        // 验证：10月1日消息在两次导入中的 sourceMessageId 完全一致并被识别为已登记，而 10月2日同 localId="1" 消息不会被误判为已登记。
        MessageItem day1File = new MessageItem();
        day1File.setId("1");
        day1File.setServerId("900001");
        day1File.setType("文件");
        day1File.setDatetime("2026/10/01 09:00:00");
        day1File.setName("王老师");
        ContentData cdDay1 = new ContentData();
        cdDay1.setTitle("高二化学周测A卷.pdf");
        day1File.setContentData(cdDay1);
        day1File.setExportMediaUrl("files/chem_day1.pdf");

        MessageItem day1Req = new MessageItem();
        day1Req.setId("2");
        day1Req.setServerId("900002");
        day1Req.setType("普通文本");
        day1Req.setDatetime("2026/10/01 09:00:20");
        day1Req.setName("王老师");
        day1Req.setContent("印40份双面");

        MessageItem day2FileSameLocalId = new MessageItem();
        day2FileSameLocalId.setId("1"); // 跨分片重复的 localId="1"
        day2FileSameLocalId.setServerId("900555");
        day2FileSameLocalId.setType("文件");
        day2FileSameLocalId.setDatetime("2026/10/02 10:30:00");
        day2FileSameLocalId.setName("王老师");
        ContentData cdDay2 = new ContentData();
        cdDay2.setTitle("高二化学周测B卷.pdf");
        day2FileSameLocalId.setContentData(cdDay2);
        day2FileSameLocalId.setExportMediaUrl("files/chem_day2.pdf");

        MessageItem day2Req = new MessageItem();
        day2Req.setId("2");
        day2Req.setServerId("900556");
        day2Req.setType("普通文本");
        day2Req.setDatetime("2026/10/02 10:30:15");
        day2Req.setName("王老师");
        day2Req.setContent("印50份单面");

        InMemoryPrintTestHarness harness = new InMemoryPrintTestHarness(1000L);
        EduOcrServiceImpl ocrService = new EduOcrServiceImpl();
        Field mapperField = EduOcrServiceImpl.class.getDeclaredField("eduPrintRecordMapper");
        mapperField.setAccessible(true);
        Field harnessMapperField = EduPrintRecordServiceImpl.class.getDeclaredField("eduPrintRecordMapper");
        harnessMapperField.setAccessible(true);
        mapperField.set(ocrService, harnessMapperField.get(harness.service));

        // 第一次：只导入 10月1日 单日记录
        ConversationItem singleDayConv = new ConversationItem();
        singleDayConv.setConversationId("conv_wang_1");
        singleDayConv.setConversationName("王老师");
        singleDayConv.setFolder("联系人/王老师");
        singleDayConv.setMessages(List.of(day1File, day1Req));
        WechatStructuredParseRequest reqSingleDay = new WechatStructuredParseRequest();
        reqSingleDay.setConversations(List.of(singleDayConv));

        EduPrintOcrResult resSingleDay = ocrService.parseStructuredMessages(reqSingleDay);
        assertEquals(1, resSingleDay.getTaskList().size());
        PrintTaskItem taskDay1FirstImport = resSingleDay.getTaskList().get(0);
        assertEquals("1:900001", taskDay1FirstImport.getSourceMessageId());
        assertFalse(Boolean.TRUE.equals(taskDay1FirstImport.getAlreadyRegistered()));

        // 保存第1天候选为正式登记
        EduPrintRecord savedDay1 = new EduPrintRecord();
        savedDay1.setPrintName(taskDay1FirstImport.getPrintName());
        savedDay1.setPaperGoodsId(8L);
        savedDay1.setPaperType("8K");
        savedDay1.setPrintCount(40L);
        savedDay1.setPageCount(2L);
        savedDay1.setPrintSide("2");
        savedDay1.setSourceConversationId(taskDay1FirstImport.getSourceConversationId());
        savedDay1.setSourceMessageId(taskDay1FirstImport.getSourceMessageId());
        harness.service.insertEduPrintRecord(savedDay1);

        // 第二次：导入全部历史记录（10月1日 + 10月2日，两个 localId 都是 "1"）
        ConversationItem fullHistoryConv = new ConversationItem();
        fullHistoryConv.setConversationId("conv_wang_1");
        fullHistoryConv.setConversationName("王老师");
        fullHistoryConv.setFolder("联系人/王老师");
        fullHistoryConv.setMessages(List.of(day1File, day1Req, day2FileSameLocalId, day2Req));
        WechatStructuredParseRequest reqFullHistory = new WechatStructuredParseRequest();
        reqFullHistory.setConversations(List.of(fullHistoryConv));

        EduPrintOcrResult resFullHistory = ocrService.parseStructuredMessages(reqFullHistory);
        assertEquals(2, resFullHistory.getTaskList().size());

        PrintTaskItem taskDay1SecondImport = resFullHistory.getTaskList().get(0);
        PrintTaskItem taskDay2SecondImport = resFullHistory.getTaskList().get(1);

        assertEquals(taskDay1FirstImport.getSourceMessageId(), taskDay1SecondImport.getSourceMessageId(),
                "单日导入与全量导入对同一条消息生成的 sourceMessageId 必须完全一致");
        assertTrue(Boolean.TRUE.equals(taskDay1SecondImport.getAlreadyRegistered()),
                "10月1日已保存过的消息在全量导入时必须准确识别为已登记");
        assertEquals("1:900555", taskDay2SecondImport.getSourceMessageId());
        assertFalse(Boolean.TRUE.equals(taskDay2SecondImport.getAlreadyRegistered()),
                "10月2日具有相同 localId='1' 的不同消息绝不能被误判为已登记");
        assertEquals(1, resFullHistory.getFirstUnregisteredIndex(), "首个未登记索引应自动定位到10月2日的新消息");
    }

    @Test
    public void testSaveTimeDuplicateSourceCheckAndExplicitReprint() throws Exception
    {
        // P2 回归验证：保存时后端再次校验重复来源（含并发提交防护），除非显式传 reprintConfirmed=true
        InMemoryPrintTestHarness harness = new InMemoryPrintTestHarness(1000L);

        // Concurrent commits are covered by the JDBC/Spring test below; this harness tests sequential validation only.
        EduPrintRecord initial = sourceRecord(false);
        initial.setSourceConversationId("conv_concurrent_1");
        harness.service.insertEduPrintRecord(initial);
        assertEquals(1000L - 62L, harness.availableSheets());

        // 再次直接保存（未确认重新登记）应抛异常且不扣库存
        EduPrintRecord dupAttempt = new EduPrintRecord();
        dupAttempt.setPrintName("并发测试高三英语阅读");
        dupAttempt.setPaperGoodsId(8L);
        dupAttempt.setPaperType("8K");
        dupAttempt.setPrintCount(30L);
        dupAttempt.setPageCount(2L);
        dupAttempt.setPrintSide("1");
        dupAttempt.setSourceConversationId("conv_concurrent_1");
        dupAttempt.setSourceMessageId("10:1790812800");
        ServiceException dupEx = assertThrows(ServiceException.class, () -> harness.service.insertEduPrintRecord(dupAttempt));
        assertTrue(dupEx.getMessage().contains("已登记"));
        assertEquals(1000L - 62L, harness.availableSheets());

        // 用户明确选择“重新登记”（reprintConfirmed = true）时允许再次保存并扣库存
        EduPrintRecord reprintAttempt = new EduPrintRecord();
        reprintAttempt.setPrintName("并发测试高三英语阅读");
        reprintAttempt.setPaperGoodsId(8L);
        reprintAttempt.setPaperType("8K");
        reprintAttempt.setPrintCount(30L);
        reprintAttempt.setPageCount(2L);
        reprintAttempt.setPrintSide("1");
        reprintAttempt.setSourceConversationId("conv_concurrent_1");
        reprintAttempt.setSourceMessageId("10:1790812800");
        reprintAttempt.setReprintConfirmed(true);
        harness.service.insertEduPrintRecord(reprintAttempt);
        assertEquals(1000L - 124L, harness.availableSheets(), "显式确认重印后应允许保存并扣减第2次库存");
    }

    private static class JdbcPrintTestHarness
    {
        final org.springframework.jdbc.core.JdbcTemplate jdbc;
        final com.doupi.edu.service.IEduPrintRecordService transactionalService;
        final java.util.concurrent.atomic.AtomicBoolean delayNextCommit = new java.util.concurrent.atomic.AtomicBoolean();
        final java.util.concurrent.CountDownLatch commitEntered = new java.util.concurrent.CountDownLatch(1);
        final java.util.concurrent.CountDownLatch releaseCommit = new java.util.concurrent.CountDownLatch(1);
        volatile java.util.concurrent.CountDownLatch sourceReadEntered = new java.util.concurrent.CountDownLatch(1);

        JdbcPrintTestHarness(String databaseName) throws Exception
        {
            // 使用真实 H2 内存数据库 + Spring DataSourceTransactionManager + TransactionInterceptor 验证拆分保存失败时的真实 JDBC 事务回滚
            org.h2.jdbcx.JdbcDataSource ds = new org.h2.jdbcx.JdbcDataSource();
            ds.setURL("jdbc:h2:mem:" + databaseName + ";MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000");
            ds.setUser("sa");
            ds.setPassword("");

            jdbc = new org.springframework.jdbc.core.JdbcTemplate(ds);
            jdbc.execute("DROP TABLE IF EXISTS edu_print_record");
            jdbc.execute("DROP TABLE IF EXISTS edu_stock_out");
            jdbc.execute("DROP TABLE IF EXISTS edu_goods");
            jdbc.execute("""
                    CREATE TABLE edu_goods (
                        goods_id BIGINT PRIMARY KEY,
                        goods_name VARCHAR(128),
                        unit VARCHAR(32),
                        base_unit VARCHAR(32),
                        conversion_rate INT,
                        stock_num BIGINT,
                        remain_sheets INT
                    )
                    """);
            jdbc.execute("""
                    CREATE TABLE edu_stock_out (
                        out_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        goods_id BIGINT,
                        quantity BIGINT,
                        remark VARCHAR(255),
                        status CHAR(1)
                    )
                    """);
            jdbc.execute("""
                    CREATE TABLE edu_print_record (
                        print_id BIGINT AUTO_INCREMENT PRIMARY KEY,
                        print_name VARCHAR(255),
                        paper_goods_id BIGINT,
                        paper_type VARCHAR(32),
                        print_count BIGINT,
                        page_count BIGINT,
                        print_side VARCHAR(8),
                        template_paper_count BIGINT,
                        preview_paper_count BIGINT,
                        total_pages BIGINT,
                        out_id BIGINT,
                        status CHAR(1),
                        del_flag CHAR(1) DEFAULT '0',
                        source_conversation_id VARCHAR(128),
                        source_message_id VARCHAR(128)
                    )
                    """);
            jdbc.execute("CREATE TABLE IF NOT EXISTS edu_print_source_lock (source_conversation_id VARCHAR(64) PRIMARY KEY)");
            // 初始库存 150 张（试卷需 82 张能成功，答案需 82 张会触发库存不足异常）
            jdbc.update("INSERT INTO edu_goods(goods_id, goods_name, unit, base_unit, conversion_rate, stock_num, remain_sheets) VALUES (8, '8K试卷纸', '包', '张', 500, 0, 150)");

            StockGoodsMapper h2GoodsMapper = (StockGoodsMapper) Proxy.newProxyInstance(
                    StockGoodsMapper.class.getClassLoader(),
                    new Class<?>[]{StockGoodsMapper.class},
                    (proxy, method, args) -> {
                        if ("selectEduGoodsByGoodsId".equals(method.getName()) || "selectStockGoodsByGoodsId".equals(method.getName()))
                        {
                            Long gid = (Long) args[0];
                            return jdbc.queryForObject("SELECT * FROM edu_goods WHERE goods_id = ?", (rs, rowNum) -> {
                                StockGoods g = new StockGoods();
                                g.setGoodsId(rs.getLong("goods_id"));
                                g.setGoodsName(rs.getString("goods_name"));
                                g.setUnit(rs.getString("unit"));
                                g.setBaseUnit(rs.getString("base_unit"));
                                g.setConversionRate(rs.getInt("conversion_rate"));
                                g.setStockNum(rs.getLong("stock_num"));
                                g.setRemainSheets(rs.getInt("remain_sheets"));
                                return g;
                            }, gid);
                        }
                        return null;
                    }
            );

            IStockOutService h2StockOutService = (IStockOutService) Proxy.newProxyInstance(
                    IStockOutService.class.getClassLoader(),
                    new Class<?>[]{IStockOutService.class},
                    (proxy, method, args) -> {
                        if ("insertEduStockOut".equals(method.getName()))
                        {
                            StockOut out = (StockOut) args[0];
                            for (StockOutItem item : out.getItemList())
                            {
                                Integer remain = jdbc.queryForObject("SELECT remain_sheets FROM edu_goods WHERE goods_id = ?", Integer.class, item.getGoodsId());
                                if (remain == null || remain < item.getQuantity())
                                {
                                    throw new ServiceException("H2数据库出库扣减失败：库存不足");
                                }
                                jdbc.update("UPDATE edu_goods SET remain_sheets = remain_sheets - ? WHERE goods_id = ?", item.getQuantity(), item.getGoodsId());
                                org.springframework.jdbc.support.KeyHolder kh = new org.springframework.jdbc.support.GeneratedKeyHolder();
                                jdbc.update(con -> {
                                    java.sql.PreparedStatement ps = con.prepareStatement(
                                            "INSERT INTO edu_stock_out(goods_id, quantity, remark, status) VALUES (?, ?, ?, '0')",
                                            java.sql.Statement.RETURN_GENERATED_KEYS);
                                    ps.setLong(1, item.getGoodsId());
                                    ps.setLong(2, item.getQuantity());
                                    ps.setString(3, out.getRemark());
                                    return ps;
                                }, kh);
                                out.setOutId(kh.getKey().longValue());
                            }
                            return 1;
                        }
                        return null;
                    }
            );

            org.mybatis.spring.SqlSessionFactoryBean factory = new org.mybatis.spring.SqlSessionFactoryBean();
            factory.setDataSource(ds);
            org.apache.ibatis.session.Configuration configuration = new org.apache.ibatis.session.Configuration();
            configuration.getTypeAliasRegistry().registerAlias("EduPrintRecord", EduPrintRecord.class);
            factory.setConfiguration(configuration);
            factory.setMapperLocations(new org.springframework.core.io.ClassPathResource("mapper/edu/EduPrintRecordMapper.xml"));
            EduPrintRecordMapper sqlMapper = new org.mybatis.spring.SqlSessionTemplate(factory.getObject()).getMapper(EduPrintRecordMapper.class);

            EduPrintRecordMapper h2RecordMapper = (EduPrintRecordMapper) Proxy.newProxyInstance(
                    EduPrintRecordMapper.class.getClassLoader(),
                    new Class<?>[]{EduPrintRecordMapper.class},
                    (proxy, method, args) -> {
                        String m = method.getName();
                        if ("insertEduPrintRecord".equals(m))
                        {
                            EduPrintRecord r = (EduPrintRecord) args[0];
                            org.springframework.jdbc.support.KeyHolder kh = new org.springframework.jdbc.support.GeneratedKeyHolder();
                            jdbc.update(con -> {
                                java.sql.PreparedStatement ps = con.prepareStatement(
                                        "INSERT INTO edu_print_record(print_name, paper_goods_id, paper_type, print_count, page_count, print_side, template_paper_count, preview_paper_count, total_pages, status, source_conversation_id, source_message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                        java.sql.Statement.RETURN_GENERATED_KEYS);
                                ps.setString(1, r.getPrintName());
                                ps.setObject(2, r.getPaperGoodsId());
                                ps.setString(3, r.getPaperType());
                                ps.setObject(4, r.getPrintCount());
                                ps.setObject(5, r.getPageCount());
                                ps.setString(6, r.getPrintSide());
                                ps.setObject(7, r.getTemplatePaperCount());
                                ps.setObject(8, r.getPreviewPaperCount());
                                ps.setObject(9, r.getTotalPages());
                                ps.setString(10, r.getStatus());
                                ps.setString(11, r.getSourceConversationId());
                                ps.setString(12, r.getSourceMessageId());
                                return ps;
                            }, kh);
                            r.setPrintId(kh.getKey().longValue());
                            if (delayNextCommit.compareAndSet(true, false))
                            {
                                org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                                    new org.springframework.transaction.support.TransactionSynchronization() {
                                        @Override public void beforeCommit(boolean readOnly) {
                                            commitEntered.countDown();
                                            try { if (!releaseCommit.await(5, java.util.concurrent.TimeUnit.SECONDS)) throw new IllegalStateException("commit gate timed out"); }
                                            catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new IllegalStateException(e); }
                                        }
                                    });
                            }
                            return 1;
                        }
                        if ("updateEduPrintRecord".equals(m))
                        {
                            EduPrintRecord r = (EduPrintRecord) args[0];
                            return jdbc.update("UPDATE edu_print_record SET out_id = ? WHERE print_id = ?", r.getOutId(), r.getPrintId());
                        }
                        if ("selectEduPrintRecordList".equals(m) || "selectSourceRecordsForUpdate".equals(m))
                        {
                            sourceReadEntered.countDown();
                            if ("selectSourceRecordsForUpdate".equals(m)) return sqlMapper.selectSourceRecordsForUpdate((String) args[0]);
                            String conv = args[0] instanceof EduPrintRecord ? ((EduPrintRecord) args[0]).getSourceConversationId() : (String) args[0];
                            return jdbc.query("SELECT print_id, source_conversation_id, source_message_id, status, del_flag FROM edu_print_record WHERE source_conversation_id = ?" + (m.endsWith("ForUpdate") ? " FOR UPDATE" : ""), (rs, rowNum) -> {
                                EduPrintRecord r = new EduPrintRecord();
                                r.setPrintId(rs.getLong("print_id"));
                                r.setSourceConversationId(rs.getString("source_conversation_id"));
                                r.setSourceMessageId(rs.getString("source_message_id"));
                                r.setStatus(rs.getString("status"));
                                r.setDelFlag(rs.getString("del_flag"));
                                return r;
                            }, conv);
                        }
                        if ("lockSourceRegistration".equals(m))
                        {
                            sqlMapper.lockSourceRegistration((String) args[0]);
                            return null;
                        }
                        return null;
                    }
            );

            EduTeacherMapper noopTeacherMapper = (EduTeacherMapper) Proxy.newProxyInstance(
                    EduTeacherMapper.class.getClassLoader(),
                    new Class<?>[]{EduTeacherMapper.class},
                    (proxy, method, args) -> null
            );

            EduPrintRecordServiceImpl targetService = new EduPrintRecordServiceImpl();
            setField(targetService, "stockGoodsMapper", h2GoodsMapper);
            setField(targetService, "stockOutService", h2StockOutService);
            setField(targetService, "eduPrintRecordMapper", h2RecordMapper);
            setField(targetService, "eduTeacherMapper", noopTeacherMapper);

            // 使用真实 Spring DataSourceTransactionManager + TransactionInterceptor 代理服务
            org.springframework.jdbc.datasource.DataSourceTransactionManager txManager =
                    new org.springframework.jdbc.datasource.DataSourceTransactionManager(ds);
            org.springframework.transaction.interceptor.TransactionInterceptor txInterceptor =
                    new org.springframework.transaction.interceptor.TransactionInterceptor(
                            txManager, new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource());
            org.springframework.aop.framework.ProxyFactory proxyFactory = new org.springframework.aop.framework.ProxyFactory(targetService);
            proxyFactory.setInterfaces(com.doupi.edu.service.IEduPrintRecordService.class);
            proxyFactory.addAdvice(txInterceptor);
            transactionalService =
                    (com.doupi.edu.service.IEduPrintRecordService) proxyFactory.getProxy();

        }
    }

    @Test
    public void testConcurrentSourceRegistrationWaitsForDatabaseCommit() throws Exception
    {
        assertConcurrentSourceRegistration(false);
    }

    @Test
    public void testConcurrentSourceRegistrationWaitsForSplitBatchCommit() throws Exception
    {
        assertConcurrentSourceRegistration(true);
    }

    private void assertConcurrentSourceRegistration(boolean split) throws Exception
    {
        JdbcPrintTestHarness h = new JdbcPrintTestHarness("source_commit_race_" + split);
        h.jdbc.update("UPDATE edu_goods SET remain_sheets = 500");
        h.delayNextCommit.set(true);
        java.util.concurrent.ExecutorService executor = java.util.concurrent.Executors.newFixedThreadPool(2);
        try
        {
            java.util.concurrent.Future<Integer> first = executor.submit(() -> {
                if (!split) return h.transactionalService.insertEduPrintRecord(sourceRecord(false));
                EduPrintRecord answer = sourceRecord(false);
                answer.setSourceMessageId(answer.getSourceMessageId() + "#answer");
                return h.transactionalService.insertEduPrintRecordBatch(List.of(sourceRecord(false), answer));
            });
            assertTrue(h.commitEntered.await(3, java.util.concurrent.TimeUnit.SECONDS), "first request must pause before commit");
            h.sourceReadEntered = new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.CountDownLatch secondStarted = new java.util.concurrent.CountDownLatch(1);
            java.util.concurrent.Future<Integer> second = executor.submit(() -> {
                secondStarted.countDown();
                return h.transactionalService.insertEduPrintRecord(sourceRecord(false));
            });
            assertTrue(secondStarted.await(2, java.util.concurrent.TimeUnit.SECONDS));
            boolean readBeforeCommit = h.sourceReadEntered.await(500, java.util.concurrent.TimeUnit.MILLISECONDS);
            h.releaseCommit.countDown();
            assertEquals(split ? 2 : 1, first.get(3, java.util.concurrent.TimeUnit.SECONDS));
            java.util.concurrent.ExecutionException duplicate = assertThrows(java.util.concurrent.ExecutionException.class,
                () -> second.get(3, java.util.concurrent.TimeUnit.SECONDS));
            assertTrue(duplicate.getCause() instanceof ServiceException);
            assertFalse(readBeforeCommit, "second request must not check uncommitted source registrations");
            assertEquals(split ? 2 : 1, h.jdbc.queryForObject("SELECT COUNT(*) FROM edu_print_record", Integer.class));
            assertEquals(split ? 2 : 1, h.jdbc.queryForObject("SELECT COUNT(*) FROM edu_stock_out", Integer.class));
            assertEquals(split ? 376 : 438, h.jdbc.queryForObject("SELECT remain_sheets FROM edu_goods WHERE goods_id=8", Integer.class));
            h.transactionalService.insertEduPrintRecord(sourceRecord(true));
            assertEquals(split ? 314 : 376, h.jdbc.queryForObject("SELECT remain_sheets FROM edu_goods WHERE goods_id=8", Integer.class));
        }
        finally
        {
            h.releaseCommit.countDown();
            executor.shutdownNow();
            assertTrue(executor.awaitTermination(5, java.util.concurrent.TimeUnit.SECONDS));
        }
    }

    private static EduPrintRecord sourceRecord(boolean reprint)
    {
        EduPrintRecord r = new EduPrintRecord();
        r.setPrintName("事务提交窗口回归");
        r.setPaperGoodsId(8L);
        r.setPrintCount(30L);
        r.setPageCount(2L);
        r.setPrintSide("1");
        r.setSourceConversationId("commit_window");
        r.setSourceMessageId("10:1790812800");
        r.setReprintConfirmed(reprint);
        return r;
    }

    @Test
    public void testRealH2DatabaseSpringTransactionalBatchRollback() throws Exception
    {
        JdbcPrintTestHarness h = new JdbcPrintTestHarness("edu_split_tx_rollback");
        org.springframework.jdbc.core.JdbcTemplate jdbc = h.jdbc;
        com.doupi.edu.service.IEduPrintRecordService transactionalService = h.transactionalService;

        EduPrintRecord exam = new EduPrintRecord();
        exam.setPrintName("高三数学周测[试卷]");
        exam.setPaperGoodsId(8L);
        exam.setPaperType("8K");
        exam.setPrintCount(40L);
        exam.setPageCount(2L);
        exam.setPrintSide("1"); // 82 张（第1条成功写入 H2 事务未提交状态）
        exam.setSourceConversationId("conv_tx_1");
        exam.setSourceMessageId("88:1790812900");

        EduPrintRecord answer = new EduPrintRecord();
        answer.setPrintName("高三数学周测[答案]");
        answer.setPaperGoodsId(8L);
        answer.setPaperType("8K");
        answer.setPrintCount(40L);
        answer.setPageCount(2L);
        answer.setPrintSide("1"); // 再需 82 张，总计 164 > 150，第2条抛出异常触发 Spring 事务回滚
        answer.setSourceConversationId("conv_tx_1");
        answer.setSourceMessageId("88:1790812900#answer");

        assertThrows(ServiceException.class, () -> transactionalService.insertEduPrintRecordBatch(List.of(exam, answer)));

        Integer recordCount = jdbc.queryForObject("SELECT COUNT(*) FROM edu_print_record", Integer.class);
        Integer stockOutCount = jdbc.queryForObject("SELECT COUNT(*) FROM edu_stock_out", Integer.class);
        Integer remainSheets = jdbc.queryForObject("SELECT remain_sheets FROM edu_goods WHERE goods_id = 8", Integer.class);

        assertEquals(0, recordCount, "拆分保存第2条失败后，H2 数据库 edu_print_record 必须回滚为 0 条（绝不留下一半记录）");
        assertEquals(0, stockOutCount, "拆分保存第2条失败后，H2 数据库 edu_stock_out 必须回滚为 0 条");
        assertEquals(150, remainSheets, "拆分保存第2条失败后，H2 数据库 edu_goods 纸张库存必须完整回滚为 150 张");
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM edu_print_source_lock", Integer.class));
        EduPrintRecord retry = sourceRecord(false);
        retry.setSourceConversationId(exam.getSourceConversationId());
        retry.setSourceMessageId(exam.getSourceMessageId());
        assertEquals(1, transactionalService.insertEduPrintRecord(retry));
        assertEquals(88, jdbc.queryForObject("SELECT remain_sheets FROM edu_goods WHERE goods_id=8", Integer.class));
    }

    @Test
    public void testRealWechatExportDirectoryReadOnlyAuditAndPreview() throws Exception
    {
        Path exportRoot = Path.of("C:/Users/javal/Desktop/weixin/全部聊天记录");
        if (!Files.exists(exportRoot))
        {
            return;
        }
        Path manifestPath = exportRoot.resolve("导出清单.json");
        assertTrue(Files.exists(manifestPath), "导出清单.json 必须存在");

        ObjectMapper mapper = new ObjectMapper().configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
        JsonNode manifest = mapper.readTree(Files.readString(manifestPath, StandardCharsets.UTF_8));
        JsonNode convs = manifest.get("conversations");
        assertNotNull(convs);
        assertEquals(790, convs.size(), "当前导出目录应包含 790 个会话");

        // 1. 验证周继兴会话：包含重复 localId（跨数据库分片）和实际打印需求
        Path zhouJsPath = exportRoot.resolve("联系人/周继兴/data/messages.js");
        assertTrue(Files.exists(zhouJsPath));
        String zhouJson = WechatExportStructuredParser.extractJsonFromMessagesJs(Files.readString(zhouJsPath, StandardCharsets.UTF_8));
        ConversationItem zhouConv = parseConversationFromExportJson(mapper, zhouJson, "0f654b8b2ed8094434eeb7d6140f9b17", "周继兴", "联系人/周继兴", exportRoot);

        // 2. 验证文件传输助手会话：包含 id=458 磁盘缺失的 # 文件名附件
        Path helperJsPath = exportRoot.resolve("联系人/文件传输助手/data/messages.js");
        assertTrue(Files.exists(helperJsPath));
        String helperJson = WechatExportStructuredParser.extractJsonFromMessagesJs(Files.readString(helperJsPath, StandardCharsets.UTF_8));
        ConversationItem helperConv = parseConversationFromExportJson(mapper, helperJson, "filehelper", "文件传输助手", "联系人/文件传输助手", exportRoot);

        WechatStructuredParseRequest req = new WechatStructuredParseRequest();
        req.setConversations(List.of(zhouConv, helperConv));

        EduPrintOcrResult result = WechatExportStructuredParser.parse(req);
        assertTrue(Boolean.TRUE.equals(result.getSuccess()));
        assertFalse(result.getTaskList().isEmpty());

        // 验证周继兴 2026-09-12 的“高三数学试卷.pdf”与“高三数学答案.pdf”印40份
        PrintTaskItem mathExam = result.getTaskList().stream()
                .filter(t -> "0f654b8b2ed8094434eeb7d6140f9b17".equals(t.getSourceConversationId())
                        && "高三数学试卷.pdf".equals(t.getOriginalDocName()))
                .findFirst()
                .orElse(null);
        assertNotNull(mathExam, "应识别出周继兴的高三数学试卷.pdf");
        assertEquals(40L, mathExam.getPrintCount());
        assertEquals("ready", mathExam.getAttachmentStatus());
        assertEquals("联系人/周继兴/files/file_4d82a967976b2947_高三数学试卷(1).pdf", mathExam.getAttachmentRelativePath());

        // 验证文件传输助手中磁盘缺失的文件（含 # 符号）被保留候选并标记为 missing
        PrintTaskItem missingHashFile = result.getTaskList().stream()
                .filter(t -> "filehelper".equals(t.getSourceConversationId())
                        && t.getOriginalDocName() != null
                        && t.getOriginalDocName().contains("#"))
                .findFirst()
                .orElse(null);
        assertNotNull(missingHashFile, "文件传输助手中含 # 的缺失附件仍应保留为候选");
        assertEquals("missing", missingHashFile.getAttachmentStatus(), "磁盘不存在该附件时状态应为 missing");
        assertTrue(missingHashFile.getReviewReasons().contains("附件缺失"));
    }

    private ConversationItem parseConversationFromExportJson(
            ObjectMapper mapper,
            String json,
            String convId,
            String convName,
            String folder,
            Path exportRoot
    ) throws Exception
    {
        JsonNode root = mapper.readTree(json);
        List<MessageItem> items = new ArrayList<>();
        JsonNode msgs = root.get("messages");
        if (msgs != null && msgs.isArray())
        {
            for (JsonNode node : msgs)
            {
                MessageItem item = mapper.treeToValue(node, MessageItem.class);
                if (item.getExportMediaUrl() != null && !item.getExportMediaUrl().isBlank())
                {
                    Path diskFile = exportRoot.resolve(folder).resolve(item.getExportMediaUrl());
                    if (!Files.exists(diskFile))
                    {
                        item.setAttachmentMissing(true);
                    }
                }
                items.add(item);
            }
        }
        ConversationItem conv = new ConversationItem();
        conv.setConversationId(convId);
        conv.setConversationName(convName);
        conv.setFolder(folder);
        conv.setMessages(items);
        return conv;
    }
}

