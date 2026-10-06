package com.doupi.edu.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Param;
import com.doupi.edu.domain.EduMaterialRecordItem;

/**
 * 教务日常物资领退明细Mapper接口
 * 
 * @author doupi
 */
public interface EduMaterialRecordItemMapper 
{
    /**
     * 查询明细列表
     */
    public List<EduMaterialRecordItem> selectItemsByRecordId(Long recordId);

    /**
     * 批量新增明细
     */
    public int batchInsertRecordItems(@Param("items") List<EduMaterialRecordItem> items);

    /**
     * 根据主记录ID删除明细
     */
    public int deleteItemsByRecordId(Long recordId);
}
