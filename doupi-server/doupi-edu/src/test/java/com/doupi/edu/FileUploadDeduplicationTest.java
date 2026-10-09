package com.doupi.edu;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Comparator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import com.doupi.common.utils.file.FileUploadUtils;

/**
 * 文件上传相同文件检测秒传 (Deduplication Upload) 单元测试
 */
public class FileUploadDeduplicationTest 
{
    private static Path tempBaseDir;

    @BeforeAll
    public static void setUp() throws IOException 
    {
        tempBaseDir = Files.createTempDirectory("doupi_upload_test_");
        new com.doupi.common.config.DoupiConfig().setProfile(tempBaseDir.toAbsolutePath().toString());
    }

    @AfterAll
    public static void tearDown() throws IOException 
    {
        new com.doupi.common.config.DoupiConfig().setProfile(null);
        if (tempBaseDir != null && Files.exists(tempBaseDir)) 
        {
            Files.walk(tempBaseDir)
                .sorted(Comparator.reverseOrder())
                .map(Path::toFile)
                .forEach(File::delete);
        }
    }

    @Test
    public void testFileDeduplicationAndInstantUpload() throws Exception 
    {
        String baseDir = tempBaseDir.toAbsolutePath().toString();
        byte[] content = "Hello World Doupi School Platform Instant Upload Content".getBytes();
        String fileHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

        MockMultipartFile file1 = new MockMultipartFile(
            "file", 
            "周测试题.docx", 
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
            content
        );

        // 1. 首次上传：未命中秒传，写入全局 hash/ 目录
        String initialCheck = FileUploadUtils.findByHash(baseDir, fileHash, "docx");
        Assertions.assertNull(initialCheck, "首次上传前哈希未命中");

        String uploadedPath1 = FileUploadUtils.upload(baseDir, file1, fileHash);
        Assertions.assertNotNull(uploadedPath1, "首次上传应返回文件访问路径");
        Assertions.assertTrue(uploadedPath1.contains("hash/" + fileHash + ".docx"), "应归档于全局 hash 目录");

        // 2. 第二次上传相同文件：findByHash 极速命中秒传，直接返回已有相对路径
        String hitPath = FileUploadUtils.findByHash(baseDir, fileHash, "docx");
        Assertions.assertNotNull(hitPath, "第二次上传应直接命中已有文件");
        Assertions.assertEquals(uploadedPath1, hitPath, "秒传返回的路径应与首次上传完全一致");

        // 3. 再次模拟 upload 调用（传入相同文件与哈希）：不抛异常，且返回相同链接
        MockMultipartFile file2 = new MockMultipartFile(
            "file", 
            "周测试题_重命名.docx", 
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document", 
            content
        );
        String uploadedPath2 = FileUploadUtils.upload(baseDir, file2, fileHash);
        Assertions.assertEquals(uploadedPath1, uploadedPath2, "不同文件名但内容相同应复用同一路径");

        // 4. 不同内容（不同哈希）不能误命中
        String diffHash = "a1b2c3d4e5f600112233445566778899aabbccddeeff00112233445566778899";
        String diffCheck = FileUploadUtils.findByHash(baseDir, diffHash, "docx");
        Assertions.assertNull(diffCheck, "不同哈希的文件不应命中秒传");
    }
}
