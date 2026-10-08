package com.doupi.edu;

import java.lang.reflect.Field;
import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import com.doupi.edu.domain.EduTeacher;
import com.doupi.edu.domain.dto.EduPrintOcrResult;
import com.doupi.edu.mapper.EduTeacherMapper;
import com.doupi.edu.service.impl.EduOcrServiceImpl;
import com.doupi.stock.domain.StockGoods;
import com.doupi.stock.mapper.StockGoodsMapper;

public class OcrParseTest 
{
    private EduOcrServiceImpl getMockedService() throws Exception 
    {
        EduOcrServiceImpl service = new EduOcrServiceImpl();

        EduTeacherMapper mockTeacherMapper = (EduTeacherMapper) Proxy.newProxyInstance(
            EduTeacherMapper.class.getClassLoader(),
            new Class<?>[]{EduTeacherMapper.class},
            (proxy, method, args) -> {
                if ("selectEduTeacherList".equals(method.getName())) {
                    List<EduTeacher> list = new ArrayList<>();
                    EduTeacher t1 = new EduTeacher();
                    t1.setTeacherId(5L);
                    t1.setTeacherName("王贤武");
                    t1.setGrade("高一");
                    t1.setSubject("语文");
                    list.add(t1);

                    EduTeacher t2 = new EduTeacher();
                    t2.setTeacherId(1L);
                    t2.setTeacherName("张伟");
                    t2.setGrade("高一");
                    t2.setSubject("数学");
                    list.add(t2);

                    EduTeacher t3 = new EduTeacher();
                    t3.setTeacherId(8L);
                    t3.setTeacherName("刘珉");
                    t3.setGrade("高三");
                    t3.setSubject("英语");
                    list.add(t3);

                    EduTeacher t4 = new EduTeacher();
                    t4.setTeacherId(9L);
                    t4.setTeacherName("徐建国");
                    t4.setGrade("高二");
                    t4.setSubject("物理");
                    list.add(t4);
                    return list;
                }
                return null;
            }
        );

        StockGoodsMapper mockGoodsMapper = (StockGoodsMapper) Proxy.newProxyInstance(
            StockGoodsMapper.class.getClassLoader(),
            new Class<?>[]{StockGoodsMapper.class},
            (proxy, method, args) -> {
                if ("selectEduGoodsList".equals(method.getName())) {
                    List<StockGoods> list = new ArrayList<>();
                    StockGoods g1 = new StockGoods();
                    g1.setGoodsId(7L);
                    g1.setGoodsName("A4复印纸(70g)");
                    g1.setSpec("500张/包");
                    g1.setCategory("3");
                    list.add(g1);

                    StockGoods g2 = new StockGoods();
                    g2.setGoodsId(8L);
                    g2.setGoodsName("8K速印试卷用纸");
                    g2.setSpec("500张/包");
                    g2.setCategory("3");
                    list.add(g2);

                    StockGoods g3 = new StockGoods();
                    g3.setGoodsId(9L);
                    g3.setGoodsName("16K模考试卷纸");
                    g3.setSpec("500张/包");
                    g3.setCategory("3");
                    list.add(g3);

                    StockGoods g4 = new StockGoods();
                    g4.setGoodsId(10L);
                    g4.setGoodsName("A3数码印刷纸");
                    g4.setSpec("500张/包");
                    g4.setCategory("3");
                    list.add(g4);
                    return list;
                }
                return null;
            }
        );

        Field f1 = EduOcrServiceImpl.class.getDeclaredField("eduTeacherMapper");
        f1.setAccessible(true);
        f1.set(service, mockTeacherMapper);

        Field f2 = EduOcrServiceImpl.class.getDeclaredField("stockGoodsMapper");
        f2.setAccessible(true);
        f2.set(service, mockGoodsMapper);

        com.doupi.edu.mapper.EduClassMapper mockClassMapper = (com.doupi.edu.mapper.EduClassMapper) Proxy.newProxyInstance(
            com.doupi.edu.mapper.EduClassMapper.class.getClassLoader(),
            new Class<?>[]{com.doupi.edu.mapper.EduClassMapper.class},
            (proxy, method, args) -> {
                if ("selectEduClassList".equals(method.getName())) {
                    List<com.doupi.edu.domain.EduClass> list = new ArrayList<>();
                    com.doupi.edu.domain.EduClass c1 = new com.doupi.edu.domain.EduClass();
                    c1.setClassId(101L);
                    c1.setGrade("高三");
                    c1.setClassName("高三(1)班");
                    list.add(c1);

                    com.doupi.edu.domain.EduClass c2 = new com.doupi.edu.domain.EduClass();
                    c2.setClassId(102L);
                    c2.setGrade("高三");
                    c2.setClassName("高三(2)班");
                    list.add(c2);
                    return list;
                }
                return null;
            }
        );

        Field f3 = EduOcrServiceImpl.class.getDeclaredField("eduClassMapper");
        f3.setAccessible(true);
        f3.set(service, mockClassMapper);

        return service;
    }

