package com.doupi.edu.domain;

import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 教职工档案对象 edu_teacher
 * 
 * @author doupi
 * @date 2026-09-25
 */
public class EduTeacher extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 教师ID */
    private Long teacherId;

    /** 教师姓名 */
    @Excel(name = "教师姓名")
    private String teacherName;

    /** 所属部门 */
    @Excel(name = "所属部门")
    private String dept;

    /** 任教年级 */
    @Excel(name = "任教年级")
    private String grade;

    /** 任教班级 */
    @Excel(name = "任教班级")
    private String classIds;

    /** 任教科目 */
    @Excel(name = "任教科目")
    private String subject;

    /** 联系电话 */
    @Excel(name = "联系电话")
    private String phone;

    /** $column.columnComment */
    private String delFlag;

    /** 人员类型（前端传入，用于新建时分配角色：1任课老师 2行政人员），不持久化 */
    private String teacherType;

    /** 角色ID数组（前端传入，用于新建时分配角色），不持久化 */
    private Long[] roleIds;

    public void setTeacherId(Long teacherId) 
    {
        this.teacherId = teacherId;
    }

    public Long getTeacherId() 
    {
        return teacherId;
    }

    public void setTeacherName(String teacherName) 
    {
        this.teacherName = teacherName;
    }

    public String getTeacherName() 
    {
        return teacherName;
    }

    public void setDept(String dept) 
    {
        this.dept = dept;
    }

    public String getDept() 
    {
        return dept;
    }

    public void setGrade(String grade) 
    {
        this.grade = grade;
    }

    public String getGrade() 
    {
        return grade;
    }

    public void setClassIds(String classIds) 
    {
        this.classIds = classIds;
    }

    public String getClassIds() 
    {
        return classIds;
    }

    public void setSubject(String subject) 
    {
        this.subject = subject;
    }

    public String getSubject() 
    {
        return subject;
    }

    public void setPhone(String phone) 
    {
        this.phone = phone;
    }

    public String getPhone() 
    {
        return phone;
    }

    public void setDelFlag(String delFlag) 
    {
        this.delFlag = delFlag;
    }

    public String getDelFlag() 
    {
        return delFlag;
    }

    public void setTeacherType(String teacherType) 
    {
        this.teacherType = teacherType;
    }

    public String getTeacherType() 
    {
        return teacherType;
    }

    public void setRoleIds(Long[] roleIds) 
    {
        this.roleIds = roleIds;
    }

    public Long[] getRoleIds() 
    {
        return roleIds;
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this,ToStringStyle.MULTI_LINE_STYLE)
            .append("teacherId", getTeacherId())
            .append("teacherName", getTeacherName())
            .append("dept", getDept())
            .append("grade", getGrade())
            .append("classIds", getClassIds())
            .append("subject", getSubject())
            .append("phone", getPhone())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("delFlag", getDelFlag())
            .toString();
    }
}
