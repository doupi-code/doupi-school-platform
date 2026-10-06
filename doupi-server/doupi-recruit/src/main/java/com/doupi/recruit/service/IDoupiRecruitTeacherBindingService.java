package com.doupi.recruit.service;

import java.util.List;
import com.doupi.recruit.domain.DoupiRecruitTeacherBinding;

/**
 * 教师招生绑定Service接口
 * 
 * @author doupi
 */
public interface IDoupiRecruitTeacherBindingService 
{
    public DoupiRecruitTeacherBinding selectDoupiRecruitTeacherBindingById(Long bindingId);

    public DoupiRecruitTeacherBinding selectDoupiRecruitTeacherBindingByTeacherId(String teacherId);

    public List<DoupiRecruitTeacherBinding> selectDoupiRecruitTeacherBindingList(DoupiRecruitTeacherBinding binding);

    public int insertDoupiRecruitTeacherBinding(DoupiRecruitTeacherBinding binding);

    public int updateDoupiRecruitTeacherBinding(DoupiRecruitTeacherBinding binding);

    public int auditBinding(Long bindingId, String status, String auditRemark);

    public int deleteDoupiRecruitTeacherBindingById(Long bindingId);
}
