package com.doupi.edu.service.impl.ocr;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.doupi.common.utils.StringUtils;
import com.doupi.edu.domain.EduClass;
import com.doupi.edu.domain.EduTeacher;
import com.doupi.edu.domain.dto.EduPrintOcrResult;
import com.doupi.stock.domain.StockGoods;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * 教务印刷意图与槽位抽取器
 * 负责从结构化对话拓扑中精确抽取【申请教师】、【印刷文档列表】、【印刷份数】、【纸张类型】等业务字段，
 * 并与教职工档案、班级库、纸张库存进行智能联动匹配。
 */
public class EduPrintIntentExtractor 
{
    private static final Logger log = LoggerFactory.getLogger(EduPrintIntentExtractor.class);

    public static EduPrintOcrResult extract(
        ChatTopologyParser.ChatDialogContext ctx,
        List<EduTeacher> teachers,
        List<EduClass> classes,
        List<StockGoods> paperGoodsList
    ) 
    {
        EduPrintOcrResult result = new EduPrintOcrResult();
        result.setSuccess(true);
        result.setRawText(ctx.cleanChatText);

        // 1. 文档文件列表槽抽取
        List<String> rawFiles = new ArrayList<>(ctx.fileList);
        result.setDocumentList(rawFiles);

        // 提取主要印刷材料名称
        String primaryDoc = null;
        if (!rawFiles.isEmpty()) 
        {
            // 默认采用最新一轮出现的文件（列表最后一个）
            primaryDoc = rawFiles.get(rawFiles.size() - 1);
        }

        // 2. 年级与学科抽取
        String grade = null;
        String subject = null;

        if (ctx.header != null) 
        {
            if (StringUtils.isNotEmpty(ctx.header.grade)) grade = ctx.header.grade;
            if (StringUtils.isNotEmpty(ctx.header.subject)) subject = ctx.header.subject;
        }

        // 若从 Header 未获取到年级，扫描文件名与正文（优先处理 高考->高三，中考->初三）
        if (StringUtils.isEmpty(grade)) 
        {
            if ((primaryDoc != null && primaryDoc.contains("高考")) || ctx.cleanChatText.contains("高考")) 
            {
                grade = "高三";
            }
            else if ((primaryDoc != null && primaryDoc.contains("中考")) || ctx.cleanChatText.contains("中考")) 
            {
                grade = "初三";
            }
            else 
            {
                for (String g : ChatTopologyParser.GRADES) 
                {
                    if ((primaryDoc != null && primaryDoc.contains(g)) || ctx.cleanChatText.contains(g)) 
                    {
                        grade = g;
                        break;
                    }
                }
            }
        }

        // 若从 Header 未获取到学科，扫描文件名与正文中的学科关键字
        if (StringUtils.isEmpty(subject)) 
        {
            String scanTarget = (primaryDoc != null ? primaryDoc : "") + " " + ctx.cleanChatText;
            if (scanTarget.contains("作文") || scanTarget.contains("语文") || scanTarget.contains("文言文") || scanTarget.contains("古诗")) 
            {
                subject = "语文";
            }
            else if (scanTarget.contains("数学") || scanTarget.contains("导数") || scanTarget.contains("几何") || scanTarget.contains("函数")) 
            {
                subject = "数学";
            }
            else if (scanTarget.contains("英语") || scanTarget.contains("完形") || scanTarget.contains("阅读理解") || scanTarget.contains("Unit") || scanTarget.contains("单词")) 
            {
                subject = "英语";
            }
            else if (scanTarget.contains("物理") || scanTarget.contains("力学") || scanTarget.contains("电磁")) 
            {
                subject = "物理";
            }
            else if (scanTarget.contains("化学")) 
            {
                subject = "化学";
            }
            else if (scanTarget.contains("生物")) 
            {
                subject = "生物";
            }
            else if (scanTarget.contains("历史")) 
            {
                subject = "历史";
            }
            else if (scanTarget.contains("地理")) 
            {
                subject = "地理";
            }
            else if (scanTarget.contains("政治") || scanTarget.contains("道法")) 
            {
                subject = "政治";
            }
            else 
            {
                for (String sub : ChatTopologyParser.SUBJECTS) 
                {
                    if (scanTarget.contains(sub)) 
                    {
                        subject = sub;
                        break;
                    }
                }
            }
        }

        result.setGrade(grade);
        result.setSubject(subject);

        // 3. 申请教师槽智能匹配（核心业务规则：识别内容匹配老师，匹配不到则由用户自选）
        matchTeacher(result, ctx, teachers);

        // 4. 印刷份数、页数与单双页方式抽取
        Long printCount = extractPrintCount(ctx);
        result.setPrintCount(printCount);

        Long pageCount = extractPageCount(ctx, printCount);
        result.setPageCount(pageCount != null && pageCount > 0 ? pageCount : 1L);

        String printSide = extractPrintSide(ctx.cleanChatText);
        result.setPrintSide(printSide);

        if (result.getPrintCount() != null) 
        {
            long pages = (result.getPageCount() != null && result.getPageCount() > 0) ? result.getPageCount() : 1L;
            long sheets = "2".equals(printSide) ? ((pages + 1) / 2) : pages;
            result.setTotalPages(result.getPrintCount() * sheets);
        }

        // 5. 纸张类型槽提取（默认 8K）
        String paperType = extractPaperType(ctx.cleanChatText);
        result.setPaperType(paperType);

        // 关联纸张物品库存
        matchPaperGoods(result, paperGoodsList);

        // 6. 班级槽提取与联动
        matchClass(result, ctx.cleanChatText, classes);

        // 7. 组装印刷名称
        assemblePrintName(result, primaryDoc);

        if (StringUtils.isEmpty(result.getPrintName())) 
        {
            result.setPrintName("教务印刷材料");
        }

        // 8. 抽取多任务/多天印刷任务清单（支持一次截图含多次印刷与多天记录）
        List<EduPrintOcrResult.PrintTaskItem> taskList = buildTaskList(ctx, result, rawFiles);
        result.setTaskList(taskList);

        result.setMsg(buildResultMessage(result));
        return result;
    }

