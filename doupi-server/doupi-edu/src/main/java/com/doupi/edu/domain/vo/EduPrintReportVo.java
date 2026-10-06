package com.doupi.edu.domain.vo;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

/**
 * 教务文印统计报表 VO
 * 
 * @author doupi
 */
public class EduPrintReportVo implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 概览统计 */
    private Map<String, Object> summary;

    /** 纸张类型分布 */
    private List<Map<String, Object>> paperTypeStats;

    /** 各年级印刷统计 */
    private List<Map<String, Object>> gradeStats;

    /** 教师印刷排行 */
    private List<Map<String, Object>> teacherStats;

    /** 月度印刷走势 */
    private List<Map<String, Object>> monthlyTrends;

    public Map<String, Object> getSummary() { return summary; }
    public void setSummary(Map<String, Object> summary) { this.summary = summary; }

    public List<Map<String, Object>> getPaperTypeStats() { return paperTypeStats; }
    public void setPaperTypeStats(List<Map<String, Object>> paperTypeStats) { this.paperTypeStats = paperTypeStats; }

    public List<Map<String, Object>> getGradeStats() { return gradeStats; }
    public void setGradeStats(List<Map<String, Object>> gradeStats) { this.gradeStats = gradeStats; }

    public List<Map<String, Object>> getTeacherStats() { return teacherStats; }
    public void setTeacherStats(List<Map<String, Object>> teacherStats) { this.teacherStats = teacherStats; }

    public List<Map<String, Object>> getMonthlyTrends() { return monthlyTrends; }
    public void setMonthlyTrends(List<Map<String, Object>> monthlyTrends) { this.monthlyTrends = monthlyTrends; }
}
