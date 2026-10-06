package com.doupi.common.core.service;

import java.io.InputStream;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.multipart.MultipartFile;
import com.doupi.common.core.domain.capability.FileStorageResult;

/**
 * 统一文件存储与上下传服务接口
 * 
 * @author doupi
 */
public interface FileStorageService
{
    /**
     * 通用文件安全上传
     * 
     * @param file 上传的文件流对象
     * @param subDir 子目录模块名称 (如 avatar, campus, attachment)
     * @return 存储结果详情
     */
    FileStorageResult uploadFile(MultipartFile file, String subDir);

    /**
     * 图片专属上传（校验 MIME 类型和扩展名防注入）
     * 
     * @param file 图片文件
     * @param subDir 目录模块
     * @param maxMb 最大允许大小(MB)
     * @return 存储结果详情
     */
    FileStorageResult uploadImage(MultipartFile file, String subDir, int maxMb);

    /**
     * 安全文件流式下载
     * 
     * @param fileUrlOrPath 文件URL或相对路径
     * @param response HTTP响应流
     */
    void downloadFile(String fileUrlOrPath, HttpServletResponse response);

    /**
     * 删除已上传的文件
     * 
     * @param fileUrlOrPath 文件相对路径或URL
     * @return 是否删除成功
     */
    boolean deleteFile(String fileUrlOrPath);
}