    @Test
    public void testWeChatScreenScreenshotParsing() throws Exception
    {
        EduOcrServiceImpl service = getMockedService();

        // 场景 A：真实微信聊天界面截图 OCR 原始识别文本（手机单聊界面）
        // 顶部导航栏显示 "< 王贤武"，气泡里是 Word 卡片 "作文训练（2）.doc \n 24.5 KB" 和 "40份。谢谢！"
        // 纸张默认使用 8K 纸
        String screenText = 
            "15:46\n" +
            "< 王贤武\n" +
            "龙老师好！\n" +
            "作文训练（2）.doc\n" +
            "24.5 KB\n" +
            "40份。谢谢！\n" +
            "好的\n" +
            "印好了\n" +
            "谢谢！我晚上来拿！";

        EduPrintOcrResult result = service.extractInfoFromText(screenText);

        System.out.println("========== [场景A] 微信聊天界面截图提取结果 ==========");
        System.out.println("申请教师姓名: " + result.getTeacherName());
        System.out.println("申请教师ID: " + result.getTeacherId());
        System.out.println("任教年级: " + result.getGrade());
        System.out.println("推断科目: " + result.getSubject());
        System.out.println("印刷名称: " + result.getPrintName());
        System.out.println("印刷份数: " + result.getPrintCount());
        System.out.println("纸张类型: " + result.getPaperType());
        System.out.println("匹配耗材名称: " + result.getPaperGoodsName());
        System.out.println("====================================================");

        Assertions.assertEquals("王贤武", result.getTeacherName());
        Assertions.assertEquals(5L, result.getTeacherId());
        Assertions.assertEquals("高一", result.getGrade());
        Assertions.assertEquals("语文", result.getSubject());
        Assertions.assertEquals(40L, result.getPrintCount());
        Assertions.assertEquals("8K", result.getPaperType()); // 默认8K纸
        Assertions.assertEquals("8K速印试卷用纸", result.getPaperGoodsName());
        Assertions.assertTrue(result.getPrintName().contains("作文训练（2）"));
    }

    @Test
    public void testWeChatCopiedChatLogParsing() throws Exception
    {
        EduOcrServiceImpl service = getMockedService();

        // 场景 B：电脑版/手机版微信右键复制出的聊天记录文本
        String copiedText = 
            "王贤武\n" +
            "2026年09月25日 15:46\n" +
            "龙老师好！\n\n" +
            "王贤武\n" +
            "2026年09月25日 15:46\n" +
            "[文件] 作文训练（2））.doc\n\n" +
            "王贤武\n" +
            "2026年09月25日 15:46\n" +
            "40份。谢谢！\n\n" +
            "<\n" +
            "2026年09月25日 15:51\n" +
            "好的\n\n" +
            "<\n" +
            "2026年09月25日 16:04\n" +
            "印好了\n\n" +
            "王贤武\n" +
            "2026年09月25日 16:06\n" +
            "谢谢！我晚上来拿！";

        EduPrintOcrResult result = service.extractInfoFromText(copiedText);

        System.out.println("========== [场景B] 微信复制文本提取结果 ==========");
        System.out.println("申请教师姓名: " + result.getTeacherName());
        System.out.println("申请教师ID: " + result.getTeacherId());
        System.out.println("任教年级: " + result.getGrade());
        System.out.println("推断科目: " + result.getSubject());
        System.out.println("印刷名称: " + result.getPrintName());
        System.out.println("印刷份数: " + result.getPrintCount());
        System.out.println("纸张类型: " + result.getPaperType());
        System.out.println("匹配耗材名称: " + result.getPaperGoodsName());
        System.out.println("====================================================");

        Assertions.assertEquals("王贤武", result.getTeacherName());
        Assertions.assertEquals(5L, result.getTeacherId());
        Assertions.assertEquals("高一", result.getGrade());
        Assertions.assertEquals("语文", result.getSubject());
        Assertions.assertEquals(40L, result.getPrintCount());
        Assertions.assertEquals("8K", result.getPaperType()); // 默认8K纸
        Assertions.assertEquals("8K速印试卷用纸", result.getPaperGoodsName());
        Assertions.assertTrue(result.getPrintName().contains("作文训练（2）"));
    }

