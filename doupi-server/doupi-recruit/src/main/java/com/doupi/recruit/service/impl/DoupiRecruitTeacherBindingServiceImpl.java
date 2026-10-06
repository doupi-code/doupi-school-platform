package com.doupi.recruit.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.common.utils.DateUtils;
import com.doupi.recruit.domain.DoupiRecruitTeacherBinding;
import com.doupi.recruit.mapper.DoupiRecruitTeacherBindingMapper;
import com.doupi.recruit.service.IDoupiRecruitTeacherBindingService;

/**
 * 教师招生绑定Service业务层处理
 * 
 * @author doupi
 */
@Service
public class DoupiRecruitTeacherBindingServiceImpl implements IDoupiRecruitTeacherBindingService 
{
    @Autowired
    private DoupiRecruitTeacherBindingMapper bindingMapper;

    @Override
    public DoupiRecruitTeacherBinding selectDoupiRecruitTeacherBindingById(Long bindingId)
    {
        return bindingMapper.selectDoupiRecruitTeacherBindingById(bindingId);
    }

    @Override
    public DoupiRecruitTeacherBinding selectDoupiRecruitTeacherBindingByTeacherId(String teacherId)
    {
        return bindingMapper.selectDoupiRecruitTeacherBindingByTeacherId(teacherId);
    }

    @Override
    public List<DoupiRecruitTeacherBinding> selectDoupiRecruitTeacherBindingList(DoupiRecruitTeacherBinding binding)
    {
        return bindingMapper.selectDoupiRecruitTeacherBindingList(binding);
    }

    @Override
    public int insertDoupiRecruitTeacherBinding(DoupiRecruitTeacherBinding binding)
    {
        binding.setCreateTime(DateUtils.getNowDate());
        return bindingMapper.insertDoupiRecruitTeacherBinding(binding);
    }

    @Override
    public int updateDoupiRecruitTeacherBinding(DoupiRecruitTeacherBinding binding)
    {
        return bindingMapper.updateDoupiRecruitTeacherBinding(binding);
    }

    @Override
    public int auditBinding(Long bindingId, String status, String auditRemark)
    {
        DoupiRecruitTeacherBinding binding = bindingMapper.selectDoupiRecruitTeacherBindingById(bindingId);
        if (binding == null)
        {
            return 0;
        }
        binding.setStatus(status);
        binding.setAuditRemark(auditRemark);
        binding.setAuditTime(DateUtils.getNowDate());
        return bindingMapper.updateDoupiRecruitTeacherBinding(binding);
    }

    @Override
    public int deleteDoupiRecruitTeacherBindingById(Long bindingId)
    {
        return bindingMapper.deleteDoupiRecruitTeacherBindingById(bindingId);
    }
}
