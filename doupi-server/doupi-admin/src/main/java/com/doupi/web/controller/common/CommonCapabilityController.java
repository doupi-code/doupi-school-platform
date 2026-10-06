package com.doupi.web.controller.common;

import java.util.List;
import java.util.Map;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import com.doupi.common.annotation.Anonymous;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.core.domain.capability.ExcelExportMapRequest;
import com.doupi.common.core.domain.capability.FileStorageResult;
import com.doupi.common.core.domain.capability.PushMessageRequest;
import com.doupi.common.core.domain.capability.SmsResult;
import com.doupi.common.core.service.FileStorageService;
import com.doupi.common.core.service.PushNotificationService;
import com.doupi.common.core.service.SmsService;
import com.doupi.common.utils.poi.DynamicExcelUtil;

/**
 * 统一核心能力控制台 Controller (短信、消息推送、Excel动态导入导出、文件存储上下传)
 * 
 * @author doupi
 */
@Anonymous
@RestController
@RequestMapping("/common/capability")
public class CommonCapabilityController
{
    @Autowired
    private SmsService smsService;

    @Autowired
    private PushNotificationService pushNotificationService;

    @Autowired
    private FileStorageService fileStorageService;

    // ==================== 1. 短信能力 ====================

    /**
     * 发送手机验证码 (自动缓存 Redis，5分钟有效)
     */
    @PostMapping("/sms/send-code")
    public AjaxResult sendSmsCode(@RequestParam("phone") String phone,
            @RequestParam(value = "expireMinutes", defaultValue = "5") int expireMinutes)
    {
        SmsResult res = smsService.sendVerificationCode(phone, expireMinutes);
        if (res.isSuccess())
        {
            AjaxResult ajax = AjaxResult.success(res.getMessage());
            ajax.put("requestId", res.getRequestId());
            ajax.put("verificationCode", res.getVerificationCode()); // 仅在开发调试环境下输出
            return ajax;
        }
        return AjaxResult.error(res.getMessage());
    }

    /**
     * 校验手机验证码
     */
    @PostMapping("/sms/verify-code")
    public AjaxResult verifySmsCode(@RequestParam("phone") String phone, @RequestParam("code") String code)
    {
        boolean ok = smsService.verifyCode(phone, code);
        return ok ? AjaxResult.success("验证码校验通过") : AjaxResult.error("验证码错误或已过期");
    }

    /**
     * 发送访校预约短信通知
     */
    @PostMapping("/sms/send-appointment-notice")
    public AjaxResult sendAppointmentNotice(@RequestParam("phone") String phone,
            @RequestParam("studentName") String studentName,
            @RequestParam("visitDate") String visitDate,
            @RequestParam("timeSlot") String timeSlot,
            @RequestParam("checkInCode") String checkInCode)
    {
        SmsResult res = smsService.sendAppointmentNotification(phone, studentName, visitDate, timeSlot, checkInCode);
        return res.isSuccess() ? AjaxResult.success(res.getMessage()) : AjaxResult.error(res.getMessage());
    }

    // ==================== 2. 消息推送能力 ====================

    /**
     * 发送站内消息
     */
    @PostMapping("/push/send-inapp")
    public AjaxResult sendInAppMessage(@RequestParam("userId") String userId,
            @RequestParam("title") String title,
            @RequestParam("content") String content,
            @RequestParam(value = "type", defaultValue = "APPOINTMENT") String type)
    {
        boolean ok = pushNotificationService.sendInAppMessage(userId, title, content, type);
        return ok ? AjaxResult.success("站内消息发送成功") : AjaxResult.error("站内消息发送失败");
    }

    /**
     * 全渠道通用消息推送
     */
    @PostMapping("/push/send")
    public AjaxResult sendPush(@RequestBody PushMessageRequest request)
    {
        boolean ok = pushNotificationService.sendPush(request);
        return ok ? AjaxResult.success("推送指令触发成功") : AjaxResult.error("推送指令执行失败");
    }

    /**
     * 一键全渠道触达预约状态变更
     */
    @PostMapping("/push/notify-appointment")
    public AjaxResult notifyAppointment(@RequestParam("appointmentId") Long appointmentId,
            @RequestParam("newStatus") String newStatus,
            @RequestParam(value = "remark", required = false) String remark)
    {
        boolean ok = pushNotificationService.notifyAppointmentStatusChange(appointmentId, newStatus, remark);
        return ok ? AjaxResult.success("状态触达全渠道通知成功") : AjaxResult.error("状态通知触发失败");
    }

    // ==================== 3. 文件上传下载能力 ====================

    /**
     * 通用文件安全上传
     */
    @PostMapping("/file/upload")
    public AjaxResult uploadFile(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "subDir", defaultValue = "common") String subDir)
    {
        FileStorageResult result = fileStorageService.uploadFile(file, subDir);
        return AjaxResult.success("文件上传成功", result);
    }

    /**
     * 专属图片上传（校验 MIME 类型和扩展名防注入）
     */
    @PostMapping("/file/upload-image")
    public AjaxResult uploadImage(@RequestParam("file") MultipartFile file,
            @RequestParam(value = "subDir", defaultValue = "images") String subDir,
            @RequestParam(value = "maxMb", defaultValue = "10") int maxMb)
    {
        FileStorageResult result = fileStorageService.uploadImage(file, subDir, maxMb);
        return AjaxResult.success("图片上传成功", result);
    }

    /**
     * 安全文件流式下载
     */
    @GetMapping("/file/download")
    public void downloadFile(@RequestParam("filePath") String filePath, HttpServletResponse response)
    {
        fileStorageService.downloadFile(filePath, response);
    }

    /**
     * 删除文件
     */
    @DeleteMapping("/file/delete")
    public AjaxResult deleteFile(@RequestParam("filePath") String filePath)
    {
        boolean ok = fileStorageService.deleteFile(filePath);
        return ok ? AjaxResult.success("文件删除成功") : AjaxResult.error("文件不存在或删除失败");
    }

    // ==================== 4. 动态 Excel 导入导出能力 ====================

    /**
     * 动态 Map 列表零约束导出为 Excel 表格
     */
    @PostMapping("/excel/export-map")
    public void exportMapList(@RequestBody ExcelExportMapRequest request, HttpServletResponse response)
    {
        DynamicExcelUtil.exportMapList(response, request.getFileName(), request.getSheetName(),
                request.getHeaders(), request.getFieldKeys(), request.getDataList());
    }

    /**
     * 动态 Excel 文件导入解析为 Map 列表
     */
    @PostMapping("/excel/import-map")
    public AjaxResult importMapList(@RequestParam("file") MultipartFile file)
    {
        List<Map<String, Object>> list = DynamicExcelUtil.importToMapList(file);
        AjaxResult ajax = AjaxResult.success("Excel解析成功", list);
        ajax.put("total", list.size());
        return ajax;
    }
}
