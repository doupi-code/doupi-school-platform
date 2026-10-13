package com.doupi.edu.service.impl.ocr;

import com.doupi.edu.domain.dto.EduPrintOcrResult;
import com.doupi.edu.domain.dto.EduPrintOcrResult.PrintTaskItem;
import com.doupi.edu.domain.dto.EduPrintOcrResult.SourceMessage;
import com.doupi.edu.domain.dto.WechatStructuredParseRequest;
import com.doupi.edu.domain.dto.WechatStructuredParseRequest.ConversationItem;
import com.doupi.edu.domain.dto.WechatStructuredParseRequest.MessageItem;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 微信导出目录结构化消息解析器
 * <ul>
 *   <li>各会话独立解析，按时间及原始顺序排列，避免不同联系人之间误关联</li>
 *   <li>文件消息使用 contentData.title 作为原文件名，通过 exportMediaUrl 精确匹配目录内附件</li>
 *   <li>只为包含材料或打印需求的消息生成候选，普通闲聊及非文本/文件消息留作上下文</li>
 * </ul>
 */
public final class WechatExportStructuredParser
{
    private WechatExportStructuredParser() {}

    private static final Pattern DATE_PREFIX_PATTERN = Pattern.compile("^\\s*(\\d{4})[年/.-]\\s*(\\d{1,2})[月/.-]\\s*(\\d{1,2})(?:[日号])?(?:\\s+(\\d{1,2}):(\\d{1,2})(?::(\\d{1,2}))?)?");
    private static final DateTimeFormatter STANDARD_DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    /**
     * 安全提取 messages.js 中的 JSON 载荷，不执行任何脚本
     */
    public static String extractJsonFromMessagesJs(String rawJs)
    {
        if (rawJs == null)
        {
            return "";
        }
        String trimmed = rawJs.trim();
        if (!trimmed.isEmpty() && trimmed.charAt(0) == '\uFEFF')
        {
            trimmed = trimmed.substring(1).trim();
        }
        Matcher m = Pattern.compile("^(?:window\\.)?__WECHAT_EXPORT__\\s*=\\s*([\\s\\S]*)$").matcher(trimmed);
        if (m.find())
        {
            trimmed = m.group(1).trim();
        }
        if (trimmed.endsWith(";"))
        {
            trimmed = trimmed.substring(0, trimmed.length() - 1).trim();
        }
        return trimmed;
    }

