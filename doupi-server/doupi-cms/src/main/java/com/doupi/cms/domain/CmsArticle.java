package com.doupi.cms.domain;

import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 官网公文与资讯实体类 doupi_cms_article
 * 
 * @author doupi
 */
public class CmsArticle extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 资讯ID */
    private Long articleId;

    /** 文章标题 */
    @Excel(name = "文章标题")
    private String title;

    /** 类型: updates-高招资讯 notices-校园公告 */
    @Excel(name = "类型", readConverterExp = "updates=高招资讯,notices=校园公告")
    private String kind;

    /** 栏目分类 */
    @Excel(name = "栏目分类")
    private String category;

    /** 摘要提炼 */
    private String summary;

    /** 富文本正文 */
    private String content;

    /** 封面图片URL */
    private String coverUrl;

    /** 发布日期(YYYY-MM-DD) */
    @Excel(name = "发布日期")
    private String publishedDate;

    /** 发布作者/署名 */
    @Excel(name = "作者")
    private String author;

    /** 状态: 0-正常发布 1-草稿箱 */
    @Excel(name = "状态", readConverterExp = "0=正常,1=草稿")
    private String status;

    /** 排序权重 */
    private Integer sortOrder;

    public Long getArticleId() { return articleId; }
    public void setArticleId(Long articleId) { this.articleId = articleId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getKind() { return kind; }
    public void setKind(String kind) { this.kind = kind; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getCoverUrl() { return coverUrl; }
    public void setCoverUrl(String coverUrl) { this.coverUrl = coverUrl; }

    public String getPublishedDate() { return publishedDate; }
    public void setPublishedDate(String publishedDate) { this.publishedDate = publishedDate; }

    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