    /**
     * 教师匹配核心算法：
     * 支持："刘珉"、"徐老师"、"周珲"、"王贤武" 等各种微信备注与聊天称谓。
     * 若在档案库中唯一定位成功，则自动预填教师及其任教学科/年级；
     * 若未匹配或存在多个同姓教师，则 teacherMatched=false，让用户在界面自选。
     */
    private static void matchTeacher(
        EduPrintOcrResult result,
        ChatTopologyParser.ChatDialogContext ctx,
        List<EduTeacher> teachers
    ) 
    {
        String candidate = null;

        // 优先级 1：从顶部 Header 提取到的教师候选（如 "李心雨老师" 中的 "李心雨"、"刘珉" 等）
        if (ctx.header != null && StringUtils.isNotEmpty(ctx.header.teacherCandidate)) 
        {
            candidate = ctx.header.teacherCandidate;
        }

        // 优先级 2：从操作员发言反推对方姓氏称谓（如操作员在右侧发：“刘老师 打多少份”）
        if (StringUtils.isEmpty(candidate)) 
        {
            for (ChatTopologyParser.ChatMessage opMsg : ctx.operatorMessages) 
            {
                Matcher m = Pattern.compile("([\\u4e00-\\u9fa5]{1,2})老师").matcher(opMsg.text);
                if (m.find()) 
                {
                    candidate = m.group(1) + "老师";
                    break;
                }
            }
        }

        // 优先级 3：扫描左侧消息首句中的署名
        if (StringUtils.isEmpty(candidate)) 
        {
            for (ChatTopologyParser.ChatMessage tMsg : ctx.teacherMessages) 
            {
                Matcher m = Pattern.compile("(?:我是|发件人[:：]|教师[:：])\\s*([\\u4e00-\\u9fa5]{2,4})").matcher(tMsg.text);
                if (m.find()) 
                {
                    candidate = m.group(1).trim();
                    break;
                }
            }
        }

        // 过滤杂音与单字数字（如误提取到的 "1"、"0" 等）
        if (candidate != null) 
        {
            candidate = candidate.trim();
            if (candidate.length() <= 1 || candidate.matches("^\\d+$")) 
            {
                candidate = null;
            } 
            else if (candidate.endsWith("老师") && candidate.length() >= 4) 
            {
                // 全名称谓（如 "李心雨老师"）规范为全名 "李心雨"
                candidate = candidate.replaceAll("老师$", "").trim();
            }
        }

        result.setTeacherName(candidate);
        result.setTeacherMatched(false);

        if (StringUtils.isEmpty(candidate) || teachers == null || teachers.isEmpty()) 
        {
            return;
        }

        // 步骤 1：全名精确匹配（如 candidate="刘珉" 或 "周珲" 或 "王贤武"）
        for (EduTeacher t : teachers) 
        {
            if (StringUtils.isNotEmpty(t.getTeacherName()) && 
                (t.getTeacherName().equals(candidate) || candidate.equals(t.getTeacherName() + "老师"))) 
            {
                fillMatchedTeacher(result, t);
                return;
            }
        }

        // 步骤 2：称谓模糊匹配（如 candidate="徐老师"、"刘老师"）
        String surname = candidate.replaceAll("老师$", "").trim();
        if (surname.length() >= 1 && surname.length() <= 2) 
        {
            List<EduTeacher> surnameMatches = new ArrayList<>();
            for (EduTeacher t : teachers) 
            {
                if (StringUtils.isNotEmpty(t.getTeacherName()) && t.getTeacherName().startsWith(surname)) 
                {
                    surnameMatches.add(t);
                }
            }

            // 若结合上下文已知学科（如 "英语"），进一步在同姓列表中筛选
            if (surnameMatches.size() > 1 && StringUtils.isNotEmpty(result.getSubject())) 
            {
                List<EduTeacher> subjectMatches = new ArrayList<>();
                for (EduTeacher t : surnameMatches) 
                {
                    if (result.getSubject().equals(t.getSubject())) 
                    {
                        subjectMatches.add(t);
                    }
                }
                if (!subjectMatches.isEmpty()) 
                {
                    surnameMatches = subjectMatches;
                }
            }

            // 唯一定位到一位老师，确认匹配！
            if (surnameMatches.size() == 1) 
            {
                fillMatchedTeacher(result, surnameMatches.get(0));
                return;
            }
        }

        // 未唯一定位到老师：保留识别到的称谓或姓名提示，设置 teacherMatched=false，前端让用户在下拉框自选
        log.info("教师称谓 [{}] 未在档案库中唯一定位，需用户自选", candidate);
    }

