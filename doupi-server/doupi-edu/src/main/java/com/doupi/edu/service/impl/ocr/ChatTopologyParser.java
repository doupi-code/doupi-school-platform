package com.doupi.edu.service.impl.ocr;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.benjaminwan.ocrlibrary.TextBlock;
import com.doupi.common.utils.StringUtils;

/**
 * 微信/IM 聊天窗口拓扑与角色建模解析器
 * 负责将无序散落的 OCR 文本块，依据屏幕坐标与视觉特征构造成具有明确角色、上下文与类型的结构化对话模型。
 */
public class ChatTopologyParser 
{
    public static final String[] GRADES = {"高一", "高二", "高三", "初一", "初二", "初三"};
    public static final String[] SUBJECTS = {"语文", "数学", "英语", "物理", "化学", "生物", "政治", "历史", "地理"};

    public enum MessageRole 
    {
        TEACHER,    // 左侧申请教师（发需求、发文件）
        OPERATOR,   // 右侧操作员自己（绿色气泡回复：如“好的”、“打多少份”）
        SYSTEM      // 居中时间戳、撤回通知等系统消息
    }

    public static class ChatMessage 
    {
        public MessageRole role;
        public boolean isFile;
        public String text;
        public int x;
        public int y;
    }

    public static class HeaderInfo 
    {
        public String rawTitle;
        public String teacherCandidate; // 提取到的教师候选（如 "刘珉"、"徐老师"、"周珲"）
        public String subject;          // 提取到的学科（如 "英语"）
        public String grade;            // 提取到的年级（如 "高三"）
    }

    public static class ChatDialogContext 
    {
        public HeaderInfo header;
        public List<String> fileList = new ArrayList<>();
        public List<ChatMessage> teacherMessages = new ArrayList<>();
        public List<ChatMessage> operatorMessages = new ArrayList<>();
        public List<ChatMessage> allMessages = new ArrayList<>();
        public String cleanChatText = "";
    }

    /**
     * 将切分后的聊天区 TextBlock 序列构建为对话拓扑模型
     */
    public static ChatDialogContext parse(List<TextBlock> chatBlocks, TextBlock headerBlock, int splitX, int imgWidth, int imgHeight) 
    {
        ChatDialogContext ctx = new ChatDialogContext();
        if (chatBlocks == null || chatBlocks.isEmpty()) 
        {
            return ctx;
        }

        // 1. 解析顶部 Header 联系人信息
        if (headerBlock != null) 
        {
            ctx.header = parseHeaderTitle(headerBlock.getText());
        }

        // 2. 将文本块按 Y 从小到大排序（垂直时间流向）
        List<TextBlock> sortedBlocks = new ArrayList<>(chatBlocks);
        sortedBlocks.sort((b1, b2) -> {
            int y1 = ChatLayoutSegmenter.getMinY(b1);
            int y2 = ChatLayoutSegmenter.getMinY(b2);
            if (Math.abs(y1 - y2) <= 10) 
            {
                return Integer.compare(ChatLayoutSegmenter.getMinX(b1), ChatLayoutSegmenter.getMinX(b2));
            }
            return Integer.compare(y1, y2);
        });

        int chatAreaWidth = imgWidth > splitX ? (imgWidth - splitX) : imgWidth;
        int leftRightBoundary = splitX + (int) (chatAreaWidth * 0.58);

        // 如果 header 未从 Segmenter 明确传入，扫描最顶部第一行非系统字作为 Header
        if (ctx.header == null) 
        {
            for (TextBlock tb : sortedBlocks) 
            {
                int y = ChatLayoutSegmenter.getMinY(tb);
                if (y <= Math.max(120, imgHeight * 0.12)) 
                {
                    HeaderInfo h = parseHeaderTitle(tb.getText());
                    if (h != null && (h.teacherCandidate != null || h.subject != null)) 
                    {
                        ctx.header = h;
                        break;
                    }
                }
            }
        }

        // 3. 多行折叠文件名预处理合并（解决微信文件卡片因为文件名长换成两行的问题）
        List<MergedBlock> mergedList = mergeWrappedFileCards(sortedBlocks);

        StringBuilder cleanChatTextBuilder = new StringBuilder();

        // 4. 角色与消息归类
        for (MergedBlock mb : mergedList) 
        {
            int minX = mb.minX;
            int minY = mb.minY;
            String text = mb.text.trim();

            if (text.isEmpty()) continue;

            // 过滤掉最顶部的窗口控制按钮或单独的 Header
            if (minY <= Math.max(100, imgHeight * 0.09) && ctx.header != null && text.contains(ctx.header.rawTitle)) 
            {
                continue;
            }

            ChatMessage msg = new ChatMessage();
            msg.text = text;
            msg.x = minX;
            msg.y = minY;
            msg.isFile = mb.isFile;

            // 系统消息（撤回提示、时间戳）
            if (text.matches("^(?:星期[一二三四五六日天]|\\d{1,2}:\\d{2}|\\d{4}年\\d{1,2}月\\d{1,2}日).*") ||
                text.contains("撤回了一条消息") || text.contains("领取了你的红包")) 
            {
                msg.role = MessageRole.SYSTEM;
            }
            // 右侧绿色气泡操作员（minX > leftRightBoundary）
            else if (minX >= leftRightBoundary) 
            {
                msg.role = MessageRole.OPERATOR;
                ctx.operatorMessages.add(msg);
            }
            // 左侧申请人气泡或文件
            else 
            {
                msg.role = MessageRole.TEACHER;
                ctx.teacherMessages.add(msg);
                if (mb.isFile) 
                {
                    ctx.fileList.add(text);
                }
            }

            ctx.allMessages.add(msg);
            cleanChatTextBuilder.append(text).append("\n");
        }

        ctx.cleanChatText = cleanChatTextBuilder.toString().trim();
        return ctx;
    }

