package com.doupi.edu.domain.dto;

import java.io.Serializable;

/**
 * 微信截图OCR识别预填结果DTO
 */
public class EduPrintOcrResult implements Serializable 
{
    private static final long serialVersionUID = 1L;
        private java.util.List<SourceMessage> messages;
        public java.util.List<SourceMessage> getMessages() { return messages; }
        public void setMessages(java.util.List<SourceMessage> value) { this.messages = value; }

    public static class SourceMessage implements Serializable {
        private String id;
        public String getId() { return id; }
        public void setId(String value) { this.id = value; }
        private String sender;
        public String getSender() { return sender; }
        public void setSender(String value) { this.sender = value; }
        private String time;
        public String getTime() { return time; }
        public void setTime(String value) { this.time = value; }
        private String text;
        public String getText() { return text; }
        public void setText(String value) { this.text = value; }
        private String type;
        public String getType() { return type; }
        public void setType(String value) { this.type = value; }
        private int order;
        public int getOrder() { return order; }
        public void setOrder(int value) { this.order = value; }
    }


    /** 原始OCR识别文本 */
    private String rawText;

    /** 识别出的时间戳片段（如 "2026年09月15日 16:08"） */
    private String timeSnippet;

    /** 提取年级（如：高一、初二） */
    private String grade;

    /** 提取科目（如：数学、语文） */
    private String subject;

    /** 提取份数 */
    private Long printCount;

    /** 每份页数/张数 */
    private Long pageCount;

    /** 印刷方式（1单页印刷 2双页印刷） */
    private String printSide;

    /** 预计消耗总纸张数 */
    private Long totalPages;

    /** 提取纸张类型（A3/A4/8K/16K） */
    private String paperType;

    /** 匹配用纸物品ID */
    private Long paperGoodsId;

    /** 匹配用纸物品名称 */
    private String paperGoodsName;

    /** 匹配申请教师ID */
    private Long teacherId;

    /** 匹配申请教师姓名 */
    private String teacherName;

    /** 匹配或提取的班级ID */
    private Long classId;

    /** 匹配或提取的班级名称 */
    private String className;

    /** 自动拼接的印刷名称 */
    private String printName;

    /** 特殊装订与排版备注说明 */
    private String remark;

    /** 识别出的所有相关文档/材料文件列表（支持一次发送多个文档场景） */
    private java.util.List<String> documentList = new java.util.ArrayList<>();

    /** 教师是否已成功在教职工档案库中匹配确认（若未确认，前端提示用户手动选择） */
    private Boolean teacherMatched = false;

    /** 是否成功识别 */
    private Boolean success = true;

    /** 提示或错误消息 */
    private String msg;

    public String getRawText() {
        return rawText;
    }

    public void setRawText(String rawText) {
        this.rawText = rawText;
    }

    public String getTimeSnippet() {
        return timeSnippet;
    }