    private static void fillMatchedTeacher(EduPrintOcrResult result, EduTeacher t) 
    {
        result.setTeacherId(t.getTeacherId());
        result.setTeacherName(t.getTeacherName());
        result.setTeacherMatched(true);
        if (StringUtils.isEmpty(result.getGrade()) && StringUtils.isNotEmpty(t.getGrade())) 
        {
            result.setGrade(t.getGrade());
        }
        if (StringUtils.isEmpty(result.getSubject()) && StringUtils.isNotEmpty(t.getSubject())) 
        {
            result.setSubject(t.getSubject());
        }
    }

    /**
     * 抽取印刷单双页方式（1-单页印刷，2-双页印刷）
     */
    public static String extractPrintSide(String text) 
    {
        if (StringUtils.isEmpty(text)) return "1";
        if (text.contains("双面") || text.contains("双页") || text.contains("两面") || text.contains("正反面") || text.contains("正反两面")) 
        {
            return "2";
        }
        return "1";
    }

    /**
     * 字符串解析数字（支持阿拉伯数字与中文数字，且必须 > 0）
     */
    public static Long parseNumberString(String s) 
    {
        if (StringUtils.isEmpty(s)) return null;
        s = s.trim();
        // 纯阿拉伯数字（含字母O混淆）
        if (s.matches("(?i)^[0-9O]+$")) 
        {
            try 
            {
                long val = Long.parseLong(s.replace('O', '0').replace('o', '0'));
                return val > 0 ? val : null;
            } 
            catch (NumberFormatException ignored) {}
        }

        // 中文数字转换 (支持 1~999，如 一份、两份、三份、二十五份、一百份)
        if (s.matches("^[一二两三四五六七八九十百]+$")) 
        {
            long val = 0;
            long temp = 0;
            for (int i = 0; i < s.length(); i++) 
            {
                char c = s.charAt(i);
                long digit = 0;
                switch (c) 
                {
                    case '一': digit = 1; break;
                    case '二': case '两': digit = 2; break;
                    case '三': digit = 3; break;
                    case '四': digit = 4; break;
                    case '五': digit = 5; break;
                    case '六': digit = 6; break;
                    case '七': digit = 7; break;
                    case '八': digit = 8; break;
                    case '九': digit = 9; break;
                    case '十':
                        if (temp == 0) temp = 1;
                        val += temp * 10;
                        temp = 0;
                        continue;
                    case '百':
                        if (temp == 0) temp = 1;
                        val += temp * 100;
                        temp = 0;
                        continue;
                }
                temp = digit;
            }
            val += temp;
            return val > 0 ? val : null;
        }

        return null;
    }

