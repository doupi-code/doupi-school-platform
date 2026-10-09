package com.doupi.recruit.controller;

import java.text.SimpleDateFormat;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.doupi.common.annotation.Anonymous;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.utils.StringUtils;
import com.doupi.recruit.domain.DoupiRecruitAppointment;
import com.doupi.recruit.service.IDoupiRecruitAppointmentService;
import com.doupi.recruit.service.IDoupiSchoolPortalService;

/**
 * 汉外华襄复读中心 - 官方网站公共门户网关 Controller
 * 路由前缀: /api/public/v1
 * 
 * 免登录开放给前台访客浏览与提交预约线索，具备实时数据库交互能力。
 * 
 * @author doupi
 */
@Anonymous
@RestController
@RequestMapping("/api/public/v1")
@CrossOrigin(origins = "*")
public class DoupiSchoolPublicController extends BaseController
{
    private static final Logger log = LoggerFactory.getLogger(DoupiSchoolPublicController.class);

    @Autowired
    private IDoupiSchoolPortalService portalService;

    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    /**
     * 1. 获取站点设置、公信力数字、联系方式
     * GET /api/public/v1/site
     */
    @GetMapping("/site")
    public AjaxResult getSite()
    {
        return AjaxResult.success(portalService.getSiteInfo());
    }

    /**
     * 2. 提交访校/咨询预约
     * POST /api/public/v1/bookings
     */
    @PostMapping("/bookings")
    public AjaxResult submitBooking(@RequestBody Map<String, Object> req)
    {
        String phone = (String) req.get("phone");
        if (StringUtils.isEmpty(phone) || !phone.matches("^1[3-9]\\d{9}$"))
        {
            return AjaxResult.error(40001, "请提供正确的11位家长手机号码");
        }

        String student = (String) req.get("student");
        String parent = (String) req.get("parent");
        Object scoreObj = req.get("score");
        String type = (String) req.get("type");
        String preferredDate = (String) req.get("preferredDate");
        String trackInterest = (String) req.get("trackInterest");
        String remark = (String) req.get("remark");

        // 生成规范预约单号与6位核销码
        SimpleDateFormat sdf = new SimpleDateFormat("yyyyMMddHHmmss");
        String appointmentNo = "AP" + sdf.format(new Date()) + (int)((Math.random() * 900) + 100);
        String checkInCode = String.valueOf((int)((Math.random() * 9 + 1) * 100000));

        DoupiRecruitAppointment appt = new DoupiRecruitAppointment();
        appt.setAppointmentNo(appointmentNo);
        appt.setParentPhone(phone.trim());
        appt.setParentName(StringUtils.isNotEmpty(parent) ? parent.trim() : "家长");
        appt.setStudentName(StringUtils.isNotEmpty(student) ? student.trim() : "学生");
        appt.setStudentGender("男");
        
        String scoreStr = scoreObj != null ? String.valueOf(scoreObj).trim() : "";
        appt.setStudentGrade(StringUtils.isNotEmpty(scoreStr) ? "高考复读 (高考" + scoreStr + "分)" : "复读部");
        appt.setCurrentSchool("往届/应届高中");
        appt.setCampusId("default");
        appt.setCampusName("汉外华襄校区");
        
        if (StringUtils.isNotEmpty(preferredDate))
        {
            appt.setVisitDate(preferredDate);
        }
        else
        {
            SimpleDateFormat dateFmt = new SimpleDateFormat("yyyy-MM-dd");
            Calendar cal = Calendar.getInstance();
            cal.add(Calendar.DAY_OF_YEAR, 1);
            appt.setVisitDate(dateFmt.format(cal.getTime()));
        }
        
        appt.setTimeSlot(StringUtils.isNotEmpty(type) ? type : "上午 09:00 - 11:30");
        appt.setCheckInCode(checkInCode);
        appt.setStatus("PENDING");

        StringBuilder sb = new StringBuilder();
        if (StringUtils.isNotEmpty(type)) sb.append("预约方式: ").append(type).append(" | ");
        if (StringUtils.isNotEmpty(scoreStr)) sb.append("高考分: ").append(scoreStr).append(" | ");
        if (StringUtils.isNotEmpty(trackInterest)) sb.append("意向方向: ").append(trackInterest).append(" | ");
        if (StringUtils.isNotEmpty(remark)) sb.append("家长备注: ").append(remark);
        appt.setRemark(sb.toString());

        log.info("[官网预约提交] 手机号: {}, 学生: {}, 单号: {}", phone, student, appointmentNo);

        int rows = appointmentService.insertDoupiRecruitAppointment(appt);
        if (rows > 0)
        {
            Map<String, Object> data = new HashMap<>();
            data.put("appointmentId", appt.getAppointmentId());
            data.put("appointmentNo", appointmentNo);
            data.put("checkInCode", checkInCode);
            data.put("visitDate", appt.getVisitDate());
            data.put("message", "预约已成功提交，招生老师将尽快与您电话联系！");
            return AjaxResult.success(data);
        }
        return AjaxResult.error(50000, "预约提交失败，请稍后重试或拨打咨询电话");
    }

