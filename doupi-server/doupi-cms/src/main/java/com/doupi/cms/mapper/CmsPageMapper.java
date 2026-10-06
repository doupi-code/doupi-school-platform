package com.doupi.cms.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.doupi.cms.domain.CmsPage;

/**
 * 官网页面定义 Mapper 接口
 * 
 * @author doupi
 */
public interface CmsPageMapper
{
    /**
     * 根据ID查询页面
     */
    CmsPage selectPageById(@Param("pageId") Long pageId);

    /**
     * 根据页面Slug路由查询页面
     */
    CmsPage selectPageBySlug(@Param("pageSlug") String pageSlug);

    /**
     * 查询页面列表
     */
    List<CmsPage> selectPageList(CmsPage page);

    /**
     * 新增页面
     */
    int insertPage(CmsPage page);

    /**
     * 更新页面
     */
    int updatePage(CmsPage page);

    /**
     * 删除页面
     */
    int deletePageById(@Param("pageId") Long pageId);
}
