package com.doupi.cms.mapper;

import java.util.List;
import com.doupi.cms.domain.CmsArticle;

/**
 * 官网公文与资讯Mapper接口
 * 
 * @author doupi
 */
public interface CmsArticleMapper 
{
    public CmsArticle selectArticleById(Long articleId);

    public List<CmsArticle> selectArticleList(CmsArticle article);

    public int insertArticle(CmsArticle article);

    public int updateArticle(CmsArticle article);

    public int deleteArticleById(Long articleId);

    public int deleteArticleByIds(Long[] articleIds);
}
