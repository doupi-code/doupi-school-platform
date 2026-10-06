package com.doupi.edu.mapper;

import java.util.List;
import com.doupi.edu.domain.EduGoodsKit;

/**
 * 教务物资套装模版Mapper接口
 * 
 * @author doupi
 */
public interface EduGoodsKitMapper 
{
    /**
     * 查询套装详情
     */
    public EduGoodsKit selectEduGoodsKitByKitId(Long kitId);

    /**
     * 查询套装列表
     */
    public List<EduGoodsKit> selectEduGoodsKitList(EduGoodsKit eduGoodsKit);

    /**
     * 新增套装
     */
    public int insertEduGoodsKit(EduGoodsKit eduGoodsKit);

    /**
     * 修改套装
     */
    public int updateEduGoodsKit(EduGoodsKit eduGoodsKit);

    /**
     * 逻辑删除套装
     */
    public int deleteEduGoodsKitByKitId(Long kitId);

    /**
     * 批量逻辑删除套装
     */
    public int deleteEduGoodsKitByKitIds(Long[] kitIds);
}
