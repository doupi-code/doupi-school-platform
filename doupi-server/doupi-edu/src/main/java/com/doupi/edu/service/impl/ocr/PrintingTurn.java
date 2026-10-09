package com.doupi.edu.service.impl.ocr;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 微信文印业务会话轮次模型 (PrintingTurn)
 * 代表文印沟通中的一次聚合业务操作（例如：老师在一段集中时间内发送的一个或多个文件，以及相应的份数与装订指令）。
 */
public class PrintingTurn implements Serializable 
{
    private static final long serialVersionUID = 1L;

    /** 轮次序号（从 0 开始） */
    private int turnIndex;

    /** 轮次发生时间线标识（如 "2026年09月26日 10:11"） */
    private String timeSnippet = "近期记录";

    /** 本轮包含的全部原始聊天消息 */
    private List<ChatTopologyParser.ChatMessage> messages = new ArrayList<>();

    /** 本轮包含的全部文件名称列表（按发送顺序） */
    private List<String> files = new ArrayList<>();

    /** 本轮统一指令份数（例如同时发了多个文件，统一说“请打印25 份”或“各打50份”） */
    private Long unifiedCount;

    /** 轮次全局统一单双面（"1" 单面，"2" 双面） */
    private String unifiedSide;

    /** 轮次全局装订/补充要求备注（如“不要把答案解析与题目印在一页，第5页为单面”） */
    private String turnRemark;

    /** 单个文件的独立份数映射（用于轮内子配对，如“这个印200份”对应文件A，“再印20份”对应文件B） */
    private Map<String, Long> fileCountMap = new HashMap<>();

    /** 单个文件的独立单双面映射 */
    private Map<String, String> fileSideMap = new HashMap<>();

    /** 单个文件的独立备注说明映射 */
    private Map<String, String> fileRemarkMap = new HashMap<>();

    public PrintingTurn() 
    {
    }

    public PrintingTurn(int turnIndex) 
    {
        this.turnIndex = turnIndex;
    }

    public int getTurnIndex() 
    {
        return turnIndex;
    }

    public void setTurnIndex(int turnIndex) 
    {
        this.turnIndex = turnIndex;
    }

    public String getTimeSnippet() 
    {
        return timeSnippet;
    }

    public void setTimeSnippet(String timeSnippet) 
    {
        this.timeSnippet = timeSnippet;
    }

    public List<ChatTopologyParser.ChatMessage> getMessages() 
    {
        return messages;
    }

    public void setMessages(List<ChatTopologyParser.ChatMessage> messages) 
    {
        this.messages = messages;
    }

    public List<String> getFiles() 
    {
        return files;
    }

    public void setFiles(List<String> files) 
    {
        this.files = files;
    }

    public Long getUnifiedCount() 
    {
        return unifiedCount;
    }

    public void setUnifiedCount(Long unifiedCount) 
    {
        this.unifiedCount = unifiedCount;
    }

    public String getUnifiedSide() 
    {
        return unifiedSide;
    }

    public void setUnifiedSide(String unifiedSide) 
    {
        this.unifiedSide = unifiedSide;
    }

    public String getTurnRemark() 
    {
        return turnRemark;
    }

    public void setTurnRemark(String turnRemark) 
    {
        this.turnRemark = turnRemark;
    }

    public Map<String, Long> getFileCountMap() 
    {
        return fileCountMap;
    }

    public void setFileCountMap(Map<String, Long> fileCountMap) 
    {
        this.fileCountMap = fileCountMap;
    }

    public Map<String, String> getFileSideMap() 
    {
        return fileSideMap;
    }

    public void setFileSideMap(Map<String, String> fileSideMap) 
    {
        this.fileSideMap = fileSideMap;
    }

    public Map<String, String> getFileRemarkMap() 
    {
        return fileRemarkMap;
    }

    public void setFileRemarkMap(Map<String, String> fileRemarkMap) 
    {
        this.fileRemarkMap = fileRemarkMap;
    }

    /**
     * 获取指定文件的最终印刷份数：
     * 1. 优先使用针对该文件的子配对明确份数
     * 2. 次选使用本轮统一指令份数
     * 3. 兜底为 1 份
     */
    public Long resolveCountForFile(String fileName) 
    {
        if (fileName != null && fileCountMap.containsKey(fileName)) 
        {
            Long cnt = fileCountMap.get(fileName);
            if (cnt != null && cnt > 0) return cnt;
        }
        if (unifiedCount != null && unifiedCount > 0) 
        {
            return unifiedCount;
        }
        return 1L;
    }

    /**
     * 获取指定文件的最终单双面：
     * 1. 优先使用子配对
     * 2. 次选使用本轮统一单双面
     * 3. 兜底默认 "1" (单面)
     */
    public String resolveSideForFile(String fileName) 
    {
        if (fileName != null && fileSideMap.containsKey(fileName)) 
        {
            String s = fileSideMap.get(fileName);
            if (s != null && !s.isEmpty()) return s;
        }
        if (unifiedSide != null && !unifiedSide.isEmpty()) 
        {
            return unifiedSide;
        }
        return "1";
    }

    /**
     * 获取指定文件的补充备注
     */
    public String resolveRemarkForFile(String fileName) 
    {
        if (fileName != null && fileRemarkMap.containsKey(fileName)) 
        {
            String r = fileRemarkMap.get(fileName);
            if (r != null && !r.isEmpty()) return r;
        }
        return turnRemark != null ? turnRemark : "";
    }
}