    @Test
    public void testOcrDistortionAndWrapCases() throws Exception
    {
        EduOcrServiceImpl service = getMockedService();

        // 场景 C1：微信文件卡片自动折行，且 (2) 被 OCR 误识为“次”
        // 原始识别文本显示：上一行为“作文训练”，下一行为“次.doc”，份数为“40分。谢谢！”
        String distortedText1 = 
            "王贤武\n" +
            "龙老师好！\n" +
            "作文训练\n" +
            "次.doc\n" +
            "24.5 KB\n" +
            "40分。谢谢！\n" +
            "好的";

        EduPrintOcrResult r1 = service.extractInfoFromText(distortedText1);
        System.out.println("========== [场景C1 换行+次误识] 结果 ==========");
        System.out.println("印刷名称: " + r1.getPrintName());
        System.out.println("印刷份数: " + r1.getPrintCount());
        System.out.println("纸张类型: " + r1.getPaperType());
        Assertions.assertEquals("王贤武", r1.getTeacherName());
        Assertions.assertTrue(r1.getPrintName().contains("作文训练"));
        Assertions.assertFalse(r1.getPrintName().endsWith("次"));
        Assertions.assertEquals(40L, r1.getPrintCount()); // “40分”能成功提取为40
        Assertions.assertEquals("8K", r1.getPaperType());

        // 场景 C2：份数出现英文字母O混淆，且无单位词（如 "4O。谢谢！"）
        String distortedText2 = 
            "王贤武\n" +
            "作文训练.docx\n" +
            "4O。谢谢！";
        EduPrintOcrResult r2 = service.extractInfoFromText(distortedText2);
        Assertions.assertEquals(40L, r2.getPrintCount());

        // 场景 C3：单独一行纯数字（"40"）
        String distortedText3 = 
            "王贤武\n" +
            "作文训练（2）.doc\n" +
            "40\n" +
            "谢谢";
        EduPrintOcrResult r3 = service.extractInfoFromText(distortedText3);
        Assertions.assertEquals(40L, r3.getPrintCount());

        // 场景 C4：显式指定 A4 纸张时，仍优先遵从显式 A4
        String explicitA4Text = 
            "王贤武\n" +
            "期末复习提纲.docx\n" +
            "打80份 A4纸 谢谢";
        EduPrintOcrResult r4 = service.extractInfoFromText(explicitA4Text);
        Assertions.assertEquals("A4", r4.getPaperType());
        Assertions.assertEquals(80L, r4.getPrintCount());

        // 场景 C5：包含页数提取（如“40份 每份2页”）
        String pageText = 
            "王贤武\n" +
            "高一语文期中试卷.doc\n" +
            "40份 每份2页 谢谢！";
        EduPrintOcrResult r5 = service.extractInfoFromText(pageText);
        Assertions.assertEquals(40L, r5.getPrintCount());
        Assertions.assertEquals(2L, r5.getPageCount());
        Assertions.assertEquals(80L, r5.getTotalPages());
    }

    @Test
    public void testRapidOcrEndToEndWithImage() throws Exception
    {
        EduOcrServiceImpl service = getMockedService();

        // 动态绘制一张测试微信截图图片
        int width = 400;
        int height = 300;
        java.awt.image.BufferedImage img = new java.awt.image.BufferedImage(width, height, java.awt.image.BufferedImage.TYPE_INT_RGB);
        java.awt.Graphics2D g = img.createGraphics();
        g.setColor(java.awt.Color.WHITE);
        g.fillRect(0, 0, width, height);
        g.setColor(java.awt.Color.BLACK);
        g.setFont(new java.awt.Font("SimSun", java.awt.Font.PLAIN, 22));
        g.drawString("< 王贤武", 30, 50);
        g.drawString("作文训练（2）.doc", 30, 110);
        g.drawString("40份。谢谢！", 30, 170);
        g.dispose();

        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        javax.imageio.ImageIO.write(img, "png", baos);
        byte[] bytes = baos.toByteArray();

        org.springframework.web.multipart.MultipartFile mockFile = new org.springframework.web.multipart.MultipartFile() 
        {
            @Override public String getName() { return "file"; }
            @Override public String getOriginalFilename() { return "test.png"; }
            @Override public String getContentType() { return "image/png"; }
            @Override public boolean isEmpty() { return bytes.length == 0; }
            @Override public long getSize() { return bytes.length; }
            @Override public byte[] getBytes() { return bytes; }
            @Override public java.io.InputStream getInputStream() { return new java.io.ByteArrayInputStream(bytes); }
            @Override public void transferTo(java.io.File dest) throws java.io.IOException { java.nio.file.Files.write(dest.toPath(), bytes); }
        };

        EduPrintOcrResult result = service.parseScreenshot(mockFile);
        System.out.println("========== [RapidOCR 真实端到端识别测试结果] ==========");
        System.out.println("成功: " + result.getSuccess());
        System.out.println("识别原始文本:\n" + result.getRawText());
        System.out.println("提取教师: " + result.getTeacherName());
        System.out.println("提取印刷名: " + result.getPrintName());
        System.out.println("提取份数: " + result.getPrintCount());
        System.out.println("纸张类型: " + result.getPaperType());
        System.out.println("匹配用纸: " + result.getPaperGoodsName());
        System.out.println("====================================================");

        Assertions.assertTrue(Boolean.TRUE.equals(result.getSuccess()), "OCR 应该成功识别");
        Assertions.assertEquals("王贤武", result.getTeacherName());
        Assertions.assertEquals(40L, result.getPrintCount());
        Assertions.assertEquals("8K", result.getPaperType());
        Assertions.assertTrue(result.getPrintName().contains("作文训练"));
    }

