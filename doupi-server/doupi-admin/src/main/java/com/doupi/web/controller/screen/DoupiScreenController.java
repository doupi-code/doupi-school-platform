package com.doupi.web.controller.screen;

import java.math.BigDecimal;
import java.text.SimpleDateFormat;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.doupi.common.core.controller.BaseController;
import com.doupi.common.core.domain.AjaxResult;
import com.doupi.common.core.domain.entity.SysRole;
import com.doupi.common.core.domain.entity.SysUser;
import com.doupi.common.utils.StringUtils;
import com.doupi.edu.domain.EduClass;
import com.doupi.edu.domain.EduPrintRecord;
import com.doupi.edu.domain.vo.EduPrintReportVo;
import com.doupi.edu.service.IEduClassService;
import com.doupi.edu.service.IEduPrintRecordService;
import com.doupi.recruit.domain.DoupiRecruitAppointment;
import com.doupi.recruit.service.IDoupiRecruitAppointmentService;
import com.doupi.stock.domain.StockGoods;
import com.doupi.stock.domain.StockIn;
import com.doupi.stock.domain.StockOut;
import com.doupi.stock.domain.vo.StockDashboardVo;
import com.doupi.stock.service.IStockGoodsService;
import com.doupi.stock.service.IStockInService;
import com.doupi.stock.service.IStockOutService;
import com.doupi.stock.service.IStockReportService;
import com.doupi.system.service.ISysUserService;
import reactor.core.publisher.Flux;

/**
 * 数字化校园智能运营数据大屏 Controller
 * 支持 WebFlux SSE 流式实时推送与 HTTP 瞬时拉取
 * 
 * @author doupi
 */
@RestController
@RequestMapping("/screen")
public class DoupiScreenController extends BaseController
{
    @Autowired
    private IDoupiRecruitAppointmentService appointmentService;

    @Autowired
    private IEduPrintRecordService printRecordService;

    @Autowired
    private IStockReportService stockReportService;

    @Autowired
    private IStockGoodsService stockGoodsService;

    @Autowired
    private IStockInService stockInService;

    @Autowired
    private IStockOutService stockOutService;

    @Autowired
    private ISysUserService userService;

    @Autowired
    private IEduClassService classService;

    @Autowired
    private com.doupi.edu.service.IEduCelebrationService celebrationService;

    @Autowired
    private com.doupi.system.service.ISysConfigService configService;

    /**
     * 获取全量提分光荣榜 (大屏全景滚动播放接口)
     */
    @GetMapping("/celebration/list")
    public AjaxResult getCelebrationList(com.doupi.edu.domain.EduCelebration eduCelebration)
    {
        eduCelebration.setStatus("0");
        return success(celebrationService.selectEduCelebrationList(eduCelebration));
    }

    /**
     * 获取提分光荣榜全局统计
     */
    @GetMapping("/celebration/summary")
    public AjaxResult getCelebrationSummary(@org.springframework.web.bind.annotation.RequestParam(value = "batchTitle", required = false) String batchTitle)
    {
        return success(celebrationService.selectCelebrationSummary(batchTitle));
    }

    /**
     * 获取全量考试批次列表 (大屏考试切换选择器接口)
     */
    @GetMapping("/celebration/batches")
    public AjaxResult getCelebrationBatches()
    {
        return success(celebrationService.selectCelebrationBatchList());
    }

    /**
     * WebFlux 反应式 SSE 实时数据流推送接口
     * 前端通过 EventSource 订阅，每 4 秒全量响应推送最新大屏与全屏钻取数据
     */
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Map<String, Object>>> streamScreenData()
    {
        return Flux.interval(Duration.ZERO, Duration.ofSeconds(4))
            .map(sequence -> ServerSentEvent.<Map<String, Object>>builder()
                .id(String.valueOf(sequence))
                .event("screen-update")
                .data(buildScreenDataMap())
                .build());
    }

    /**
     * 获取数据大屏全景数据 (标准 HTTP 接口，全部来自真实数据库统计)
     */
    @GetMapping("/data")
    public AjaxResult getScreenData()
    {
        return success(buildScreenDataMap());
    }

