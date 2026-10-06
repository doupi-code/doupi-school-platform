package com.doupi.cms.domain;

import com.doupi.common.core.domain.BaseEntity;

/**
 * 官网全局布局与公共组件配置实体 doupi_cms_global
 * 
 * @author doupi
 */
public class CmsGlobal extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 主键ID */
    private Long id;

    /** 布局类别: header, footer, seo, floating */
    private String category;

    /** 具体配置结构化JSON字符串 */
    private String configContent;

    /** 说明备注 */
    private String remark;

    public Long getId()
    {
        return id;
    }

    public void setId(Long id)
    {
        this.id = id;
    }

    public String getCategory()
    {
        return category;
    }

    public void setCategory(String category)
    {
        this.category = category;
    }

    public String getConfigContent()
    {
        return configContent;
    }

    public void setConfigContent(String configContent)
    {
        this.configContent = configContent;
    }

    public String getRemark()
    {
        return remark;
    }

    public void setRemark(String remark)
    {
        this.remark = remark;
    }
}