    /**
     * 印刷份数智能提取：
     * 优先在申请教师最新发出的消息列表中逆序检索
     * 兼容："三个文档各印55份"、"小龙老师，麻烦帮忙印55份"、"各印55份"、"打6份"、"这个打印一份" 等口语
     */
    private static Long extractPrintCount(ChatTopologyParser.ChatDialogContext ctx) 
    {
        List<ChatTopologyParser.ChatMessage> searchList = new ArrayList<>(ctx.teacherMessages);
        Collections.reverse(searchList); // 从最新消息开始找

        // 模式 1：口语复合句（如 "三个文档各印55份"、"麻烦帮我印55份"、"各印55份"、"这个打印一份"、"打1份"、"40分。谢谢！"、"4O。谢谢！"）
        Pattern p1 = Pattern.compile("(?i)(?:这个|这些)?(?:各(?:印|打)?|打|印|打印|帮忙印|帮忙打|帮我印|帮我打|需要|共|共计)?\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:份|分|张|本|套)");
        for (ChatTopologyParser.ChatMessage msg : searchList) 
        {
            if (msg.isFile) continue;
            Matcher m = p1.matcher(msg.text);
            if (m.find()) 
            {
                Long val = parseNumberString(m.group(1));
                if (val != null && val > 0) return val;
            }
        }

        // 模式 2：简短句式（如 "打6份"、"印6份"、"打25"、"打印1"）
        Pattern p2 = Pattern.compile("(?i)(?:打印|各(?:印|打)?|打|印)\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:份|分)?");
        for (ChatTopologyParser.ChatMessage msg : searchList) 
        {
            if (msg.isFile) continue;
            Matcher m = p2.matcher(msg.text);
            if (m.find()) 
            {
                Long val = parseNumberString(m.group(1));
                if (val != null && val > 0) return val;
            }
        }

        // 模式 3：单独一行的数字（如 "40"、"4O。谢谢！"、"40 谢谢"、"一份 谢谢"）
        Pattern p3 = Pattern.compile("(?i)^\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:[。！!，,\\s]|谢谢)*$");
        for (ChatTopologyParser.ChatMessage msg : searchList) 
        {
            if (msg.isFile) continue;
            Matcher m = p3.matcher(msg.text.trim());
            if (m.find()) 
            {
                Long val = parseNumberString(m.group(1));
                if (val != null && val > 0) return val;
            }
        }

        // 模式 4：若前几轮未命中，在全文本中检索
        Matcher mAll = p1.matcher(ctx.cleanChatText);
        while (mAll.find()) 
        {
            Long val = parseNumberString(mAll.group(1));
            if (val != null && val > 0) return val;
        }

        Matcher mAllAlone = Pattern.compile("(?im)^\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:[。！!，,\\s]|谢谢)*$").matcher(ctx.cleanChatText);
        while (mAllAlone.find()) 
        {
            Long val = parseNumberString(mAllAlone.group(1));
            if (val != null && val > 0) return val;
        }

        return null;
    }

    private static Long extractPageCount(ChatTopologyParser.ChatDialogContext ctx, Long printCount) 
    {
        Pattern pagePattern = Pattern.compile("(?i)(?:每份|共)?\\s*([0-9]{1,3})\\s*(?:页|张)(?!份)");
        Matcher m = pagePattern.matcher(ctx.cleanChatText);
        if (m.find()) 
        {
            try 
            {
                long p = Long.parseLong(m.group(1));
                if (printCount == null || p != printCount) 
                {
                    return p;
                }
            } 
            catch (NumberFormatException ignored) {}
        }
        return 1L;
    }

    private static String extractPaperType(String text) 
    {
        String upper = text.toUpperCase();
        if (upper.contains("8K") || text.contains("八开") || text.contains("8开")) 
        {
            return "8K";
        } 
        else if (upper.contains("16K") || text.contains("十六开") || text.contains("16开")) 
        {
            return "16K";
        } 
        else if (upper.contains("A3")) 
        {
            return "A3";
        } 
        else if (upper.contains("A4")) 
        {
            return "A4";
        }
        // 校园教务试卷印刷默认 8K 纸
        return "8K";
    }

