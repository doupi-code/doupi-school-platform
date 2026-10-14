package com.doupi.edu.service;

import java.io.IOException;
import java.io.OutputStream;
import java.util.List;
import jakarta.servlet.http.HttpServletResponse;
import com.doupi.edu.domain.EduPrintRecord;

/**
 * 生产文印双Sheet台账导出服务接口
 * 
 * @author doupi
 * @date 2026-10-14
 */
public interface IPrintLedgerExportService
{
    /**
     * 导出文印双Sheet台账Excel到HTTP响应流
     * 
     * @param response HTTP响应对象
     * @param list 待导出的文印记录列表
     * @throws IOException IO异常
     */
    void exportLedger(HttpServletResponse response, List<EduPrintRecord> list) throws IOException;

    /**
     * 导出文印双Sheet台账Excel到指定的输出流（用于单元测试或文件保存）
     * 
     * @param outputStream 输出流
     * @param list 待导出的文印记录列表
     * @throws IOException IO异常
     */
    void exportLedgerToStream(OutputStream outputStream, List<EduPrintRecord> list) throws IOException;
}
