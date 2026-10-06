package com.doupi.edu.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.doupi.edu.domain.EduGoodsKitItem;

/**
 * 物资套装明细Mapper接口
 * 
 * @author doupi
 */
public interface EduGoodsKitItemMapper 
{
    /**
     * 根据套装ID查询明细（包含物资名称、规格型号、当前库存等关联数据）
     */
    public List<EduGoodsKitItem> selectItemsByKitId(Long kitId);

    /**
     * 批量新增明细
     */
    public int batchInsertKitItems(@Param("items") List<EduGoodsKitItem> items);

    /**
     * 根据套装ID删除明细
     */
    public int deleteItemsByKitId(Long kitId);

    /**
     * 批量根据套装ID删除明细
     */
    public int deleteItemsByKitIds(Long[] kitIds);
}
