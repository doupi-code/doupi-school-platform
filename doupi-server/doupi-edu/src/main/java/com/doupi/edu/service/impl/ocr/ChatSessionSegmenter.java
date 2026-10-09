package com.doupi.edu.service.impl.ocr;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import com.doupi.common.utils.StringUtils;

/**
 * 微信文印会话轮次切分器 (ChatSessionSegmenter)
 * 将扁平的聊天消息流依据跨天日期分界与时间静默窗口（默认 8 分钟）切分为若干个独立的业务轮次 (PrintingTurn)。
 */
public class ChatSessionSegmenter 
{
    /** 同一业务轮次允许的最大静默间隔时间（分钟） */
    public static final long SESSION_SILENCE_THRESHOLD_MINUTES = 8;

    /**
     * 将对话上下文中的全部消息切分为若干个业务轮次
     */
    public static List<PrintingTurn> segment(ChatTopologyParser.ChatDialogContext ctx) 
    {
        List<PrintingTurn> turnList = new ArrayList<>();
        if (ctx == null || ctx.allMessages == null || ctx.allMessages.isEmpty()) 
        {
            return turnList;
        }

        PrintingTurn currentTurn = new PrintingTurn(0);
        LocalDateTime lastMsgTime = null;
        String lastDateSnippet = null;

        for (int i = 0; i < ctx.allMessages.size(); i++) 
        {
            ChatTopologyParser.ChatMessage m = ctx.allMessages.get(i);
            if (m == null || StringUtils.isEmpty(m.text)) continue;

            String text = m.text.trim();

            // 检查当前消息是否包含日期/时间戳信息
            LocalDateTime msgTime = parseMessageDateTime(text, lastMsgTime);
            String dateSnippet = extractDateSnippet(text);

            boolean isDateBoundary = false;
            boolean isTimeGapBoundary = false;

            // 1. 跨天分界检测（日期变化、SYSTEM 跨天系统通知、或星期切换）
            if (m.role == ChatTopologyParser.MessageRole.SYSTEM && 
                (text.matches("^(?:星期[一二三四五六日天]|周[一二三四五六日天]|昨天|前天|\\d{4}年|\\d{1,2}月).*"))) 
            {
                isDateBoundary = true;
            } 
            else if (dateSnippet != null && lastDateSnippet != null && !dateSnippet.equals(lastDateSnippet)) 
            {
                isDateBoundary = true;
            }
            else if (text.matches("^(?:星期[一二三四五六日天]|周[一二三四五六日天]|昨天|前天).*") && lastDateSnippet != null && !text.startsWith(lastDateSnippet)) 
            {
                isDateBoundary = true;
            }

            // 2. 静默时间差检测（相隔超过 20 分钟）
            if (msgTime != null && lastMsgTime != null) 
            {
                long diffMinutes = Math.abs(ChronoUnit.MINUTES.between(lastMsgTime, msgTime));
                if (diffMinutes > 20) 
                {
                    isTimeGapBoundary = true;
                }
            }

            boolean isFileMsg = m.isFile || (ctx.fileList != null && ctx.fileList.contains(text));

            // 切分新轮次规则：
            // A. 明确跨天分界（日期变动、昨天/前天/不同年月日）且当前轮次已有文件或消息，必须切分；
            // B. 时间静默超期：仅当【当前消息是新文件】时才切分新轮次！
            //    同日内的纯文字发言（没有新文件材料到达）绝不能切断前面的文件轮次，它是对前面文件的意图补充（如“单面打印，25 份”）！
            boolean shouldSplit = false;
            if (isDateBoundary && !currentTurn.getFiles().isEmpty()) 
            {
                shouldSplit = true;
            } 
            else if (isTimeGapBoundary && isFileMsg && !currentTurn.getFiles().isEmpty()) 
            {
                shouldSplit = true;
            }

            if (shouldSplit) 
            {
                turnList.add(currentTurn);
                currentTurn = new PrintingTurn(turnList.size());
            }

            // 更新最近的时间线状态
            if (dateSnippet != null) 
            {
                lastDateSnippet = dateSnippet;
            }
            if (msgTime != null) 
            {
                lastMsgTime = msgTime;
                if ("近期记录".equals(currentTurn.getTimeSnippet()) || currentTurn.getMessages().isEmpty()) 
                {
                    currentTurn.setTimeSnippet(extractFullTimeSnippet(text, lastDateSnippet));
                }
            }

            // 记录消息与文件
            currentTurn.getMessages().add(m);
            if (isFileMsg) 
            {
                currentTurn.getFiles().add(text);
            }
        }

        // 加入最后一个轮次
        if (!currentTurn.getFiles().isEmpty() || !currentTurn.getMessages().isEmpty()) 
        {
            turnList.add(currentTurn);
        }

        // 3. 孤立指令回填处理（Backfill）：
        // 若存在只有指令而无文件材料的轮次，自动将指令回填合并到前一个缺少指令的文件轮次中
        for (int i = 0; i < turnList.size(); i++) 
        {
            PrintingTurn t = turnList.get(i);
            if (t.getFiles().isEmpty() && !t.getMessages().isEmpty()) 
            {
                // 检查该轮次中是否包含打印份数或单双面指令
                TurnIntentResolver.resolve(t);
                if (t.getUnifiedCount() != null || t.getUnifiedSide() != null || t.getTurnRemark() != null) 
                {
                    // 向前寻找紧邻的有文件但缺少指令的轮次
                    for (int j = i - 1; j >= 0; j--) 
                    {
                        PrintingTurn prevTurn = turnList.get(j);
                        if (!prevTurn.getFiles().isEmpty()) 
                        {
                            if (prevTurn.getUnifiedCount() == null && t.getUnifiedCount() != null) 
                            {
                                prevTurn.setUnifiedCount(t.getUnifiedCount());
                            }
                            if (prevTurn.getUnifiedSide() == null && t.getUnifiedSide() != null) 
                            {
                                prevTurn.setUnifiedSide(t.getUnifiedSide());
                            }
                            if (prevTurn.getTurnRemark() == null && t.getTurnRemark() != null) 
                            {
                                prevTurn.setTurnRemark(t.getTurnRemark());
                            }
                            prevTurn.getMessages().addAll(t.getMessages());
                            break;
                        }
                    }
                }
            }
        }

        // 兜底保障：确保 ctx.fileList 中的每一个文件均被纳入至少一个轮次
        if (ctx.fileList != null && !ctx.fileList.isEmpty()) 
        {
            List<String> collectedFiles = new ArrayList<>();
            for (PrintingTurn t : turnList) 
            {
                collectedFiles.addAll(t.getFiles());
            }
            for (String f : ctx.fileList) 
            {
                if (!collectedFiles.contains(f)) 
                {
                    if (turnList.isEmpty()) 
                    {
                        PrintingTurn t = new PrintingTurn(0);
                        t.getFiles().add(f);
                        turnList.add(t);
                    } 
                    else 
                    {
                        turnList.get(turnList.size() - 1).getFiles().add(f);
                    }
                }
            }
        }

        return turnList;
    }