    private static void matchPaperGoods(EduPrintOcrResult result, List<StockGoods> paperGoodsList) 
    {
        if (paperGoodsList == null || paperGoodsList.isEmpty() || StringUtils.isEmpty(result.getPaperType())) 
        {
            return;
        }

        StockGoods fallback = null;
        for (StockGoods g : paperGoodsList) 
        {
            String name = g.getGoodsName() != null ? g.getGoodsName() : "";
            String spec = g.getSpec() != null ? g.getSpec() : "";
            if (name.toUpperCase().contains(result.getPaperType()) || spec.equalsIgnoreCase(result.getPaperType())) 
            {
                if (name.contains("试卷") || name.contains("速印")) 
                {
                    result.setPaperGoodsId(g.getGoodsId());
                    result.setPaperGoodsName(g.getGoodsName());
                    return;
                } 
                else if (fallback == null) 
                {
                    fallback = g;
                }
            }
        }
        if (fallback != null) 
        {
            result.setPaperGoodsId(fallback.getGoodsId());
            result.setPaperGoodsName(fallback.getGoodsName());
        }
    }

    private static void matchClass(EduPrintOcrResult result, String text, List<EduClass> classes) 
    {
        // 匹配班级（如 "高三1班"、"三1班"、"1班"）
        Pattern p = Pattern.compile("(?i)(?:[高初]?[一二三123])?\\s*([0-9]{1,2}|[一二三四五六七八九十]{1,2})\\s*班");
        Matcher m = p.matcher(text);
        String foundClassName = null;
        if (m.find()) 
        {
            foundClassName = m.group(0).trim();
        }

        if (classes != null && !classes.isEmpty()) 
        {
            if (foundClassName != null) 
            {
                for (EduClass c : classes) 
                {
                    if (c.getClassName().equals(foundClassName) || foundClassName.endsWith(c.getClassName())) 
                    {
                        if (StringUtils.isEmpty(result.getGrade()) || result.getGrade().equals(c.getGrade())) 
                        {
                            result.setClassId(c.getClassId());
                            result.setClassName(c.getClassName());
                            return;
                        }
                    }
                }
            }
            result.setClassName(foundClassName);
        }
    }

    public static String cleanDocumentName(String docName) 
    {
        if (StringUtils.isEmpty(docName)) return "";
        // 1. 去除文件后缀
        String name = docName.replaceAll("(?i)\\.(?:docx?|pdf|wps|xlsx?|pptx?)$", "").trim();
        // 2. 剥离可能存在的 [文件] 或 (文件) 标头
        name = name.replaceAll("^\\[(?:文件|文档|图片)\\]\\s*", "");
        return name.trim();
    }

    private static void assemblePrintName(EduPrintOcrResult result, String docName) 
    {
        if (StringUtils.isEmpty(docName)) return;
        result.setPrintName(cleanDocumentName(docName));
    }

