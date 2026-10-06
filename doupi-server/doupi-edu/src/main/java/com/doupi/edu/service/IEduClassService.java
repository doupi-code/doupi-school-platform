package com.doupi.edu.service;

import java.util.List;
import com.doupi.edu.domain.EduClass;

/**
 * 班级档案Service接口
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
public interface IEduClassService 
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
     * 批量删除班级档案
     * 
     * @param classIds 需要删除的班级档案主键集合
     * @return 结果
     */
    public int deleteEduClassByClassIds(Long[] classIds);

    /**
     * 删除班级档案信息
     * 
     * @param classId 班级档案主键
     * @return 结果
     */
    public int deleteEduClassByClassId(Long classId);
}
