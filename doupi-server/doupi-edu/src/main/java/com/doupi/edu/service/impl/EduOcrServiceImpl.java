package com.doupi.edu.service.impl;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.Semaphore;
import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.benjaminwan.ocrlibrary.OcrResult;
import com.doupi.common.utils.StringUtils;
import com.doupi.edu.domain.EduClass;
import com.doupi.edu.domain.EduTeacher;
import com.doupi.edu.domain.dto.DocumentAnalysisResult;
import com.doupi.edu.domain.dto.EduPrintOcrResult;
import com.doupi.edu.mapper.EduClassMapper;
import com.doupi.edu.mapper.EduTeacherMapper;
import com.doupi.edu.service.IEduOcrService;
import com.doupi.edu.util.DocumentPageAnalyzer;
import com.doupi.edu.service.impl.ocr.ChatLayoutSegmenter;
import com.doupi.edu.service.impl.ocr.ChatTopologyParser;
import com.doupi.edu.service.impl.ocr.EduPrintIntentExtractor;
import com.doupi.stock.domain.StockGoods;
import com.doupi.stock.mapper.StockGoodsMapper;
import io.github.mymonstercat.Model;
import io.github.mymonstercat.ocr.InferenceEngine;
import io.github.mymonstercat.ocr.config.HardwareConfig;

/**
 * 本地离线高精度OCR及微信截图信息提取服务实现（基于 RapidOCR / PaddleOCR ONNX + 对话拓扑建模）
 */
@Service
public class EduOcrServiceImpl implements IEduOcrService 
{
    private static final Logger log = LoggerFactory.getLogger(EduOcrServiceImpl.class);

    // 纯 CPU 推理，限制最大线程数为可用核心数（最多2核），保护Web主线程
    private static final HardwareConfig OCR_HARDWARE_CONFIG;
    // 并发保护信号量：最多允许 2 个并发 OCR 识别
    private static final Semaphore OCR_SEMAPHORE = new Semaphore(2);

    static 
    {
        HardwareConfig config = HardwareConfig.getOnnxConfig();
        int cores = Math.max(1, Math.min(2, Runtime.getRuntime().availableProcessors()));
        config.setNumThread(cores);
        config.setGpuIndex(-1); // 纯 CPU 推理
        OCR_HARDWARE_CONFIG = config;
    }

    @Autowired
    private EduTeacherMapper eduTeacherMapper;

    @Autowired(required = false)
    private StockGoodsMapper stockGoodsMapper;

    @Autowired(required = false)
    private EduClassMapper eduClassMapper;

    @Autowired(required = false)
    private com.doupi.edu.mapper.EduPrintRecordMapper eduPrintRecordMapper;

    /**
     * 解析文档文件（PDF/Word/Excel）的页数与纸张规格，用于登记自动换算耗纸数
     */
    @Override
    public DocumentAnalysisResult analyzeDocument(MultipartFile file)
    {
        return DocumentPageAnalyzer.analyze(file);
    }

    @Override
    public EduPrintOcrResult parseScreenshot(MultipartFile file) 
    {
        EduPrintOcrResult result = new EduPrintOcrResult();
        if (file == null || file.isEmpty()) 
        {
            result.setSuccess(false);
            result.setMsg("上传的文件为空！");
            return result;
        }

        File tempFile = null;
        try 
        {
            String originalFilename = file.getOriginalFilename();
            String suffix = ".png";
            if (originalFilename != null && originalFilename.lastIndexOf('.') > 0) 
            {
                suffix = originalFilename.substring(originalFilename.lastIndexOf('.'));
            }
            tempFile = File.createTempFile("ocr_temp_", suffix);
            try (InputStream in = file.getInputStream(); FileOutputStream out = new FileOutputStream(tempFile)) 
            {
                byte[] buffer = new byte[8192];
                int len;
                while ((len = in.read(buffer)) != -1) 
                {
                    out.write(buffer, 0, len);
                }
            }

            OCR_SEMAPHORE.acquire();
            try 
            {
                log.info("开始执行 RapidOCR 本地高精度识别，图片临时路径: {}", tempFile.getAbsolutePath());
                InferenceEngine engine = InferenceEngine.getInstance(Model.ONNX_PPOCR_V3, OCR_HARDWARE_CONFIG);
                OcrResult ocrResult = engine.runOcr(tempFile.getAbsolutePath());

                int imgWidth = 0, imgHeight = 0;
                try 
                {
                    BufferedImage bimg = ImageIO.read(tempFile);
                    if (bimg != null) 
                    {
                        imgWidth = bimg.getWidth();
                        imgHeight = bimg.getHeight();
                    }
                } 
                catch (Exception ignored) {}

                // 1. 自适应版面切分
                ChatLayoutSegmenter.SegmentResult seg = ChatLayoutSegmenter.segment(ocrResult, imgWidth, imgHeight);

                // 2. 对话拓扑建模与角色分离
                ChatTopologyParser.ChatDialogContext ctx = ChatTopologyParser.parse(
                    seg.chatBlocks,
                    seg.headerBlock,
                    seg.splitX,
                    imgWidth,
                    imgHeight
                );

                log.info("拓扑解析完成：提取到文档 {} 个，纯净聊天文本:\n{}", ctx.fileList.size(), ctx.cleanChatText);

                // 4. 业务意图与槽位抽取
                List<EduPrintOcrResult.SourceMessage> source = com.doupi.edu.service.impl.ocr.ChatMessageNormalizer.normalize(ctx.cleanChatText);
                for (EduPrintOcrResult.SourceMessage m : source) {
                    if (ctx.operatorMessages.stream().anyMatch(op -> op.text.equals(m.getText()))) m.setType("operator");
                }
                result = com.doupi.edu.service.impl.ocr.ChatPrefillParser.parse(ctx.cleanChatText, source);

                // 5. 查询历史同名登记，仅提示用户核对
                checkExistingRecordsAndArrangeQueue(result);
            } 
            finally 
            {
                OCR_SEMAPHORE.release();
            }
        } 
        catch (Throwable e) 
        {
            log.error("RapidOCR 本地高精度识别发生异常", e);
            result.setSuccess(false);
            result.setMsg("本地OCR识别失败: " + e.getMessage());
        } 
        finally 
        {
            if (tempFile != null && tempFile.exists()) 
            {
                tempFile.delete();
            }
        }
        return result;
    }