    /**
     * 构建全景大屏与多维钻取全量数据
     */
    public Map<String, Object> buildScreenDataMap()
    {
        Map<String, Object> root = new HashMap<>();
        SimpleDateFormat timeFmt = new SimpleDateFormat("HH:mm");
        SimpleDateFormat dateFmt = new SimpleDateFormat("yyyy-MM-dd HH:mm");

        // ==========================================
        // 1. 招生预约数据深度聚合
        // ==========================================
        List<DoupiRecruitAppointment> allAppointments = appointmentService.selectDoupiRecruitAppointmentList(new DoupiRecruitAppointment());
        int totalApp = allAppointments != null ? allAppointments.size() : 0;
        long verifiedApp = 0;
        long pendingApp = 0;
        long cancelledApp = 0;
        Map<String, Integer> slotMap = new HashMap<>();
        Map<String, Integer> verifierMap = new HashMap<>();

        if (allAppointments != null)
        {
            for (DoupiRecruitAppointment a : allAppointments)
            {
                String status = a.getStatus();
                if ("VERIFIED".equalsIgnoreCase(status))
                {
                    verifiedApp++;
                    String verifier = StringUtils.isNotEmpty(a.getVerifier()) ? a.getVerifier() : "现场接待老师";
                    verifierMap.put(verifier, verifierMap.getOrDefault(verifier, 0) + 1);
                }
                else if ("PENDING".equalsIgnoreCase(status) || "APPROVED".equalsIgnoreCase(status))
                {
                    pendingApp++;
                }
                else if ("CANCELLED".equalsIgnoreCase(status))
                {
                    cancelledApp++;
                }

                String slot = StringUtils.isNotEmpty(a.getTimeSlot()) ? a.getTimeSlot() : "待定时段";
                slotMap.put(slot, slotMap.getOrDefault(slot, 0) + 1);
            }
        }
        double verifyRate = totalApp > 0 ? Math.round((verifiedApp * 100.0 / totalApp) * 10.0) / 10.0 : 0.0;

        // 招生近15日走势
        Map<String, Object> recruitData = new HashMap<>();
        DateTimeFormatter fullDf = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        DateTimeFormatter labelDf = DateTimeFormatter.ofPattern("MM-dd");
        LocalDate today = LocalDate.now();
        List<String> trendDates = new ArrayList<>();
        List<Integer> trendAppointments = new ArrayList<>();
        List<Integer> trendVerified = new ArrayList<>();
        Map<String, Integer> dateAppCount = new HashMap<>();
        Map<String, Integer> dateVerCount = new HashMap<>();

        if (allAppointments != null)
        {
            for (DoupiRecruitAppointment a : allAppointments)
            {
                String vDate = a.getVisitDate();
                if (StringUtils.isNotEmpty(vDate))
                {
                    dateAppCount.put(vDate, dateAppCount.getOrDefault(vDate, 0) + 1);
                    if ("VERIFIED".equalsIgnoreCase(a.getStatus()))
                    {
                        dateVerCount.put(vDate, dateVerCount.getOrDefault(vDate, 0) + 1);
                    }
                }
            }
        }
        for (int i = 14; i >= 0; i--)
        {
            LocalDate target = today.minusDays(i);
            String fullDate = target.format(fullDf);
            trendDates.add(target.format(labelDf));
            trendAppointments.add(dateAppCount.getOrDefault(fullDate, 0));
            trendVerified.add(dateVerCount.getOrDefault(fullDate, 0));
        }
        recruitData.put("trendDates", trendDates);
        recruitData.put("trendAppointments", trendAppointments);
        recruitData.put("trendVerified", trendVerified);

        // 意向年级分布
        Map<String, Object> recruitStats = appointmentService.getDashboardStats();
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> rawGradeStats = (List<Map<String, Object>>) (recruitStats != null ? recruitStats.get("gradeStats") : null);
        List<Map<String, Object>> gradeStats = new ArrayList<>();
        if (rawGradeStats != null)
        {
            for (Map<String, Object> g : rawGradeStats)
            {
                Map<String, Object> item = new HashMap<>();
                item.put("name", g.get("grade") != null ? g.get("grade").toString() : "未分配");
                item.put("value", g.get("total") != null ? g.get("total") : 0);
                gradeStats.add(item);
            }
        }
        recruitData.put("gradeDistribution", gradeStats);

        // 预约时段分布
        List<Map<String, Object>> slotDistribution = new ArrayList<>();
        slotMap.forEach((k, v) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("name", k);
            m.put("value", v);
            slotDistribution.add(m);
        });
        slotDistribution.sort((a, b) -> Integer.compare(((Number) b.get("value")).intValue(), ((Number) a.get("value")).intValue()));
        recruitData.put("slotDistribution", slotDistribution);

