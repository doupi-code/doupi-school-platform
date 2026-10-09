package com.doupi.web.controller.common;

import java.util.ArrayList;
import java.util.List;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.apache.commons.io.FilenameUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.doupi.common.config.DoupiConfig;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.utils.StringUtils;
import com.doupi.common.utils.file.FileUploadUtils;
import com.doupi.common.utils.file.FileUtils;
import com.doupi.framework.config.ServerConfig;

/**
 * 通用请求处理
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/common")
public class CommonController
{
    private static final Logger log = LoggerFactory.getLogger(CommonController.class);

    @Autowired
    private ServerConfig serverConfig;

    private static final String FILE_DELIMITER = ",";

    /**
     * 通用下载请求
     * 
     * @param fileName 文件名称
     * @param delete 是否删除
     */
    @GetMapping("/download")
    public void fileDownload(String fileName, Boolean delete, HttpServletResponse response, HttpServletRequest request)
    {
        try
        {
            if (!FileUtils.checkAllowDownload(fileName))
            {
                throw new Exception(StringUtils.format("文件名称({})非法，不允许下载。 ", fileName));
            }
            String realFileName = System.currentTimeMillis() + fileName.substring(fileName.indexOf("_") + 1);
            String filePath = DoupiConfig.getDownloadPath() + fileName;

            response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE);
            FileUtils.setAttachmentResponseHeader(response, realFileName);
            FileUtils.writeBytes(filePath, response.getOutputStream());
            if (delete)
            {
                FileUtils.deleteFile(filePath);
            }
        }
        catch (Exception e)
        {
            log.error("下载文件失败", e);
        }
    }

    /**
     * 相同文件秒传预检接口（0流量秒传）
     * 前端计算文件SHA-256哈希后先发此请求进行轻量预检。
     * 若文件在服务端已存在，直接返回已有文件URL，前端无需传输文件体，瞬间完成秒传；未命中则返回 found=false。
     */
    @GetMapping("/check-hash")
    public AjaxResult checkFileHash(String fileHash, String extension, String originalFilename) throws Exception
    {
        try
        {
            if (StringUtils.isEmpty(fileHash))
            {
                return AjaxResult.error("文件哈希不能为空");
            }
            String ext = extension;
            if (StringUtils.isEmpty(ext) && StringUtils.isNotEmpty(originalFilename))
            {
                ext = FilenameUtils.getExtension(originalFilename);
            }
            if (StringUtils.isEmpty(ext))
            {
                return AjaxResult.error("无法识别文件扩展名");
            }

            String filePath = DoupiConfig.getUploadPath();
            String existingFileName = FileUploadUtils.findByHash(filePath, fileHash, ext);
            if (StringUtils.isNotEmpty(existingFileName))
            {
                String url = serverConfig.getUrl() + existingFileName;
                AjaxResult ajax = AjaxResult.success();
                ajax.put("found", true);
                ajax.put("deduplicated", true);
                ajax.put("url", url);
                ajax.put("fileName", existingFileName);
                ajax.put("newFileName", FileUtils.getName(existingFileName));
                ajax.put("originalFilename", originalFilename);
                return ajax;
            }

            AjaxResult ajax = AjaxResult.success();
            ajax.put("found", false);
            ajax.put("deduplicated", false);
            return ajax;
        }
        catch (Exception e)
        {
            return AjaxResult.error(e.getMessage());
        }
    }

    /**
     * 通用上传请求（单个）
     * 支持同文件秒传：前端传入 fileHash（文件内容哈希），后端据此检测已存在文件直接返回原链接
     */
    @PostMapping("/upload")
    public AjaxResult uploadFile(MultipartFile file, String fileHash) throws Exception
    {
        try
        {
            // 上传文件路径
            String filePath = DoupiConfig.getUploadPath();

            // 同文件秒传：若提供了内容哈希且对应文件已存在，直接返回已有链接，不重复存储
            if (StringUtils.isNotEmpty(fileHash))
            {
                String existingFileName = FileUploadUtils.findByHash(filePath, fileHash, FileUploadUtils.getExtension(file));
                if (StringUtils.isNotEmpty(existingFileName))
                {
                    String url = serverConfig.getUrl() + existingFileName;
                    AjaxResult ajax = AjaxResult.success();
                    ajax.put("url", url);
                    ajax.put("fileName", existingFileName);
                    ajax.put("newFileName", FileUtils.getName(existingFileName));
                    ajax.put("originalFilename", file.getOriginalFilename());
                    ajax.put("deduplicated", true);
                    return ajax;
                }
            }

            // 上传并返回新文件名称
            String fileName = FileUploadUtils.upload(filePath, file, fileHash);
            String url = serverConfig.getUrl() + fileName;
            AjaxResult ajax = AjaxResult.success();
            ajax.put("url", url);
            ajax.put("fileName", fileName);
            ajax.put("newFileName", FileUtils.getName(fileName));
            ajax.put("originalFilename", file.getOriginalFilename());
            return ajax;
        }
        catch (Exception e)
        {
            return AjaxResult.error(e.getMessage());
        }
    }

    /**
     * 通用上传请求（多个）
     */
    @PostMapping("/uploads")
    public AjaxResult uploadFiles(List<MultipartFile> files) throws Exception
    {
        try
        {
            // 上传文件路径
            String filePath = DoupiConfig.getUploadPath();
            List<String> urls = new ArrayList<String>();
            List<String> fileNames = new ArrayList<String>();
            List<String> newFileNames = new ArrayList<String>();
            List<String> originalFilenames = new ArrayList<String>();
            for (MultipartFile file : files)
            {
                // 上传并返回新文件名称
                String fileName = FileUploadUtils.upload(filePath, file);
                String url = serverConfig.getUrl() + fileName;
                urls.add(url);
                fileNames.add(fileName);
                newFileNames.add(FileUtils.getName(fileName));
                originalFilenames.add(file.getOriginalFilename());
            }
            AjaxResult ajax = AjaxResult.success();
            ajax.put("urls", StringUtils.join(urls, FILE_DELIMITER));
            ajax.put("fileNames", StringUtils.join(fileNames, FILE_DELIMITER));
            ajax.put("newFileNames", StringUtils.join(newFileNames, FILE_DELIMITER));
            ajax.put("originalFilenames", StringUtils.join(originalFilenames, FILE_DELIMITER));
            return ajax;
        }
        catch (Exception e)
        {
            return AjaxResult.error(e.getMessage());
        }
    }

    /**
     * 本地资源通用下载
     */
    @GetMapping("/download/resource")
    public void resourceDownload(String resource, HttpServletRequest request, HttpServletResponse response)
            throws Exception
    {
        try
        {
            if (!FileUtils.checkAllowDownload(resource))
            {
                throw new Exception(StringUtils.format("资源文件({})非法，不允许下载。 ", resource));
            }
            // 本地资源路径
            String localPath = DoupiConfig.getProfile();
            // 数据库资源地址
            String downloadPath = localPath + FileUtils.stripPrefix(resource);
            // 下载名称
            String downloadName = StringUtils.substringAfterLast(downloadPath, "/");
            response.setContentType(MediaType.APPLICATION_OCTET_STREAM_VALUE);
            FileUtils.setAttachmentResponseHeader(response, downloadName);
            FileUtils.writeBytes(downloadPath, response.getOutputStream());
        }
        catch (Exception e)
        {
            log.error("下载文件失败", e);
        }
    }
}
