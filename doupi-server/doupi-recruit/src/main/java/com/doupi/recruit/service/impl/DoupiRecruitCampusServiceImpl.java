package com.doupi.recruit.service.impl;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.common.utils.DateUtils;
import com.doupi.recruit.domain.DoupiRecruitCampus;
import com.doupi.recruit.mapper.DoupiRecruitCampusMapper;
import com.doupi.recruit.service.IDoupiRecruitCampusService;

/**
 * 校区信息Service业务层处理
 * 
 * @author doupi
 */
@Service
public class DoupiRecruitCampusServiceImpl implements IDoupiRecruitCampusService 
{
    @Autowired
    private DoupiRecruitCampusMapper campusMapper;

    @Override
    public DoupiRecruitCampus selectDoupiRecruitCampusById(String campusId)
    {
        return campusMapper.selectDoupiRecruitCampusById(campusId);
    }

    @Override
    public List<DoupiRecruitCampus> selectDoupiRecruitCampusList(DoupiRecruitCampus campus)
    {
        return campusMapper.selectDoupiRecruitCampusList(campus);
    }

    @Override
    public int insertDoupiRecruitCampus(DoupiRecruitCampus campus)
    {
        campus.setCreateTime(DateUtils.getNowDate());
        return campusMapper.insertDoupiRecruitCampus(campus);
    }

    @Override
    public int updateDoupiRecruitCampus(DoupiRecruitCampus campus)
    {
        campus.setUpdateTime(DateUtils.getNowDate());
        return campusMapper.updateDoupiRecruitCampus(campus);
    }

    @Override
    public int deleteDoupiRecruitCampusById(String campusId)
    {
        return campusMapper.deleteDoupiRecruitCampusById(campusId);
    }
}