    /**
     * 抽取多任务清单：按文件卡片及其所属时间戳/份数切分独立任务
     */
    public static List<EduPrintOcrResult.PrintTaskItem> buildTaskList(
        ChatTopologyParser.ChatDialogContext ctx,
        EduPrintOcrResult baseResult,
        List<String> rawFiles
    ) 
    {
        List<EduPrintOcrResult.PrintTaskItem> list = new ArrayList<>();
        if (rawFiles != null && !rawFiles.isEmpty()) 
        {
            // 1. 定位各个文件在 ctx.allMessages 中的下标位置
            List<Integer> fileIndices = new ArrayList<>();
            List<String> matchedFiles = new ArrayList<>();
            for (String rawFile : rawFiles) 
            {
                int pos = -1;
                for (int i = 0; i < ctx.allMessages.size(); i++) 
                {
                    ChatTopologyParser.ChatMessage m = ctx.allMessages.get(i);
                    if (m.isFile && (m.text.equals(rawFile) || m.text.contains(rawFile) || rawFile.contains(m.text))) 
                    {
                        if (!fileIndices.contains(i)) 
                        {
                            pos = i;
                            break;
                        }
                    }
                }
                if (pos == -1) 
                {
                    for (int i = 0; i < ctx.allMessages.size(); i++) 
                    {
                        ChatTopologyParser.ChatMessage m = ctx.allMessages.get(i);
                        if (m.text != null && (m.text.equals(rawFile) || m.text.contains(rawFile) || rawFile.contains(m.text))) 
                        {
                            if (!fileIndices.contains(i)) 
                            {
                                pos = i;
                                break;
                            }
                        }
                    }
                }
                fileIndices.add(pos);
                matchedFiles.add(rawFile);
            }

            // 2. 逐个文件智能推断绑定印刷份数
            Long lastEachCount = null; // 记录前序指令中“各打/各印X份”的各份数值

            for (int k = 0; k < matchedFiles.size(); k++) 
            {
                String rawFile = matchedFiles.get(k);
                int currentFilePos = fileIndices.get(k);
                int prevFilePos = (k == 0) ? 0 : (fileIndices.get(k - 1) + 1);
                int nextFilePos = (k == matchedFiles.size() - 1) ? (ctx.allMessages.size() - 1) : (fileIndices.get(k + 1) - 1);

                Long resolvedCount = null;

                // 优先 A：检查在当前文件与上一文件之间的前置发言（如老师先说“龙老师，帮忙打13份，谢谢”或“这个各打25份”，然后发送文件）
                if (currentFilePos > 0) 
                {
                    for (int j = currentFilePos - 1; j >= prevFilePos; j--) 
                    {
                        ChatTopologyParser.ChatMessage m = ctx.allMessages.get(j);
                        if (m.isFile) break;
                        // 遇到时间戳或系统消息，跨越了对话会话分界，停止向前追溯并清除前序跨天继承
                        if (m.role == ChatTopologyParser.MessageRole.SYSTEM || 
                            (m.text != null && m.text.matches("^(?:星期[一二三四五六日天]|昨天|前天|\\d{1,2}:\\d{2}|\\d{4}年).*"))) 
                        {
                            lastEachCount = null;
                            break;
                        }
                        Long cnt = parseCountFromSingleText(m.text);
                        if (cnt != null && cnt > 0) 
                        {
                            resolvedCount = cnt;
                            if (m.text.contains("各")) 
                            {
                                lastEachCount = cnt;
                            } 
                            else 
                            {
                                lastEachCount = null; // 被单项份数打断，清除各份数
                            }
                            break;
                        }
                    }
                }

                // 规则 B：若当前文件前未明确说明份数，但处于“各打XX份”的批量发送队列中，继承该各份数值
                if (resolvedCount == null && lastEachCount != null) 
                {
                    resolvedCount = lastEachCount;
                }

                // 规则 C：检查在当前文件与下一文件之间的后置发言（如发送文件后紧接着说“打40份”或“各55份”）
                if (resolvedCount == null && currentFilePos >= 0) 
                {
                    for (int j = currentFilePos + 1; j <= nextFilePos; j++) 
                    {
                        ChatTopologyParser.ChatMessage m = ctx.allMessages.get(j);
                        if (m.isFile) break;
                        // 同样，后置检索也不能跨越时间戳
                        if (m.role == ChatTopologyParser.MessageRole.SYSTEM || 
                            (m.text != null && m.text.matches("^(?:星期[一二三四五六日天]|昨天|前天|\\d{1,2}:\\d{2}|\\d{4}年).*"))) 
                        {
                            break;
                        }
                        Long cnt = parseCountFromSingleText(m.text);
                        if (cnt != null && cnt > 0) 
                        {
                            resolvedCount = cnt;
                            if (m.text.contains("各")) 
                            {
                                lastEachCount = cnt;
                            }
                            break;
                        }
                    }
                }

                // 规则 D：兜底使用全局提取到的份数或默认1份
                if (resolvedCount == null) 
                {
                    resolvedCount = (baseResult.getPrintCount() != null && baseResult.getPrintCount() > 0) ? baseResult.getPrintCount() : 1L;
                }

                // 检查当前文件附近的发言是否单独指定了单面/双面
                String resolvedSide = null;
                if (currentFilePos > 0) 
                {
                    for (int j = currentFilePos - 1; j >= prevFilePos; j--) 
                    {
                        ChatTopologyParser.ChatMessage m = ctx.allMessages.get(j);
                        if (m.isFile) break;
                        if (m.role == ChatTopologyParser.MessageRole.SYSTEM || 
                            (m.text != null && m.text.matches("^(?:星期[一二三四五六日天]|昨天|前天|\\d{1,2}:\\d{2}|\\d{4}年).*"))) 
                        {
                            break;
                        }
                        if (StringUtils.isNotEmpty(m.text)) 
                        {
                            if (m.text.contains("双面") || m.text.contains("双页") || m.text.contains("两面") || m.text.contains("正反面")) 
                            {
                                resolvedSide = "2";
                                break;
                            } 
                            else if (m.text.contains("单面") || m.text.contains("单页")) 
                            {
                                resolvedSide = "1";
                                break;
                            }
                        }
                    }
                }
                if (resolvedSide == null && currentFilePos >= 0) 
                {
                    for (int j = currentFilePos + 1; j <= nextFilePos; j++) 
                    {
                        ChatTopologyParser.ChatMessage m = ctx.allMessages.get(j);
                        if (m.isFile) break;
                        if (m.role == ChatTopologyParser.MessageRole.SYSTEM || 
                            (m.text != null && m.text.matches("^(?:星期[一二三四五六日天]|昨天|前天|\\d{1,2}:\\d{2}|\\d{4}年).*"))) 
                        {
                            break;
                        }
                        if (StringUtils.isNotEmpty(m.text)) 
                        {
                            if (m.text.contains("双面") || m.text.contains("双页") || m.text.contains("两面") || m.text.contains("正反面")) 
                            {
                                resolvedSide = "2";
                                break;
                            } 
                            else if (m.text.contains("单面") || m.text.contains("单页")) 
                            {
                                resolvedSide = "1";
                                break;
                            }
                        }
                    }
                }
                if (resolvedSide == null) 
                {
                    resolvedSide = StringUtils.isNotEmpty(baseResult.getPrintSide()) ? baseResult.getPrintSide() : "1";
                }

                EduPrintOcrResult.PrintTaskItem item = new EduPrintOcrResult.PrintTaskItem();
                item.setOriginalDocName(rawFile);
                item.setPrintName(cleanDocumentName(rawFile));

                String timeSnippet = findNearestTimeSnippet(ctx, rawFile);
                item.setTimeSnippet(timeSnippet);

                item.setPrintCount(resolvedCount);
                item.setPageCount(baseResult.getPageCount());
                item.setPrintSide(resolvedSide);
                item.setPaperType(baseResult.getPaperType());
                item.setPaperGoodsId(baseResult.getPaperGoodsId());
                item.setPaperGoodsName(baseResult.getPaperGoodsName());

                item.setTeacherId(baseResult.getTeacherId());
                item.setTeacherName(baseResult.getTeacherName());
                item.setTeacherMatched(baseResult.getTeacherMatched());
                item.setGrade(baseResult.getGrade());
                item.setSubject(baseResult.getSubject());
                item.setClassId(baseResult.getClassId());
                item.setClassName(baseResult.getClassName());

                item.setAlreadyRegistered(false);
                list.add(item);
            }
        } 
        else 
        {
            // 无独立文件卡片，但有文本材料
            EduPrintOcrResult.PrintTaskItem item = new EduPrintOcrResult.PrintTaskItem();
            item.setPrintName(baseResult.getPrintName());
            item.setOriginalDocName("");
            item.setTimeSnippet("当前对话");
            item.setPrintCount((baseResult.getPrintCount() != null && baseResult.getPrintCount() > 0) ? baseResult.getPrintCount() : 1L);
            item.setPageCount(baseResult.getPageCount());
            item.setPrintSide(baseResult.getPrintSide());
            item.setPaperType(baseResult.getPaperType());
            item.setPaperGoodsId(baseResult.getPaperGoodsId());
            item.setPaperGoodsName(baseResult.getPaperGoodsName());

            item.setTeacherId(baseResult.getTeacherId());
            item.setTeacherName(baseResult.getTeacherName());
            item.setTeacherMatched(baseResult.getTeacherMatched());
            item.setGrade(baseResult.getGrade());
            item.setSubject(baseResult.getSubject());
            item.setClassId(baseResult.getClassId());
            item.setClassName(baseResult.getClassName());

            item.setAlreadyRegistered(false);
            list.add(item);
        }
        return list;
    }

