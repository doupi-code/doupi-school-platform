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
import com.doupi.edu.domain.dto.EduPrintOcrResult;
import com.doupi.edu.mapper.EduClassMapper;
import com.doupi.edu.mapper.EduTeacherMapper;
import com.doupi.edu.service.IEduOcrService;
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

                // 3. 查询教职工档案、班级列表与纸张库存
                List<EduTeacher> teachers = getTeachers();
                List<EduClass> classes = getClasses();
                List<StockGoods> paperGoods = getPaperGoods();

                // 4. 业务意图与槽位抽取
                result = EduPrintIntentExtractor.extract(ctx, teachers, classes, paperGoods);

                // 5. 校验已有印刷登记记录，自动跳过已登记任务，排队未登记任务
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
        if (StringUtils.isEmpty(text)) 
        {
            EduPrintOcrResult res = new EduPrintOcrResult();
            res.setMsg("文本为空，未提取到有效信息");
            return res;
        }

        // 将纯文本转换为虚拟对话上下文
        ChatTopologyParser.ChatDialogContext ctx = new ChatTopologyParser.ChatDialogContext();
        ctx.cleanChatText = text;

        String[] lines = text.split("\\r?\\n");
        String prevDateCode = null; // 记录上一条时间戳的日期（yyyyMMdd），用于识别跨天分界
        for (int i = 0; i < lines.length; i++) 
        {
            String line = lines[i].trim();
            if (line.isEmpty()) continue;

            // 前几行尝试作为联系人 Header（跳过时间/状态栏）
            if (ctx.header == null && i < 3) 
            {
                if (line.matches("^(?:\\d{1,2}:\\d{2}|上午|下午|5G|4G|WiFi|wifi|\\d+%).*")) 
                {
                    continue;
                }
                ChatTopologyParser.HeaderInfo h = ChatTopologyParser.parseHeaderTitle(line);
                if (h != null && (h.teacherCandidate != null || h.subject != null)) 
                {
                    ctx.header = h;
                    continue;
                }
            }

            // 微信"复制聊天记录"格式：发送人姓名行（纯中文姓名、与头部教师候选一致）直接跳过
            if (isSenderNameLine(line, ctx)) 
            {
                continue;
            }

            // 时间戳行（如 "2026年08月20日  9:30"）：
            // 同日保留为普通消息（供时间线展示，不阻断份数绑定）；跨天作为 SYSTEM 分界，避免份数跨天串绑
            String dateCode = extractDateCode(line);
            if (dateCode != null) 
            {
                boolean isCrossDay = (prevDateCode != null && !dateCode.equals(prevDateCode));
                prevDateCode = dateCode;

                ChatTopologyParser.ChatMessage ts = new ChatTopologyParser.ChatMessage();
                ts.text = line;
                ts.x = 0;
                ts.y = i * 20;
                if (isCrossDay) 
                {
                    ts.role = ChatTopologyParser.MessageRole.SYSTEM;
                    ctx.allMessages.add(ts);
                } 
                else 
                {
                    ts.role = ChatTopologyParser.MessageRole.TEACHER;
                    ctx.teacherMessages.add(ts);
                    ctx.allMessages.add(ts);
                }
                continue;
            }

            ChatTopologyParser.ChatMessage msg = new ChatTopologyParser.ChatMessage();
            msg.text = line;
            msg.x = 0;
            msg.y = i * 20;

            if (line.matches("(?i).*[.,，。、]?(?:docx?|pdf|wps|xlsx?|pptx?).*")) 
            {
                msg.isFile = true;
                String cleanDoc = line.replaceAll("(?i)^(?:【文件】|\\[文件\\]|文件[:：]|附件[:：]?)", "").trim();
                // 检查上一行是否为文件名前半截（如上一行是“作文训练”，当前行是“次.doc”或“(2).doc”，或“9.30 8班辅导阅读理解（科” + “技发明类）.docx”）
                if (!ctx.allMessages.isEmpty()) 
                {
                    ChatTopologyParser.ChatMessage prevMsg = ctx.allMessages.get(ctx.allMessages.size() - 1);
                    if (!prevMsg.isFile && !prevMsg.text.contains("好") && !prevMsg.text.contains("：") && !prevMsg.text.contains(":")
                        && !prevMsg.text.matches("^(?:星期[一二三四五六日天]|\\d{1,2}:\\d{2}|\\d{4}年|昨天|前天).*")
                        && !prevMsg.text.matches("(?i).*(?:各(?:印|打)?|打|印|打印|帮忙印|帮忙打)\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:份|分).*")) 
                    {
                        String prefix = cleanDoc.replaceAll("(?i)[.,，。、]?(?:docx?|pdf|wps|xlsx?|pptx?)$", "").trim();
                        if ("次".equals(prefix)) 
                        {
                            prefix = "（2）";
                        }
                        int lastDot = cleanDoc.lastIndexOf('.');
                        String ext = lastDot >= 0 ? cleanDoc.substring(lastDot + 1) : "docx";
                        cleanDoc = (prevMsg.text.trim() + prefix).trim().replaceAll("\\s+\\.", ".") + "." + ext;
                        ctx.allMessages.remove(ctx.allMessages.size() - 1);
                        ctx.teacherMessages.remove(prevMsg);
                    }
                }
                ctx.fileList.add(cleanDoc);
                msg.text = cleanDoc;
            }
            msg.role = ChatTopologyParser.MessageRole.TEACHER;
            ctx.teacherMessages.add(msg);
            ctx.allMessages.add(msg);
        }

        List<EduTeacher> teachers = getTeachers();
        List<EduClass> classes = getClasses();
        List<StockGoods> paperGoods = getPaperGoods();

        EduPrintOcrResult result = EduPrintIntentExtractor.extract(ctx, teachers, classes, paperGoods);
        checkExistingRecordsAndArrangeQueue(result);
        return result;
    }

    /**
     * 判断某行是否为微信"复制聊天记录"里的发送人姓名行（纯中文姓名、且与头部教师候选一致）
     */
    private static boolean isSenderNameLine(String line, ChatTopologyParser.ChatDialogContext ctx) 
    {
        if (StringUtils.isEmpty(line) || ctx == null || ctx.header == null || StringUtils.isEmpty(ctx.header.teacherCandidate)) 
        {
            return false;
        }
        String t = line.trim();
        if (!t.matches("^[\\u4e00-\\u9fa5]{2,4}$")) 
        {
            return false;
        }
        String cand = ctx.header.teacherCandidate.replaceAll("老师$", "").trim();
        return t.equals(cand) || t.equals(ctx.header.teacherCandidate);
    }

    /**
     * 从时间戳行提取日期编码（yyyyMMdd），如 "2026年08月20日  9:30" -> "20260820"；非时间戳返回 null
     */
    private static String extractDateCode(String line) 
    {
        if (StringUtils.isEmpty(line)) return null;
        String t = line.trim();
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("^(\\d{4})年(\\d{1,2})月(\\d{1,2})日").matcher(t);
        if (!m.find()) return null;
        int month = Integer.parseInt(m.group(2));
        int day = Integer.parseInt(m.group(3));
        return m.group(1) + String.format("%02d%02d", month, day);
    }

    /**
     * 校验已有印刷登记记录：
     * 遍历识别到的任务清单，在数据库已有数据中比对是否已经登记。
     * 若已登记则标记 alreadyRegistered=true 并跳过；
     * 自动将首个未登记的任务提升为主预填任务，供用户进入登记流程。
     */
    private void checkExistingRecordsAndArrangeQueue(EduPrintOcrResult result) 
    {
        if (result == null || result.getTaskList() == null || result.getTaskList().isEmpty()) 
        {
            return;
        }

        if (eduPrintRecordMapper == null) 
        {
            result.setFirstUnregisteredIndex(0);
            return;
        }

        int registeredCount = 0;
        int firstUnregisteredIdx = -1;

        for (int i = 0; i < result.getTaskList().size(); i++) 
        {
            EduPrintOcrResult.PrintTaskItem item = result.getTaskList().get(i);
            if (StringUtils.isEmpty(item.getPrintName())) 
            {
                continue;
            }

            com.doupi.edu.domain.EduPrintRecord query = new com.doupi.edu.domain.EduPrintRecord();
            query.setPrintName(item.getPrintName());
            if (item.getTeacherId() != null) 
            {
                query.setTeacherId(item.getTeacherId());
            }

            try 
            {
                List<com.doupi.edu.domain.EduPrintRecord> records = eduPrintRecordMapper.selectEduPrintRecordList(query);
                com.doupi.edu.domain.EduPrintRecord matched = null;
                if (records != null) 
                {
                    for (com.doupi.edu.domain.EduPrintRecord rec : records) 
                    {
                        // 过滤掉作废单据（status = '2'）和已逻辑删除单据
                        if (!"2".equals(rec.getStatus()) && !"2".equals(rec.getDelFlag())) 
                        {
                            matched = rec;
                            break;
                        }
                    }
                }

                if (matched != null) 
                {
                    item.setAlreadyRegistered(true);
                    item.setExistingPrintId(matched.getPrintId());
                    String statusText = "1".equals(matched.getStatus()) ? "已完成" : "待印刷";
                    String timeStr = matched.getPrintTime() != null ? 
                        com.doupi.common.utils.DateUtils.parseDateToStr("yyyy-MM-dd", matched.getPrintTime()) : "历史";
                    item.setExistingRecordDesc("系统已有单据 #" + matched.getPrintId() + " (" + timeStr + ", " + statusText + ")");
                    registeredCount++;
                    log.info("印刷任务 [{}] 在已有数据中已登记，单号: #{}", item.getPrintName(), matched.getPrintId());
                } 
                else 
                {
                    item.setAlreadyRegistered(false);
                    if (firstUnregisteredIdx == -1) 
                    {
                        firstUnregisteredIdx = i;
                    }
                }
            } 
            catch (Exception ex) 
            {
                log.warn("查询已有印刷记录失败, printName: {}", item.getPrintName(), ex);
            }
        }

        result.setFirstUnregisteredIndex(firstUnregisteredIdx);

        // 如果存在未登记的任务，且首个未登记的任务不是第 0 个，将首个未登记的任务信息覆写到顶层字段，
        // 做到“先查已有数据看看是否有已登记的，如果有就跳过，开始处理下一条，如果下一条没登记，那么开始登记流程”
        if (firstUnregisteredIdx >= 0 && firstUnregisteredIdx < result.getTaskList().size()) 
        {
            EduPrintOcrResult.PrintTaskItem activeTask = result.getTaskList().get(firstUnregisteredIdx);
            applyTaskItemToRootResult(result, activeTask);
            if (registeredCount > 0) 
            {
                result.setMsg("已自动跳过 " + registeredCount + " 条已登记材料，当前准备登记第 " + (firstUnregisteredIdx + 1) + " 条：" + activeTask.getPrintName());
            }
        } 
        else if (registeredCount > 0 && registeredCount == result.getTaskList().size()) 
        {
            // 所有任务均已登记过
            result.setMsg("检测到截图内包含的 " + registeredCount + " 条印刷记录在系统中均已登记，无需重复登记！");
        }
    }

    private void applyTaskItemToRootResult(EduPrintOcrResult result, EduPrintOcrResult.PrintTaskItem task) 
    {
        if (task == null) return;
        result.setPrintName(task.getPrintName());
        if (task.getPrintCount() != null) result.setPrintCount(task.getPrintCount());
        if (task.getPageCount() != null) result.setPageCount(task.getPageCount());
        if (task.getPaperType() != null) result.setPaperType(task.getPaperType());
        if (task.getPaperGoodsId() != null) result.setPaperGoodsId(task.getPaperGoodsId());
        if (task.getPaperGoodsName() != null) result.setPaperGoodsName(task.getPaperGoodsName());
        if (task.getTeacherId() != null) result.setTeacherId(task.getTeacherId());
        if (task.getTeacherName() != null) result.setTeacherName(task.getTeacherName());
        if (task.getTeacherMatched() != null) result.setTeacherMatched(task.getTeacherMatched());
        if (task.getGrade() != null) result.setGrade(task.getGrade());
        if (task.getSubject() != null) result.setSubject(task.getSubject());
        if (task.getClassId() != null) result.setClassId(task.getClassId());
        if (task.getClassName() != null) result.setClassName(task.getClassName());
        if (result.getPrintCount() != null) 
        {
            result.setTotalPages(result.getPrintCount() * result.getPageCount());
        }
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
