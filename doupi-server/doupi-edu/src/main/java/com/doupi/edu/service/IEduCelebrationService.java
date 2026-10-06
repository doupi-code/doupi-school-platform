package com.doupi.edu.service;

import java.io.InputStream;
import java.util.List;
import java.util.Map;
import com.doupi.edu.domain.EduCelebration;

/**
 * 提分喜报Service接口
 * 
 * @author doupi
 */
public interface IEduCelebrationService 
{
    public EduCelebration selectEduCelebrationById(Long celebrationId);

    public List<EduCelebration> selectEduCelebrationList(EduCelebration eduCelebration);

    public int insertEduCelebration(EduCelebration eduCelebration);

    public int updateEduCelebration(EduCelebration eduCelebration);

    public int deleteEduCelebrationByIds(Long[] celebrationIds);

    public int deleteEduCelebrationById(Long celebrationId);

    public void cleanEduCelebration();

    public Map<String, Object> selectCelebrationSummary(String batchTitle);

    public List<Map<String, Object>> selectCelebrationBatchList();

    public String importCelebration(InputStream is, boolean updateSupport, String operName, String batchTitle);
}
