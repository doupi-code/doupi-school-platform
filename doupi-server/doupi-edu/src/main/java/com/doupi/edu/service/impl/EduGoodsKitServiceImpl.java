package com.doupi.edu.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.doupi.common.utils.DateUtils;
import com.doupi.edu.domain.EduGoodsKit;
import com.doupi.edu.domain.EduGoodsKitItem;
import com.doupi.edu.mapper.EduGoodsKitItemMapper;
import com.doupi.edu.mapper.EduGoodsKitMapper;
import com.doupi.edu.service.IEduGoodsKitService;

/**
 * 物资套装Service业务层处理
 * 
 * @author doupi
 */
@Service
public class EduGoodsKitServiceImpl implements IEduGoodsKitService 
{
    @Autowired
    private EduGoodsKitMapper eduGoodsKitMapper;

    @Autowired
    private EduGoodsKitItemMapper eduGoodsKitItemMapper;

    @Override
    public EduGoodsKit selectEduGoodsKitByKitId(Long kitId)
    {
        EduGoodsKit kit = eduGoodsKitMapper.selectEduGoodsKitByKitId(kitId);
        if (kit != null)
        {
            List<EduGoodsKitItem> items = eduGoodsKitItemMapper.selectItemsByKitId(kitId);
            kit.setItemList(items);
        }
        return kit;
    }

    @Override
    public List<EduGoodsKit> selectEduGoodsKitList(EduGoodsKit eduGoodsKit)
    {
        return eduGoodsKitMapper.selectEduGoodsKitList(eduGoodsKit);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int insertEduGoodsKit(EduGoodsKit eduGoodsKit)
    {
        eduGoodsKit.setCreateTime(DateUtils.getNowDate());
        if (eduGoodsKit.getStatus() == null)
        {
            eduGoodsKit.setStatus("0");
        }
        eduGoodsKit.setDelFlag("0");
        int rows = eduGoodsKitMapper.insertEduGoodsKit(eduGoodsKit);
        insertKitItems(eduGoodsKit);
        return rows;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int updateEduGoodsKit(EduGoodsKit eduGoodsKit)
    {
        eduGoodsKit.setUpdateTime(DateUtils.getNowDate());
        eduGoodsKitItemMapper.deleteItemsByKitId(eduGoodsKit.getKitId());
        insertKitItems(eduGoodsKit);
        return eduGoodsKitMapper.updateEduGoodsKit(eduGoodsKit);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public int deleteEduGoodsKitByKitIds(Long[] kitIds)
    {
        return eduGoodsKitMapper.deleteEduGoodsKitByKitIds(kitIds);
    }

    /**
     * 新增套装明细信息
     */
    private void insertKitItems(EduGoodsKit eduGoodsKit)
    {
        List<EduGoodsKitItem> itemList = eduGoodsKit.getItemList();
        Long kitId = eduGoodsKit.getKitId();
        if (itemList != null && !itemList.isEmpty())
        {
            int order = 1;
            for (EduGoodsKitItem item : itemList)
            {
                item.setKitId(kitId);
                if (item.getSortOrder() == null)
                {
                    item.setSortOrder(order++);
                }
            }
            eduGoodsKitItemMapper.batchInsertKitItems(itemList);
        }
    }
}
