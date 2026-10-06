package com.doupi.edu.mapper;

import java.util.List;
import com.doupi.edu.domain.EduClass;

/**
 * 班级档案Mapper接口
 * 
 * @author doupi
 * @date 2026-09-25
 */
public interface EduClassMapper 
{
    /**
     * 查询班级档案
     * 
     * @param classId 班级档案主键
     * @return 班级档案
     */
    public EduClass selectEduClassByClassId(Long classId);

    /**
     * 查询班级档案列表
     * 
     * @param eduClass 班级档案
     * @return 班级档案集合
     */
    public List<EduClass> selectEduClassList(EduClass eduClass);

    /**
     * 新增班级档案
     * 
     * @param eduClass 班级档案
     * @return 结果
     */
    public int insertEduClass(EduClass eduClass);

    /**
     * 修改班级档案
     * 
     * @param eduClass 班级档案
     * @return 结果
     */
    public int updateEduClass(EduClass eduClass);

    /**
     * 删除班级档案
     * 
     * @param classId 班级档案主键
     * @return 结果
     */
    public int deleteEduClassByClassId(Long classId);

    /**
     * 批量删除班级档案
     * 
     * @param classIds 需要删除的数据主键集合
     * @return 结果
     */
    public int deleteEduClassByClassIds(Long[] classIds);
}
