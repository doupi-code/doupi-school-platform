package com.doupi.recruit.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Param;
import com.doupi.recruit.domain.DoupiRecruitAppointment;

/**
 * 访校预约Mapper接口
 * 
 * @author doupi
 */
public interface DoupiRecruitAppointmentMapper 
{
    public DoupiRecruitAppointment selectDoupiRecruitAppointmentById(Long appointmentId);

    public DoupiRecruitAppointment selectDoupiRecruitAppointmentByNo(String appointmentNo);

    public DoupiRecruitAppointment selectDoupiRecruitAppointmentByCheckInCode(String checkInCode);

    public List<DoupiRecruitAppointment> selectDoupiRecruitAppointmentList(DoupiRecruitAppointment appointment);

    public int insertDoupiRecruitAppointment(DoupiRecruitAppointment appointment);

    public int updateDoupiRecruitAppointment(DoupiRecruitAppointment appointment);

    public int deleteDoupiRecruitAppointmentById(Long appointmentId);

    public int deleteDoupiRecruitAppointmentByIds(Long[] appointmentIds);

    public List<Map<String, Object>> countByStatus();

    public List<Map<String, Object>> countByGrade();

    public List<Map<String, Object>> countByVisitDate(@Param("startDate") String startDate, @Param("endDate") String endDate);
}
