package com.doupi.cms.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.doupi.cms.domain.CmsGlobal;

/**
 * 官网全局布局与公共组件配置 Mapper 接口
 * 
 * @author doupi
 */
public interface CmsGlobalMapper
{
    /**
     * 查询指定类别的全局配置
     */
    CmsGlobal selectGlobalByCategory(@Param("category") String category);

    /**
     * 查询所有全局配置
     */
    List<CmsGlobal> selectAllGlobals();

    /**
     * 新增或更新全局配置 (upsert)
     */
    int upsertGlobal(CmsGlobal global);
}
