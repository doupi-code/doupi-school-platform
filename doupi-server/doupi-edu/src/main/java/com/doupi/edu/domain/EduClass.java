package com.doupi.edu.domain;

import org.apache.commons.lang3.builder.ToStringBuilder;
import org.apache.commons.lang3.builder.ToStringStyle;
import com.doupi.common.annotation.Excel;
import com.doupi.common.core.domain.BaseEntity;

/**
 * 班级档案对象 edu_class
 * 
 * @author doupi
 * @date 2026-09-25
 */
public class EduClass extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 班级ID */
    private Long classId;

    /** 年级 */
    @Excel(name = "年级")
    private String grade;

    /** 班级名称 */
    @Excel(name = "班级名称")
    private String className;

    /** 班级人数 */
    @Excel(name = "班级人数")
    private Long studentNum;

    /** 班主任教师ID */
    private Long headTeacherId;

    /** 班主任姓名 */
    @Excel(name = "班主任")
    private String headTeacher;

    /** $column.columnComment */
    private String delFlag;

    public void setHeadTeacherId(Long headTeacherId) 
    {
        this.headTeacherId = headTeacherId;
    }

    public Long getHeadTeacherId() 
    {
        return headTeacherId;
    }

    public void setHeadTeacher(String headTeacher) 
    {
        this.headTeacher = headTeacher;
    }

    public String getHeadTeacher() 
    {
        return headTeacher;
    }

    public void setClassId(Long classId) 
    {
        this.classId = classId;
    }

    public Long getClassId() 
    {
        return classId;
    }

    public void setGrade(String grade) 
    {
        this.grade = grade;
    }

    public String getGrade() 
    {
        return grade;
    }

    public void setClassName(String className) 
    {
        this.className = className;
    }

    public String getClassName() 
    {
        return className;
    }

    public void setStudentNum(Long studentNum) 
    {
        this.studentNum = studentNum;
    }

    public Long getStudentNum() 
    {
        return studentNum;
    }

    public void setDelFlag(String delFlag) 
    {
        this.delFlag = delFlag;
    }

    public String getDelFlag() 
    {
        return delFlag;
    }

    @Override
    public String toString() {
        return new ToStringBuilder(this,ToStringStyle.MULTI_LINE_STYLE)
            .append("classId", getClassId())
            .append("grade", getGrade())
            .append("className", getClassName())
            .append("studentNum", getStudentNum())
            .append("headTeacherId", getHeadTeacherId())
            .append("headTeacher", getHeadTeacher())
            .append("createBy", getCreateBy())
            .append("createTime", getCreateTime())
            .append("updateBy", getUpdateBy())
            .append("updateTime", getUpdateTime())
            .append("delFlag", getDelFlag())
            .toString();
    }
}
