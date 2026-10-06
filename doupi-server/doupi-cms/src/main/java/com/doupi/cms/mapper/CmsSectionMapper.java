package com.doupi.cms.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.doupi.cms.domain.CmsSection;

/**
 * 官网页面动态区块 Mapper 接口
 * 
 * @author doupi
 */
public interface CmsSectionMapper
{
    /**
     * 根据页面ID查询该页面的所有可见区块 (按 sort_order 升序)
     */
    List<CmsSection> selectSectionsByPageId(@Param("pageId") Long pageId);

    /**
     * 根据页面ID查询该页面的所有区块 (包含隐藏的，供后台编辑)
     */
    List<CmsSection> selectAllSectionsByPageId(@Param("pageId") Long pageId);

    /**
     * 根据区块ID查询区块
     */
    CmsSection selectSectionById(@Param("sectionId") Long sectionId);

    /**
     * 插入新区块
     */
    int insertSection(CmsSection section);

    /**
     * 更新区块
     */
    int updateSection(CmsSection section);

    /**
     * 根据区块ID删除
     */
    int deleteSectionById(@Param("sectionId") Long sectionId);

    /**
     * 根据页面ID批量删除所有区块
     */
    int deleteSectionsByPageId(@Param("pageId") Long pageId);
}