    @Override
    public EduPrintOcrResult extractInfoFromText(String text) 
    {
        EduPrintOcrResult result = com.doupi.edu.service.impl.ocr.ChatPrefillParser.parse(text);
        matchTeachersForTasks(result);
        checkExistingRecordsAndArrangeQueue(result);
        return result;
    }

    @Override
    public EduPrintOcrResult parseStructuredMessages(com.doupi.edu.domain.dto.WechatStructuredParseRequest request)
    {
        EduPrintOcrResult result = com.doupi.edu.service.impl.ocr.WechatExportStructuredParser.parse(request);
        matchTeachersForTasks(result);
        checkExistingRecordsAndArrangeQueue(result);
        return result;
    }

    /**
     * 按发送人或会话显示名匹配系统内教师档案（仅在唯一匹配时自动预填，同名多教师或未匹配时留空）
     */
    private void matchTeachersForTasks(EduPrintOcrResult result)
    {
        if (result == null || result.getTaskList() == null || result.getTaskList().isEmpty())
        {
            return;
        }
        List<EduTeacher> teachers = getTeachers();
        if (teachers == null || teachers.isEmpty())
        {
            return;
        }
        for (EduPrintOcrResult.PrintTaskItem item : result.getTaskList())
        {
            if (item.getTeacherId() != null)
            {
                continue;
            }
            EduTeacher matched = findUniqueMatchingTeacher(teachers, item.getSender(), item.getSourceConversationName());
            if (matched != null)
            {
                item.setTeacherId(matched.getTeacherId());
                item.setTeacherName(matched.getTeacherName());
                item.setTeacherMatched(true);
                if (StringUtils.isEmpty(item.getGrade()) && StringUtils.isNotEmpty(matched.getGrade()))
                {
                    item.setGrade(matched.getGrade());
                }
                if (StringUtils.isEmpty(item.getSubject()) && StringUtils.isNotEmpty(matched.getSubject()))
                {
                    item.setSubject(matched.getSubject());
                }
            }
        }
    }

    private EduTeacher findUniqueMatchingTeacher(List<EduTeacher> teachers, String sender, String convName)
    {
        String[] candidates = new String[] { sender, convName };
        for (String raw : candidates)
        {
            if (StringUtils.isEmpty(raw))
            {
                continue;
            }
            String clean = raw.trim();
            // 1. 精确匹配
            List<EduTeacher> exact = teachers.stream()
                    .filter(t -> t != null && StringUtils.isNotEmpty(t.getTeacherName()) && clean.equals(t.getTeacherName().trim()))
                    .toList();
            if (exact.size() == 1)
            {
                return exact.get(0);
            }
            // 2. 包含匹配（如“校办-汪思雅”匹配“汪思雅”）
            List<EduTeacher> contained = teachers.stream()
                    .filter(t -> t != null && StringUtils.isNotEmpty(t.getTeacherName()) && t.getTeacherName().trim().length() >= 2 && clean.contains(t.getTeacherName().trim()))
                    .toList();
            if (contained.size() == 1)
            {
                return contained.get(0);
            }
        }
        return null;
    }

