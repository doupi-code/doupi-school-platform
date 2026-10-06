package com.doupi.common.core.domain.capability;

import java.io.Serializable;

/**
 * 文件存储与上传结果
 * 
 * @author doupi
 */
public class FileStorageResult implements Serializable
{
    private static final long serialVersionUID = 1L;

    /** 原始文件名 */
    private String originalName;

    /** 存储后生成的新文件名 */
    private String newFileName;

    /** 相对资源路径 (用于存储到数据库，例如 /profile/upload/2026/09/26/xxx.jpg) */
    private String relativePath;

    /** 完整网络访问 URL (例如 http://127.0.0.1:8080/profile/upload/2026/09/26/xxx.jpg) */
    private String url;

    /** 物理存储绝对路径 */
    private String absolutePath;

    /** 文件大小（字节） */
    private Long size;

    /** 易读文件大小（例如 2.45 MB） */
    private String humanSize;

    /** 文件类型/扩展名（例如 jpg） */
    private String extension;

    /** 校验哈希（SHA256或MD5） */
    private String hash;

    public FileStorageResult() {}

    public String getOriginalName()
    {
        return originalName;
    }

    public void setOriginalName(String originalName)
    {
        this.originalName = originalName;
    }

    public String getNewFileName()
    {
        return newFileName;
    }

    public void setNewFileName(String newFileName)
    {
        this.newFileName = newFileName;
    }

    public String getRelativePath()
    {
        return relativePath;
    }

    public void setRelativePath(String relativePath)
    {
        this.relativePath = relativePath;
    }

    public String getUrl()
    {
        return url;
    }

    public void setUrl(String url)
    {
        this.url = url;
    }

    public String getAbsolutePath()
    {
        return absolutePath;
    }

    public void setAbsolutePath(String absolutePath)
    {
        this.absolutePath = absolutePath;
    }

    public Long getSize()
    {
        return size;
    }

    public void setSize(Long size)
    {
        this.size = size;
    }

    public String getHumanSize()
    {
        return humanSize;
    }

    public void setHumanSize(String humanSize)
    {
        this.humanSize = humanSize;
    }

    public String getExtension()
    {
        return extension;
    }

    public void setExtension(String extension)
    {
        this.extension = extension;
    }

    public String getHash()
    {
        return hash;
    }

    public void setHash(String hash)
    {
        this.hash = hash;
    }
}
