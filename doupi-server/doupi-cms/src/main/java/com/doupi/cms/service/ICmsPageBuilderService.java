package com.doupi.cms.service;

import java.util.List;
import java.util.Map;
import com.doupi.cms.domain.*;

/**
 * 官网全站可视化页面搭建 (Page Builder) 服务接口
 * 
 * @author doupi
 */
public interface ICmsPageBuilderService
{
    // ================= 全局布局管理 (Header / Footer / SEO) =================

    CmsGlobal getGlobal(String category);

    List<CmsGlobal> getAllGlobals();

    int saveGlobal(CmsGlobal global);

    // ================= 页面管理 (Page) =================

    List<CmsPage> selectPageList(CmsPage page);

    CmsPage selectPageById(Long pageId);

    CmsPage selectPageBySlug(String pageSlug);

    int insertPage(CmsPage page);

    int updatePage(CmsPage page);

    int deletePageById(Long pageId);

    // ================= 动态区块管理 (Section) =================

    List<CmsSection> selectSectionsByPageId(Long pageId, boolean includeHidden);

    CmsSection selectSectionById(Long sectionId);

    int insertSection(CmsSection section);

    int updateSection(CmsSection section);

    int deleteSectionById(Long sectionId);

    void batchSaveSections(Long pageId, List<CmsSection> sections);

    // ================= 对外渲染聚合接口 (带 Redis 极速缓存) =================

    Map<String, Object> renderPage(String pageSlug);

    void evictPageCache(String pageSlug);
}
