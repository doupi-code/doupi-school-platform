package com.doupi.stock.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.common.utils.StringUtils;
import com.doupi.stock.domain.vo.StockDashboardVo;
import com.doupi.stock.domain.vo.StockMonthlyReportVo;
import com.doupi.stock.domain.vo.StockDetailVo;
import com.doupi.stock.mapper.StockReportMapper;
import com.doupi.stock.service.IStockReportService;

/**
 * 统计报表Service业务处理
 */
@Service
public class StockReportServiceImpl implements IStockReportService 
{
    @Autowired
    private StockReportMapper stockReportMapper;

    private static final DateTimeFormatter YM_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    @Override
    public StockDashboardVo getDashboardData() 
    {
        StockDashboardVo vo = new StockDashboardVo();
        String currentMonth = LocalDate.now().format(YM_FORMATTER);

        // 1. 核心指标卡片
        BigDecimal monthlyIn = stockReportMapper.getMonthlyInAmount(currentMonth);
        BigDecimal monthlyOut = stockReportMapper.getMonthlyOutAmount(currentMonth);
        BigDecimal totalStock = stockReportMapper.getTotalStockAmount();
        Long warnCount = stockReportMapper.getWarnLowCount();

        vo.setMonthlyInAmount(monthlyIn != null ? monthlyIn : BigDecimal.ZERO);
        vo.setMonthlyOutAmount(monthlyOut != null ? monthlyOut : BigDecimal.ZERO);
        vo.setTotalStockAmount(totalStock != null ? totalStock : BigDecimal.ZERO);
        vo.setWarnLowCount(warnCount != null ? warnCount : 0L);

        // 2. 分类占比（确保三大标准分类完整呈现，即使未录入某类物品时也能平稳显示0存量）
        List<Map<String, Object>> catList = stockReportMapper.selectCategoryStockSummary();
        Map<String, Map<String, Object>> catMap = new HashMap<>();
        if (catList != null) 
        {
            for (Map<String, Object> map : catList) 
            {
                if (map.get("category") != null) 
                {
                    catMap.put(map.get("category").toString(), map);
                }
            }
        }
        List<Map<String, Object>> completeCatList = new ArrayList<>();
        String[][] standardCats = {{"1", "教师办公品"}, {"2", "学生教材"}, {"3", "文印耗材"}};
        for (String[] catDef : standardCats) 
        {
            Map<String, Object> map = catMap.get(catDef[0]);
            if (map == null) 
            {
                map = new HashMap<>();
                map.put("category", catDef[0]);
                map.put("name", catDef[1]);
                map.put("stockNum", 0L);
                map.put("goodsCount", 0L);
            }
            completeCatList.add(map);
        }
        vo.setCategoryStock(completeCatList);

        // 3. 近12个月出入库趋势
        LocalDate startMonthDate = LocalDate.now().minusMonths(11);
        String beginMonth = startMonthDate.format(YM_FORMATTER);

        List<Map<String, Object>> inSummary = stockReportMapper.selectMonthlyInSummary(beginMonth);
        List<Map<String, Object>> outSummary = stockReportMapper.selectMonthlyOutSummary(beginMonth);

        Map<String, Map<String, Object>> inMap = new HashMap<>();
        if (inSummary != null) 
        {
            for (Map<String, Object> map : inSummary) 
            {
                if (map.get("ym") != null) 
                {
                    inMap.put(map.get("ym").toString(), map);
                }
            }
        }

        Map<String, Map<String, Object>> outMap = new HashMap<>();
        if (outSummary != null) 
        {
            for (Map<String, Object> map : outSummary) 
            {
                if (map.get("ym") != null) 
                {
                    outMap.put(map.get("ym").toString(), map);
                }
            }
        }

        List<Map<String, Object>> trends = new ArrayList<>();
        LocalDate cur = startMonthDate;
        for (int i = 0; i < 12; i++) 
        {
            String ym = cur.format(YM_FORMATTER);
            Map<String, Object> item = new HashMap<>();
            item.put("month", ym);

            Map<String, Object> inData = inMap.get(ym);
            item.put("inAmount", inData != null && inData.get("inAmount") != null ? inData.get("inAmount") : BigDecimal.ZERO);
            item.put("inQty", inData != null && inData.get("inQty") != null ? inData.get("inQty") : 0);

            Map<String, Object> outData = outMap.get(ym);
            item.put("outAmount", outData != null && outData.get("outAmount") != null ? outData.get("outAmount") : BigDecimal.ZERO);
            item.put("outQty", outData != null && outData.get("outQty") != null ? outData.get("outQty") : 0);

            trends.add(item);
            cur = cur.plusMonths(1);
        }
        vo.setMonthlyTrends(trends);

        return vo;
    }

    @Override
    public List<StockDetailVo> selectStockDetailList(Map<String, Object> params) 
    {
        return stockReportMapper.selectStockDetailList(params);
    }

    @Override
    public List<StockMonthlyReportVo> selectMonthlyReportList(String year) 
    {
        if (StringUtils.isEmpty(year)) 
        {
            year = String.valueOf(LocalDate.now().getYear());
        }

        String beginMonth = year + "-01";
        List<Map<String, Object>> inSummary = stockReportMapper.selectMonthlyInSummary(beginMonth);
        List<Map<String, Object>> outSummary = stockReportMapper.selectMonthlyOutSummary(beginMonth);

        Map<String, Map<String, Object>> inMap = new HashMap<>();
        if (inSummary != null) 
        {
            for (Map<String, Object> map : inSummary) 
            {
                if (map.get("ym") != null) 
                {
                    inMap.put(map.get("ym").toString(), map);
                }
            }
        }

        Map<String, Map<String, Object>> outMap = new HashMap<>();
        if (outSummary != null) 
        {
            for (Map<String, Object> map : outSummary) 
            {
                if (map.get("ym") != null) 
                {
                    outMap.put(map.get("ym").toString(), map);
                }
            }
        }

        List<StockMonthlyReportVo> list = new ArrayList<>();
        for (int m = 1; m <= 12; m++) 
        {
            String monthStr = String.format("%s-%02d", year, m);
            StockMonthlyReportVo vo = new StockMonthlyReportVo();
            vo.setMonth(monthStr);

            Map<String, Object> inData = inMap.get(monthStr);
            if (inData != null) 
            {
                vo.setInOrderCount(inData.get("inOrders") != null ? ((Number) inData.get("inOrders")).longValue() : 0L);
                vo.setInQuantity(inData.get("inQty") != null ? ((Number) inData.get("inQty")).longValue() : 0L);
                vo.setInAmount(inData.get("inAmount") != null ? new BigDecimal(inData.get("inAmount").toString()) : BigDecimal.ZERO);
            }

            Map<String, Object> outData = outMap.get(monthStr);
            if (outData != null) 
            {
                vo.setOutOrderCount(outData.get("outOrders") != null ? ((Number) outData.get("outOrders")).longValue() : 0L);
                vo.setOutQuantity(outData.get("outQty") != null ? ((Number) outData.get("outQty")).longValue() : 0L);
                vo.setOutAmount(outData.get("outAmount") != null ? new BigDecimal(outData.get("outAmount").toString()) : BigDecimal.ZERO);
            }

            list.add(vo);
        }
        return list;
    }
}