    public void setTimeSnippet(String timeSnippet) {
        this.timeSnippet = timeSnippet;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public Long getPrintCount() {
        return printCount;
    }

    public void setPrintCount(Long printCount) {
        this.printCount = printCount;
    }

    public Long getPageCount() {
        return pageCount;
    }

    public void setPageCount(Long pageCount) {
        this.pageCount = pageCount;
    }

    public String getPrintSide() {
        return printSide;
    }

    public void setPrintSide(String printSide) {
        this.printSide = printSide;
    }

    public Long getTotalPages() {
        return totalPages;
    }

    public void setTotalPages(Long totalPages) {
        this.totalPages = totalPages;
    }

    public String getPaperType() {
        return paperType;
    }

    public void setPaperType(String paperType) {
        this.paperType = paperType;
    }

    public Long getPaperGoodsId() {
        return paperGoodsId;
    }

    public void setPaperGoodsId(Long paperGoodsId) {
        this.paperGoodsId = paperGoodsId;
    }

    public String getPaperGoodsName() {
        return paperGoodsName;
    }

    public void setPaperGoodsName(String paperGoodsName) {
        this.paperGoodsName = paperGoodsName;
    }

    public Long getTeacherId() {
        return teacherId;
    }

    public void setTeacherId(Long teacherId) {
        this.teacherId = teacherId;
    }

    public String getTeacherName() {
        return teacherName;
    }

    public void setTeacherName(String teacherName) {
        this.teacherName = teacherName;
    }

    public Long getClassId() {
        return classId;
    }

    public void setClassId(Long classId) {
        this.classId = classId;
    }

    public String getClassName() {
        return className;
    }

    public void setClassName(String className) {
        this.className = className;
    }

    public String getPrintName() {
        return printName;
    }

    public void setPrintName(String printName) {
        this.printName = printName;
    }

    public String getRemark() {
        return remark;
    }

    public void setRemark(String remark) {
        this.remark = remark;
    }

    public Boolean getSuccess() {
        return success;
    }

    public void setSuccess(Boolean success) {
        this.success = success;
    }

    public String getMsg() {
        return msg;
    }

    public void setMsg(String msg) {
        this.msg = msg;
    }

    public java.util.List<String> getDocumentList() {
        return documentList;
    }

    public void setDocumentList(java.util.List<String> documentList) {
        this.documentList = documentList;
    }

    public Boolean getTeacherMatched() {
        return teacherMatched;
    }

    public void setTeacherMatched(Boolean teacherMatched) {
        this.teacherMatched = teacherMatched;
    }

    public java.util.List<PrintTaskItem> getTaskList() {
        return taskList;
    }

    public void setTaskList(java.util.List<PrintTaskItem> taskList) {
        this.taskList = taskList;
    }

    public Integer getFirstUnregisteredIndex() {
        return firstUnregisteredIndex;
    }

    public void setFirstUnregisteredIndex(Integer firstUnregisteredIndex) {
        this.firstUnregisteredIndex = firstUnregisteredIndex;
    }

    /** 识别出的所有多任务/多天印刷任务清单 */
    private java.util.List<PrintTaskItem> taskList = new java.util.ArrayList<>();

    /** 首个未登记任务的索引（若全部已登记，为 -1） */
    private Integer firstUnregisteredIndex = 0;

    /**
     * 单个印刷任务项（用于多天记录、多文件多次印刷的分解与排重）
     */
    public static class PrintTaskItem implements Serializable 
    {
        private static final long serialVersionUID = 1L;

        private String taskId;
        public String getTaskId() { return taskId; }
        public void setTaskId(String value) { this.taskId = value; }
        private String sender;
        public String getSender() { return sender; }
        public void setSender(String value) { this.sender = value; }
        private java.util.List<String> sourceMessageIds;
        public java.util.List<String> getSourceMessageIds() { return sourceMessageIds; }
        public void setSourceMessageIds(java.util.List<String> value) { this.sourceMessageIds = value; }
        private java.util.Map<String, java.util.List<String>> fieldEvidence;
        public java.util.Map<String, java.util.List<String>> getFieldEvidence() { return fieldEvidence; }
        public void setFieldEvidence(java.util.Map<String, java.util.List<String>> value) { this.fieldEvidence = value; }
        private java.util.List<String> reviewReasons;
        public java.util.List<String> getReviewReasons() { return reviewReasons; }
        public void setReviewReasons(java.util.List<String> value) { this.reviewReasons = value; }
        private String attachmentStatus;
        public String getAttachmentStatus() { return attachmentStatus; }
        public void setAttachmentStatus(String value) { this.attachmentStatus = value; }
        /** 纯净印刷材料名称（已剔除科目、年级） */
        private String printName;

        /** 原始文档文件名（如 作文训练（2）.doc） */
        private String originalDocName;

        /** 对话中的时间线/时间戳标识（如 "星期四 11:03"、"昨天 15:30"） */
        private String timeSnippet;

        /** 申请教师ID */
        private Long teacherId;

        /** 申请教师姓名 */
        private String teacherName;

        /** 教师是否匹配成功 */
        private Boolean teacherMatched = false;

        /** 年级 */
        private String grade;

        /** 科目 */
        private String subject;

        /** 班级ID */
        private Long classId;

        /** 班级名称 */
        private String className;

        /** 印刷份数 */
        private Long printCount;

        /** 每份页数 */
        private Long pageCount;

        /** 印刷方式（1单页印刷 2双页印刷） */
        private String printSide;

        /** 纸张类型 */
        private String paperType;

        /** 纸张物品ID */
        private Long paperGoodsId;

        /** 纸张物品名称 */
        private String paperGoodsName;

        /** 是否已经在数据库已有数据中登记过 */
        private Boolean alreadyRegistered = false;

        /** 已登记的印刷单据ID */
        private Long existingPrintId;

        /** 已登记单据的状态或时间说明 */
        private String existingRecordDesc;

        public String getPrintName() {
            return printName;
        }

        public void setPrintName(String printName) {
            this.printName = printName;
        }

        public String getOriginalDocName() {
            return originalDocName;
        }

        public void setOriginalDocName(String originalDocName) {
            this.originalDocName = originalDocName;
        }

        public String getTimeSnippet() {
            return timeSnippet;
        }

        public void setTimeSnippet(String timeSnippet) {
            this.timeSnippet = timeSnippet;
        }

        public Long getTeacherId() {
            return teacherId;
        }

        public void setTeacherId(Long teacherId) {
            this.teacherId = teacherId;
        }

        public String getTeacherName() {
            return teacherName;
        }

        public void setTeacherName(String teacherName) {
            this.teacherName = teacherName;
        }

        public Boolean getTeacherMatched() {
            return teacherMatched;
        }

        public void setTeacherMatched(Boolean teacherMatched) {
            this.teacherMatched = teacherMatched;
        }

        public String getGrade() {
            return grade;
        }

        public void setGrade(String grade) {
            this.grade = grade;
        }

        public String getSubject() {
            return subject;
        }

        public void setSubject(String subject) {
            this.subject = subject;
        }

        public Long getClassId() {
            return classId;
        }

        public void setClassId(Long classId) {
            this.classId = classId;
        }

        public String getClassName() {
            return className;
        }

        public void setClassName(String className) {
            this.className = className;
        }

        public Long getPrintCount() {
            return printCount;
        }

        public void setPrintCount(Long printCount) {
            this.printCount = printCount;
        }

        public Long getPageCount() {
            return pageCount;
        }

        public void setPageCount(Long pageCount) {
            this.pageCount = pageCount;
        }

        public String getPrintSide() {
            return printSide;
        }

        public void setPrintSide(String printSide) {
            this.printSide = printSide;
        }

        public String getPaperType() {
            return paperType;
        }

        public void setPaperType(String paperType) {
            this.paperType = paperType;
        }

        public Long getPaperGoodsId() {
            return paperGoodsId;
        }

        public void setPaperGoodsId(Long paperGoodsId) {
            this.paperGoodsId = paperGoodsId;
        }

        public String getPaperGoodsName() {
            return paperGoodsName;
        }

        public void setPaperGoodsName(String paperGoodsName) {
            this.paperGoodsName = paperGoodsName;
        }

        public Boolean getAlreadyRegistered() {
            return alreadyRegistered;
        }

        public void setAlreadyRegistered(Boolean alreadyRegistered) {
            this.alreadyRegistered = alreadyRegistered;
        }

        public Long getExistingPrintId() {
            return existingPrintId;
        }

        public void setExistingPrintId(Long existingPrintId) {
            this.existingPrintId = existingPrintId;
        }

        /** 特殊装订与排版备注说明 */
        private String remark;

        public String getRemark() {
            return remark;
        }

        public void setRemark(String remark) {
            this.remark = remark;
        }

        public String getExistingRecordDesc() {
            return existingRecordDesc;
        }

        public void setExistingRecordDesc(String existingRecordDesc) {
            this.existingRecordDesc = existingRecordDesc;
        }
    }
}