    @Test
    public void testWeChatGuiPng() throws Exception
    {
        java.io.File imgFile = new java.io.File("C:/Users/javal/Desktop/doupi-Vue-v3.9.2/微信界面.png");
        if (!imgFile.exists()) {
            System.out.println("微信界面.png 不存在，跳过");
            return;
        }

        io.github.mymonstercat.ocr.config.HardwareConfig config = io.github.mymonstercat.ocr.config.HardwareConfig.getOnnxConfig();
        config.setNumThread(2);
        config.setGpuIndex(-1);
        io.github.mymonstercat.ocr.InferenceEngine engine = io.github.mymonstercat.ocr.InferenceEngine.getInstance(io.github.mymonstercat.Model.ONNX_PPOCR_V3, config);
        com.benjaminwan.ocrlibrary.OcrResult ocrResult = engine.runOcr(imgFile.getAbsolutePath());
        String rawText = ocrResult.getStrRes();
        String[] lines = rawText.split("\\r?\\n");
        EduOcrServiceImpl service = getMockedService();
        EduPrintOcrResult result = service.extractInfoFromText(rawText);

        java.awt.image.BufferedImage bimg = javax.imageio.ImageIO.read(imgFile);
        int imgW = bimg.getWidth();
        int imgH = bimg.getHeight();
        java.io.File blockFile = new java.io.File("target/block_coords.txt");
        StringBuilder bsb = new StringBuilder();
        bsb.append("Image Size: ").append(imgW).append(" x ").append(imgH).append("\n");
        for (com.benjaminwan.ocrlibrary.TextBlock tb : ocrResult.getTextBlocks()) {
            int minX = Integer.MAX_VALUE, maxX = Integer.MIN_VALUE;
            int minY = Integer.MAX_VALUE, maxY = Integer.MIN_VALUE;
            for (com.benjaminwan.ocrlibrary.Point pt : tb.getBoxPoint()) {
                minX = Math.min(minX, pt.getX());
                maxX = Math.max(maxX, pt.getX());
                minY = Math.min(minY, pt.getY());
                maxY = Math.max(maxY, pt.getY());
            }
            double ratioX = (double) minX / imgW;
            bsb.append(String.format("[%3d, %3d] (ratioX=%.2f): %s\n", minX, minY, ratioX, tb.getText()));
        }
        String filteredChatText = EduOcrServiceImpl.filterAndAssembleChatText(ocrResult, imgW, imgH);
        System.out.println("========== 过滤左侧联系人后的纯净聊天记录文本 ==========");
        System.out.println(filteredChatText);
        System.out.println("====================================================");

        // 验证左侧联系人栏已 100% 剥离忽略
        Assertions.assertFalse(filteredChatText.contains("这是考务群啊"), "左侧联系人群聊应被过滤");
        Assertions.assertFalse(filteredChatText.contains("汉阳-华襄英语听力"), "左侧联系人会话应被过滤");
        Assertions.assertFalse(filteredChatText.contains("教务-曾平老师"), "左侧联系人备注应被过滤");
        Assertions.assertFalse(filteredChatText.contains("付老师"), "左侧联系人列表应被过滤");
        Assertions.assertFalse(filteredChatText.contains("搜索"), "顶部搜索栏应被过滤");

        // 验证右侧真实聊天记录完整保留
        Assertions.assertTrue(filteredChatText.contains("普高部-高三-周珲"), "右侧聊天窗口标题联系人应保留");
        Assertions.assertTrue(filteredChatText.contains("那这个也打6份呗"), "右侧用户消息应保留");
        Assertions.assertTrue(filteredChatText.contains("试卷擦除"), "右侧文件卡片应保留");

        EduPrintOcrResult filteredResult = service.extractInfoFromText(filteredChatText);
        Assertions.assertEquals("周珲", filteredResult.getTeacherName());
        Assertions.assertEquals("高三", filteredResult.getGrade());
        Assertions.assertNotNull(filteredResult.getClassName());
        Assertions.assertTrue(filteredResult.getClassName().contains("1") && filteredResult.getClassName().contains("班"));
        Assertions.assertEquals(101L, filteredResult.getClassId());
        Assertions.assertEquals(6L, filteredResult.getPrintCount());
        Assertions.assertEquals("8K", filteredResult.getPaperType());
        Assertions.assertTrue(filteredResult.getPrintName().contains("试卷擦除"));
        Assertions.assertFalse(filteredResult.getPrintName().contains("英语"));
        Assertions.assertFalse(filteredResult.getPrintName().contains("搜索"));
    }

    private org.springframework.web.multipart.MultipartFile toMultipartFile(java.io.File file) throws Exception {
        byte[] bytes = java.nio.file.Files.readAllBytes(file.toPath());
        return new org.springframework.web.multipart.MultipartFile() {
            @Override public String getName() { return "file"; }
            @Override public String getOriginalFilename() { return file.getName(); }
            @Override public String getContentType() { return "image/png"; }
            @Override public boolean isEmpty() { return bytes.length == 0; }
            @Override public long getSize() { return bytes.length; }
            @Override public byte[] getBytes() { return bytes; }
            @Override public java.io.InputStream getInputStream() { return new java.io.ByteArrayInputStream(bytes); }
            @Override public void transferTo(java.io.File dest) throws java.io.IOException { java.nio.file.Files.write(dest.toPath(), bytes); }
        };
    }

