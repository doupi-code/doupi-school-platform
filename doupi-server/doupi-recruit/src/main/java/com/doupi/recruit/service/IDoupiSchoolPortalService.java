package com.doupi.recruit.service;

import java.util.List;
import java.util.Map;

/**
 * 汉外华襄复读中心 - 官网门户数据与业务接口
 * 
 * @author doupi
 */
public interface IDoupiSchoolPortalService
{
    /**
     * 获取站点配置与公信力统计
     */
    Map<String, Object> getSiteInfo();

    /**
     * 获取教师名录（支持 group, category, subject 筛选）
     */
    List<Map<String, Object>> getTeachers(String group, String category, String subject);

    /**
     * 获取单个教师档案详情
     */
    Map<String, Object> getTeacherById(String id);

    /**
     * 获取校园资讯与公告列表（支持 kind, category 筛选）
     */
    List<Map<String, Object>> getArticles(String kind, String category, Integer page, Integer pageSize);

    /**
     * 获取资讯详情
     */
    Map<String, Object> getArticleDetail(String kind, String id);

    /**
     * 获取班型设置与学位名额
     */
    List<Map<String, Object>> getClassPlans();

    /**
     * 获取校园设施与导览点位（支持 zone 区域筛选）
     */
    List<Map<String, Object>> getFacilities(String zone);

    /**
     * 获取常见问答（支持 category 类别筛选）
     */
    List<Map<String, Object>> getFaqs(String category);

    /**
     * 更新站点配置与门户参数
     */
    void updateSiteInfo(Map<String, Object> data);
}
