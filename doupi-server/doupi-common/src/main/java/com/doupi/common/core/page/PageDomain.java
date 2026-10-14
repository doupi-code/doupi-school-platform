package com.doupi.common.core.page;

import com.doupi.common.utils.StringUtils;

/**
 * 分页数据
 * 
 * @author doupi
 */
public class PageDomain
{
    /** 当前记录起始索引 */
    private Integer pageNum;

    /** 每页显示记录数 */
    private Integer pageSize;

    /** 排序列 */
    private String orderByColumn;

    /** 排序的方向desc或者asc */
    private String isAsc = "asc";

    /** 完整自定义排序字符串（优先级高于 orderByColumn/isAsc） */
    private String orderBy;

    /** 分页参数合理化 */
    private Boolean reasonable = true;

    public String getOrderBy()
    {
        if (StringUtils.isNotEmpty(orderBy))
        {
            return orderBy;
        }
        if (StringUtils.isEmpty(orderByColumn))
        {
            return "";
        }
        // 如果包含逗号或显式指定了排序方向（多字段组合排序），按各字段解析驼峰并保留排序方向
        if (orderByColumn.contains(",") || orderByColumn.toLowerCase().contains(" asc") || orderByColumn.toLowerCase().contains(" desc"))
        {
            StringBuilder sb = new StringBuilder();
            String[] parts = orderByColumn.split(",");
            for (String part : parts)
            {
                String item = part.trim();
                if (StringUtils.isNotEmpty(item))
                {
                    String[] tokens = item.split("\\s+");
                    String col = convertColumnNameToUnderscore(tokens[0]);
                    String dir = tokens.length > 1 ? tokens[1] : isAsc;
                    if (sb.length() > 0)
                    {
                        sb.append(", ");
                    }
                    sb.append(col);
                    if (StringUtils.isNotEmpty(dir))
                    {
                        sb.append(" ").append(dir);
                    }
                }
            }
            return sb.toString();
        }
        return convertColumnNameToUnderscore(orderByColumn) + " " + isAsc;
    }

    private String convertColumnNameToUnderscore(String name)
    {
        if (StringUtils.isEmpty(name))
        {
            return "";
        }
        if (name.contains("."))
        {
            int dotIdx = name.indexOf(".");
            String prefix = name.substring(0, dotIdx + 1);
            String col = name.substring(dotIdx + 1);
            return prefix + StringUtils.toUnderScoreCase(col);
        }
        return StringUtils.toUnderScoreCase(name);
    }

    public Integer getPageNum()
    {
        return pageNum;
    }

    public void setPageNum(Integer pageNum)
    {
        this.pageNum = pageNum;
    }

    public Integer getPageSize()
    {
        return pageSize;
    }

    public void setPageSize(Integer pageSize)
    {
        this.pageSize = pageSize;
    }

    public String getOrderByColumn()
    {
        return orderByColumn;
    }

    public void setOrderByColumn(String orderByColumn)
    {
        this.orderByColumn = orderByColumn;
    }

    public String getIsAsc()
    {
        return isAsc;
    }

    public void setIsAsc(String isAsc)
    {
        if (StringUtils.isNotEmpty(isAsc))
        {
            // 兼容前端排序类型
            if ("ascending".equals(isAsc))
            {
                isAsc = "asc";
            }
            else if ("descending".equals(isAsc))
            {
                isAsc = "desc";
            }
            this.isAsc = isAsc;
        }
    }

    public Boolean getReasonable()
    {
        if (StringUtils.isNull(reasonable))
        {
            return Boolean.TRUE;
        }
        return reasonable;
    }

    public void setReasonable(Boolean reasonable)
    {
        this.reasonable = reasonable;
    }

    public String getOrderByParam()
    {
        return orderBy;
    }

    public void setOrderBy(String orderBy)
    {
        this.orderBy = orderBy;
    }
}
