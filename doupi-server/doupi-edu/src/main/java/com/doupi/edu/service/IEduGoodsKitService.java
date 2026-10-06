package com.doupi.edu.service;

import java.util.List;
import com.doupi.edu.domain.EduGoodsKit;

/**
 * 物资套装Service接口
 * 
 * @author doupi
 */
public interface IEduGoodsKitService 
{
    /**
     * 查询套装详情（包含明细物品列表）
     */
    public EduGoodsKit selectEduGoodsKitByKitId(Long kitId);

    /**
     * 查询套装列表
     */
    public List<EduGoodsKit> selectEduGoodsKitList(EduGoodsKit eduGoodsKit);

    /**
     * 新增套装（事务控制主子表）
     */
    public int insertEduGoodsKit(EduGoodsKit eduGoodsKit);

    /**
     * 修改套装（事务控制主子表）
     */
    public int updateEduGoodsKit(EduGoodsKit eduGoodsKit);

    /**
     * 批量删除套装
     */
    public int deleteEduGoodsKitByKitIds(Long[] kitIds);
}
