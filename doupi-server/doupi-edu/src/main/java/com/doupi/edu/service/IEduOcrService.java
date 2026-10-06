package com.doupi.edu.service;

import java.io.File;
import org.springframework.web.multipart.MultipartFile;
import com.doupi.edu.domain.dto.EduPrintOcrResult;

/**
 * 本地离线OCR及截图信息解析服务接口
 */
public interface IEduOcrService 
{
    /**
     * 解析微信截图
     * 
     * @param file 微信截图文件
     * @return 结构化提取结果
     */
    public EduPrintOcrResult parseScreenshot(MultipartFile file);

    /**
     * 根据直接文本内容结构化提取（供调试或手动粘贴文本使用）
     * 
     * @param text 输入文本
     * @return 结构化提取结果
     */
    public EduPrintOcrResult extractInfoFromText(String text);
}
