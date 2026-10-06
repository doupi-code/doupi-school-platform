package com.doupi.edu.mapper;

import java.util.List;
import java.util.Map;
import com.doupi.edu.domain.EduCelebration;

/**
 * 提分喜报Mapper接口
 * 
 * @author doupi
 */
public interface EduCelebrationMapper 
{
    public EduCelebration selectEduCelebrationById(Long celebrationId);

    public List<EduCelebration> selectEduCelebrationList(EduCelebration eduCelebration);

    public int insertEduCelebration(EduCelebration eduCelebration);

    public int updateEduCelebration(EduCelebration eduCelebration);

    public int deleteEduCelebrationById(Long celebrationId);

    public int deleteEduCelebrationByIds(Long[] celebrationIds);

    public int cleanEduCelebration();

    public Map<String, Object> selectCelebrationSummary(String batchTitle);

    public List<Map<String, Object>> selectCelebrationBatchList();
}