    public static EduPrintOcrResult parse(WechatStructuredParseRequest request)
    {
        EduPrintOcrResult combined = new EduPrintOcrResult();
        if (request == null)
        {
            combined.setSuccess(false);
            combined.setMsg("未提供结构化聊天消息");
            combined.setTaskList(new ArrayList<>());
            combined.setMessages(new ArrayList<>());
            return combined;
        }

        List<ConversationItem> conversations = normalizeConversations(request);
        LocalDate startFilter = parseLocalDate(request.getStartDate());
        LocalDate endFilter = parseLocalDate(request.getEndDate());

        List<SourceMessage> allMessages = new ArrayList<>();
        List<PrintTaskItem> allTasks = new ArrayList<>();
        StringBuilder allRawText = new StringBuilder();
        int globalMsgCounter = 0;

        for (int convIdx = 0; convIdx < conversations.size(); convIdx++)
        {
            ConversationItem conv = conversations.get(convIdx);
            if (conv == null || conv.getMessages() == null || conv.getMessages().isEmpty())
            {
                continue;
            }
            String convId = firstNonBlank(conv.getConversationId(), "conv-" + convIdx);
            String convName = firstNonBlank(conv.getConversationName(), convId);
            String convFolder = conv.getFolder();

            // 1. 包装并按日期筛选、按时间及原始顺序稳定排序
            List<IndexedMessage> indexedList = new ArrayList<>();
            for (int i = 0; i < conv.getMessages().size(); i++)
            {
                MessageItem item = conv.getMessages().get(i);
                if (item == null)
                {
                    continue;
                }
                Long epochSec = resolveEpochSeconds(item);
                String formattedTime = resolveFormattedTime(item, epochSec);
                LocalDate msgDate = extractLocalDate(formattedTime, epochSec);
                if (startFilter != null && msgDate != null && msgDate.isBefore(startFilter))
                {
                    continue;
                }
                if (endFilter != null && msgDate != null && msgDate.isAfter(endFilter))
                {
                    continue;
                }
                indexedList.add(new IndexedMessage(i, epochSec, formattedTime, msgDate, item));
            }

            if (indexedList.isEmpty())
            {
                continue;
            }

            indexedList.sort(Comparator
                    .comparing((IndexedMessage im) -> im.sortEpoch != null ? im.sortEpoch : Long.MAX_VALUE)
                    .thenComparingInt(im -> im.originalIndex));

            // 判断会话中是否存在对方发送的消息（区分普通联系人会话与“文件传输助手”自发自收会话）
            boolean hasNonSenderMessages = indexedList.stream()
                    .anyMatch(im -> !Boolean.TRUE.equals(im.item.getIsSender()) && !"assistant".equalsIgnoreCase(im.item.getFrom()));

            // 统计同一天内发送方“我”是否发送了文件（若未发文件且在他人会话中，“我”的纯文字属于经办人回复）
            Set<String> operatorFileDays = new HashSet<>();
            for (IndexedMessage im : indexedList)
            {
                if (isOperatorMessage(im.item) && isFileType(im.item.getType()))
                {
                    String dayKey = im.msgDate != null ? im.msgDate.toString() : "";
                    operatorFileDays.add(dayKey);
                }
            }

            Set<String> usedRawIds = new HashSet<>();

            List<SourceMessage> convMessages = new ArrayList<>();
            StringBuilder convTextBuilder = new StringBuilder();

            for (int localOrder = 0; localOrder < indexedList.size(); localOrder++)
            {
                IndexedMessage im = indexedList.get(localOrder);
                MessageItem item = im.item;

                SourceMessage sm = new SourceMessage();
                sm.setOrder(localOrder);
                sm.setId("m" + (globalMsgCounter++));
                sm.setConversationId(convId);
                sm.setConversationName(convName);

                String rawId = buildStableMessageId(item, im.sortEpoch, im.originalIndex, usedRawIds);
                sm.setRawMessageId(rawId);

                boolean isOp = isOperatorMessage(item);
                String sender = firstNonBlank(item.getSenderName(), item.getName());
                if (sender == null)
                {
                    sender = isOp ? "我" : convName;
                }
                else if (!isOp && "我".equals(sender) && convName != null && !"文件传输助手".equals(convName))
                {
                    sender = convName;
                }
                sm.setSender(sender);
                sm.setTime(im.formattedTime);

                String rawType = item.getType() != null ? item.getType().trim() : "";
                String msgFolder = firstNonBlank(item.getFolder(), convFolder);
                String dayKey = im.msgDate != null ? im.msgDate.toString() : "";

                if (isFileType(rawType))
                {
                    // 在普通联系人会话中，如果“我”（经办人）主动发给老师的文件，且不是“文件传输助手”，仅在是老师发来或自发自收时作为待印材料；
                    // 但若测试或用户未标记 isSender（null/false），或属于文件传输助手，则正常作为 file
                    String title = resolveFileTitle(item);
                    sm.setFileName(title);
                    sm.setText("[文件] " + (title != null ? title : ""));

                    String mediaUrl = item.getExportMediaUrl() != null ? item.getExportMediaUrl().trim() : null;
                    sm.setExportMediaUrl(mediaUrl);

                    String relPath = item.getAttachmentRelativePath();
                    if ((relPath == null || relPath.isBlank()) && mediaUrl != null && !mediaUrl.isBlank())
                    {
                        relPath = (msgFolder != null && !msgFolder.isBlank())
                                ? normalizePath(msgFolder) + "/" + normalizePath(mediaUrl)
                                : normalizePath(mediaUrl);
                    }
                    sm.setAttachmentRelativePath(relPath);
                    sm.setExportMediaError(item.getExportMediaError());

                    boolean missing = Boolean.TRUE.equals(item.getAttachmentMissing())
                            || mediaUrl == null || mediaUrl.isBlank()
                            || (item.getExportMediaError() != null && !item.getExportMediaError().isBlank());
                    sm.setAttachmentMissing(missing);
                    sm.setType("file");
                }
                else if (isQuoteType(rawType))
                {
                    String quoteText = resolveQuoteText(item);
                    if (quoteText == null || quoteText.isBlank())
                    {
                        sm.setType("context");
                        sm.setText("[引用消息]");
                    }
                    else
                    {
                        boolean treatAsOperator = isOp && hasNonSenderMessages && !operatorFileDays.contains(dayKey);
                        sm.setType(treatAsOperator ? "operator" : "text");
                        sm.setText(quoteText);
                    }
                }
                else if ("operator".equalsIgnoreCase(rawType))
                {
                    sm.setType("operator");
                    sm.setText(item.getContent() != null ? item.getContent().trim() : "");
                }
                else if (isPlainTextType(rawType))
                {
                    String content = item.getContent() != null ? item.getContent().trim() : "";
                    boolean treatAsOperator = isOp && hasNonSenderMessages && !operatorFileDays.contains(dayKey);
                    sm.setType(treatAsOperator ? "operator" : "text");
                    sm.setText(content);
                }
                else
                {
                    sm.setType("context");
                    String content = item.getContent() != null && !item.getContent().isBlank()
                            ? item.getContent().trim()
                            : "[" + rawType + "]";
                    sm.setText(content);
                }

                convMessages.add(sm);
                if (!convTextBuilder.isEmpty())
                {
                    convTextBuilder.append('\n');
                }
                convTextBuilder.append(sm.getSender() != null ? sm.getSender() : "")
                        .append(' ')
                        .append(sm.getTime() != null ? sm.getTime() : "")
                        .append('\n')
                        .append(sm.getText() != null ? sm.getText() : "");
            }

            // 2. 独立调用现有文印需求解析器
            String convRawText = convTextBuilder.toString();
            EduPrintOcrResult convResult = ChatPrefillParser.parse(convRawText, convMessages);

            for (SourceMessage sm : convMessages)
            {
                sm.setOrder(allMessages.size());
                allMessages.add(sm);
            }

            if (convResult.getTaskList() != null)
            {
                for (PrintTaskItem task : convResult.getTaskList())
                {
                    if (task.getSourceConversationId() == null)
                    {
                        task.setSourceConversationId(convId);
                    }
                    if (task.getSourceConversationName() == null)
                    {
                        task.setSourceConversationName(convName);
                    }
                    if ((task.getSender() == null || task.getSender().isBlank() || "我".equals(task.getSender()))
                            && convName != null && !"文件传输助手".equals(convName))
                    {
                        task.setSender(convName);
                    }
                    allTasks.add(task);
                }
            }

            if (!convRawText.isBlank())
            {
                if (!allRawText.isEmpty())
                {
                    allRawText.append("\n\n");
                }
                allRawText.append(convRawText);
            }
        }

        combined.setRawText(allRawText.toString());
        combined.setMessages(allMessages);
        combined.setTaskList(allTasks);
        combined.setFirstUnregisteredIndex(0);
        if (!allTasks.isEmpty())
        {
            PrintTaskItem first = allTasks.get(0);
            combined.setPrintName(first.getPrintName());
            combined.setPrintCount(first.getPrintCount());
            combined.setPageCount(first.getPageCount());
            combined.setPrintSide(first.getPrintSide());
            combined.setPaperType(first.getPaperType());
            combined.setTimeSnippet(first.getTimeSnippet());
        }
        combined.setDocumentList(allTasks.stream().map(PrintTaskItem::getOriginalDocName).filter(Objects::nonNull).toList());
        combined.setSuccess(!allTasks.isEmpty());
        combined.setMsg(allTasks.isEmpty() ? "未发现打印需求或材料" : "请对照当天聊天逐条核对，未知信息已留空");
        return combined;
    }