    /**
     * 校验是否已登记：
     * 1. 若存在相同 (sourceConversationId, sourceMessageId) 的有效登记，标记 alreadyRegistered = true（默认不再自动提交，需明确选择重印）
     * 2. 否则按材料名称查询历史同名登记，仅作为疑似重复提示，不自动跳过
     */
    private void checkExistingRecordsAndArrangeQueue(EduPrintOcrResult result)
    {
        result.setFirstUnregisteredIndex(0);
        if (eduPrintRecordMapper == null || result.getTaskList() == null || result.getTaskList().isEmpty()) return;

        // 预先按会话ID批量拉取该会话下的已有记录，避免逐条查询
        java.util.Map<String, List<com.doupi.edu.domain.EduPrintRecord>> recordsByConv = new java.util.HashMap<>();
        for (EduPrintOcrResult.PrintTaskItem item : result.getTaskList())
        {
            String convId = item.getSourceConversationId();
            if (StringUtils.isNotEmpty(convId) && !recordsByConv.containsKey(convId))
            {
                try
                {
                    com.doupi.edu.domain.EduPrintRecord q = new com.doupi.edu.domain.EduPrintRecord();
                    q.setSourceConversationId(convId);
                    List<com.doupi.edu.domain.EduPrintRecord> list = eduPrintRecordMapper.selectEduPrintRecordList(q);
                    recordsByConv.put(convId, list != null ? list : Collections.emptyList());
                }
                catch (Exception ex)
                {
                    log.warn("按会话ID查询已有印刷记录失败, sourceConversationId: {}", convId, ex);
                    recordsByConv.put(convId, Collections.emptyList());
                }
            }
        }

        java.util.Map<String, List<com.doupi.edu.domain.EduPrintRecord>> historyRecordsByName = new java.util.HashMap<>();

        for (EduPrintOcrResult.PrintTaskItem item : result.getTaskList())
        {
            boolean matchedBySource = false;
            String convId = item.getSourceConversationId();
            String msgId = item.getSourceMessageId();
            if (StringUtils.isNotEmpty(convId) && StringUtils.isNotEmpty(msgId))
            {
                List<com.doupi.edu.domain.EduPrintRecord> convRecords = recordsByConv.getOrDefault(convId, Collections.emptyList());
                for (com.doupi.edu.domain.EduPrintRecord record : convRecords)
                {
                    if ("2".equals(record.getStatus()) || "2".equals(record.getDelFlag()))
                    {
                        continue;
                    }
                    if (sourceMessageMatches(msgId, record.getSourceMessageId()))
                    {
                        item.setAlreadyRegistered(true);
                        item.setReprintConfirmed(false);
                        item.setExistingPrintId(record.getPrintId());
                        String time = record.getPrintTime() == null ? "时间未知" :
                                com.doupi.common.utils.DateUtils.parseDateToStr("yyyy-MM-dd", record.getPrintTime());
                        item.setExistingRecordDesc("已登记（来源会话与消息匹配）：单据 #" + record.getPrintId() + "，" + time);
                        if (!item.getReviewReasons().contains("该聊天消息已登记，如需再次提交请选择重印"))
                        {
                            item.getReviewReasons().add("该聊天消息已登记，如需再次提交请选择重印");
                        }
                        matchedBySource = true;
                        break;
                    }
                }
            }

            if (matchedBySource || StringUtils.isEmpty(item.getPrintName())) continue;

            // 1. 优先在当前会话已拉取记录中零开销匹配（无需任何数据库查询）
            boolean matchedSameConv = false;
            List<com.doupi.edu.domain.EduPrintRecord> convRecords = recordsByConv.getOrDefault(convId, Collections.emptyList());
            for (com.doupi.edu.domain.EduPrintRecord record : convRecords)
            {
                if (!item.getPrintName().equals(record.getPrintName()) || "2".equals(record.getStatus()) || "2".equals(record.getDelFlag())) continue;
                item.setExistingPrintId(record.getPrintId());
                String time = record.getPrintTime() == null ? "时间未知" :
                    com.doupi.common.utils.DateUtils.parseDateToStr("yyyy-MM-dd", record.getPrintTime());
                item.setExistingRecordDesc("疑似重复（同联系人已有同名材料）：单据 #" + record.getPrintId() + "，" + time);
                item.getReviewReasons().add("疑似已有同名登记，请确认不是重复登记");
                matchedSameConv = true;
                break;
            }
            if (matchedSameConv) continue;

            // 2. 跨会话排查：使用本地缓存避免重复查询同一材料名，并限制单次解析的最大查询频次
            String printName = item.getPrintName();
            if (!historyRecordsByName.containsKey(printName))
            {
                if (historyRecordsByName.size() < 100)
                {
                    try
                    {
                        com.doupi.edu.domain.EduPrintRecord query = new com.doupi.edu.domain.EduPrintRecord();
                        query.setPrintName(printName);
                        if (item.getTeacherId() != null) query.setTeacherId(item.getTeacherId());
                        List<com.doupi.edu.domain.EduPrintRecord> records = eduPrintRecordMapper.selectEduPrintRecordList(query);
                        historyRecordsByName.put(printName, records != null ? records : Collections.emptyList());
                    }
                    catch (Exception ex)
                    {
                        log.warn("查询已有印刷记录失败, printName: {}", printName, ex);
                        historyRecordsByName.put(printName, Collections.emptyList());
                    }
                }
                else
                {
                    historyRecordsByName.put(printName, Collections.emptyList());
                }
            }

            List<com.doupi.edu.domain.EduPrintRecord> records = historyRecordsByName.getOrDefault(printName, Collections.emptyList());
            for (com.doupi.edu.domain.EduPrintRecord record : records)
            {
                if (!item.getPrintName().equals(record.getPrintName()) || "2".equals(record.getStatus()) || "2".equals(record.getDelFlag())) continue;
                item.setExistingPrintId(record.getPrintId());
                String time = record.getPrintTime() == null ? "时间未知" :
                    com.doupi.common.utils.DateUtils.parseDateToStr("yyyy-MM-dd", record.getPrintTime());
                item.setExistingRecordDesc("疑似重复（材料名称匹配）：单据 #" + record.getPrintId() + "，" + time);
                item.getReviewReasons().add("疑似已有同名登记，请确认不是重复登记");
                break;
            }
        }

        // 设置首个未登记且未跳过的候选索引
        int firstUnregistered = 0;
        for (int i = 0; i < result.getTaskList().size(); i++)
        {
            EduPrintOcrResult.PrintTaskItem t = result.getTaskList().get(i);
            if (!Boolean.TRUE.equals(t.getAlreadyRegistered()) && !Boolean.TRUE.equals(t.getSkipped()))
            {
                firstUnregistered = i;
                break;
            }
        }
        result.setFirstUnregisteredIndex(firstUnregistered);
    }

