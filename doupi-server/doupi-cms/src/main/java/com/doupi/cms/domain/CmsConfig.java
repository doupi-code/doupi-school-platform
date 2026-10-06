package com.doupi.cms.domain;

import com.doupi.common.core.domain.BaseEntity;

/**
 * 官网门户参数表 doupi_cms_config
 * 
 * @author doupi
 */
public class CmsConfig extends BaseEntity
{
    private static final long serialVersionUID = 1L;

    /** 参数ID */
    private Long configId;

    /** 参数键名 */
    private String configKey;

    /** 参数键值 */
    private String configValue;

    /** 参数中文名称 */
    private String configName;

    /** 备注说明 */
    private String remark;

    public Long getConfigId()
    {
        return configId;
    }

    public void setConfigId(Long configId)
    {
        this.configId = configId;
    }

    public String getConfigKey()
    {
        return configKey;
    }

    public void setConfigKey(String configKey)
    {
        this.configKey = configKey;
    }

    public String getConfigValue()
    {
        return configValue;
    }

    public void setConfigValue(String configValue)
    {
        this.configValue = configValue;
    }

    public String getConfigName()
    {
        return configName;
    }

    public void setConfigName(String configName)
    {
        this.configName = configName;
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