    @Test
    public void testUserUploadedImage1() throws Exception
    {
        java.io.File imgFile = new java.io.File("C:/Users/javal/Desktop/doupi-Vue-v3.9.2/测试图片.png");
        if (!imgFile.exists()) {
            System.out.println("测试图片.png 不存在");
            return;
        }

        EduOcrServiceImpl service = getMockedService();
        EduPrintOcrResult result = service.parseScreenshot(toMultipartFile(imgFile));

        System.out.println("========== [测试图片 1 识别结果] ==========");
        System.out.println("成功: " + result.getSuccess());
        System.out.println("教师: " + result.getTeacherName() + " (ID: " + result.getTeacherId() + ", Matched: " + result.getTeacherMatched() + ")");
        System.out.println("学科: " + result.getSubject() + " | 年级: " + result.getGrade());
        System.out.println("印刷名: " + result.getPrintName());
        System.out.println("文档列表: " + result.getDocumentList());
        System.out.println("份数: " + result.getPrintCount() + " | 纸张: " + result.getPaperType());
        System.out.println("=========================================");

        Assertions.assertTrue(Boolean.TRUE.equals(result.getSuccess()));
        Assertions.assertEquals("刘珉", result.getTeacherName());
        Assertions.assertEquals(8L, result.getTeacherId());
        Assertions.assertTrue(Boolean.TRUE.equals(result.getTeacherMatched()));
        Assertions.assertEquals("英语", result.getSubject());
        Assertions.assertEquals(55L, result.getPrintCount());
        Assertions.assertEquals("8K", result.getPaperType());
        Assertions.assertTrue(result.getPrintName().contains("A9 七篇词汇整理"));
    }

    @Test
    public void testUserUploadedImage2() throws Exception
    {
        java.io.File imgFile = new java.io.File("C:/Users/javal/Desktop/doupi-Vue-v3.9.2/测试图片2.png");
        if (!imgFile.exists()) {
            System.out.println("测试图片2.png 不存在");
            return;
        }

        EduOcrServiceImpl service = getMockedService();
        EduPrintOcrResult result = service.parseScreenshot(toMultipartFile(imgFile));

        System.out.println("========== [测试图片 2 识别结果] ==========");
        System.out.println("成功: " + result.getSuccess());
        System.out.println("教师: " + result.getTeacherName() + " (ID: " + result.getTeacherId() + ", Matched: " + result.getTeacherMatched() + ")");
        System.out.println("学科: " + result.getSubject() + " | 年级: " + result.getGrade());
        System.out.println("印刷名: " + result.getPrintName());
        System.out.println("文档列表 (" + result.getDocumentList().size() + " 个): " + result.getDocumentList());
        System.out.println("份数: " + result.getPrintCount() + " | 纸张: " + result.getPaperType());
        System.out.println("=========================================");

        Assertions.assertTrue(Boolean.TRUE.equals(result.getSuccess()));
        Assertions.assertEquals("刘珉", result.getTeacherName());
        Assertions.assertEquals(8L, result.getTeacherId());
        Assertions.assertTrue(Boolean.TRUE.equals(result.getTeacherMatched()));
        Assertions.assertEquals("英语", result.getSubject());
        Assertions.assertEquals(55L, result.getPrintCount());
        Assertions.assertEquals("8K", result.getPaperType());
        Assertions.assertEquals(3, result.getDocumentList().size());
        Assertions.assertTrue(result.getDocumentList().contains("武汉九调续写学生版.docx"));
        Assertions.assertTrue(result.getDocumentList().contains("武汉九调应用文解题思路.docx"));
        Assertions.assertTrue(result.getDocumentList().contains("武汉九调重点词汇整理.docx"));
    }

    @Test
    public void testXuTeacherAndUnknownTeacherMatching() throws Exception
    {
        EduOcrServiceImpl service = getMockedService();

        // 场景 A: 识别到“徐老师”且已知物理 -> 唯一定位档案库中的“徐建国”
        EduPrintOcrResult res1 = service.extractInfoFromText("物理 徐老师\n单元检测.docx\n请帮忙印40份");
        Assertions.assertEquals("徐建国", res1.getTeacherName());
        Assertions.assertEquals(9L, res1.getTeacherId());
        Assertions.assertTrue(Boolean.TRUE.equals(res1.getTeacherMatched()));
        Assertions.assertEquals(40L, res1.getPrintCount());

        // 场景 B: 识别到未录入档案的“马老师” -> teacherMatched=false，让用户自选
        EduPrintOcrResult res2 = service.extractInfoFromText("马老师\n综合卷.docx\n印30份");
        Assertions.assertEquals("马老师", res2.getTeacherName());
        Assertions.assertNull(res2.getTeacherId());
        Assertions.assertFalse(Boolean.TRUE.equals(res2.getTeacherMatched()));
        Assertions.assertEquals(30L, res2.getPrintCount());
    }