    /**
     * 3. 手机号查询预约进度与核销凭证
     * GET /api/public/v1/bookings/query?phone=xxx
     */
    @GetMapping("/bookings/query")
    public AjaxResult queryBookings(@RequestParam("phone") String phone)
    {
        if (StringUtils.isEmpty(phone))
        {
            return AjaxResult.error(40001, "手机号不能为空");
        }
        DoupiRecruitAppointment param = new DoupiRecruitAppointment();
        param.setParentPhone(phone.trim());
        List<DoupiRecruitAppointment> list = appointmentService.selectDoupiRecruitAppointmentList(param);
        
        List<Map<String, Object>> result = new ArrayList<>();
        for (DoupiRecruitAppointment item : list)
        {
            Map<String, Object> map = new HashMap<>();
            map.put("appointmentId", item.getAppointmentId());
            map.put("appointmentNo", item.getAppointmentNo());
            map.put("studentName", item.getStudentName());
            map.put("parentName", item.getParentName());
            map.put("campusName", item.getCampusName());
            map.put("visitDate", item.getVisitDate());
            map.put("timeSlot", item.getTimeSlot());
            map.put("status", item.getStatus());
            map.put("checkInCode", item.getCheckInCode());
            map.put("teacherName", item.getTeacherName());
            map.put("createTime", item.getCreateTime());
            result.add(map);
        }
        return AjaxResult.success(result);
    }

    /**
     * 4. 师资名录与团队列表
     * GET /api/public/v1/teachers?group=&category=&subject=
     */
    @GetMapping("/teachers")
    public AjaxResult getTeachers(@RequestParam(value = "group", required = false) String group,
                                  @RequestParam(value = "category", required = false) String category,
                                  @RequestParam(value = "subject", required = false) String subject)
    {
        return AjaxResult.success(portalService.getTeachers(group, category, subject));
    }

    /**
     * 5. 教师档案详情
     * GET /api/public/v1/teachers/{id}
     */
    @GetMapping("/teachers/{id}")
    public AjaxResult getTeacherDetail(@PathVariable("id") String id)
    {
        Map<String, Object> teacher = portalService.getTeacherById(id);
        if (teacher == null)
        {
            return AjaxResult.error(40401, "未找到该教师档案");
        }
        return AjaxResult.success(teacher);
    }

    /**
     * 6. 校园资讯/公告列表
     * GET /api/public/v1/articles?kind=&category=&page=&pageSize=
     */
    @GetMapping("/articles")
    public AjaxResult getArticles(@RequestParam(value = "kind", required = false) String kind,
                                  @RequestParam(value = "category", required = false) String category,
                                  @RequestParam(value = "page", defaultValue = "1") Integer page,
                                  @RequestParam(value = "pageSize", defaultValue = "20") Integer pageSize)
    {
        return AjaxResult.success(portalService.getArticles(kind, category, page, pageSize));
    }

    /**
     * 7. 资讯/公告正文详情
     * GET /api/public/v1/articles/{kind}/{id}
     */
    @GetMapping("/articles/{kind}/{id}")
    public AjaxResult getArticleDetail(@PathVariable("kind") String kind,
                                       @PathVariable("id") String id)
    {
        Map<String, Object> article = portalService.getArticleDetail(kind, id);
        if (article == null)
        {
            return AjaxResult.error(40401, "未找到该资讯或公告");
        }
        return AjaxResult.success(article);
    }

    /**
     * 8. 班型设置与名额查询
     * GET /api/public/v1/class-plans
     */
    @GetMapping("/class-plans")
    public AjaxResult getClassPlans()
    {
        return AjaxResult.success(portalService.getClassPlans());
    }

    /**
     * 9. 校园设施建筑与点位
     * GET /api/public/v1/facilities?zone=
     */
    @GetMapping("/facilities")
    public AjaxResult getFacilities(@RequestParam(value = "zone", required = false) String zone)
    {
        return AjaxResult.success(portalService.getFacilities(zone));
    }

    /**
     * 10. 常见问题 FAQ
     * GET /api/public/v1/faqs?category=
     */
    @GetMapping("/faqs")
    public AjaxResult getFaqs(@RequestParam(value = "category", required = false) String category)
    {
        return AjaxResult.success(portalService.getFaqs(category));
    }
}