    /**
     * 从文本提取日期部分（如 "2026年09月15日" 或 "09月15日"）
     */
    public static String extractDateSnippet(String text) 
    {
        if (StringUtils.isEmpty(text)) return null;
        Matcher m1 = Pattern.compile("(\\d{4})[年/\\-\\.]\\s*(\\d{1,2})[月/\\-\\.]\\s*(\\d{1,2})[日号]?").matcher(text);
        if (m1.find()) 
        {
            return m1.group(1) + "-" + String.format("%02d-%02d", Integer.parseInt(m1.group(2)), Integer.parseInt(m1.group(3)));
        }
        Matcher m2 = Pattern.compile("(\\d{1,2})[月/\\-\\.]\\s*(\\d{1,2})[日号]?").matcher(text);
        if (m2.find()) 
        {
            return String.format("%02d-%02d", Integer.parseInt(m2.group(1)), Integer.parseInt(m2.group(2)));
        }
        Matcher mWeek = Pattern.compile("^(?:星期[一二三四五六日天]|周[一二三四五六日天])").matcher(text);
        if (mWeek.find()) 
        {
            return mWeek.group(0);
        }
        if (text.startsWith("昨天") || text.startsWith("前天") || text.startsWith("今天")) 
        {
            return text.substring(0, 2);
        }
        return null;
    }

