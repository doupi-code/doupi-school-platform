package com.doupi.recruit.handler.impl;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import com.doupi.common.core.domain.model.LoginUser;
import com.doupi.recruit.domain.DoupiRecruitCampus;
import com.doupi.recruit.handler.AbstractWxActionHandler;
import com.doupi.recruit.service.IDoupiRecruitCampusService;

/**
 * 校区详情处理器
 * 
 * @author doupi
 */
@Component
public class CampusHandler extends AbstractWxActionHandler
{
    @Autowired
    private IDoupiRecruitCampusService campusService;

    @Override
    public List<String> getActions()
    {
        return Arrays.asList("campus.summary", "campus.detail", "campus.adminDetail");
    }

    @Override
    public boolean isAuthRequired()
    {
        return false;
    }

    @Override
    public Object handle(Map<String, Object> payload, LoginUser loginUser) throws Exception
    {
        DoupiRecruitCampus campus = campusService.selectDoupiRecruitCampusById("default");
        if (campus == null)
        {
            campus = new DoupiRecruitCampus();
            campus.setTitle("汉外华襄高级中学");
            campus.setSummary("武汉汉阳区卓越寄宿制名校，师资雄厚，学风纯正。");
            campus.setAddress("湖北省武汉市汉阳区教育路88号");
            campus.setContactPhone("027-87654321");
        }
        Map<String, Object> res = new HashMap<>();
        res.put("campusId", campus.getCampusId());
        res.put("title", campus.getTitle());
        res.put("name", campus.getCampusName());
        res.put("summary", campus.getSummary());
        res.put("intro", campus.getIntro());
        res.put("address", campus.getAddress());
        res.put("contactPhone", campus.getContactPhone());
        res.put("nature", campus.getNature());
        res.put("section", campus.getSection());
        res.put("coverImage", campus.getCoverImage());
        res.put("published", true);
        return res;
    }
}
