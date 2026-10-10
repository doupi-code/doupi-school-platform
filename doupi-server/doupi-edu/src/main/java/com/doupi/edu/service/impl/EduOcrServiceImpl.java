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
        checkExistingRecordsAndArrangeQueue(result);
        return result;
    }

    /** Historical name matches are review hints, not evidence that this request was saved. */
    private void checkExistingRecordsAndArrangeQueue(EduPrintOcrResult result)
    {
        result.setFirstUnregisteredIndex(0);
        if (eduPrintRecordMapper == null || result.getTaskList() == null) return;
        for (EduPrintOcrResult.PrintTaskItem item : result.getTaskList())
        {
            if (StringUtils.isEmpty(item.getPrintName())) continue;
            com.doupi.edu.domain.EduPrintRecord query = new com.doupi.edu.domain.EduPrintRecord();
            query.setPrintName(item.getPrintName());
            if (item.getTeacherId() != null) query.setTeacherId(item.getTeacherId());
            try
            {
                List<com.doupi.edu.domain.EduPrintRecord> records = eduPrintRecordMapper.selectEduPrintRecordList(query);
                if (records == null) continue;
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
            catch (Exception ex)
            {
                item.getReviewReasons().add("历史登记查询失败，请核对是否重复登记");
                log.warn("查询已有印刷记录失败, printName: {}", item.getPrintName(), ex);
            }
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