    /**
     * 解析聊天窗口顶部的联系人标题（如 "英语 刘珉"、"徐老师"、"普高部-高三-周珲"、"高一1班-张伟"）
     */
    public static HeaderInfo parseHeaderTitle(String raw) 
    {
        if (StringUtils.isEmpty(raw)) return null;
        String t = raw.trim();
        // 过滤常见的微信顶部前缀后缀（如 "<"、"‹"、"..."、"(3)"）
        t = t.replaceAll("^(?:<|‹|\\(|«|<|【)?\\s*", "").replaceAll("[】)）>»…\\s]+$", "");
        if (t.isEmpty()) return null;

        HeaderInfo h = new HeaderInfo();
        h.rawTitle = t;

        // 模式 1：用空格、横线、下划线、斜杠分隔（如 "英语 刘珉"、"高三英语 刘珉"、"普高部-高三-周珲"、"高一-张伟"）
        String[] tokens = t.split("[\\s\\-_—－/]+");
        if (tokens.length >= 2) 
        {
            for (String tok : tokens) 
            {
                String tk = tok.trim();
                if (tk.isEmpty()) continue;

                // 提取年级
                for (String g : GRADES) 
                {
                    if (tk.contains(g)) 
                    {
                        h.grade = g;
                        break;
                    }
                }
                // 提取学科
                for (String sub : SUBJECTS) 
                {
                    if (tk.contains(sub)) 
                    {
                        h.subject = sub;
                        break;
                    }
                }
                // 提取教师姓名/称谓
                if (!isDepartmentOrNoise(tk)) 
                {
                    String cleaned = tk.replaceAll("^(?:高[一二三]|初[一二三])", "").replaceAll("(?:语文|数学|英语|物理|化学|生物|历史|地理|政治)", "").trim();
                    if (!cleaned.isEmpty()) 
                    {
                        h.teacherCandidate = cleaned;
                    }
                }
            }
        } 
        else 
        {
            // 模式 2：单一词汇或紧凑词汇（如 "徐老师"、"王贤武"、"英语刘珉"、"高三周珲"）
            for (String g : GRADES) 
            {
                if (t.contains(g)) 
                {
                    h.grade = g;
                    t = t.replace(g, "");
                    break;
                }
            }
            for (String sub : SUBJECTS) 
            {
                if (t.contains(sub)) 
                {
                    h.subject = sub;
                    t = t.replace(sub, "");
                    break;
                }
            }
            t = t.trim();
            if (!t.isEmpty() && !isDepartmentOrNoise(t)) 
            {
                h.teacherCandidate = t;
            }
        }

        return h;
    }

    private static boolean isDepartmentOrNoise(String s) 
    {
        if (StringUtils.isEmpty(s)) return true;
        if (s.matches(".*(?:\\d|份|分|打|印|请|麻烦|张|本|套).*")) return true;
        if (s.length() > 6 && !s.endsWith("老师")) return true;
        return s.endsWith("部") || s.endsWith("处") || s.endsWith("组") || s.endsWith("室") || 
               s.endsWith("校") || s.contains("教务") || s.contains("普高") || s.contains("年级") ||
               s.equals("微信") || s.equals("文件") || s.equals("群聊");
    }

