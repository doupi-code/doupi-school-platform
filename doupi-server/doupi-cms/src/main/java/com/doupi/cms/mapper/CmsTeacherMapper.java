package com.doupi.cms.mapper;

import java.util.List;
import com.doupi.cms.domain.CmsTeacher;

/**
 * 官网名师天团Mapper接口
 * 
 * @author doupi
 */
public interface CmsTeacherMapper 
{
    public CmsTeacher selectTeacherById(Long teacherId);

    public List<CmsTeacher> selectTeacherList(CmsTeacher teacher);

    public int insertTeacher(CmsTeacher teacher);

    public int updateTeacher(CmsTeacher teacher);

    public int deleteTeacherById(Long teacherId);

    public int deleteTeacherByIds(Long[] teacherIds);
}