    @Test
    public void testMultiDayMultiPrintRecordWithDbSkipAndQueue() throws Exception
    {
        EduOcrServiceImpl service = getMockedService();

        // 模拟已存在数据库中的单据：【A9 七篇词汇整理】（已于周三完成登记）
        com.doupi.edu.mapper.EduPrintRecordMapper mockRecordMapper = (com.doupi.edu.mapper.EduPrintRecordMapper) Proxy.newProxyInstance(
            com.doupi.edu.mapper.EduPrintRecordMapper.class.getClassLoader(),
            new Class<?>[]{com.doupi.edu.mapper.EduPrintRecordMapper.class},
            (proxy, method, args) -> {
                if ("selectEduPrintRecordList".equals(method.getName())) {
                    com.doupi.edu.domain.EduPrintRecord query = (com.doupi.edu.domain.EduPrintRecord) args[0];
                    List<com.doupi.edu.domain.EduPrintRecord> records = new ArrayList<>();
                    if (query.getPrintName() != null && query.getPrintName().contains("A9 七篇词汇整理")) {
                        com.doupi.edu.domain.EduPrintRecord r1 = new com.doupi.edu.domain.EduPrintRecord();
                        r1.setPrintId(101L);
                        r1.setPrintName("A9 七篇词汇整理");
                        r1.setTeacherId(8L);
                        r1.setStatus("1"); // 已完成
                        r1.setDelFlag("0");
                        r1.setPrintTime(new java.util.Date());
                        records.add(r1);
                    }
                    return records;
                }
                return null;
            }
        );

        Field f4 = EduOcrServiceImpl.class.getDeclaredField("eduPrintRecordMapper");
        f4.setAccessible(true);
        f4.set(service, mockRecordMapper);

        // 模拟多天聊天记录：
        // 星期三 11:03: 老师发了 A9 七篇词汇整理.docx，印55份
        // 星期四 11:17: 老师发了 Book2 Unit3 高频词默写.docx，印40份
        String multiDayChatText = 
            "英语 刘珉\n" +
            "星期三 11:03\n" +
            "A9 七篇词汇整理.docx\n" +
            "各55份\n" +
            "好的\n" +
            "星期四 11:17\n" +
            "Book2 Unit3 高频词默写.docx\n" +
            "打40份\n" +
            "好的\n" +
            "17:19\n" +
            "有空了可以来拿哈";

        EduPrintOcrResult result = service.extractInfoFromText(multiDayChatText);

        System.out.println("========== [多天多次印刷记录识别与自动跳过测试] ==========");
        System.out.println("提取到总任务数: " + result.getTaskList().size());
        for (int i = 0; i < result.getTaskList().size(); i++) {
            EduPrintOcrResult.PrintTaskItem task = result.getTaskList().get(i);
            System.out.println(String.format("任务 #%d [%s]: 纯净名=%s, 时间=%s, 份数=%d, 已在库登记=%s (%s)",
                i, task.getOriginalDocName(), task.getPrintName(), task.getTimeSnippet(), task.getPrintCount(),
                task.getAlreadyRegistered(), task.getExistingRecordDesc()));
        }
        System.out.println("首个未登记任务索引: " + result.getFirstUnregisteredIndex());
        System.out.println("当前系统就绪处理名称: " + result.getPrintName());
        System.out.println("当前系统就绪处理份数: " + result.getPrintCount());
        System.out.println("系统状态提示: " + result.getMsg());
        System.out.println("======================================================");

        // 验证识别出2个任务
        Assertions.assertEquals(2, result.getTaskList().size());

        // 验证任务 0 (星期三: A9 七篇词汇整理): 在数据库中已存在 -> alreadyRegistered=true
        EduPrintOcrResult.PrintTaskItem task0 = result.getTaskList().get(0);
        Assertions.assertEquals("A9 七篇词汇整理", task0.getPrintName());
        Assertions.assertEquals(55L, task0.getPrintCount());
        Assertions.assertTrue(task0.getTimeSnippet().contains("星期三"));
        Assertions.assertTrue(Boolean.TRUE.equals(task0.getAlreadyRegistered()));
        Assertions.assertEquals(101L, task0.getExistingPrintId());

        // 验证任务 1 (星期四: Book2 Unit3 高频词默写): 未在数据库中登记 -> alreadyRegistered=false
        EduPrintOcrResult.PrintTaskItem task1 = result.getTaskList().get(1);
        Assertions.assertEquals("Book2 Unit3 高频词默写", task1.getPrintName());
        Assertions.assertEquals(40L, task1.getPrintCount());
        Assertions.assertTrue(task1.getTimeSnippet().contains("星期四"));
        Assertions.assertFalse(Boolean.TRUE.equals(task1.getAlreadyRegistered()));

        // 验证系统自动跳过了任务0，直接把任务1提升为当前待登记表单数据！
        Assertions.assertEquals(1, result.getFirstUnregisteredIndex());
        Assertions.assertEquals("Book2 Unit3 高频词默写", result.getPrintName());
        Assertions.assertEquals(40L, result.getPrintCount());
        Assertions.assertTrue(result.getMsg().contains("自动跳过 1 条已登记材料"));
    }

