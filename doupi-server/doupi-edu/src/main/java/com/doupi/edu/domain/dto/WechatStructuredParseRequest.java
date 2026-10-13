package com.doupi.edu.domain.dto;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * 微信导出目录结构化消息解析请求 DTO
 */
public class WechatStructuredParseRequest implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 按会话分组的结构化消息列表 */
    private List<ConversationItem> conversations = new ArrayList<>();

    /** 兼容扁平化消息列表（按 conversationId / exportConversationId 自动归组后独立解析） */
    private List<MessageItem> messages = new ArrayList<>();

    /** 可选起始日期（YYYY-MM-DD，含当日） */
    private String startDate;

    /** 可选结束日期（YYYY-MM-DD，含当日） */
    private String endDate;

    public List<ConversationItem> getConversations()
    {
        return conversations;
    }

    public void setConversations(List<ConversationItem> conversations)
    {
        this.conversations = conversations;
    }

    public List<MessageItem> getMessages()
    {
        return messages;
    }

    public void setMessages(List<MessageItem> messages)
    {
        this.messages = messages;
    }

    public String getStartDate()
    {
        return startDate;
    }

    public void setStartDate(String startDate)
    {
        this.startDate = startDate;
    }

    public String getEndDate()
    {
        return endDate;
    }

    public void setEndDate(String endDate)
    {
        this.endDate = endDate;
    }

    public static class ConversationItem implements Serializable
    {
        private static final long serialVersionUID = 1L;

        private String conversationId;
        private String conversationName;
        private String folder;
        private List<MessageItem> messages = new ArrayList<>();

        public String getConversationId()
        {
            return conversationId;
        }

        public void setConversationId(String conversationId)
        {
            this.conversationId = conversationId;
        }

        public String getConversationName()
        {
            return conversationName;
        }

        public void setConversationName(String conversationName)
        {
            this.conversationName = conversationName;
        }

        public String getFolder()
        {
            return folder;
        }

        public void setFolder(String folder)
        {
            this.folder = folder;
        }

        public List<MessageItem> getMessages()
        {
            return messages;
        }

        public void setMessages(List<MessageItem> messages)
        {
            this.messages = messages;
        }
    }

    public static class MessageItem implements Serializable
    {
        private static final long serialVersionUID = 1L;

        private String id;
        private String serverId;
        private String conversationId;
        private String exportConversationId;
        private String conversationName;
        private String exportConversationName;
        private String folder;
        private String senderName;
        private String name;
        private String from;
        private Boolean isSender;
        private String type;
        private Long timestamp;
        private Long createTime;
        private String datetime;
        private String timeStr;
        private String content;
        private ContentData contentData;
        private String fileTitle;
        private String quoteContent;
        private String exportMediaUrl;
        private String attachmentRelativePath;
        private String exportMediaError;
        private Boolean attachmentMissing;

        public String getId()
        {
            return id;
        }

        public void setId(String id)
        {
            this.id = id;
        }

        public String getServerId()
        {
            return serverId;
        }

        public void setServerId(String serverId)
        {
            this.serverId = serverId;
        }

        public String getConversationId()
        {
            return conversationId;
        }

        public void setConversationId(String conversationId)
        {
            this.conversationId = conversationId;
        }

        public String getExportConversationId()
        {
            return exportConversationId;
        }

        public void setExportConversationId(String exportConversationId)
        {
            this.exportConversationId = exportConversationId;
        }

        public String getConversationName()
        {
            return conversationName;
        }

        public void setConversationName(String conversationName)
        {
            this.conversationName = conversationName;
        }

        public String getExportConversationName()
        {
            return exportConversationName;
        }

        public void setExportConversationName(String exportConversationName)
        {
            this.exportConversationName = exportConversationName;
        }

        public String getFolder()
        {
            return folder;
        }

        public void setFolder(String folder)
        {
            this.folder = folder;
        }

        public String getSenderName()
        {
            return senderName;
        }

        public void setSenderName(String senderName)
        {
            this.senderName = senderName;
        }

        public String getName()
        {
            return name;
        }

        public void setName(String name)
        {
            this.name = name;
        }

        public String getFrom()
        {
            return from;
        }

        public void setFrom(String from)
        {
            this.from = from;
        }

        public Boolean getIsSender()
        {
            return isSender;
        }

        public void setIsSender(Boolean isSender)
        {
            this.isSender = isSender;
        }

        public String getType()
        {
            return type;
        }

        public void setType(String type)
        {
            this.type = type;
        }

        public Long getTimestamp()
        {
            return timestamp;
        }

        public void setTimestamp(Long timestamp)
        {
            this.timestamp = timestamp;
        }

        public Long getCreateTime()
        {
            return createTime;
        }

        public void setCreateTime(Long createTime)
        {
            this.createTime = createTime;
        }

        public String getDatetime()
        {
            return datetime;
        }

        public void setDatetime(String datetime)
        {
            this.datetime = datetime;
        }

        public String getTimeStr()
        {
            return timeStr;
        }

        public void setTimeStr(String timeStr)
        {
            this.timeStr = timeStr;
        }

        public String getContent()
        {
            return content;
        }

        public void setContent(String content)
        {
            this.content = content;
        }

        public ContentData getContentData()
        {
            return contentData;
        }

        public void setContentData(ContentData contentData)
        {
            this.contentData = contentData;
        }

        public String getFileTitle()
        {
            return fileTitle;
        }

        public void setFileTitle(String fileTitle)
        {
            this.fileTitle = fileTitle;
        }

        public String getQuoteContent()
        {
            return quoteContent;
        }

        public void setQuoteContent(String quoteContent)
        {
            this.quoteContent = quoteContent;
        }

        public String getExportMediaUrl()
        {
            return exportMediaUrl;
        }

        public void setExportMediaUrl(String exportMediaUrl)
        {
            this.exportMediaUrl = exportMediaUrl;
        }

        public String getAttachmentRelativePath()
        {
            return attachmentRelativePath;
        }

        public void setAttachmentRelativePath(String attachmentRelativePath)
        {
            this.attachmentRelativePath = attachmentRelativePath;
        }

        public String getExportMediaError()
        {
            return exportMediaError;
        }

        public void setExportMediaError(String exportMediaError)
        {
            this.exportMediaError = exportMediaError;
        }

        public Boolean getAttachmentMissing()
        {
            return attachmentMissing;
        }

        public void setAttachmentMissing(Boolean attachmentMissing)
        {
            this.attachmentMissing = attachmentMissing;
        }
    }

    public static class ContentData implements Serializable
    {
        private static final long serialVersionUID = 1L;

        private String type;
        private String title;
        private String content;
        private String quotedContent;
        private String quotedSender;

        public String getType()
        {
            return type;
        }

        public void setType(String type)
        {
            this.type = type;
        }

        public String getTitle()
        {
            return title;
        }

        public void setTitle(String title)
        {
            this.title = title;
        }

        public String getContent()
        {
            return content;
        }

        public void setContent(String content)
        {
            this.content = content;
        }

        public String getQuotedContent()
        {
            return quotedContent;
        }

        public void setQuotedContent(String quotedContent)
        {
            this.quotedContent = quotedContent;
        }

        public String getQuotedSender()
        {
            return quotedSender;
        }

        public void setQuotedSender(String quotedSender)
        {
            this.quotedSender = quotedSender;
        }
    }
}
