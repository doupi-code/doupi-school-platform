package com.doupi.edu.service.impl.ocr;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.doupi.common.utils.StringUtils;

/**
 * 业务会话轮次意图解析器 (TurnIntentResolver)
 * 负责在单个业务轮次内部，精准解析各文件的印刷份数、单双面与装订特殊要求备注。
 */
public class TurnIntentResolver 
{
    /**
     * 解析并填充单个业务轮次的文印意图
     */
    public static void resolve(PrintingTurn turn) 
    {
        if (turn == null || turn.getFiles().isEmpty()) 
        {
            return;
        }

        List<ChatTopologyParser.ChatMessage> msgs = turn.getMessages();
        List<String> files = turn.getFiles();

        // 1. 过滤识别轮内有效非噪音发言（排除纯问询“印了吗”、纯礼貌用语“好的/谢谢”）
        List<ChatTopologyParser.ChatMessage> intentMsgs = new ArrayList<>();
        List<Long> countDirectives = new ArrayList<>();
        boolean hasEachKeyword = false;

        for (ChatTopologyParser.ChatMessage m : msgs) 
        {
            if (m.isFile) continue;
            if (isConversationalNoise(m.text)) continue;
            intentMsgs.add(m);

            Long cnt = parsePrintCount(m.text);
            if (cnt != null && cnt > 0) 
            {
                countDirectives.add(cnt);
                if (m.text != null && m.text.contains("各")) 
                {
                    hasEachKeyword = true;
                }
            }
        }

        // 2. 装订特殊备注统一汇总提取
        StringBuilder remarkBuilder = new StringBuilder();
        String unifiedSide = null;
        for (ChatTopologyParser.ChatMessage m : intentMsgs) 
        {
            String side = parsePrintSide(m.text);
            if (side != null) 
            {
                unifiedSide = side;
            }

            String remark = extractSpecialRemark(m.text);
            if (StringUtils.isNotEmpty(remark)) 
            {
                if (remarkBuilder.length() > 0) remarkBuilder.append("；");
                remarkBuilder.append(remark);
            }
        }
        if (unifiedSide != null) 
        {
            turn.setUnifiedSide(unifiedSide);
        }
        if (remarkBuilder.length() > 0) 
        {
            turn.setTurnRemark(remarkBuilder.toString());
        }

        // 3. 份数解析策略：
        // 策略 A：轮内只有一个指令（例如老师发了几个文件，统一只说了一句“请单面打印25 份”），
        // 或者出现了“各打/各印XX份”，或者轮内仅有1个文件：
        // 此时判定为【整轮批量统一定义】，全轮共享此统一份数！
        if (countDirectives.size() == 1 || hasEachKeyword || files.size() == 1) 
        {
            if (!countDirectives.isEmpty()) 
            {
                turn.setUnifiedCount(countDirectives.get(0));
            }
        } 
        else if (countDirectives.size() > 1) 
        {
            // 策略 B：轮内出现多条不同的份数指令，且有多个文件，触发【局部子配对】
            resolveSubPairings(turn, msgs);
        }
    }

