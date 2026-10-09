package com.doupi.edu.domain.dto;

import java.io.Serializable;

/**
 * 文档文件解析结果DTO（用于文印登记时自动解析页数/纸张规格）
 */
public class DocumentAnalysisResult implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 解析出的原始页数（Excel为sheet数）；解析失败为 null */
    private Integer pageCount;

    /** 检测到的源纸张规格（A4/A3/8K/16K）；检测不到为 null */
    private String sourcePaperType;

    /** 是否成功解析 */
    private Boolean parseable = false;

    /** 提示或错误消息 */
    private String msg;

    public Integer getPageCount()
    {
        return pageCount;
    }

    public void setPageCount(Integer pageCount)
    {
        this.pageCount = pageCount;
    }

    public String getSourcePaperType()
    {
        return sourcePaperType;
    }

    public void setSourcePaperType(String sourcePaperType)
    {
        this.sourcePaperType = sourcePaperType;
    }

    public Boolean getParseable()
    {
        return parseable;
    }

    public void setParseable(Boolean parseable)
    {
        this.parseable = parseable;
    }

    public String getMsg()
    {
        return msg;
    }

    public void setMsg(String msg)
    {
        this.msg = msg;
    }

    /** 便捷构造：解析失败 */
    public static DocumentAnalysisResult fail(String msg)
    {
        DocumentAnalysisResult r = new DocumentAnalysisResult();
        r.setParseable(false);
        r.setMsg(msg);
        return r;
    }
}