    private static List<ConversationItem> normalizeConversations(WechatStructuredParseRequest request)
    {
        List<ConversationItem> list = new ArrayList<>();
        if (request.getConversations() != null)
        {
            list.addAll(request.getConversations());
        }
        if (request.getMessages() != null && !request.getMessages().isEmpty())
        {
            Map<String, ConversationItem> grouped = new LinkedHashMap<>();
            for (MessageItem m : request.getMessages())
            {
                if (m == null)
                {
                    continue;
                }
                String cid = firstNonBlank(m.getConversationId(), m.getExportConversationId(), "default-conv");
                String cname = firstNonBlank(m.getConversationName(), m.getExportConversationName(), m.getSenderName(), m.getName(), cid);
                ConversationItem conv = grouped.computeIfAbsent(cid, k -> {
                    ConversationItem c = new ConversationItem();
                    c.setConversationId(cid);
                    c.setConversationName(cname);
                    c.setFolder(m.getFolder());
                    c.setMessages(new ArrayList<>());
                    return c;
                });
                if (conv.getFolder() == null && m.getFolder() != null)
                {
                    conv.setFolder(m.getFolder());
                }
                conv.getMessages().add(m);
            }
            list.addAll(grouped.values());
        }
        return list;
    }

    /**
     * 生成与导入日期范围无关的稳定消息标识：
     * 始终基于消息自身属性（id + serverId / 秒级时间戳 / 时间字符串）生成唯一标识，
     * 不依赖当前导入批次内是否出现重复 id，确保“先导入单日、再导入全量历史”得到完全一致的标识，
     * 同时避免不同日期但 localId 相同的消息被误判为已登记。
     */
    public static String buildStableMessageId(MessageItem item, Long epochSec, int fallbackIndex, Set<String> usedRawIds)
    {
        String baseId = firstNonBlank(item.getId(), item.getServerId(), "idx-" + (fallbackIndex + 1));
        String serverId = item.getServerId() != null ? item.getServerId().trim() : null;
        Long resolvedEpoch = epochSec != null ? epochSec : resolveEpochSeconds(item);
        String candidate;
        if (serverId != null && !serverId.isEmpty() && !"0".equals(serverId))
        {
            candidate = baseId.equals(serverId) ? serverId : (baseId + ":" + serverId);
        }
        else if (resolvedEpoch != null && resolvedEpoch > 0)
        {
            candidate = baseId + ":" + resolvedEpoch;
        }
        else if (item.getDatetime() != null && !item.getDatetime().isBlank())
        {
            candidate = baseId + ":" + item.getDatetime().trim();
        }
        else if (item.getTimeStr() != null && !item.getTimeStr().isBlank())
        {
            candidate = baseId + ":" + item.getTimeStr().trim();
        }
        else
        {
            candidate = baseId;
        }

        if (usedRawIds != null)
        {
            if (usedRawIds.contains(candidate))
            {
                String mediaDisambiguator = item.getExportMediaUrl() != null && !item.getExportMediaUrl().isBlank()
                        ? normalizePath(item.getExportMediaUrl())
                        : String.valueOf(fallbackIndex + 1);
                candidate = candidate + "#" + mediaDisambiguator;
            }
            int dupSeq = 2;
            String baseCandidate = candidate;
            while (usedRawIds.contains(candidate))
            {
                candidate = baseCandidate + "#" + (dupSeq++);
            }
            usedRawIds.add(candidate);
        }
        return candidate;
    }

