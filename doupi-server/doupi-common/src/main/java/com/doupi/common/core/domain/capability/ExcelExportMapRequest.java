package com.doupi.common.core.domain.capability;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

/**
 * 动态 Excel 导出请求入参
 * 
 * @author doupi
 */
public class ExcelExportMapRequest implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 导出文件名 (如: "招生预约报表") */
    private String fileName;

    /** Sheet页名称 */
    private String sheetName;

    /** 表头中文列名数组 */
    private List<String> headers;

    /** 数据字段 key 映射数组 */
    private List<String> fieldKeys;

    /** 数据项集合 */
    private List<Map<String, Object>> dataList;

    public ExcelExportMapRequest() {}

    public String getFileName()
    {
        return fileName;
    }

    public void setFileName(String fileName)
    {
        this.fileName = fileName;
    }

    public String getSheetName()
    {
        return com.doupi.common.utils.StringUtils.isNotEmpty(sheetName) ? sheetName : "Sheet1";
    }

    public void setSheetName(String sheetName)
    {
        this.sheetName = sheetName;
    }

    public List<String> getHeaders()
    {
        return headers;
    }

    public void setHeaders(List<String> headers)
    {
        this.headers = headers;
    }

    public List<String> getFieldKeys()
    {
        return fieldKeys;
    }

    public void setFieldKeys(List<String> fieldKeys)
    {
        this.fieldKeys = fieldKeys;
    }

    public List<Map<String, Object>> getDataList()
    {
        return dataList;
    }

    public void setDataList(List<Map<String, Object>> dataList)
    {
        this.dataList = dataList;
    }
}