    @Test
    public void testUserUploadedImageLatest() throws Exception
    {
        java.io.File imgFile = new java.io.File("C:/Users/javal/Desktop/doupi-Vue-v3.9.2/最新测试图片.png");
        if (!imgFile.exists()) return;
        EduOcrServiceImpl service = getMockedService();
        io.github.mymonstercat.ocr.config.HardwareConfig config = io.github.mymonstercat.ocr.config.HardwareConfig.getOnnxConfig();
        io.github.mymonstercat.ocr.InferenceEngine engine = io.github.mymonstercat.ocr.InferenceEngine.getInstance(io.github.mymonstercat.Model.ONNX_PPOCR_V3, config);
        com.benjaminwan.ocrlibrary.OcrResult ocrResult = engine.runOcr(imgFile.getAbsolutePath());
        System.out.println("========== ALL OCR BLOCKS ==========");
        for (com.benjaminwan.ocrlibrary.TextBlock tb : ocrResult.getTextBlocks()) {
            int minX = com.doupi.edu.service.impl.ocr.ChatLayoutSegmenter.getMinX(tb);
            int minY = com.doupi.edu.service.impl.ocr.ChatLayoutSegmenter.getMinY(tb);
            System.out.println(String.format("[%4d, %4d] %s", minX, minY, tb.getText()));
        }
        System.out.println("=====================================");

        EduPrintOcrResult result = service.parseScreenshot(toMultipartFile(imgFile));

        System.out.println("========== [最新测试图片 识别结果] ==========");
        System.out.println("成功: " + result.getSuccess());
        System.out.println("教师: " + result.getTeacherName() + " (ID: " + result.getTeacherId() + ", Matched: " + result.getTeacherMatched() + ")");
        System.out.println("学科: " + result.getSubject() + " | 年级: " + result.getGrade());
        System.out.println("印刷名: " + result.getPrintName());
        System.out.println("文档列表 (" + (result.getDocumentList() != null ? result.getDocumentList().size() : 0) + " 个): " + result.getDocumentList());
        System.out.println("份数: " + result.getPrintCount() + " | 纸张: " + result.getPaperType());
        if (result.getTaskList() != null) {
            for (int i = 0; i < result.getTaskList().size(); i++) {
                EduPrintOcrResult.PrintTaskItem task = result.getTaskList().get(i);
                System.out.println(String.format("任务 #%d: 原始文件=%s, 纯净名=%s, 时间=%s, 份数=%s",
                    i, task.getOriginalDocName(), task.getPrintName(), task.getTimeSnippet(), task.getPrintCount()));
            }
        }
        System.out.println("=========================================");

        Assertions.assertTrue(Boolean.TRUE.equals(result.getSuccess()));
        Assertions.assertEquals("黄紫琦", result.getTeacherName());
        Assertions.assertNotNull(result.getTaskList());
        Assertions.assertEquals(4, result.getTaskList().size());

        // 任务 #0: 9.30 8班辅导阅读理解（科技发明类）, 13份
        EduPrintOcrResult.PrintTaskItem task0 = result.getTaskList().get(0);
        Assertions.assertTrue(task0.getPrintName().contains("9.30") && task0.getPrintName().contains("阅读理解") && task0.getPrintName().contains("科技发明类"));
        Assertions.assertEquals(13L, task0.getPrintCount());

        // 任务 #1: B2U3重点句型复盘(S), 25份
        EduPrintOcrResult.PrintTaskItem task1 = result.getTaskList().get(1);
        Assertions.assertEquals("B2U3重点句型复盘(S)", task1.getPrintName());
        Assertions.assertEquals(25L, task1.getPrintCount());

        // 任务 #2: 热点时文15微尘塑变·水网危机 (阅读专练...卷版), 25份
        EduPrintOcrResult.PrintTaskItem task2 = result.getTaskList().get(2);
        Assertions.assertTrue(task2.getPrintName().contains("热点时文15") && task2.getPrintName().contains("微尘塑变·水网危机"));
        Assertions.assertEquals(25L, task2.getPrintCount());

        // 任务 #3: B2U3重点句型复盘(T), 1份
        EduPrintOcrResult.PrintTaskItem task3 = result.getTaskList().get(3);
        Assertions.assertEquals("B2U3重点句型复盘(T)", task3.getPrintName());
        Assertions.assertEquals(1L, task3.getPrintCount());

        // 验证主印刷名称与任务列表
        Assertions.assertNotNull(result.getPrintName());
        Assertions.assertNotNull(result.getPrintCount());
    }

