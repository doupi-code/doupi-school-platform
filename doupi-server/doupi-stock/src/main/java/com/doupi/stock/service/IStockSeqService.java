package com.doupi.stock.service;

/**
 * 教务单号生成服务
 */
public interface IStockSeqService 
{
    /**
     * 生成单号：前缀 + yyyyMMdd + 3位流水号（每日递增从001开始）
     * 
     * @param prefix 单号前缀（RK/CK/PD）
     * @return 格式化单号
     */
    public String generateNo(String prefix);
}