    private static boolean isOperatorMessage(MessageItem item)
    {
        if (Boolean.TRUE.equals(item.getIsSender()))
        {
            return true;
        }
        if ("assistant".equalsIgnoreCase(item.getFrom()))
        {
            return true;
        }
        return "operator".equalsIgnoreCase(item.getType());
    }

    private static boolean isFileType(String rawType)
    {
        return "文件".equals(rawType) || "file".equalsIgnoreCase(rawType);
    }

    private static boolean isQuoteType(String rawType)
    {
        return "引用消息".equals(rawType) || "quote".equalsIgnoreCase(rawType);
    }

    private static boolean isPlainTextType(String rawType)
    {
        return rawType == null || rawType.isBlank() || "普通文本".equals(rawType) || "文本".equals(rawType) || "text".equalsIgnoreCase(rawType);
    }

    private static String resolveFileTitle(MessageItem item)
    {
        String title = item.getFileTitle();
        if ((title == null || title.isBlank()) && item.getContentData() != null)
        {
            title = item.getContentData().getTitle();
        }
        if (title == null || title.isBlank())
        {
            title = item.getContent();
        }
        return title != null ? title.trim() : "未命名文件";
    }

    private static String resolveQuoteText(MessageItem item)
    {
        String text = item.getContent();
        if (text == null || text.isBlank())
        {
            text = item.getQuoteContent();
        }
        if ((text == null || text.isBlank()) && item.getContentData() != null)
        {
            text = firstNonBlank(item.getContentData().getContent(), item.getContentData().getTitle());
        }
        if (text == null || text.isBlank())
        {
            text = item.getFileTitle();
        }
        return text != null ? text.trim() : "";
    }