    private static String findNearestTimeSnippet(ChatTopologyParser.ChatDialogContext ctx, String fileName) 
    {
        if (ctx == null || ctx.allMessages == null || ctx.allMessages.isEmpty()) 
        {
            return "近期记录";
        }

        // 定位该文件名所在的消息下标
        int pos = -1;
        for (int i = 0; i < ctx.allMessages.size(); i++) 
        {
            ChatTopologyParser.ChatMessage m = ctx.allMessages.get(i);
            if (m.text != null && (m.text.equals(fileName) || m.text.contains(fileName) || fileName.contains(m.text))) 
            {
                pos = i;
                break;
            }
        }

        if (pos == -1) pos = ctx.allMessages.size() - 1;

        // 从 pos 往前检索最近的时间戳或系统消息
        for (int i = pos - 1; i >= 0; i--) 
        {
            ChatTopologyParser.ChatMessage m = ctx.allMessages.get(i);
            if (m.role == ChatTopologyParser.MessageRole.SYSTEM || 
                m.text.matches("^(?:星期[一二三四五六日天]|昨天|前天|\\d{1,2}:\\d{2}|\\d{4}年\\d{1,2}月).*")) 
            {
                return m.text.trim();
            }
        }

        // 往后找第1个时间戳（可能时间在消息紧随其后）
        for (int i = pos + 1; i < ctx.allMessages.size(); i++) 
        {
            ChatTopologyParser.ChatMessage m = ctx.allMessages.get(i);
            if (m.role == ChatTopologyParser.MessageRole.SYSTEM || 
                m.text.matches("^(?:星期[一二三四五六日天]|昨天|前天|\\d{1,2}:\\d{2}|\\d{4}年\\d{1,2}月).*")) 
            {
                return m.text.trim();
            }
        }

        return "近期记录";
    }

