package com.doupi.recruit.service;

import java.util.List;
import com.doupi.recruit.domain.DoupiRecruitCampus;

/**
 * 校区信息Service接口
 * 
 * @author doupi
 */
public interface IDoupiRecruitCampusService 
{
    public DoupiRecruitCampus selectDoupiRecruitCampusById(String campusId);

    public List<DoupiRecruitCampus> selectDoupiRecruitCampusList(DoupiRecruitCampus campus);

    public int insertDoupiRecruitCampus(DoupiRecruitCampus campus);

    public int updateDoupiRecruitCampus(DoupiRecruitCampus campus);

    public int deleteDoupiRecruitCampusById(String campusId);
}
