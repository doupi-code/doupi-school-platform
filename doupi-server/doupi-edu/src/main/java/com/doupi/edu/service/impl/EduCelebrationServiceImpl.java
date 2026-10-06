package com.doupi.edu.service.impl;

import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Map;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.WorkbookFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.common.exception.ServiceException;
import com.doupi.common.utils.DateUtils;
import com.doupi.common.utils.StringUtils;
import com.doupi.edu.domain.EduCelebration;
import com.doupi.edu.mapper.EduCelebrationMapper;
import com.doupi.edu.service.IEduCelebrationService;

/**
 * 提分喜报Service业务层处理
 * 
 * @author doupi
 */
@Service
public class EduCelebrationServiceImpl implements IEduCelebrationService 
{
    private static final Logger log = LoggerFactory.getLogger(EduCelebrationServiceImpl.class);

    @Autowired
    private EduCelebrationMapper celebrationMapper;

    @Override
    public EduCelebration selectEduCelebrationById(Long celebrationId)
    {
        return celebrationMapper.selectEduCelebrationById(celebrationId);
    }

    @Override
    public List<EduCelebration> selectEduCelebrationList(EduCelebration eduCelebration)
    {
        return celebrationMapper.selectEduCelebrationList(eduCelebration);
    }

    @Override
    public int insertEduCelebration(EduCelebration eduCelebration)
    {
        if (StringUtils.isEmpty(eduCelebration.getMaskedName()) && StringUtils.isNotEmpty(eduCelebration.getStudentName()))
        {
            eduCelebration.setMaskedName(maskName(eduCelebration.getStudentName()));
        }
        if (eduCelebration.getUpgradeScore() == null && eduCelebration.getAfterScore() != null && eduCelebration.getBeforeScore() != null)
        {
            eduCelebration.setUpgradeScore(eduCelebration.getAfterScore().subtract(eduCelebration.getBeforeScore()));
        }
        if (StringUtils.isEmpty(eduCelebration.getTag()))
        {
            eduCelebration.setTag(computeTag(eduCelebration.getAfterScore(), eduCelebration.getUpgradeScore()));
        }
        eduCelebration.setCreateTime(DateUtils.getNowDate());
        return celebrationMapper.insertEduCelebration(eduCelebration);
    }

    @Override
    public int updateEduCelebration(EduCelebration eduCelebration)
    {
        if (StringUtils.isNotEmpty(eduCelebration.getStudentName()))
        {
            eduCelebration.setMaskedName(maskName(eduCelebration.getStudentName()));
        }
        if (eduCelebration.getUpgradeScore() == null && eduCelebration.getAfterScore() != null && eduCelebration.getBeforeScore() != null)
        {
            eduCelebration.setUpgradeScore(eduCelebration.getAfterScore().subtract(eduCelebration.getBeforeScore()));
        }
        if (StringUtils.isEmpty(eduCelebration.getTag()))
        {
            eduCelebration.setTag(computeTag(eduCelebration.getAfterScore(), eduCelebration.getUpgradeScore()));
        }
        eduCelebration.setUpdateTime(DateUtils.getNowDate());
        return celebrationMapper.updateEduCelebration(eduCelebration);
    }

    @Override
    public int deleteEduCelebrationByIds(Long[] celebrationIds)
    {
        return celebrationMapper.deleteEduCelebrationByIds(celebrationIds);
    }

    @Override
    public int deleteEduCelebrationById(Long celebrationId)
    {
        return celebrationMapper.deleteEduCelebrationById(celebrationId);
    }

    @Override
    public void cleanEduCelebration()
    {
        celebrationMapper.cleanEduCelebration();
    }

    @Override
    public Map<String, Object> selectCelebrationSummary(String batchTitle)
    {
        return celebrationMapper.selectCelebrationSummary(batchTitle);
    }

    @Override
    public List<Map<String, Object>> selectCelebrationBatchList()
    {
        return celebrationMapper.selectCelebrationBatchList();
    }

