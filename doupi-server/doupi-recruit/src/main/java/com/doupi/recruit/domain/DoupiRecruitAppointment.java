package com.doupi.recruit.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 访校预约对象 doupi_recruit_appointment
 * 
 * @author doupi
 */
public class DoupiRecruitAppointment extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 预约ID */
    private Long appointmentId;

    /** 预约单号 */
    @Excel(name = "预约单号")
    private String appointmentNo;

    /** 家长微信OpenID */
    private String openid;

    /** 状态: PENDING-待审核 APPROVED-已通过 CANCELLED-已取消 VERIFIED-已核销 */
    @Excel(name = "状态")
    private String status;

    /** 家长姓名 */
    @Excel(name = "家长姓名")
    private String parentName;

    /** 联系电话 */
    @Excel(name = "联系电话")
    private String parentPhone;

    /** 学生姓名 */
    @Excel(name = "学生姓名")
    private String studentName;

    /** 学生性别 */
    @Excel(name = "性别")
    private String studentGender;

    /** 意向/在读年级 */
    @Excel(name = "年级")
    private String studentGrade;

    /** 原就读学校 */
    @Excel(name = "原就读学校")
    private String currentSchool;

    /** 校区ID */
    private String campusId;

    /** 校区名称 */
    @Excel(name = "校区")
    private String campusName;

    /** 预约访校日期 */
    @Excel(name = "访校日期")
    private String visitDate;

    /** 预约时间段 */
    @Excel(name = "时间段")
    private String timeSlot;

    /** 核销凭证码 */
    @Excel(name = "核销码")
    private String checkInCode;

    /** 接待/对接教师ID */
    private String teacherId;

    /** 对接教师姓名 */
    @Excel(name = "接待教师")
    private String teacherName;

    /** 核销到校时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    @Excel(name = "核销时间", width = 30, dateFormat = "yyyy-MM-dd HH:mm:ss")
    private Date verifyTime;

    /** 核销人 */
    private String verifier;

    /** 家长备注/诉求 */
    private String remark;

    /** 审核备注 */
    private String auditRemark;

    public Long getAppointmentId() { return appointmentId; }
    public void setAppointmentId(Long appointmentId) { this.appointmentId = appointmentId; }

    public String getAppointmentNo() { return appointmentNo; }
    public void setAppointmentNo(String appointmentNo) { this.appointmentNo = appointmentNo; }

    public String getOpenid() { return openid; }
    public void setOpenid(String openid) { this.openid = openid; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getParentName() { return parentName; }
    public void setParentName(String parentName) { this.parentName = parentName; }

    public String getParentPhone() { return parentPhone; }
    public void setParentPhone(String parentPhone) { this.parentPhone = parentPhone; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getStudentGender() { return studentGender; }
    public void setStudentGender(String studentGender) { this.studentGender = studentGender; }

    public String getStudentGrade() { return studentGrade; }
    public void setStudentGrade(String studentGrade) { this.studentGrade = studentGrade; }

    public String getCurrentSchool() { return currentSchool; }
    public void setCurrentSchool(String currentSchool) { this.currentSchool = currentSchool; }

    public String getCampusId() { return campusId; }
    public void setCampusId(String campusId) { this.campusId = campusId; }

    public String getCampusName() { return campusName; }
    public void setCampusName(String campusName) { this.campusName = campusName; }

    public String getVisitDate() { return visitDate; }
    public void setVisitDate(String visitDate) { this.visitDate = visitDate; }

    public String getTimeSlot() { return timeSlot; }
    public void setTimeSlot(String timeSlot) { this.timeSlot = timeSlot; }

    public String getCheckInCode() { return checkInCode; }
    public void setCheckInCode(String checkInCode) { this.checkInCode = checkInCode; }

    public String getTeacherId() { return teacherId; }
    public void setTeacherId(String teacherId) { this.teacherId = teacherId; }

    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }

    public Date getVerifyTime() { return verifyTime; }
    public void setVerifyTime(Date verifyTime) { this.verifyTime = verifyTime; }

    public String getVerifier() { return verifier; }
    public void setVerifier(String verifier) { this.verifier = verifier; }

    @Override
    public String getRemark() { return remark; }
    @Override
    public void setRemark(String remark) { this.remark = remark; }

    public String getAuditRemark() { return auditRemark; }
    public void setAuditRemark(String auditRemark) { this.auditRemark = auditRemark; }
}
