package com.doupi.cms.service.impl;

import java.util.*;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.doupi.common.core.redis.RedisCache;
import com.doupi.cms.domain.*;
import com.doupi.cms.mapper.*;
import com.doupi.cms.service.ICmsPageBuilderService;

/**
 * 官网全站可视化页面搭建服务实现类 (MySQL落库 + Redis多级缓存加速)
 * 
 * @author doupi
 */
@Service
public class CmsPageBuilderServiceImpl implements ICmsPageBuilderService
{
    private static final String CACHE_GLOBAL_PREFIX = "cms:global:";
    private static final String CACHE_RENDER_PREFIX = "cms:page:render:";

    @Autowired
    private CmsGlobalMapper globalMapper;

    @Autowired
    private CmsPageMapper pageMapper;

    @Autowired
    private CmsSectionMapper sectionMapper;

    @Autowired
    private RedisCache redisCache;

    // ================= 全局布局管理 =================

    @Override
    public CmsGlobal getGlobal(String category)
    {
        String cacheKey = CACHE_GLOBAL_PREFIX + category;
        CmsGlobal cached = redisCache.getCacheObject(cacheKey);
        if (cached != null)
        {
            return cached;
        }

        CmsGlobal global = globalMapper.selectGlobalByCategory(category);
        if (global != null)
        {
            redisCache.setCacheObject(cacheKey, global, 30, TimeUnit.MINUTES);
        }
        return global;
    }

    @Override
    public List<CmsGlobal> getAllGlobals()
    {
        return globalMapper.selectAllGlobals();
    }

    @Override
    public int saveGlobal(CmsGlobal global)
    {
        int row = globalMapper.upsertGlobal(global);
        if (row > 0)
        {
            // 主动驱逐全局缓存
            redisCache.deleteObject(CACHE_GLOBAL_PREFIX + global.getCategory());
            // 清理所有页面渲染缓存 (因为包含全局Header/Footer)
            Collection<String> keys = redisCache.keys(CACHE_RENDER_PREFIX + "*");
            if (keys != null && !keys.isEmpty())
            {
                redisCache.deleteObject(keys);
            }
        }
        return row;
    }

    // ================= 页面管理 =================

    @Override
    public List<CmsPage> selectPageList(CmsPage page)
    {
        return pageMapper.selectPageList(page);
    }

    @Override
    public CmsPage selectPageById(Long pageId)
    {
        CmsPage page = pageMapper.selectPageById(pageId);
        if (page != null)
        {
            page.setSections(sectionMapper.selectAllSectionsByPageId(pageId));
        }
        return page;
    }

    @Override
    public CmsPage selectPageBySlug(String pageSlug)
    {
        return pageMapper.selectPageBySlug(pageSlug);
    }

    @Override
    public int insertPage(CmsPage page)
    {
        return pageMapper.insertPage(page);
    }

    @Override
    public int updatePage(CmsPage page)
    {
        int row = pageMapper.updatePage(page);
        if (row > 0 && page.getPageSlug() != null)
        {
            evictPageCache(page.getPageSlug());
        }
        return row;
    }

    @Override
    @Transactional
    public int deletePageById(Long pageId)
    {
        CmsPage page = pageMapper.selectPageById(pageId);
        if (page != null)
        {
            evictPageCache(page.getPageSlug());
        }
        sectionMapper.deleteSectionsByPageId(pageId);
        return pageMapper.deletePageById(pageId);
    }

    // ================= 动态区块管理 =================

    @Override
    public List<CmsSection> selectSectionsByPageId(Long pageId, boolean includeHidden)
    {
        if (includeHidden)
        {
            return sectionMapper.selectAllSectionsByPageId(pageId);
        }
        return sectionMapper.selectSectionsByPageId(pageId);
    }

    @Override
    public CmsSection selectSectionById(Long sectionId)
    {
        return sectionMapper.selectSectionById(sectionId);
    }

    @Override
    public int insertSection(CmsSection section)
    {
        int row = sectionMapper.insertSection(section);
        evictPageCacheByPageId(section.getPageId());
        return row;
    }

    @Override
    public int updateSection(CmsSection section)
    {
        int row = sectionMapper.updateSection(section);
        evictPageCacheByPageId(section.getPageId());
        return row;
    }

    @Override
    public int deleteSectionById(Long sectionId)
    {
        CmsSection section = sectionMapper.selectSectionById(sectionId);
        if (section != null)
        {
            int row = sectionMapper.deleteSectionById(sectionId);
            evictPageCacheByPageId(section.getPageId());
            return row;
        }
        return 0;
    }

    @Override
    @Transactional
    public void batchSaveSections(Long pageId, List<CmsSection> sections)
    {
        if (pageId == null) return;
        // 先删除原页面所有区块，再按最新排版序列批量插入
        sectionMapper.deleteSectionsByPageId(pageId);
        if (sections != null)
        {
            int order = 1;
            for (CmsSection sec : sections)
            {
                sec.setPageId(pageId);
                sec.setSortOrder(order++);
                sectionMapper.insertSection(sec);
            }
        }
        evictPageCacheByPageId(pageId);
    }

    // ================= 聚合渲染与多级缓存 =================

    @Override
    public Map<String, Object> renderPage(String pageSlug)
    {
        if (pageSlug == null || pageSlug.trim().isEmpty())
        {
            pageSlug = "/";
        }
        if (!pageSlug.startsWith("/"))
        {
            pageSlug = "/" + pageSlug;
        }

        String cacheKey = CACHE_RENDER_PREFIX + pageSlug;
        Map<String, Object> cached = redisCache.getCacheObject(cacheKey);
        if (cached != null)
        {
            return cached;
        }

        CmsPage page = pageMapper.selectPageBySlug(pageSlug);
        if (page == null)
        {
            return null;
        }

        List<CmsSection> sections = sectionMapper.selectSectionsByPageId(page.getPageId());
        CmsGlobal headerGlobal = getGlobal("header");
        CmsGlobal footerGlobal = getGlobal("footer");

        Map<String, Object> renderData = new HashMap<>();
        renderData.put("page", page);
        renderData.put("sections", sections != null ? sections : Collections.emptyList());
        renderData.put("header", headerGlobal != null ? headerGlobal.getConfigContent() : null);
        renderData.put("footer", footerGlobal != null ? footerGlobal.getConfigContent() : null);

        // 缓存 15 分钟 (后台修改发布时会主动精确失效，安全可靠)
        redisCache.setCacheObject(cacheKey, renderData, 15, TimeUnit.MINUTES);

        return renderData;
    }

    @Override
    public void evictPageCache(String pageSlug)
    {
        if (pageSlug == null) return;
        if (!pageSlug.startsWith("/")) pageSlug = "/" + pageSlug;
        redisCache.deleteObject(CACHE_RENDER_PREFIX + pageSlug);
    }

    private void evictPageCacheByPageId(Long pageId)
    {
        if (pageId == null) return;
        CmsPage page = pageMapper.selectPageById(pageId);
        if (page != null && page.getPageSlug() != null)
        {
            evictPageCache(page.getPageSlug());
        }
    }
}
