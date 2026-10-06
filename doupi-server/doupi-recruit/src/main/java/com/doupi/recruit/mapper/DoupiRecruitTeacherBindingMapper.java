package com.doupi.recruit.mapper;

import java.util.List;
import com.doupi.recruit.domain.DoupiRecruitTeacherBinding;

/**
 * 教师招生绑定Mapper接口
 * 
 * @author doupi
 */
public interface DoupiRecruitTeacherBindingMapper 
{
    public DoupiRecruitTeacherBinding selectDoupiRecruitTeacherBindingById(Long bindingId);

    public DoupiRecruitTeacherBinding selectDoupiRecruitTeacherBindingByTeacherId(String teacherId);

    public List<DoupiRecruitTeacherBinding> selectDoupiRecruitTeacherBindingList(DoupiRecruitTeacherBinding binding);

    public int insertDoupiRecruitTeacherBinding(DoupiRecruitTeacherBinding binding);

    public int updateDoupiRecruitTeacherBinding(DoupiRecruitTeacherBinding binding);

    public int deleteDoupiRecruitTeacherBindingById(Long bindingId);
}