    private boolean sourceMessageMatches(String candidateMsgId, String recordedMsgId)
    {
        if (StringUtils.isEmpty(candidateMsgId) || StringUtils.isEmpty(recordedMsgId))
        {
            return false;
        }
        if (candidateMsgId.trim().equals(recordedMsgId.trim()))
        {
            return true;
        }
        java.util.Set<String> cTokens = splitMessageTokens(candidateMsgId);
        java.util.Set<String> rTokens = splitMessageTokens(recordedMsgId);
        for (String ct : cTokens)
        {
            if (rTokens.contains(ct))
            {
                return true;
            }
        }
        return false;
    }

    private java.util.Set<String> splitMessageTokens(String raw)
    {
        java.util.Set<String> tokens = new java.util.HashSet<>();
        for (String part : raw.split(","))
        {
            String p = part.trim().replaceFirst("#answer$", "");
            if (!p.isEmpty())
            {
                tokens.add(p);
            }
        }
        return tokens;
    }

    /**
     * 保持静态方法向下兼容（测试类调用）
     */
    public static String filterAndAssembleChatText(OcrResult ocrResult, int imgWidth, int imgHeight) 
    {
        ChatLayoutSegmenter.SegmentResult seg = ChatLayoutSegmenter.segment(ocrResult, imgWidth, imgHeight);
        ChatTopologyParser.ChatDialogContext ctx = ChatTopologyParser.parse(
            seg.chatBlocks,
            seg.headerBlock,
            seg.splitX,
            imgWidth,
            imgHeight
        );
        return ctx.cleanChatText;
    }

    private List<EduTeacher> getTeachers() 
    {
        try 
        {
            if (eduTeacherMapper != null) 
            {
                return eduTeacherMapper.selectEduTeacherList(new EduTeacher());
            }
        } 
        catch (Exception e) 
        {
            log.warn("获取教师列表失败: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    private List<EduClass> getClasses() 
    {
        try 
        {
            if (eduClassMapper != null) 
            {
                return eduClassMapper.selectEduClassList(new EduClass());
            }
        } 
        catch (Exception e) 
        {
            log.warn("获取班级列表失败: {}", e.getMessage());
        }
        return Collections.emptyList();
    }

    private List<StockGoods> getPaperGoods() 
    {
        try 
        {
            if (stockGoodsMapper != null) 
            {
                StockGoods query = new StockGoods();
                query.setCategory("3"); // 纸张耗材分类
                return stockGoodsMapper.selectEduGoodsList(query);
            }
        } 
        catch (Exception e) 
        {
            log.warn("获取纸张物品列表失败: {}", e.getMessage());
        }
        return Collections.emptyList();
    }
}
