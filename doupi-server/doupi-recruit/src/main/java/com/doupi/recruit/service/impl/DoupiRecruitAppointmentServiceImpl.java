package com.doupi.recruit.service.impl;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.common.utils.DateUtils;
import com.doupi.common.utils.StringUtils;
import com.doupi.recruit.domain.DoupiRecruitAppointment;
import com.doupi.recruit.mapper.DoupiRecruitAppointmentMapper;
import com.doupi.recruit.service.IDoupiRecruitAppointmentService;

/**
 * 访校预约Service业务层处理
 * 
 * @author doupi
 */
@Service
public class DoupiRecruitAppointmentServiceImpl implements IDoupiRecruitAppointmentService 
{
    @Autowired
    private DoupiRecruitAppointmentMapper appointmentMapper;

    @Override
    public DoupiRecruitAppointment selectDoupiRecruitAppointmentById(Long appointmentId)
    {
        return appointmentMapper.selectDoupiRecruitAppointmentById(appointmentId);
    }

    @Override
    public DoupiRecruitAppointment selectDoupiRecruitAppointmentByNo(String appointmentNo)
    {
        return appointmentMapper.selectDoupiRecruitAppointmentByNo(appointmentNo);
    }

    @Override
    public DoupiRecruitAppointment selectDoupiRecruitAppointmentByCheckInCode(String checkInCode)
    {
        return appointmentMapper.selectDoupiRecruitAppointmentByCheckInCode(checkInCode);
    }

    @Override
    public List<DoupiRecruitAppointment> selectDoupiRecruitAppointmentList(DoupiRecruitAppointment appointment)
    {
        return appointmentMapper.selectDoupiRecruitAppointmentList(appointment);
    }

    @Override
    public int insertDoupiRecruitAppointment(DoupiRecruitAppointment appointment)
    {
        if (StringUtils.isEmpty(appointment.getAppointmentNo()))
        {
            String dateStr = new SimpleDateFormat("yyyyMMdd").format(new Date());
            int rand = new Random().nextInt(9000) + 1000;
            appointment.setAppointmentNo("AP" + dateStr + rand);
        }
        if (StringUtils.isEmpty(appointment.getCheckInCode()))
        {
            int randCode = new Random().nextInt(900000) + 100000;
            appointment.setCheckInCode(String.valueOf(randCode));
        }
        if (StringUtils.isEmpty(appointment.getStatus()))
        {
            appointment.setStatus("APPROVED");
        }
        appointment.setCreateTime(DateUtils.getNowDate());
        return appointmentMapper.insertDoupiRecruitAppointment(appointment);
    }

    @Override
    public int updateDoupiRecruitAppointment(DoupiRecruitAppointment appointment)
    {
        appointment.setUpdateTime(DateUtils.getNowDate());
        return appointmentMapper.updateDoupiRecruitAppointment(appointment);
    }

    @Override
    public int deleteDoupiRecruitAppointmentByIds(Long[] appointmentIds)
    {
        return appointmentMapper.deleteDoupiRecruitAppointmentByIds(appointmentIds);
    }

    @Override
    public int deleteDoupiRecruitAppointmentById(Long appointmentId)
    {
        return appointmentMapper.deleteDoupiRecruitAppointmentById(appointmentId);
    }

    @Override
    public boolean verifyAppointment(String checkInCode, String verifier)
    {
        DoupiRecruitAppointment appointment = appointmentMapper.selectDoupiRecruitAppointmentByCheckInCode(checkInCode);
        if (appointment == null)
        {
            return false;
        }
        appointment.setStatus("VERIFIED");
        appointment.setVerifyTime(DateUtils.getNowDate());
        appointment.setVerifier(StringUtils.isNotEmpty(verifier) ? verifier : "管理员");
        return appointmentMapper.updateDoupiRecruitAppointment(appointment) > 0;
    }

    @Override
    public Map<String, Object> getDashboardStats()
    {
        Map<String, Object> res = new HashMap<>();
        List<Map<String, Object>> statusStats = appointmentMapper.countByStatus();
        List<Map<String, Object>> gradeStats = appointmentMapper.countByGrade();
        List<Map<String, Object>> dateStats = appointmentMapper.countByVisitDate(null, null);

        long totalCount = 0;
        long verifiedCount = 0;
        long pendingCount = 0;

        for (Map<String, Object> map : statusStats)
        {
            String st = (String) map.get("status");
            long cnt = ((Number) map.get("total")).longValue();
            totalCount += cnt;
            if ("VERIFIED".equalsIgnoreCase(st)) { verifiedCount += cnt; }
            if ("PENDING".equalsIgnoreCase(st)) { pendingCount += cnt; }
        }

        res.put("totalCount", totalCount);
        res.put("verifiedCount", verifiedCount);
        res.put("pendingCount", pendingCount);
        res.put("statusStats", statusStats);
        res.put("gradeStats", gradeStats);
        res.put("dateStats", dateStats);
        return res;
    }
}