    private static Long resolveEpochSeconds(MessageItem item)
    {
        Long ts = item.getTimestamp() != null ? item.getTimestamp() : item.getCreateTime();
        if (ts != null && ts > 0)
        {
            // 兼容毫秒时间戳与秒级时间戳
            return ts > 10_000_000_000L ? ts / 1000L : ts;
        }
        String dtStr = firstNonBlank(item.getDatetime(), item.getTimeStr());
        if (dtStr != null)
        {
            Matcher m = DATE_PREFIX_PATTERN.matcher(dtStr);
            if (m.find())
            {
                try
                {
                    int year = Integer.parseInt(m.group(1));
                    int month = Integer.parseInt(m.group(2));
                    int day = Integer.parseInt(m.group(3));
                    int hour = m.group(4) != null ? Integer.parseInt(m.group(4)) : 0;
                    int minute = m.group(5) != null ? Integer.parseInt(m.group(5)) : 0;
                    int second = m.group(6) != null ? Integer.parseInt(m.group(6)) : 0;
                    LocalDateTime ldt = LocalDateTime.of(year, month, day, hour, minute, second);
                    return ldt.atZone(ZoneId.systemDefault()).toEpochSecond();
                }
                catch (Exception ignored) {}
            }
        }
        return null;
    }

    private static String resolveFormattedTime(MessageItem item, Long epochSec)
    {
        String raw = firstNonBlank(item.getDatetime(), item.getTimeStr());
        if (raw != null)
        {
            Matcher m = DATE_PREFIX_PATTERN.matcher(raw);
            if (m.find())
            {
                try
                {
                    int year = Integer.parseInt(m.group(1));
                    int month = Integer.parseInt(m.group(2));
                    int day = Integer.parseInt(m.group(3));
                    int hour = m.group(4) != null ? Integer.parseInt(m.group(4)) : 0;
                    int minute = m.group(5) != null ? Integer.parseInt(m.group(5)) : 0;
                    int second = m.group(6) != null ? Integer.parseInt(m.group(6)) : 0;
                    if (m.group(4) != null)
                    {
                        return String.format("%04d-%02d-%02d %02d:%02d:%02d", year, month, day, hour, minute, second);
                    }
                    return String.format("%04d-%02d-%02d", year, month, day);
                }
                catch (Exception ignored) {}
            }
            return raw.trim();
        }
        if (epochSec != null && epochSec > 0)
        {
            LocalDateTime ldt = LocalDateTime.ofInstant(Instant.ofEpochSecond(epochSec), ZoneId.systemDefault());
            return STANDARD_DT_FMT.format(ldt);
        }
        return null;
    }

    private static LocalDate extractLocalDate(String formattedTime, Long epochSec)
    {
        if (formattedTime != null)
        {
            Matcher m = DATE_PREFIX_PATTERN.matcher(formattedTime);
            if (m.find())
            {
                try
                {
                    return LocalDate.of(
                            Integer.parseInt(m.group(1)),
                            Integer.parseInt(m.group(2)),
                            Integer.parseInt(m.group(3))
                    );
                }
                catch (Exception ignored) {}
            }
        }
        if (epochSec != null && epochSec > 0)
        {
            return Instant.ofEpochSecond(epochSec).atZone(ZoneId.systemDefault()).toLocalDate();
        }
        return null;
    }

    private static LocalDate parseLocalDate(String dateStr)
    {
        if (dateStr == null || dateStr.isBlank())
        {
            return null;
        }
        return extractLocalDate(dateStr.trim(), null);
    }

    private static String normalizePath(String path)
    {
        if (path == null)
        {
            return "";
        }
        String normalized = path.replace('\\', '/').trim();
        while (normalized.startsWith("/"))
        {
            normalized = normalized.substring(1);
        }
        while (normalized.endsWith("/"))
        {
            normalized = normalized.substring(0, normalized.length() - 1);
        }
        return normalized;
    }

    private static String firstNonBlank(String... values)
    {
        if (values == null)
        {
            return null;
        }
        for (String v : values)
        {
            if (v != null && !v.isBlank())
            {
                return v.trim();
            }
        }
        return null;
    }

    private static class IndexedMessage
    {
        final int originalIndex;
        final Long sortEpoch;
        final String formattedTime;
        final LocalDate msgDate;
        final MessageItem item;

        IndexedMessage(int originalIndex, Long sortEpoch, String formattedTime, LocalDate msgDate, MessageItem item)
        {
            this.originalIndex = originalIndex;
            this.sortEpoch = sortEpoch;
            this.formattedTime = formattedTime;
            this.msgDate = msgDate;
            this.item = item;
        }
    }
}
