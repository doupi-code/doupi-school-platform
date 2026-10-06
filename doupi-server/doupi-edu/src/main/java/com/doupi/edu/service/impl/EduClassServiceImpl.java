package com.doupi.edu.service.impl;

import java.util.List;
import com.doupi.common.utils.DateUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.edu.mapper.EduClassMapper;
import com.doupi.edu.domain.EduClass;
import com.doupi.edu.service.IEduClassService;

/**
 * 班级档案Service业务层处理
 * 
 * @author doupi
 * @date 2026-09-25
 */
@Service
public class EduClassServiceImpl implements IEduClassService 
{
    @Autowired
    private EduClassMapper eduClassMapper;

    /**
     * 查询班级档案
     * 
     * @param classId 班级档案主键
     * @return 班级档案
     */
    @Override
    public EduClass selectEduClassByClassId(Long classId)
    {
        return eduClassMapper.selectEduClassByClassId(classId);
    }

    /**
     * 查询班级档案列表
     * 
     * @param eduClass 班级档案
     * @return 班级档案
     */
    @Override
    public List<EduClass> selectEduClassList(EduClass eduClass)
    {
        return eduClassMapper.selectEduClassList(eduClass);
    }

    /**
     * 新增班级档案
     * 
     * @param eduClass 班级档案
     * @return 结果
     */
    @Override
    public int insertEduClass(EduClass eduClass)
    {
        checkGradeClassNameUnique(eduClass);
        eduClass.setDelFlag("0");
        eduClass.setCreateTime(DateUtils.getNowDate());
        return eduClassMapper.insertEduClass(eduClass);
    }

    /**
     * 修改班级档案
     * 
     * @param eduClass 班级档案
     * @return 结果
     */
    @Override
    public int updateEduClass(EduClass eduClass)
    {
        checkGradeClassNameUnique(eduClass);
        eduClass.setUpdateTime(DateUtils.getNowDate());
        return eduClassMapper.updateEduClass(eduClass);
    }

    private void checkGradeClassNameUnique(EduClass eduClass)
    {
        if (eduClass.getGrade() == null || eduClass.getClassName() == null)
        {
            return;
        }
        EduClass query = new EduClass();
        query.setGrade(eduClass.getGrade());
        query.setClassName(eduClass.getClassName());
        List<EduClass> list = eduClassMapper.selectEduClassList(query);
        for (EduClass item : list)
        {
            if (eduClass.getClassId() == null || !item.getClassId().equals(eduClass.getClassId()))
            {
                throw new com.doupi.common.exception.ServiceException("【" + eduClass.getGrade() + "】下已存在班级名称【" + eduClass.getClassName() + "】！");
            }
        }
    }

    /**
     * 批量删除班级档案
     * 
     * @param classIds 需要删除的班级档案主键
     * @return 结果
     */
    @Override
    public int deleteEduClassByClassIds(Long[] classIds)
    {
        return eduClassMapper.deleteEduClassByClassIds(classIds);
    }

    /**
     * 删除班级档案信息
     * 
     * @param classId 班级档案主键
     * @return 结果
     */
    @Override
    public int deleteEduClassByClassId(Long classId)
    {
        return eduClassMapper.deleteEduClassByClassId(classId);
    }
}