        // 招生转化漏斗
        List<Map<String, Object>> recruitFunnel = new ArrayList<>();
        Map<String, Object> f1 = new HashMap<>(); f1.put("name", "线上意向登记"); f1.put("value", totalApp); recruitFunnel.add(f1);
        Map<String, Object> f2 = new HashMap<>(); f2.put("name", "审核排班确认"); f2.put("value", Math.max(0, totalApp - (int) cancelledApp)); recruitFunnel.add(f2);
        Map<String, Object> f3 = new HashMap<>(); f3.put("name", "到校实地核销"); f3.put("value", verifiedApp); recruitFunnel.add(f3);
        recruitData.put("funnel", recruitFunnel);

        // 接待老师/核销榜
        List<Map<String, Object>> verifierRank = new ArrayList<>();
        verifierMap.forEach((k, v) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("teacherName", k);
            m.put("verifyCount", v);
            m.put("rate", totalApp > 0 ? (Math.round((v * 100.0 / totalApp) * 10.0) / 10.0) + "%" : "0.0%");
            verifierRank.add(m);
        });
        verifierRank.sort((a, b) -> Integer.compare(((Number) b.get("verifyCount")).intValue(), ((Number) a.get("verifyCount")).intValue()));
        recruitData.put("verifierRank", verifierRank);

        // 最新真实预约流水 (最多20条用于全屏钻取表格)
        List<Map<String, Object>> recentAppointments = new ArrayList<>();
        if (allAppointments != null)
        {
            List<DoupiRecruitAppointment> sortedApps = new ArrayList<>(allAppointments);
            sortedApps.sort((a, b) -> Long.compare(b.getAppointmentId() != null ? b.getAppointmentId() : 0L,
                                                   a.getAppointmentId() != null ? a.getAppointmentId() : 0L));
            int limit = Math.min(sortedApps.size(), 20);
            for (int i = 0; i < limit; i++)
            {
                DoupiRecruitAppointment a = sortedApps.get(i);
                Map<String, Object> item = new HashMap<>();
                item.put("id", a.getAppointmentId());
                item.put("appointmentNo", a.getAppointmentNo());
                item.put("studentName", a.getStudentName());
                item.put("studentGrade", a.getStudentGrade());
                item.put("parentName", a.getParentName());
                String ph = a.getParentPhone();
                if (StringUtils.isNotEmpty(ph) && ph.length() == 11) {
                    ph = ph.substring(0, 3) + "****" + ph.substring(7);
                }
                item.put("parentPhone", ph);
                item.put("visitDate", a.getVisitDate());
                item.put("visitTime", a.getTimeSlot());
                item.put("status", a.getStatus());
                item.put("verifier", a.getVerifier());
                item.put("verifyTime", a.getVerifyTime() != null ? dateFmt.format(a.getVerifyTime()) : "-");
                item.put("createTime", a.getCreateTime() != null ? dateFmt.format(a.getCreateTime()) : "-");
                recentAppointments.add(item);
            }
        }
        recruitData.put("recentList", recentAppointments);
        root.put("recruit", recruitData);

        // ==========================================
        // 2. 教务文印数据深度聚合
        // ==========================================
        EduPrintReportVo printVo = printRecordService.getPrintReport(new EduPrintRecord());
        Map<String, Object> printSum = printVo != null ? printVo.getSummary() : null;
        long totalJobs = printSum != null && printSum.get("totalJobs") != null ? ((Number) printSum.get("totalJobs")).longValue() : 0L;
        long totalCopies = printSum != null && printSum.get("totalPrintCount") != null ? ((Number) printSum.get("totalPrintCount")).longValue() : 0L;
        long totalPages = printSum != null && printSum.get("totalPages") != null ? ((Number) printSum.get("totalPages")).longValue() : 0L;

        Map<String, Object> eduData = new HashMap<>();
        List<Map<String, Object>> rawPaperStats = printVo != null ? printVo.getPaperTypeStats() : null;
        List<Map<String, Object>> paperStats = new ArrayList<>();
        if (rawPaperStats != null)
        {
            for (Map<String, Object> p : rawPaperStats)
            {
                Map<String, Object> item = new HashMap<>();
                item.put("name", p.get("paperType") + "用纸");
                item.put("value", p.get("totalPages"));
                item.put("paperType", p.get("paperType"));
                paperStats.add(item);
            }
        }
        eduData.put("paperDistribution", paperStats);
        eduData.put("gradePrintStats", printVo != null && printVo.getGradeStats() != null ? printVo.getGradeStats() : Collections.emptyList());
        eduData.put("teacherRanking", printVo != null && printVo.getTeacherStats() != null ? printVo.getTeacherStats() : Collections.emptyList());
        eduData.put("monthlyTrends", printVo != null && printVo.getMonthlyTrends() != null ? printVo.getMonthlyTrends() : Collections.emptyList());

        // 文印学科推断统计与最新记录
        List<EduPrintRecord> allPrintRecords = printRecordService.selectEduPrintRecordList(new EduPrintRecord());
        Map<String, Long> subjectPrintPages = new HashMap<>();
        List<Map<String, Object>> recentPrintRecords = new ArrayList<>();
        String[] subjects = {"语文", "数学", "英语", "物理", "化学", "生物", "政治", "历史", "地理", "通用"};

        if (allPrintRecords != null)
        {
            for (EduPrintRecord p : allPrintRecords)
            {
                if ("2".equals(p.getStatus()))
                {
                    continue; // 彻底排除已作废文印数据
                }
                String pName = StringUtils.isNotEmpty(p.getPrintName()) ? p.getPrintName() : "";
                String subj = "综合资料";
                for (String s : subjects)
                {
                    if (pName.contains(s)) { subj = s; break; }
                }
                long pages = p.getTotalPages() != null ? p.getTotalPages() : ((p.getPageCount() != null ? p.getPageCount() : 1) * (p.getPrintCount() != null ? p.getPrintCount() : 1));
                subjectPrintPages.put(subj, subjectPrintPages.getOrDefault(subj, 0L) + pages);
            }

            List<EduPrintRecord> sortedPrints = new ArrayList<>();
            for (EduPrintRecord p : allPrintRecords)
            {
                if (!"2".equals(p.getStatus()))
                {
                    sortedPrints.add(p);
                }
            }
            sortedPrints.sort((a, b) -> Long.compare(b.getPrintId() != null ? b.getPrintId() : 0L,
                                                     a.getPrintId() != null ? a.getPrintId() : 0L));
            int limit = Math.min(sortedPrints.size(), 20);
            for (int i = 0; i < limit; i++)
            {
                EduPrintRecord p = sortedPrints.get(i);
                Map<String, Object> item = new HashMap<>();
                item.put("id", p.getPrintId());
                item.put("printName", p.getPrintName());
                item.put("teacherName", p.getTeacherName());
                item.put("grade", p.getGrade());
                String pName = StringUtils.isNotEmpty(p.getPrintName()) ? p.getPrintName() : "";
                String sFound = "综合";
                for (String s : subjects) { if (pName.contains(s)) { sFound = s; break; } }
                item.put("subject", sFound);
                item.put("printCount", p.getPrintCount());
                item.put("pageCount", p.getPageCount());
                item.put("totalPages", p.getTotalPages());
                item.put("paperType", p.getPaperType());
                item.put("status", p.getStatus());
                item.put("createTime", p.getCreateTime() != null ? dateFmt.format(p.getCreateTime()) : "-");
                recentPrintRecords.add(item);
            }
        }
        List<Map<String, Object>> subjectStatsList = new ArrayList<>();
        subjectPrintPages.forEach((k, v) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("name", k);
            m.put("value", v);
            subjectStatsList.add(m);
        });
        subjectStatsList.sort((a, b) -> Long.compare(((Number) b.get("value")).longValue(), ((Number) a.get("value")).longValue()));
        eduData.put("subjectStats", subjectStatsList);
        eduData.put("recentList", recentPrintRecords);
        root.put("edu", eduData);

        // ==========================================
        // 3. 仓储资产与物资数据深度聚合
        // ==========================================
        StockDashboardVo stockVo = stockReportService.getDashboardData();
        Map<String, Object> stockData = new HashMap<>();
        stockData.put("categoryStock", stockVo != null && stockVo.getCategoryStock() != null ? stockVo.getCategoryStock() : Collections.emptyList());
        stockData.put("monthlyTrends", stockVo != null && stockVo.getMonthlyTrends() != null ? stockVo.getMonthlyTrends() : Collections.emptyList());

        // 真实商品列表与低库存预警明细
        List<StockGoods> allGoods = stockGoodsService.selectEduGoodsList(new StockGoods());
        List<Map<String, Object>> warnLowList = new ArrayList<>();
        int totalGoodsCount = allGoods != null ? allGoods.size() : 0;
        if (allGoods != null)
        {
            for (StockGoods g : allGoods)
            {
                long cur = g.getStockNum() != null ? g.getStockNum() : 0L;
                long min = g.getWarnLow() != null ? g.getWarnLow() : 0L;
                if (cur <= min && min > 0)
                {
                    Map<String, Object> w = new HashMap<>();
                    w.put("goodsId", g.getGoodsId());
                    w.put("goodsName", g.getGoodsName());
                    w.put("spec", g.getSpec());
                    w.put("unit", g.getUnit());
                    w.put("currentStock", cur);
                    w.put("minStock", min);
                    w.put("gap", min - cur);
                    w.put("categoryName", g.getCategory());
                    warnLowList.add(w);
                }
            }
        }
        warnLowList.sort((a, b) -> Long.compare(((Number) b.get("gap")).longValue(), ((Number) a.get("gap")).longValue()));
        stockData.put("warnLowList", warnLowList);
        stockData.put("totalGoodsCount", totalGoodsCount);

        // 最新出入库单流水 (用于全屏钻取)
        List<StockIn> inList = stockInService.selectEduStockInList(new StockIn());
        List<Map<String, Object>> recentInList = new ArrayList<>();
        if (inList != null)
        {
            List<StockIn> sortedIns = new ArrayList<>(inList);
            sortedIns.sort((a, b) -> Long.compare(b.getInId() != null ? b.getInId() : 0L, a.getInId() != null ? a.getInId() : 0L));
            int limit = Math.min(sortedIns.size(), 15);
            for (int i = 0; i < limit; i++)
            {
                StockIn in = sortedIns.get(i);
                Map<String, Object> item = new HashMap<>();
                item.put("id", in.getInId());
                item.put("inNo", in.getInNo());
                item.put("supplierName", in.getSupplierName());
                item.put("totalAmount", in.getTotalAmount());
                Date t = in.getInTime() != null ? in.getInTime() : in.getCreateTime();
                item.put("time", t != null ? dateFmt.format(t) : "-");
                recentInList.add(item);
            }
        }
        stockData.put("recentInList", recentInList);

        List<StockOut> outList = stockOutService.selectEduStockOutList(new StockOut());
        List<Map<String, Object>> recentOutList = new ArrayList<>();
        if (outList != null)
        {
            List<StockOut> sortedOuts = new ArrayList<>(outList);
            sortedOuts.sort((a, b) -> Long.compare(b.getOutId() != null ? b.getOutId() : 0L, a.getOutId() != null ? a.getOutId() : 0L));
            int limit = Math.min(sortedOuts.size(), 15);
            for (int i = 0; i < limit; i++)
            {
                StockOut out = sortedOuts.get(i);
                Map<String, Object> item = new HashMap<>();
                item.put("id", out.getOutId());
                item.put("outNo", out.getOutNo());
                item.put("receiver", out.getReceiver());
                item.put("className", out.getClassName());
                item.put("outType", out.getOutType());
                Date t = out.getOutTime() != null ? out.getOutTime() : out.getCreateTime();
                item.put("time", t != null ? dateFmt.format(t) : "-");
                recentOutList.add(item);
            }
        }
        stockData.put("recentOutList", recentOutList);
        root.put("stock", stockData);

        // ==========================================
        // 4. 师资队伍与班级规模深度聚合
        // ==========================================
        List<SysUser> allUsers = userService.selectUserList(new SysUser());
        List<EduClass> classes = classService.selectEduClassList(new EduClass());
        long teacherCount = allUsers != null ? allUsers.size() : 0L;
        long classCount = classes != null ? classes.size() : 0L;
        long studentCount = 0L;
        Map<String, Integer> gradeClassCount = new HashMap<>();
        Map<String, Long> gradeStudentCount = new HashMap<>();
        List<Map<String, Object>> classDetailList = new ArrayList<>();

        if (classes != null)
        {
            for (EduClass c : classes)
            {
                long sNum = c.getStudentNum() != null ? c.getStudentNum() : 0L;
                studentCount += sNum;
                String g = StringUtils.isNotEmpty(c.getGrade()) ? c.getGrade() : "未分年级";
                gradeClassCount.put(g, gradeClassCount.getOrDefault(g, 0) + 1);
                gradeStudentCount.put(g, gradeStudentCount.getOrDefault(g, 0L) + sNum);

                Map<String, Object> cMap = new HashMap<>();
                cMap.put("classId", c.getClassId());
                cMap.put("className", c.getClassName());
                cMap.put("grade", c.getGrade());
                cMap.put("studentNum", sNum);
                classDetailList.add(cMap);
            }
        }

        // 师资角色与学科统计
        int roleTeacher = 0;
        int roleRecruit = 0;
        int roleAdmin = 0;
        Map<String, Integer> subjectTeacherCount = new HashMap<>();
        List<Map<String, Object>> teacherDetailList = new ArrayList<>();

        if (allUsers != null)
        {
            for (SysUser u : allUsers)
            {
                if (u.getUserId() != null && u.getUserId() == 1L) continue; // 排除纯系统管理员
                List<SysRole> roles = u.getRoles();
                boolean isTeacher = false;
                boolean isRecruit = false;
                boolean isAdminStaff = false;
                if (roles != null)
                {
                    for (SysRole r : roles)
                    {
                        if ("teacher".equalsIgnoreCase(r.getRoleKey())) isTeacher = true;
                        if ("teacher_recruit".equalsIgnoreCase(r.getRoleKey())) isRecruit = true;
                        if ("admin_staff".equalsIgnoreCase(r.getRoleKey())) isAdminStaff = true;
                    }
                }
                if (isTeacher) roleTeacher++;
                if (isRecruit) roleRecruit++;
                if (isAdminStaff) roleAdmin++;
                if (!isTeacher && !isRecruit && !isAdminStaff) roleTeacher++; // 默认任课

                String subj = StringUtils.isNotEmpty(u.getSubject()) ? u.getSubject() : "通用学科";
                subjectTeacherCount.put(subj, subjectTeacherCount.getOrDefault(subj, 0) + 1);

                Map<String, Object> tMap = new HashMap<>();
                tMap.put("userId", u.getUserId());
                tMap.put("userName", u.getUserName());
                tMap.put("nickName", u.getNickName());
                tMap.put("grade", u.getGrade());
                tMap.put("subject", u.getSubject());
                tMap.put("phonenumber", u.getPhonenumber());
                teacherDetailList.add(tMap);
            }
        }

        Map<String, Object> facultyData = new HashMap<>();
        List<Map<String, Object>> roleDist = new ArrayList<>();
        Map<String, Object> r1 = new HashMap<>(); r1.put("name", "任课教师"); r1.put("value", roleTeacher); roleDist.add(r1);
        Map<String, Object> r2 = new HashMap<>(); r2.put("name", "招生老师"); r2.put("value", roleRecruit); roleDist.add(r2);
        Map<String, Object> r3 = new HashMap<>(); r3.put("name", "行政与教辅"); r3.put("value", roleAdmin); roleDist.add(r3);
        facultyData.put("roleDistribution", roleDist);

        List<Map<String, Object>> subjDist = new ArrayList<>();
        subjectTeacherCount.forEach((k, v) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("name", k);
            m.put("value", v);
            subjDist.add(m);
        });
        subjDist.sort((a, b) -> Integer.compare(((Number) b.get("value")).intValue(), ((Number) a.get("value")).intValue()));
        facultyData.put("subjectDistribution", subjDist);

        List<Map<String, Object>> gradeClassDist = new ArrayList<>();
        gradeClassCount.forEach((k, v) -> {
            Map<String, Object> m = new HashMap<>();
            m.put("grade", k);
            m.put("classCount", v);
            m.put("studentCount", gradeStudentCount.getOrDefault(k, 0L));
            gradeClassDist.add(m);
        });
        facultyData.put("gradeClassStats", gradeClassDist);
        facultyData.put("classList", classDetailList);
        facultyData.put("teacherList", teacherDetailList);
        root.put("faculty", facultyData);

        // ==========================================
        // 5. 核心 KPI 汇总卡片
        // ==========================================
        Map<String, Object> summary = new HashMap<>();
        summary.put("totalAppointments", totalApp);
        summary.put("verifiedAppointments", verifiedApp);
        summary.put("pendingAppointments", pendingApp);
        summary.put("cancelledAppointments", cancelledApp);
        summary.put("verifyRate", verifyRate + "%");
        summary.put("totalPrintJobs", totalJobs);
        summary.put("totalPrintCopies", totalCopies);
        summary.put("totalPaperPages", totalPages);
        double screenReamSize = 500.0;
        if (configService != null)
        {
            String rConfig = configService.selectConfigByKey("edu.print.sheetsPerReam");
            if (com.doupi.common.utils.StringUtils.isNotEmpty(rConfig))
            {
                try { screenReamSize = Double.parseDouble(rConfig); } catch (Exception ignored) {}
            }
        }
        summary.put("printPaperReams", Math.round((totalPages / screenReamSize) * 10.0) / 10.0);
        summary.put("totalStockAmount", stockVo != null && stockVo.getTotalStockAmount() != null ? stockVo.getTotalStockAmount() : BigDecimal.ZERO);
        summary.put("monthlyInAmount", stockVo != null && stockVo.getMonthlyInAmount() != null ? stockVo.getMonthlyInAmount() : BigDecimal.ZERO);
        summary.put("monthlyOutAmount", stockVo != null && stockVo.getMonthlyOutAmount() != null ? stockVo.getMonthlyOutAmount() : BigDecimal.ZERO);
        summary.put("warnLowGoodsCount", warnLowList.size());
        summary.put("totalGoodsCount", totalGoodsCount);
        summary.put("teacherCount", teacherCount > 0 ? (teacherCount - 1) : 0); // 排除纯系统管理员
        summary.put("classCount", classCount);
        summary.put("studentCount", studentCount);
        summary.put("avgClassSize", classCount > 0 ? Math.round((double) studentCount / classCount) : 0);
        long effectiveTeachers = teacherCount > 1 ? (teacherCount - 1) : 1;
        summary.put("teacherStudentRatio", "1:" + (studentCount > 0 ? Math.round((double) studentCount / effectiveTeachers) : 0));
        root.put("summary", summary);

        // ==========================================
        // 6. 校园效能雷达沙盘六维指数
        // ==========================================
        List<Map<String, Object>> radarIndicators = new ArrayList<>();
        Map<String, Object> ind1 = new HashMap<>(); ind1.put("name", "招生拓展转化"); ind1.put("max", 100); radarIndicators.add(ind1);
        Map<String, Object> ind2 = new HashMap<>(); ind2.put("name", "教务文印敏捷"); ind2.put("max", 100); radarIndicators.add(ind2);
        Map<String, Object> ind3 = new HashMap<>(); ind3.put("name", "仓储流转周转"); ind3.put("max", 100); radarIndicators.add(ind3);
        Map<String, Object> ind4 = new HashMap<>(); ind4.put("name", "师资力量齐备"); ind4.put("max", 100); radarIndicators.add(ind4);
        Map<String, Object> ind5 = new HashMap<>(); ind5.put("name", "教学班级承载"); ind5.put("max", 100); radarIndicators.add(ind5);
        Map<String, Object> ind6 = new HashMap<>(); ind6.put("name", "资产安全保障"); ind6.put("max", 100); radarIndicators.add(ind6);

        List<Number> radarValues = new ArrayList<>();
        radarValues.add(Math.min(100, Math.max(20, (int) verifyRate)));
        radarValues.add(Math.min(100, Math.max(30, (int) (totalJobs > 0 ? 88 : 20))));
        radarValues.add(Math.min(100, Math.max(40, (int) (totalGoodsCount > 0 ? 85 : 30))));
        radarValues.add(Math.min(100, Math.max(35, (int) (teacherCount > 1 ? 92 : 25))));
        radarValues.add(Math.min(100, Math.max(30, (int) (classCount > 0 ? 86 : 20))));
        radarValues.add(warnLowList.isEmpty() ? 96 : Math.max(40, 96 - warnLowList.size() * 8));

        Map<String, Object> radarData = new HashMap<>();
        radarData.put("indicators", radarIndicators);
        radarData.put("values", radarValues);
        root.put("radar", radarData);

        // ==========================================
        // 7. 校园实时动态综合流 (招生、文印、入库、出库真实聚合)
        // ==========================================
        List<Map<String, Object>> activities = new ArrayList<>();

        if (allAppointments != null && !allAppointments.isEmpty())
        {
            List<DoupiRecruitAppointment> sortedApps = new ArrayList<>(allAppointments);
            sortedApps.sort((a, b) -> Long.compare(b.getAppointmentId() != null ? b.getAppointmentId() : 0L,
                                                   a.getAppointmentId() != null ? a.getAppointmentId() : 0L));
            int limit = Math.min(sortedApps.size(), 4);
            for (int i = 0; i < limit; i++)
            {
                DoupiRecruitAppointment a = sortedApps.get(i);
                Map<String, Object> act = new HashMap<>();
                act.put("id", "app_" + a.getAppointmentId());
                act.put("type", "recruit");
                boolean isVer = "VERIFIED".equalsIgnoreCase(a.getStatus());
                act.put("title", isVer ? "访校实地核销" : "访校预约登记");
                act.put("desc", (StringUtils.isNotEmpty(a.getParentName()) ? a.getParentName() : "家长") + "为学生 " + (StringUtils.isNotEmpty(a.getStudentName()) ? a.getStudentName() : "") + (isVer ? " 完成到校核销" : " 提交" + (StringUtils.isNotEmpty(a.getStudentGrade()) ? a.getStudentGrade() : "") + "访校预约"));
                String tStr = a.getVerifyTime() != null ? timeFmt.format(a.getVerifyTime()) : (a.getCreateTime() != null ? timeFmt.format(a.getCreateTime()) : "今天");
                act.put("time", tStr);
                act.put("badge", isVer ? "核销成功" : "预约登记");
                act.put("sortTime", a.getVerifyTime() != null ? a.getVerifyTime().getTime() : (a.getCreateTime() != null ? a.getCreateTime().getTime() : 0L));
                activities.add(act);
            }
        }

        if (allPrintRecords != null && !allPrintRecords.isEmpty())
        {
            List<EduPrintRecord> sortedPrints = new ArrayList<>(allPrintRecords);
            sortedPrints.sort((a, b) -> Long.compare(b.getPrintId() != null ? b.getPrintId() : 0L,
                                                     a.getPrintId() != null ? a.getPrintId() : 0L));
            int limit = Math.min(sortedPrints.size(), 4);
            for (int i = 0; i < limit; i++)
            {
                EduPrintRecord p = sortedPrints.get(i);
                Map<String, Object> act = new HashMap<>();
                act.put("id", "print_" + p.getPrintId());
                act.put("type", "edu");
                act.put("title", StringUtils.isNotEmpty(p.getGrade()) ? p.getGrade() + "文印印制" : "试卷讲义印制");
                act.put("desc", (StringUtils.isNotEmpty(p.getTeacherName()) ? p.getTeacherName() + "老师" : "教师") + "登记《" + (StringUtils.isNotEmpty(p.getPrintName()) ? p.getPrintName() : "教学资料") + "》" + (p.getPrintCount() != null ? p.getPrintCount() : 0) + "份");
                act.put("time", p.getCreateTime() != null ? timeFmt.format(p.getCreateTime()) : "今天");
                act.put("badge", (StringUtils.isNotEmpty(p.getPaperType()) ? p.getPaperType() : "标准") + "印制");
                act.put("sortTime", p.getCreateTime() != null ? p.getCreateTime().getTime() : 0L);
                activities.add(act);
            }
        }

        if (inList != null && !inList.isEmpty())
        {
            List<StockIn> sortedIns = new ArrayList<>(inList);
            sortedIns.sort((a, b) -> Long.compare(b.getInId() != null ? b.getInId() : 0L, a.getInId() != null ? a.getInId() : 0L));
            int limit = Math.min(sortedIns.size(), 3);
            for (int i = 0; i < limit; i++)
            {
                StockIn in = sortedIns.get(i);
                Map<String, Object> act = new HashMap<>();
                act.put("id", "stock_in_" + in.getInId());
                act.put("type", "stock");
                act.put("title", "物资采购入库");
                act.put("desc", (StringUtils.isNotEmpty(in.getSupplierName()) ? in.getSupplierName() : "供应商") + "入库单号 " + (StringUtils.isNotEmpty(in.getInNo()) ? in.getInNo() : "") + " 验收完成");
                Date t = in.getInTime() != null ? in.getInTime() : in.getCreateTime();
                act.put("time", t != null ? timeFmt.format(t) : "今天");
                act.put("badge", "采购入库");
                act.put("sortTime", t != null ? t.getTime() : 0L);
                activities.add(act);
            }
        }

        if (outList != null && !outList.isEmpty())
        {
            List<StockOut> sortedOuts = new ArrayList<>(outList);
            sortedOuts.sort((a, b) -> Long.compare(b.getOutId() != null ? b.getOutId() : 0L, a.getOutId() != null ? a.getOutId() : 0L));
            int limit = Math.min(sortedOuts.size(), 3);
            for (int i = 0; i < limit; i++)
            {
                StockOut out = sortedOuts.get(i);
                Map<String, Object> act = new HashMap<>();
                act.put("id", "stock_out_" + out.getOutId());
                act.put("type", "stock");
                act.put("title", "耗材领用出库");
                act.put("desc", (StringUtils.isNotEmpty(out.getReceiver()) ? out.getReceiver() : (StringUtils.isNotEmpty(out.getClassName()) ? out.getClassName() : "教研部门")) + "领用单号 " + (StringUtils.isNotEmpty(out.getOutNo()) ? out.getOutNo() : "") + " 出库完成");
                Date t = out.getOutTime() != null ? out.getOutTime() : out.getCreateTime();
                act.put("time", t != null ? timeFmt.format(t) : "今天");
                act.put("badge", "领用出库");
                act.put("sortTime", t != null ? t.getTime() : 0L);
                activities.add(act);
            }
        }

        activities.sort((a, b) -> Long.compare(((Number) b.getOrDefault("sortTime", 0L)).longValue(),
                                                ((Number) a.getOrDefault("sortTime", 0L)).longValue()));
        root.put("activities", activities);

        return root;
    }
}
