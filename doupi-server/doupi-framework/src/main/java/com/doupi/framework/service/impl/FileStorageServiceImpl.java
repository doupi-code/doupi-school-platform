package com.doupi.framework.service.impl;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.Arrays;
import java.util.Date;
import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import org.apache.commons.io.FilenameUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.doupi.common.config.DoupiConfig;
import com.doupi.common.constant.Constants;
import com.doupi.common.core.domain.capability.FileStorageResult;
import com.doupi.common.core.service.FileStorageService;
import com.doupi.common.exception.ServiceException;
import com.doupi.common.utils.StringUtils;
import com.doupi.common.utils.file.FileUploadUtils;
import com.doupi.common.utils.file.FileUtils;
import com.doupi.common.utils.uuid.IdUtils;
import com.doupi.framework.config.ServerConfig;

/**
 * 统一文件存储与上下传实现类
 * 
 * @author doupi
 */
@Service
public class FileStorageServiceImpl implements FileStorageService
{
    private static final Logger log = LoggerFactory.getLogger(FileStorageServiceImpl.class);

    private static final List<String> ALLOWED_IMAGE_EXTENSIONS = Arrays.asList("jpg", "jpeg", "png", "gif", "webp", "svg");

    @Autowired
    private ServerConfig serverConfig;

    /**
     * 通用文件安全上传
     */
    @Override
    public FileStorageResult uploadFile(MultipartFile file, String subDir)
    {
        if (file == null || file.isEmpty())
        {
            throw new ServiceException("上传的文件不能为空");
        }

        try
        {
            String originalFilename = file.getOriginalFilename();
            String extension = FilenameUtils.getExtension(originalFilename);
            if (StringUtils.isEmpty(extension))
            {
                extension = "bin";
            }

            // 1. 生成安全存储路径与文件名
            String datePath = new SimpleDateFormat("yyyy/MM/dd").format(new Date());
            String module = StringUtils.isNotEmpty(subDir) ? subDir.replaceAll("[^a-zA-Z0-9_-]", "") : "common";
            String newFileName = IdUtils.fastSimpleUUID() + "." + extension;

            String baseDir = DoupiConfig.getProfile();
            String relativeDir = "/" + module + "/" + datePath;
            File targetDir = new File(baseDir + relativeDir);
            if (!targetDir.exists())
            {
                targetDir.mkdirs();
            }

            File targetFile = new File(targetDir, newFileName);
            file.transferTo(targetFile);

            // 2. 构造响应结果
            FileStorageResult res = new FileStorageResult();
            res.setOriginalName(originalFilename);
            res.setNewFileName(newFileName);
            res.setExtension(extension.toLowerCase());
            res.setSize(file.getSize());
            res.setHumanSize(formatFileSize(file.getSize()));
            res.setAbsolutePath(targetFile.getAbsolutePath());

            // 相对访问路径与完整 URL
            String relativePath = Constants.RESOURCE_PREFIX + relativeDir + "/" + newFileName;
            res.setRelativePath(relativePath);
            res.setUrl(serverConfig.getUrl() + relativePath);

            log.info("[FILE-UPLOAD] 文件上传成功 -> 原文件名: {}, 存储路径: {}, URL: {}", originalFilename, targetFile.getPath(), res.getUrl());
            return res;
        }
        catch (Exception e)
        {
            log.error("[FILE-UPLOAD] 上传文件失败: {}", e.getMessage(), e);
            throw new ServiceException("文件上传异常: " + e.getMessage());
        }
    }

    /**
     * 图片专属上传（校验 MIME 类型和扩展名防注入）
     */
    @Override
    public FileStorageResult uploadImage(MultipartFile file, String subDir, int maxMb)
    {
        if (file == null || file.isEmpty())
        {
            throw new ServiceException("上传的图片不能为空");
        }

        long limitBytes = (maxMb > 0 ? maxMb : 10) * 1024 * 1024L;
        if (file.getSize() > limitBytes)
        {
            throw new ServiceException(String.format("图片大小不能超过 %d MB", maxMb > 0 ? maxMb : 10));
        }

        String extension = FilenameUtils.getExtension(file.getOriginalFilename());
        if (StringUtils.isEmpty(extension) || !ALLOWED_IMAGE_EXTENSIONS.contains(extension.toLowerCase()))
        {
            throw new ServiceException("非法图片类型，仅支持: " + String.join(", ", ALLOWED_IMAGE_EXTENSIONS));
        }

        return uploadFile(file, StringUtils.isNotEmpty(subDir) ? subDir : "images");
    }

    /**
     * 安全文件流式下载
     */
    @Override
    public void downloadFile(String fileUrlOrPath, HttpServletResponse response)
    {
        if (StringUtils.isEmpty(fileUrlOrPath))
        {
            throw new ServiceException("下载路径不能为空");
        }

        try
        {
            // 防目录遍历
            if (fileUrlOrPath.contains("..") || fileUrlOrPath.contains("./"))
            {
                throw new ServiceException("非法文件路径");
            }

            // 提取本地物理文件路径
            String localPath = fileUrlOrPath;
            if (localPath.startsWith(Constants.RESOURCE_PREFIX))
            {
                localPath = localPath.substring(Constants.RESOURCE_PREFIX.length());
            }
            if (!localPath.startsWith(DoupiConfig.getProfile()))
            {
                localPath = DoupiConfig.getProfile() + (localPath.startsWith("/") ? localPath : ("/" + localPath));
            }

            File file = new File(localPath);
            if (!file.exists() || !file.isFile())
            {
                throw new ServiceException("目标文件不存在或已被删除");
            }

            String fileName = file.getName();
            response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE);
            FileUtils.setAttachmentResponseHeader(response, fileName);

            try (InputStream in = new FileInputStream(file))
            {
                org.apache.commons.io.IOUtils.copy(in, response.getOutputStream());
                response.getOutputStream().flush();
            }
        }
        catch (Exception e)
        {
            log.error("[FILE-DOWNLOAD] 下载失败: {}", e.getMessage(), e);
            throw new ServiceException("下载文件失败: " + e.getMessage());
        }
    }

    /**
     * 删除已上传的文件
     */
    @Override
    public boolean deleteFile(String fileUrlOrPath)
    {
        if (StringUtils.isEmpty(fileUrlOrPath)) return false;

        try
        {
            String localPath = fileUrlOrPath;
            if (localPath.contains(Constants.RESOURCE_PREFIX))
            {
                localPath = localPath.substring(localPath.indexOf(Constants.RESOURCE_PREFIX) + Constants.RESOURCE_PREFIX.length());
            }
            if (!localPath.startsWith(DoupiConfig.getProfile()))
            {
                localPath = DoupiConfig.getProfile() + (localPath.startsWith("/") ? localPath : ("/" + localPath));
            }

            File f = new File(localPath);
            if (f.exists() && f.isFile())
            {
                return f.delete();
            }
        }
        catch (Exception e)
        {
            log.warn("[FILE-DELETE] 删除文件异常: {}", e.getMessage());
        }
        return false;
    }

    private String formatFileSize(long bytes)
    {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return String.format("%.2f KB", bytes / 1024.0);
        return String.format("%.2f MB", bytes / (1024.0 * 1024.0));
    }
}