    @Test
    public void testUserUploadedImageLiXinyu() throws Exception
    {
        java.io.File imgFile = new java.io.File("C:/Users/javal/.gemini/antigravity/brain/bdbe8299-ed6e-4806-9e61-ffad94dbdb79/.user_uploaded/media_1791022576460.png");
        EduOcrServiceImpl service = getMockedService();
        io.github.mymonstercat.ocr.config.HardwareConfig config = io.github.mymonstercat.ocr.config.HardwareConfig.getOnnxConfig();
        io.github.mymonstercat.ocr.InferenceEngine engine = io.github.mymonstercat.ocr.InferenceEngine.getInstance(io.github.mymonstercat.Model.ONNX_PPOCR_V3, config);
        com.benjaminwan.ocrlibrary.OcrResult ocrResult = engine.runOcr(imgFile.getAbsolutePath());
        java.awt.image.BufferedImage bimg = javax.imageio.ImageIO.read(imgFile);
        java.io.PrintWriter pw = new java.io.PrintWriter(new java.io.OutputStreamWriter(new java.io.FileOutputStream("target/ocr_dump.txt"), java.nio.charset.StandardCharsets.UTF_8));
        pw.println("Image Size: " + bimg.getWidth() + "x" + bimg.getHeight());
        pw.println("========== ALL OCR BLOCKS ==========");
        for (com.benjaminwan.ocrlibrary.TextBlock tb : ocrResult.getTextBlocks()) {
            int minX = com.doupi.edu.service.impl.ocr.ChatLayoutSegmenter.getMinX(tb);
            int minY = com.doupi.edu.service.impl.ocr.ChatLayoutSegmenter.getMinY(tb);
            int maxX = com.doupi.edu.service.impl.ocr.ChatLayoutSegmenter.getMaxX(tb);
            int maxY = com.doupi.edu.service.impl.ocr.ChatLayoutSegmenter.getMaxY(tb);
            pw.println(String.format("[%4d, %4d, %4d, %4d] %s", minX, minY, maxX, maxY, tb.getText()));
        }
        pw.println("=====================================");
        pw.close();

        EduPrintOcrResult result = service.parseScreenshot(toMultipartFile(imgFile));

        java.io.PrintWriter pwResult = new java.io.PrintWriter(new java.io.OutputStreamWriter(new java.io.FileOutputStream("target/result_utf8.txt"), java.nio.charset.StandardCharsets.UTF_8));
        pwResult.println("成功: " + result.getSuccess());
        pwResult.println("教师: " + result.getTeacherName() + " (ID: " + result.getTeacherId() + ", Matched: " + result.getTeacherMatched() + ")");
        pwResult.println("学科: " + result.getSubject() + " | 年级: " + result.getGrade());
        pwResult.println("印刷名: " + result.getPrintName());
        pwResult.println("文档列表: " + result.getDocumentList());
        pwResult.println("份数: " + result.getPrintCount() + " | 纸张: " + result.getPaperType());
        pwResult.close();
    }

    @Test
    public void testUserReportedMultiFileChatLog() throws Exception
    {
        EduOcrServiceImpl service = getMockedService();

        String chatText =
            "王贤武\n" +
            "2026年08月20日  9:30\n" +
            "[文件] 默写训练（必修上文言文）.doc\n" +
            "\n" +
            "王贤武\n" +
            "2026年08月20日  9:30\n" +
            "[文件] 默写训练（必修上古诗词）.doc\n" +
            "\n" +
            "王贤武\n" +
            "2026年08月20日  9:30\n" +
            "40份。下午来拿。\n" +
            "\n" +
            "王贤武\n" +
            "2026年08月21日 11:02\n" +
            "[文件] 高三(7)班登分表.doc\n" +
            "\n" +
            "王贤武\n" +
            "2026年08月21日 11:02\n" +
            "龙老师，麻烦你印10份。";

        EduPrintOcrResult result = service.extractInfoFromText(chatText);

        System.out.println("========== [用户报告-跨天多文件聊天记录] ==========");
        System.out.println("文档列表: " + result.getDocumentList());
        System.out.println("全局份数: " + result.getPrintCount());
        System.out.println("任务数: " + result.getTaskList().size());
        for (int i = 0; i < result.getTaskList().size(); i++) {
            EduPrintOcrResult.PrintTaskItem t = result.getTaskList().get(i);
            System.out.println(String.format("任务#%d 文件=%s 名=%s 份数=%s 时间=%s",
                i, t.getOriginalDocName(), t.getPrintName(), t.getPrintCount(), t.getTimeSnippet()));
        }
        System.out.println("==================================================");

        Assertions.assertEquals(3, result.getTaskList().size(), "应识别出3个文件任务");
        Assertions.assertEquals(40L, result.getTaskList().get(0).getPrintCount(), "默写训练（必修上文言文）应为40份");
        Assertions.assertEquals(40L, result.getTaskList().get(1).getPrintCount(), "默写训练（必修上古诗词）应为40份");
        Assertions.assertEquals(10L, result.getTaskList().get(2).getPrintCount(), "高三(7)班登分表应为10份");
    }
}