    public static Long parseCountFromSingleText(String text) 
    {
        if (StringUtils.isEmpty(text)) return null;
        text = text.trim();
        // 模式 1：口语复合句（如 "各打25份"、"这个各打25份"、"龙老师，帮忙打13份，谢谢"、"这个打印一份"、"打1份"）
        Pattern p1 = Pattern.compile("(?i)(?:这个|这些)?(?:各(?:印|打)?|打|印|打印|帮忙印|帮忙打|帮我印|帮我打|需要|共|共计)?\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:份|分|张|本|套)");
        Matcher m1 = p1.matcher(text);
        if (m1.find()) 
        {
            Long val = parseNumberString(m1.group(1));
            if (val != null && val > 0) return val;
        }

        // 模式 2：简短句式（如 "打25"、"印6"、"打印1"）
        Pattern p2 = Pattern.compile("(?i)(?:打印|各(?:印|打)?|打|印)\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:份|分)?");
        Matcher m2 = p2.matcher(text);
        if (m2.find()) 
        {
            Long val = parseNumberString(m2.group(1));
            if (val != null && val > 0) return val;
        }

        // 模式 3：单独一行的数字（如 "40"、"4O。谢谢！"、"40 谢谢"、"一份 谢谢"）
        Pattern p3 = Pattern.compile("(?i)^\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:[。！!，,\\s]|谢谢)*$");
        Matcher m3 = p3.matcher(text);
        if (m3.find()) 
        {
            Long val = parseNumberString(m3.group(1));
            if (val != null && val > 0) return val;
        }
        return null;
    }

    private static String buildResultMessage(EduPrintOcrResult result) 
    {
        StringBuilder msg = new StringBuilder("微信截图智能识别解析成功！");
        if (Boolean.TRUE.equals(result.getTeacherMatched())) 
        {
            msg.append("已确认匹配教师: ").append(result.getTeacherName());
        } 
        else if (StringUtils.isNotEmpty(result.getTeacherName())) 
        {
            msg.append("识别到申请称谓: [").append(result.getTeacherName()).append("]，请在下拉列表核对指定教师。");
        }
        if (result.getTaskList() != null && result.getTaskList().size() > 1) 
        {
            msg.append(" 检测到共 ").append(result.getTaskList().size()).append(" 条印刷任务记录。");
        }
        else if (result.getDocumentList() != null && result.getDocumentList().size() > 1) 
        {
            msg.append(" 检测到共 ").append(result.getDocumentList().size()).append(" 份印刷文档附件。");
        }
        return msg.toString();
    }
}
