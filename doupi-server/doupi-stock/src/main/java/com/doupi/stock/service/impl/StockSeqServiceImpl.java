package com.doupi.stock.service.impl;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.common.core.redis.RedisCache;
import com.doupi.stock.mapper.StockInMapper;
import com.doupi.stock.mapper.StockOutMapper;
import com.doupi.stock.service.IStockSeqService;

/**
 * 教务单号生成服务实现类
 */
@Service
public class StockSeqServiceImpl implements IStockSeqService 
{
    @Autowired
    private RedisCache redisCache;

    @Autowired
    private StockInMapper stockInMapper;

    @Autowired
    private StockOutMapper stockOutMapper;

    @Override
    public synchronized String generateNo(String prefix) 
    {
        String dateStr = new SimpleDateFormat("yyyyMMdd").format(new Date());
        String redisKey = "seq:edu:" + prefix + ":" + dateStr;
        Integer seqInt = redisCache.getCacheObject(redisKey);
        long seq = 0L;
        if (seqInt != null) 
        {
            seq = seqInt.longValue();
        } 
        else 
        {
            // 如果缓存为空，则从数据库查询当天最大单号兜底
            String searchPrefix = prefix + dateStr;
            String maxNo = null;
            if ("RK".equals(prefix)) 
            {
                maxNo = stockInMapper.selectMaxInNo(searchPrefix);
            } 
            else if ("CK".equals(prefix)) 
            {
                maxNo = stockOutMapper.selectMaxOutNo(searchPrefix);
            }
            if (maxNo != null && maxNo.length() >= searchPrefix.length() + 3) 
            {
                try 
                {
                    String numPart = maxNo.substring(searchPrefix.length(), searchPrefix.length() + 3);
                    seq = Long.parseLong(numPart);
                } 
                catch (Exception ignored) {}
            }
        }
        seq++;
        redisCache.setCacheObject(redisKey, (int) seq, 2, TimeUnit.DAYS);
        return prefix + dateStr + String.format("%03d", seq);
    }
}
