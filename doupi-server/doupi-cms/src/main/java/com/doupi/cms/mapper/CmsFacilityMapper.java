package com.doupi.cms.mapper;

import java.util.List;
import com.doupi.cms.domain.CmsFacility;

/**
 * 官网校园设施Mapper接口
 * 
 * @author doupi
 */
public interface CmsFacilityMapper 
{
    public CmsFacility selectFacilityById(Long facilityId);

    public List<CmsFacility> selectFacilityList(CmsFacility facility);

    public int insertFacility(CmsFacility facility);

    public int updateFacility(CmsFacility facility);

    public int deleteFacilityById(Long facilityId);

    public int deleteFacilityByIds(Long[] facilityIds);
}
