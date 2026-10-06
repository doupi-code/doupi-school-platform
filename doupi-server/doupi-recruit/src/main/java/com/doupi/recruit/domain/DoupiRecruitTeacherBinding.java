package com.doupi.recruit.domain;

import java.util.Date;
import com.fasterxml.jackson.annotation.JsonFormat;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 教师招生绑定对象 doupi_recruit_teacher_binding
 * 
 * @author doupi
 */
public class DoupiRecruitTeacherBinding extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 绑定ID */
    private Long bindingId;

    /** 教师用户标识/ID */
    private String teacherId;

    /** 教师姓名 */
    @Excel(name = "教师姓名")
    private String teacherName;

    /** 教师手机号 */
    @Excel(name = "教师手机号")
    private String teacherPhone;

    /** 招生主管ID */
    private String directorId;

    /** 招生主管姓名 */
    @Excel(name = "招生主管")
    private String directorName;

    /** 状态: PENDING-待审核 APPROVED-已通过 REJECTED-已驳回 */
    @Excel(name = "状态")
    private String status;

    /** 审批意见 */
    @Excel(name = "审批意见")
    private String auditRemark;

    /** 审批时间 */
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private Date auditTime;

    public Long getBindingId() { return bindingId; }
    public void setBindingId(Long bindingId) { this.bindingId = bindingId; }

    public String getTeacherId() { return teacherId; }
    public void setTeacherId(String teacherId) { this.teacherId = teacherId; }

    public String getTeacherName() { return teacherName; }
    public void setTeacherName(String teacherName) { this.teacherName = teacherName; }

    public String getTeacherPhone() { return teacherPhone; }
    public void setTeacherPhone(String teacherPhone) { this.teacherPhone = teacherPhone; }

    public String getDirectorId() { return directorId; }
    public void setDirectorId(String directorId) { this.directorId = directorId; }

    public String getDirectorName() { return directorName; }
    public void setDirectorName(String directorName) { this.directorName = directorName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAuditRemark() { return auditRemark; }
    public void setAuditRemark(String auditRemark) { this.auditRemark = auditRemark; }

    public Date getAuditTime() { return auditTime; }
    public void setAuditTime(Date auditTime) { this.auditTime = auditTime; }
}