    /**
     * 智能导入 Excel 提分成绩单
     * 自动识别姓名、选科、原始分、现考分、提分值，并执行自动姓名脱敏
     */
    @Override
    public String importCelebration(InputStream is, boolean updateSupport, String operName, String batchTitle)
    {
        if (StringUtils.isEmpty(batchTitle))
        {
            batchTitle = "2026年高考提分光荣榜";
        }

        int successNum = 0;
        int failureNum = 0;
        StringBuilder successMsg = new StringBuilder();
        StringBuilder failureMsg = new StringBuilder();

        try (Workbook workbook = WorkbookFactory.create(is))
        {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null)
            {
                throw new ServiceException("导入Excel表单为空！");
            }

            int rowCount = sheet.getPhysicalNumberOfRows();
            if (rowCount <= 1)
            {
                throw new ServiceException("Excel表单无有效学生成绩数据！");
            }

            // 识别列头位置
            Row headRow = sheet.getRow(0);
            int nameCol = 0;
            int subjCol = 1;
            int beforeCol = 2;
            int afterCol = 3;
            int upgradeCol = 4;
            boolean hasHeader = false;

            if (headRow != null)
            {
                for (int c = 0; c < headRow.getLastCellNum(); c++)
                {
                    String val = getCellValueAsString(headRow.getCell(c));
                    if (StringUtils.isEmpty(val)) continue;
                    val = val.trim();
                    if (val.contains("姓名")) { nameCol = c; hasHeader = true; }
                    else if (val.contains("选科") || val.contains("科目") || val.contains("方向")) { subjCol = c; hasHeader = true; }
                    else if (val.contains("高考") || val.contains("前考") || val.contains("原始") || val.contains("入学")) { beforeCol = c; hasHeader = true; }
                    else if (val.contains("三调") || val.contains("现考") || val.contains("提升后") || val.contains("本次") || val.contains("二调")) { afterCol = c; hasHeader = true; }
                    else if (val.contains("提分") || val.contains("增幅") || val.contains("对比")) { upgradeCol = c; hasHeader = true; }
                }
            }

            int startRow = hasHeader ? 1 : 0;
            for (int r = startRow; r <= sheet.getLastRowNum(); r++)
            {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                String name = getCellValueAsString(row.getCell(nameCol));
                if (StringUtils.isEmpty(name) || "姓名".equals(name.trim()) || "学生姓名".equals(name.trim()))
                {
                    continue;
                }
                name = name.trim();

                try
                {
                    String subject = getCellValueAsString(row.getCell(subjCol));
                    BigDecimal beforeScore = parseScore(getCellValueAsString(row.getCell(beforeCol)));
                    BigDecimal afterScore = parseScore(getCellValueAsString(row.getCell(afterCol)));
                    BigDecimal upgradeScore = parseScore(getCellValueAsString(row.getCell(upgradeCol)));

                    // 若无选科列或选科为数字，自适应微调
                    if (isNumericString(subject))
                    {
                        // 可能第二列是分数
                        BigDecimal tempBefore = parseScore(subject);
                        if (tempBefore != null)
                        {
                            beforeScore = tempBefore;
                            subject = "综合";
                        }
                    }

                    // 自动计算提分值
                    if (upgradeScore == null && afterScore != null && beforeScore != null)
                    {
                        upgradeScore = afterScore.subtract(beforeScore);
                    }

                    EduCelebration cel = new EduCelebration();
                    cel.setStudentName(name);
                    cel.setMaskedName(maskName(name));
                    cel.setSubject(StringUtils.isNotEmpty(subject) ? subject : "物化生");
                    cel.setBeforeScore(beforeScore);
                    cel.setAfterScore(afterScore);
                    cel.setUpgradeScore(upgradeScore);
                    cel.setBatchTitle(batchTitle);
                    cel.setTag(computeTag(afterScore, upgradeScore));
                    cel.setStatus("0");
                    cel.setCreateBy(operName);
                    cel.setCreateTime(new Date());

                    celebrationMapper.insertEduCelebration(cel);
                    successNum++;
                }
                catch (Exception e)
                {
                    failureNum++;
                    String msg = "<br/>第" + (r + 1) + "行学生【" + name + "】导入失败：" + e.getMessage();
                    failureMsg.append(msg);
                    log.error(msg, e);
                }
            }
        }
        catch (Exception e)
        {
            throw new ServiceException("解析Excel表格异常：" + e.getMessage());
        }

        if (failureNum > 0)
        {
            failureMsg.insert(0, "很遗憾，部分成绩导入失败！共 " + failureNum + " 条错误：");
            throw new ServiceException(failureMsg.toString());
        }
        else
        {
            successMsg.append("恭喜您，已成功导入 ").append(successNum).append(" 条学子成绩数据！");
        }
        return successMsg.toString();
    }

    public static String maskName(String name)
    {
        if (StringUtils.isEmpty(name)) return "";
        name = name.trim();
        int len = name.length();
        if (len <= 1) return name;
        if (len == 2) return name.charAt(0) + "*";
        StringBuilder sb = new StringBuilder();
        sb.append(name.charAt(0));
        for (int i = 0; i < len - 2; i++)
        {
            sb.append("*");
        }
        sb.append(name.charAt(len - 1));
        return sb.toString();
    }

    private String computeTag(BigDecimal after, BigDecimal upgrade)
    {
        if (after != null && after.compareTo(new BigDecimal("660")) >= 0) return "稳录清北";
        if (after != null && after.compareTo(new BigDecimal("620")) >= 0) return "C9名校";
        if (after != null && after.compareTo(new BigDecimal("600")) >= 0) return "特控高分";
        if (upgrade != null && upgrade.compareTo(new BigDecimal("100")) >= 0) return "逆袭百分子";
        if (upgrade != null && upgrade.compareTo(new BigDecimal("60")) >= 0) return "卓越提分";
        if (after != null && after.compareTo(new BigDecimal("500")) >= 0) return "一本冲刺";
        return "显著进步";
    }

    private BigDecimal parseScore(String str)
    {
        if (StringUtils.isEmpty(str)) return null;
        try
        {
            str = str.replaceAll("[^0-9.]", "").trim();
            if (StringUtils.isEmpty(str)) return null;
            return new BigDecimal(str).setScale(1, RoundingMode.HALF_UP);
        }
        catch (Exception e)
        {
            return null;
        }
    }

    private boolean isNumericString(String str)
    {
        if (StringUtils.isEmpty(str)) return false;
        return str.matches("^[0-9]+(\\.[0-9]+)?$");
    }

    private String getCellValueAsString(Cell cell)
    {
        if (cell == null) return "";
        if (cell.getCellType() == CellType.STRING) return cell.getStringCellValue();
        if (cell.getCellType() == CellType.NUMERIC) {
            double d = cell.getNumericCellValue();
            if (d == (long) d) return String.valueOf((long) d);
            return String.valueOf(d);
        }
        if (cell.getCellType() == CellType.BOOLEAN) return String.valueOf(cell.getBooleanCellValue());
        return "";
    }
}