    /**
     * 解析局部子配对：
     * 涵盖：先说“这个印200份”，紧接着发文件A；或者发了文件B，紧接着说“这个打20份”
     */
    private static void resolveSubPairings(PrintingTurn turn, List<ChatTopologyParser.ChatMessage> msgs) 
    {
        for (int i = 0; i < msgs.size(); i++) 
        {
            ChatTopologyParser.ChatMessage m = msgs.get(i);
            if (!m.isFile) continue;

            String currentFile = m.text;

            // 检查紧前发言（i - 1 是否明确指定了该文件份数）
            if (i > 0) 
            {
                ChatTopologyParser.ChatMessage prev = msgs.get(i - 1);
                if (!prev.isFile && !isConversationalNoise(prev.text)) 
                {
                    Long cnt = parsePrintCount(prev.text);
                    if (cnt != null && cnt > 0) 
                    {
                        turn.getFileCountMap().put(currentFile, cnt);
                    }
                    String side = parsePrintSide(prev.text);
                    if (side != null) 
                    {
                        turn.getFileSideMap().put(currentFile, side);
                    }
                    String rem = extractSpecialRemark(prev.text);
                    if (StringUtils.isNotEmpty(rem)) 
                    {
                        turn.getFileRemarkMap().put(currentFile, rem);
                    }
                }
            }

            // 检查紧后发言（若紧前未指定，且 i + 1 是否明确指定了该文件份数）
            if (!turn.getFileCountMap().containsKey(currentFile) && i + 1 < msgs.size()) 
            {
                ChatTopologyParser.ChatMessage next = msgs.get(i + 1);
                if (!next.isFile && !isConversationalNoise(next.text)) 
                {
                    Long cnt = parsePrintCount(next.text);
                    if (cnt != null && cnt > 0) 
                    {
                        turn.getFileCountMap().put(currentFile, cnt);
                    }
                    String side = parsePrintSide(next.text);
                    if (side != null) 
                    {
                        turn.getFileSideMap().put(currentFile, side);
                    }
                    String rem = extractSpecialRemark(next.text);
                    if (StringUtils.isNotEmpty(rem)) 
                    {
                        turn.getFileRemarkMap().put(currentFile, rem);
                    }
                }
            }
        }
    }

    /**
     * 判断某条消息是否为闲聊问询或确认噪音（如“上面那个20份印了吗？”、“好的谢谢”、“收到”）
     */
    public static boolean isConversationalNoise(String text) 
    {
        if (StringUtils.isEmpty(text)) return true;
        String t = text.trim();

        // 包含反问、追问语气的疑问句（如“印了吗”、“印好没”、“打了吗”、“好了没”）
        if (t.matches(".*(?:印了吗|打了吗|印好没|打好没|好了吗|做好了吗|出来了吗|可以了吗|印好没有|打好没有|吗[？?]?)$")) 
        {
            return true;
        }

        // 纯礼貌、确认回复
        if (t.matches("^(?:好的|收到|谢谢|好的谢谢|辛苦了|麻烦了|ok|OK|好的！|谢谢！|感谢|好嘞|明白|收到！|多谢)$")) 
        {
            return true;
        }

        return false;
    }

    /**
     * 从单条文本精准提取印刷份数
     */
    public static Long parsePrintCount(String text) 
    {
        if (StringUtils.isEmpty(text)) return null;
        String t = text.trim();

        // 排除时间戳、日期、问询等
        if (t.matches("^(?:\\d{4}年|\\d{1,2}:\\d{2}|\\d{1,2}点|星期[一二三四五六日天]|昨天|前天).*")) 
        {
            return null;
        }
        if (isConversationalNoise(t)) 
        {
            return null;
        }

        // 模式 1：明确带“份”字或错别字“分”（排除“分析/分类/分数/分配”等）
        Pattern p1 = Pattern.compile("(?i)(?:请|麻烦|烦请|帮我|帮忙)?\\s*(?:单面|双面|正反面)?\\s*(?:这个|这些|上面|这)?(?:又|再)?(?:各(?:印|打)?|打|印|打印|帮忙印|帮忙打|帮我印|帮我打|需要|要|打算|共|共计)?\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:份|分(?!析|数|配|工|辨|类|量|期|块|钱|钟))");
        Matcher m1 = p1.matcher(t);
        if (m1.find()) 
        {
            return parseNumberString(m1.group(1));
        }

        // 模式 2：明确带有动词打/印的简略句（如“打25”、“印6”、“打30张”、“印50本”）
        Pattern p2 = Pattern.compile("(?i)(?:请|麻烦|帮我|帮忙)?\\s*(?:单面|双面)?\\s*(?:又|再)?(?:各(?:印|打)|打印|打|印|印制)\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)(?:\\s*(?:张|本|套))?");
        Matcher m2 = p2.matcher(t);
        if (m2.find()) 
        {
            return parseNumberString(m2.group(1));
        }

        // 模式 3：直接带份数的简短词汇（如 "25 份"、"9份"、"40份"）
        Pattern p3 = Pattern.compile("(?i)(?:^|[^0-9])([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:份|分(?!析|数|配|工|辨|类|量|期|块|钱|钟))(?:$|[^0-9])");
        Matcher m3 = p3.matcher(t);
        if (m3.find()) 
        {
            return parseNumberString(m3.group(1));
        }

        // 模式 4：整行仅有纯数字与礼貌标点（如 "40"、"40。谢谢！"）
        Pattern p4 = Pattern.compile("(?i)^\\s*([0-9O]{1,5}|[一二两三四五六七八九十百]+)\\s*(?:[。！!，,\\s]|谢谢)*$");
        Matcher m4 = p4.matcher(t);
        if (m4.find()) 
        {
            return parseNumberString(m4.group(1));
        }

        return null;
    }