    private static class MergedBlock 
    {
        String text;
        int minX;
        int minY;
        boolean isFile;
    }

    /**
     * 文件卡片折行无缝拼接处理
     * 例如微信卡片将长文件名分为两行：第一行 "9.30 8班辅导阅读理解（科"，第二行 "技发明类）.docx"
     * 或第一行 "Book2 Unit3高频词默"，第二行 "写.docx"
     */
    private static List<MergedBlock> mergeWrappedFileCards(List<TextBlock> blocks) 
    {
        List<MergedBlock> list = new ArrayList<>();
        Pattern fileExtPattern = Pattern.compile("(?i)^(.*?)\\s*[.,，。、]?\\s*(docx?|pdf|wps|xlsx?|pptx?)[.,，。、\\s]*$");

        for (int i = 0; i < blocks.size(); i++) 
        {
            TextBlock tb = blocks.get(i);
            String txt = tb.getText() != null ? tb.getText().trim() : "";
            int x = ChatLayoutSegmenter.getMinX(tb);
            int y = ChatLayoutSegmenter.getMinY(tb);

            Matcher m = fileExtPattern.matcher(txt);
            if (m.find()) 
            {
                String prefix = m.group(1).trim();
                String ext = m.group(2).toLowerCase();
                // 常见 OCR 混淆修复：如 "(2)" 误识为 "次"
                if ("次".equals(prefix)) 
                {
                    prefix = "（2）";
                }
                String fullFileName = (prefix.isEmpty() ? "" : prefix) + "." + ext;

                // 检查上一行（及前序折行）是否为文件名前半段
                // 微信文件卡片中的折行文字：垂直距离在 15~55 像素以内，水平左对齐偏差 <= 40px
                while (!list.isEmpty()) 
                {
                    MergedBlock prev = list.get(list.size() - 1);
                    int dy = y - prev.minY;
                    int dx = Math.abs(x - prev.minX);
                    if (dy > 0 && dy <= 55 && dx <= 40 && !prev.isFile 
                        && !fileExtPattern.matcher(prev.text).find()
                        && !isSystemOrNoiseText(prev.text)
                        && !isPrintCountInstruction(prev.text)) 
                    {
                        fullFileName = prev.text.trim() + fullFileName;
                        y = prev.minY;
                        list.remove(list.size() - 1);
                    } 
                    else 
                    {
                        break;
                    }
                }

                // 规整文件名：去除扩展名前的多余空格，如 "(S) .docx" -> "(S).docx"
                fullFileName = fullFileName.replaceAll("\\s+\\.", ".").trim();

                MergedBlock mb = new MergedBlock();
                mb.text = fullFileName;
                mb.minX = x;
                mb.minY = y;
                mb.isFile = true;
                list.add(mb);
            } 
            else 
            {
                // 排除常见的微信文件卡片元数据（如 "15.1K"、"26.0K"、"微信电脑版"、"W" 单字图标）
                if (txt.matches("(?i)^(?:\\d+(?:\\.\\d+)?\\s*(?:k|m|g|kb|mb|gb)|微信电脑版|微信手机版|电脑版|手机版|[wxp]|pdf)$")) 
                {
                    continue;
                }
                MergedBlock mb = new MergedBlock();
                mb.text = txt;
                mb.minX = x;
                mb.minY = y;
                mb.isFile = false;
                list.add(mb);
            }
        }
        return list;
    }

    private static boolean isSystemOrNoiseText(String text) 
    {
        if (StringUtils.isEmpty(text)) return true;
        String t = text.trim();
        // 时间戳
        if (t.matches("^(?:星期[一二三四五六日天]|\\d{1,2}:\\d{2}|\\d{4}年|昨天|前天).*")) return true;
        // 常见操作员/日常应答
        if (t.equals("好的") || t.equals("收到") || t.equals("印完了") || t.equals("印好了") || 
            t.equals("谢谢") || t.equals("谢谢！") || t.equals("谢谢!") || t.contains("撤回了一条消息")) 
        {
            return true;
        }
        return false;
    }

    private static boolean isPrintCountInstruction(String text) 
    {
        if (StringUtils.isEmpty(text)) return false;
        String t = text.trim();
        return t.matches("(?i).*(?:各(?:印|打)?|打|印|打印|帮忙印|帮忙打|需要)\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:份|分|张|本|套).*");
    }
}
