package com.doupi.edu.mapper;

import java.util.List;
import com.doupi.edu.domain.EduTeacher;

/**
 * 教职工档案Mapper接口
 * 
 * @author ruoyi
 * @date 2026-09-25
 */
public interface EduTeacherMapper 
{
    /**
     * 查询教职工档案
     * 
     * @param teacherId 教职工档案主键
     * @return 教职工档案
     */
    public EduTeacher selectEduTeacherByTeacherId(Long teacherId);

    /**
     * 查询教职工档案列表
     * 
     * @param eduTeacher 教职工档案
     * @return 教职工档案集合
     */
    public List<EduTeacher> selectEduTeacherList(EduTeacher eduTeacher);

    /**
     * 新增教职工档案
     * 
     * @param eduTeacher 教职工档案
     * @return 结果
     */
    public int insertEduTeacher(EduTeacher eduTeacher);

    /**
     * 修改教职工档案
     * 
     * @param eduTeacher 教职工档案
     * @return 结果
     */
    public int updateEduTeacher(EduTeacher eduTeacher);

    /**
     * 删除教职工档案
     * 
     * @param teacherId 教职工档案主键
     * @return 结果
     */
    public int deleteEduTeacherByTeacherId(Long teacherId);

    /**
     * 批量删除教职工档案
     * 
     * @param teacherIds 需要删除的数据主键集合
     * @return 结果
     */
    public int deleteEduTeacherByTeacherIds(Long[] teacherIds);
}
