package com.doupi.cms.domain;

import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 官网常见问答实体类 doupi_cms_faq
 * 
 * @author doupi
 */
public class CmsFaq extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 问答ID */
    private Long faqId;

    /** 分类: 报名/费用/课程/管理/住宿/心理 */
    @Excel(name = "分类")
    private String category;

    /** 咨询问题 */
    @Excel(name = "咨询问题")
    private String question;

    /** 官方规范答复 */
    private String answer;

    /** 状态: 0-显示 1-隐藏 */
    @Excel(name = "状态", readConverterExp = "0=显示,1=隐藏")
    private String status;

    /** 排序 */
    private Integer sortOrder;

    public Long getFaqId() { return faqId; }
    public void setFaqId(Long faqId) { this.faqId = faqId; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