    /**
     * 从单条消息文本解析时间点（结合前序已知日期）
     */
    public static LocalDateTime parseMessageDateTime(String text, LocalDateTime fallbackDate) 
    {
        if (StringUtils.isEmpty(text)) return null;

        // 包含年月日与时分：2026年09月15日 16:08
        Matcher mFull = Pattern.compile("(\\d{4})[年/\\-\\.]\\s*(\\d{1,2})[月/\\-\\.]\\s*(\\d{1,2})[日号]?\\s*(?:上午|下午|中午|凌晨|晚上)?\\s*(\\d{1,2}):(\\d{1,2})").matcher(text);
        if (mFull.find()) 
        {
            try 
            {
                int year = Integer.parseInt(mFull.group(1));
                int month = Integer.parseInt(mFull.group(2));
                int day = Integer.parseInt(mFull.group(3));
                int hour = Integer.parseInt(mFull.group(4));
                int minute = Integer.parseInt(mFull.group(5));
                if (text.contains("下午") || text.contains("晚上")) 
                {
                    if (hour < 12) hour += 12;
                }
                return LocalDateTime.of(year, month, day, hour, minute);
            } 
            catch (Exception ignored) {}
        }

        // 包含月日与时分：09月15日 16:08
        Matcher mMonth = Pattern.compile("(\\d{1,2})[月/\\-\\.]\\s*(\\d{1,2})[日号]?\\s*(?:上午|下午|中午|凌晨|晚上)?\\s*(\\d{1,2}):(\\d{1,2})").matcher(text);
        if (mMonth.find()) 
        {
            try 
            {
                int year = fallbackDate != null ? fallbackDate.getYear() : 2026;
                int month = Integer.parseInt(mMonth.group(1));
                int day = Integer.parseInt(mMonth.group(2));
                int hour = Integer.parseInt(mMonth.group(3));
                int minute = Integer.parseInt(mMonth.group(4));
                if (text.contains("下午") || text.contains("晚上")) 
                {
                    if (hour < 12) hour += 12;
                }
                return LocalDateTime.of(year, month, day, hour, minute);
            } 
            catch (Exception ignored) {}
        }

        // 纯时分或带星期/相对日期的时分：星期三 11:03、14:40
        Matcher mTime = Pattern.compile("(?:(?:星期[一二三四五六日天]|周[一二三四五六日天]|昨天|前天|今天)?\\s*)?(?:上午|下午|中午|凌晨|晚上)?\\s*(\\d{1,2}):(\\d{1,2})").matcher(text);
        if (mTime.find() && text.matches("^(?:星期[一二三四五六日天]|周[一二三四五六日天]|昨天|前天|今天)?\\s*(?:上午|下午|中午|凌晨|晚上)?\\s*\\d{1,2}:\\d{2}$")) 
        {
            try 
            {
                int hour = Integer.parseInt(mTime.group(1));
                int minute = Integer.parseInt(mTime.group(2));
                if (text.contains("下午") || text.contains("晚上")) 
                {
                    if (hour < 12) hour += 12;
                }
                if (fallbackDate != null) 
                {
                    return LocalDateTime.of(fallbackDate.getYear(), fallbackDate.getMonthValue(), fallbackDate.getDayOfMonth(), hour, minute);
                } 
                else 
                {
                    return LocalDateTime.of(2026, 1, 1, hour, minute);
                }
            } 
            catch (Exception ignored) {}
        }

        return null;
    }

    /**
     * 组装最完整的时间展示文本（例如 "2026年09月15日 16:08"）
     */
    private static String extractFullTimeSnippet(String text, String lastDateSnippet) 
    {
        if (StringUtils.isEmpty(text)) return "近期记录";
        if (text.matches(".*\\d{4}年.*\\d{1,2}:\\d{2}.*") || text.matches(".*\\d{1,2}月.*\\d{1,2}:\\d{2}.*")) 
        {
            return text.trim();
        }
        if (text.matches(".*\\d{1,2}:\\d{2}.*") && lastDateSnippet != null) 
        {
            return lastDateSnippet + " " + text.trim();
        }
        return text.trim();
    }
}
