package com.doupi.edu.service.impl;

import java.util.List;
import com.doupi.common.utils.DateUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.edu.mapper.EduTeacherMapper;
import com.doupi.edu.domain.EduTeacher;
import com.doupi.edu.service.IEduTeacherService;

/**
 * 教职工档案Service业务层处理
 * 
 * @author doupi
 * @date 2026-09-25
 */
@Service
public class EduTeacherServiceImpl implements IEduTeacherService 
{
    @Autowired
    private EduTeacherMapper eduTeacherMapper;

    /**
     * 查询教职工档案
     * 
     * @param teacherId 教职工档案主键
     * @return 教职工档案
     */
    @Override
    public EduTeacher selectEduTeacherByTeacherId(Long teacherId)
    {
        return eduTeacherMapper.selectEduTeacherByTeacherId(teacherId);
    }

    /**
     * 查询教职工档案列表
     * 
     * @param eduTeacher 教职工档案
     * @return 教职工档案
     */
    @Override
    public List<EduTeacher> selectEduTeacherList(EduTeacher eduTeacher)
    {
        return eduTeacherMapper.selectEduTeacherList(eduTeacher);
    }

    /**
     * 新增教职工档案
     * 
     * @param eduTeacher 教职工档案
     * @return 结果
     */
    @Override
    public int insertEduTeacher(EduTeacher eduTeacher)
    {
        eduTeacher.setDelFlag("0");
        eduTeacher.setCreateTime(DateUtils.getNowDate());
        return eduTeacherMapper.insertEduTeacher(eduTeacher);
    }

    /**
     * 修改教职工档案
     * 
     * @param eduTeacher 教职工档案
     * @return 结果
     */
    @Override
    public int updateEduTeacher(EduTeacher eduTeacher)
    {
        eduTeacher.setUpdateTime(DateUtils.getNowDate());
        return eduTeacherMapper.updateEduTeacher(eduTeacher);
    }

    /**
     * 批量删除教职工档案
     * 
     * @param teacherIds 需要删除的教职工档案主键
     * @return 结果
     */
    @Override
    public int deleteEduTeacherByTeacherIds(Long[] teacherIds)
    {
        return eduTeacherMapper.deleteEduTeacherByTeacherIds(teacherIds);
    }

    /**
     * 删除教职工档案信息
     * 
     * @param teacherId 教职工档案主键
     * @return 结果
     */
    @Override
    public int deleteEduTeacherByTeacherId(Long teacherId)
    {
        return eduTeacherMapper.deleteEduTeacherByTeacherId(teacherId);
    }
}