    /**
     * 从文本提取单双面设置（"1" 单面，"2" 双面）
     */
    public static String parsePrintSide(String text) 
    {
        if (StringUtils.isEmpty(text)) return null;
        if (text.contains("双面") || text.contains("双页") || text.contains("两面") || text.contains("正反面")) 
        {
            return "2";
        } 
        else if (text.contains("单面") || text.contains("单页")) 
        {
            return "1";
        }
        return null;
    }

    /**
     * 提取特殊装订与排版备注说明（例如：“不要把答案解析与题目印在一页，第5页为单面”、“骑马钉”、“加封面”）
     */
    public static String extractSpecialRemark(String text) 
    {
        if (StringUtils.isEmpty(text)) return "";
        String t = text.trim();

        // 若整行纯粹由单双面、打印动作、份数及标点组成（例如“单面打印，25 份”、“请双面印50份”、“打25份”），不属于特殊排版装订备注
        String testPure = t.replaceAll("(?i)[请麻烦烦请帮忙帮我打印单面双面正反面两面单页双页份分张本套各、，,。!！\\s\\d一二两三四五六七八九十百]+", "").trim();
        if (testPure.isEmpty()) 
        {
            return "";
        }

        // 剥离常见的份数开头（例如 "45份，不要把答案..." -> 提取 "不要把答案解析与题目印在一页，第5页为单面"）
        String stripped = t.replaceAll("(?i)^\\s*(?:请|麻烦|烦请|帮忙)?\\s*(?:单面|双面|正反面)?\\s*(?:打|印|打印)?\\s*[,，、\\s]*\\d{1,5}\\s*(?:份|分|张|本|套)?\\s*[,，。、\\s]*", "").trim();

        if (stripped.length() >= 3 && !isConversationalNoise(stripped)) 
        {
            if (stripped.contains("不要") || stripped.contains("装订") || stripped.contains("钉") 
                || stripped.contains("答案") || stripped.contains("封面")
                || stripped.contains("胶装") || stripped.contains("彩印") || stripped.contains("横向")) 
            {
                return stripped;
            }
        }
        return "";
    }

    /**
     * 中文数字与英文字母O容错转数字
     */
    public static Long parseNumberString(String numStr) 
    {
        if (StringUtils.isEmpty(numStr)) return null;
        String s = numStr.trim().replace('O', '0').replace('o', '0');
        try 
        {
            return Long.parseLong(s);
        } 
        catch (NumberFormatException ignored) {}

        if ("一".equals(s)) return 1L;
        if ("二".equals(s) || "两".equals(s)) return 2L;
        if ("三".equals(s)) return 3L;
        if ("四".equals(s)) return 4L;
        if ("五".equals(s)) return 5L;
        if ("六".equals(s)) return 6L;
        if ("七".equals(s)) return 7L;
        if ("八".equals(s)) return 8L;
        if ("九".equals(s)) return 9L;
        if ("十".equals(s)) return 10L;

        if (s.startsWith("十") && s.length() == 2) 
        {
            Long sub = parseNumberString(s.substring(1));
            return sub != null ? (10L + sub) : 10L;
        }

        return null;
    }
}
