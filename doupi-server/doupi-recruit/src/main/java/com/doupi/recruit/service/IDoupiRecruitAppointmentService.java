package com.doupi.recruit.service;

import java.util.List;
import java.util.Map;
import com.doupi.recruit.domain.DoupiRecruitAppointment;

/**
 * 访校预约Service接口
 * 
 * @author doupi
 */
public interface IDoupiRecruitAppointmentService 
{
    public DoupiRecruitAppointment selectDoupiRecruitAppointmentById(Long appointmentId);

    public DoupiRecruitAppointment selectDoupiRecruitAppointmentByNo(String appointmentNo);

    public DoupiRecruitAppointment selectDoupiRecruitAppointmentByCheckInCode(String checkInCode);

    public List<DoupiRecruitAppointment> selectDoupiRecruitAppointmentList(DoupiRecruitAppointment appointment);

    public int insertDoupiRecruitAppointment(DoupiRecruitAppointment appointment);

    public int updateDoupiRecruitAppointment(DoupiRecruitAppointment appointment);

    public int deleteDoupiRecruitAppointmentByIds(Long[] appointmentIds);

    public int deleteDoupiRecruitAppointmentById(Long appointmentId);

    public boolean verifyAppointment(String checkInCode, String verifier);

    public Map<String, Object> getDashboardStats();
}
