package com.doupi.recruit.service.impl;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.doupi.common.utils.DateUtils;
import com.doupi.common.utils.StringUtils;
import com.doupi.system.domain.SysNotice;
import com.doupi.system.service.ISysConfigService;
import com.doupi.system.service.ISysNoticeService;
import com.doupi.recruit.service.IDoupiSchoolPortalService;

/**
 * 汉外华襄复读中心 - 官网门户数据与业务实现类
 * 
 * @author doupi
 */
@Service
public class DoupiSchoolPortalServiceImpl implements IDoupiSchoolPortalService
{
    @Autowired(required = false)
    private ISysConfigService configService;

    @Autowired(required = false)
    private ISysNoticeService noticeService;

    private final Map<String, Object> siteData = new ConcurrentHashMap<>();
    private final List<Map<String, Object>> teacherList = new ArrayList<>();
    private final List<Map<String, Object>> articleList = new ArrayList<>();
    private final List<Map<String, Object>> classPlanList = new ArrayList<>();
    private final List<Map<String, Object>> facilityList = new ArrayList<>();
    private final List<Map<String, Object>> faqList = new ArrayList<>();

    @PostConstruct
    public void initPortalData()
    {
        initSiteData();
        initTeachers();
        initArticles();
        initClassPlans();
        initFacilities();
        initFaqs();
    }

    private void initSiteData()
    {
        siteData.put("siteName", "汉外华襄复读中心");
        siteData.put("siteNameEn", "HUAXIANG SENIOR YEAR CENTER");
        siteData.put("brandMark", "华");
        siteData.put("slogan", "不是复读，是再出发");
        siteData.put("kicker", "ONE YEAR. A NEW POSSIBILITY.");
        siteData.put("subtitle", "只专注高三。让每一份不甘，都拥有重新抵达的路径。");
        siteData.put("address", "武汉市江夏区武汉海淀外国语实验学校（北门）");
        siteData.put("hotlines", Arrays.asList("027-81777887", "027-81777838"));
        siteData.put("admissionsLine", "400-0000-000");
        siteData.put("officeHours", "周一至周日 8:30–17:30");
        siteData.put("icp", "鄂ICP备2026055716号-1");

        // 核心成效数据
        List<Map<String, Object>> results = new ArrayList<>();
        results.add(buildStat("92.6%", "2026 届本科上线率"));
        results.add(buildStat("+86", "平均提分（分）"));
        results.add(buildStat("318", "600 分以上人数"));
        results.add(buildStat("146", "双一流院校录取"));
        siteData.put("results", results);

        // 校园硬核参数
        List<Map<String, Object>> campusStats = new ArrayList<>();
        campusStats.add(buildStat("130", "亩校园面积"));
        campusStats.add(buildStat("12", "万㎡建筑面积"));
        campusStats.add(buildStat("1100", "人千人礼堂"));
        campusStats.add(buildStat("10", "万册图书馆藏"));
        siteData.put("campusStats", campusStats);

        // 办学特色四大理由
        List<Map<String, Object>> reasons = new ArrayList<>();
        reasons.add(buildReason("只做复读", "不做低年级、不做泛学科培训，全部精力只给高三这一年。", "/about/introduction"));
        reasons.add(buildReason("全封闭管理", "日清 · 周结 · 月测，手机统一保管，班主任全天跟班。", "/senior-year/teaching"));
        reasons.add(buildReason("小班分层", "按学情分层编班，每班不超过 40 人，作业与讲评分层。", "/senior-year/curriculum"));
        reasons.add(buildReason("名师领衔", "名校管理骨干与特级教师组成的学科首席团队。", "/faculty/teachers"));
        siteData.put("reasons", reasons);

        // 优秀学子故事
        List<Map<String, Object>> stories = new ArrayList<>();
        stories.add(buildStory("陈同学", 478, 612, "武汉大学 · 法学", "第一次月考我还在班里中游，是每周的错题复盘让我知道分丢在哪里。"));
        stories.add(buildStory("刘同学", 521, 647, "华中科技大学 · 计算机", "老师把物理大题拆成固定步骤，到五月我已经能稳定拿满。"));
        stories.add(buildStory("王同学", 436, 581, "华中师范大学 · 汉语言", "心理老师陪我熬过一模的低谷，那以后我才真正学会了节奏。"));
        siteData.put("successStories", stories);
    }

    private void initTeachers()
    {
        teacherList.clear();
        addTeacher("wang-zhong", "王忠", "化学", "校长", "principal", "management",
            Arrays.asList("中学正高级教师", "化学特级教师", "国际奥赛金牌教练"),
            "原华中师大一附中党委书记兼副校长，湖北省督学、华中师大硕士研究生导师。",
            "把方程式当成故事来讲。", 32, "享受国务院特殊津贴专家");

        addTeacher("meng-zhaokui", "孟昭奎", "数学", "副校长", "principal", "management",
            Arrays.asList("中学高级教师", "高考状元教师", "功勋班主任"),
            "原华中师大附属武当中学副校长、督学，拥有丰富的高中教学与管理经验。",
            "每一道压轴题，都是几道基础题的组合。", 28, "湖北省骨干教师");

        addTeacher("xie-zhenxiang", "谢贞祥", "语文", "副校长", "principal", "management",
            Arrays.asList("中学高级教师", "湖北省优秀语文教师", "国家二级心理咨询师"),
            "原华师一附中副校长，曾任华师一附中初中部校长、朝阳学校校长。",
            "读懂题目，就赢了一半。", 29, "武汉市优秀教育工作者");

        addTeacher("tan-weisheng", "谭伟生", "历史", "华襄复读中心主任", "principal", "management",
            Arrays.asList("中学正高级教师", "历史特级教师", "高考状元教师"),
            "长期深耕高中教学与备考研究，担任华襄复读中心主任。",
            "历史题考的是逻辑，不是记忆。", 27, "湖北省优秀历史教师");

        addTeacher("zhao-yuliang", "赵育亮", "语文", "语文学科首席教师", "special", "faculty",
            Arrays.asList("中学正高级教师", "语文特级教师", "全国优秀语文教师"),
            "享受武汉市人民政府专项津贴专家，国家级观摩课一等奖获得者。",
            "阅读是知识的输入，写作是逻辑的绽放。", 30, "国家级优质课一等奖");

        addTeacher("zhang-zhuhua", "张祝华", "数学", "数学学科首席教师", "backbone", "faculty",
            Arrays.asList("中学高级教师", "湖北省骨干教师", "省级优质课一等奖"),
            "原华师一附中卓越班主任，武汉市高考状元班主任。",
            "用清晰的思维模型替代盲目的题海冲刺。", 24, "武汉市高考状元班主任");

        addTeacher("li-dexian", "李德贤", "英语", "英语学科首席教师", "special", "faculty",
            Arrays.asList("中学高级教师", "英语特级教师", "全国优秀外语教师"),
            "湖北省“名师档案”入选者，长期担任高中英语教学与班级管理工作。",
            "语言是练出来的，不是背出来的。", 26, "湖北省特级教师");

        addTeacher("lv-haoran", "吕浩然", "化学", "化学学科首席教师", "backbone", "faculty",
            Arrays.asList("中学高级教师", "竞赛优秀教练", "硕士研究生指导教师"),
            "原华中师大一附中优秀教研组长、模范班主任，培养清华、北大学生30余人。",
            "实验探究本质，推演解锁难点。", 22, "全国化学奥赛优秀教练");

        addTeacher("yang-yanfei", "杨燕飞", "化学", "化学教师", "backbone", "faculty",
            Arrays.asList("中学高级教师", "湖北省骨干教师", "名师工作室指导教师"),
            "曾任新洲一中教研组长、省实验中学年级主任、教导主任。",
            "精准备考，日清周结，稳步提分。", 25, "湖北省骨干教师");

        addTeacher("li-wei", "李炜", "生物", "生物学科首席教师", "special", "faculty",
            Arrays.asList("中学高级教师", "生物特级教师", "武汉市首席教师"),
            "全国基础教育先进工作者，武汉市教师高端培训专家。",
            "从生活现象出发理解生命科学原理。", 27, "武汉市学科首席教师");

        addTeacher("ge-honglin", "鄂洪林", "历史", "历史学科首席教师", "special", "faculty",
            Arrays.asList("中学正高级教师", "历史特级教师", "教学名师"),
            "原武汉外国语学校优秀教师、模范班主任，武汉市2024年高考状元教师。",
            "建立大历史观，融通命题逻辑与时代背景。", 31, "高考状元名师");

        addTeacher("xia-jianfeng", "夏剑峰", "地理", "地理学科首席教师", "backbone", "faculty",
            Arrays.asList("中学高级教师", "全国优秀地理教师", "奥赛指导教师"),
            "中国地理学会会员，曾培养清华、北大学生20余人。",
            "一张地图，就是一道综合题。", 23, "全国优秀地理教师");

        addTeacher("liu-daode", "刘道德", "语文", "语文教师", "special", "faculty",
            Arrays.asList("中学高级教师", "语文特级教师", "全国优秀教师"),
            "原襄阳五中党委书记、校长，湖北省有突出贡献中青年专家。",
            "涵养品格，以文育人，静水流深。", 35, "湖北省有突出贡献专家");
    }

    private void addTeacher(String id, String name, String subject, String role, String group, String category,
                            List<String> tags, String intro, String motto, int years, String honor)
    {
        Map<String, Object> t = new HashMap<>();
        t.put("id", id);
        t.put("slug", id);
        t.put("name", name);
        t.put("subject", subject);
        t.put("role", role);
        t.put("group", group); // principal, special, backbone, excellent
        t.put("category", category); // management, faculty
        t.put("tags", tags);
        t.put("intro", intro);
        t.put("motto", motto);
        t.put("years", years);
        t.put("honor", honor);
        t.put("stats", Arrays.asList(
            buildStat(String.valueOf(years / 2), "届高三毕业班"),
            buildStat(String.valueOf(15 + (years % 10) * 3), "名清北学子"),
            buildStat("+" + (26 + (years % 7) * 3), "带班平均提分")
        ));
        t.put("career", Arrays.asList(
            buildCareer("1998–2010", "省重点示范高中学科教学骨干"),
            buildCareer("2010–2020", "担任年级教研组长，连续带高三毕业班"),
            buildCareer("2020至今", "加入汉外华襄复读中心，任" + role)
        ));
        t.put("review", "老师讲题从不绕弯，每次都能一句话点到关键。复读这一年，最感谢的就是" + name + "老师。");
        teacherList.add(t);
    }

    private void initArticles()
    {
        articleList.clear();
        // updates (校园动态)
        addArticle("feedback-meeting", "updates", "2026.09.18", "校园动态",
            "新学期第一次学情反馈会：把每一步都走得更清楚",
            "以阶段数据为镜，帮助每位学生定位当下、制定下一步。",
            Arrays.asList(
                "9 月 18 日下午，华襄复读中心召开新学期第一次学情反馈会。各班班主任结合入学诊断考试数据，逐一向学生说明每科的失分结构。",
                "教学研究中心负责人表示，复读的第一步不是做更多题，而是看清问题在哪里。本次反馈会后，每位学生都将拿到一份个人提分方案。",
                "接下来，各学科将按诊断结果开设分层辅导小组，第一次月考后再进行动态调整。"
            ), false, Collections.emptyList());

        addArticle("goal-talk", "updates", "2026.09.12", "校园动态",
            "师生共话目标：高三不是独行，而是并肩向前",
            "各班开启学习目标交流会，让每一份期待都落到日常。",
            Arrays.asList(
                "本周，各班陆续开展学习目标交流会。学生们把目标院校写在卡片上，贴在教室后墙。",
                "班主任引导学生把大目标拆解为每月、每周可完成的小目标，并约定每月复盘一次。"
            ), false, Collections.emptyList());

        addArticle("baseball", "updates", "2026.09.05", "校园生活",
            "棒球场上的专注时刻｜校园运动活动记录",
            "在学习之外，保持热爱与体能，收获向上的力量。",
            Arrays.asList(
                "每天 17:30，运动场准时热闹起来。棒球社是今年新成立的学生社团，已有 60 多名同学加入。",
                "体育老师表示，每天一小时的运动，是保持一整年学习状态的基础。"
            ), false, Collections.emptyList());

        addArticle("parents-meeting", "updates", "2026.08.29", "家校互动",
            "新生家长见面会：一起陪孩子走好关键一年",
            "从入学适应到学习规划，建立家校共同支持的方式。",
            Arrays.asList(
                "8 月 29 日，新生家长见面会在千人礼堂举行。中心主任介绍了全年教学安排与管理制度。",
                "心理教师为家长们分享了复读阶段常见的情绪变化，以及家长可以如何支持孩子。"
            ), false, Collections.emptyList());

        // notices (校园公告)
        addArticle("national-day", "notices", "2026.09.20", "重要公告",
            "2026级高三学生国庆假期学习与安全提示",
            "国庆假期放假时间与返校安排安全注意事项。",
            Arrays.asList(
                "各位家长、同学：",
                "根据校历安排，国庆假期为 10 月 1 日至 10 月 3 日，10 月 3 日 18:00 前返校参加晚自习。",
                "假期期间请同学们按照各学科布置的假期作业合理安排时间，注意交通、饮食与用电安全。返校时请携带假期作业，班主任将统一检查。",
                "特此通知。"
            ), true, Arrays.asList("国庆假期各学科作业安排.pdf"));

        addArticle("open-day", "notices", "2026.09.16", "招生公告",
            "汉外华襄复读中心校园开放日预约通道开启",
            "每周六、周日面向社会开放访校体验。",
            Arrays.asList(
                "为便于家长和学生实地了解中心的教学与生活环境，即日起开放校园开放日预约。",
                "开放时间：每周六、周日 9:00—16:00。请通过官网「预约游园」提交信息，招生老师将电话确认到访时间。"
            ), false, Collections.emptyList());

        addArticle("fees", "notices", "2026.09.02", "通知公告",
            "关于2026学年秋季学期收费及资助政策说明",
            "2026秋季学费公示及助学金减免申请指南。",
            Arrays.asList(
                "根据物价部门备案标准，现将 2026 学年秋季学期收费项目及资助政策说明如下。",
                "家庭经济困难学生可向班主任提交资助申请，经审核后可享受学费减免。"
            ), false, Arrays.asList("2026学年收费标准.pdf", "学生资助申请表.docx"));

        addArticle("enrollment", "notices", "2026.08.25", "入学公告",
            "新生报到须知与入学材料清单",
            "报到流程、必备材料及校规守则指引。",
            Arrays.asList(
                "新生报到时间为 8 月 26 日至 8 月 27 日，请携带以下材料到教学楼一楼大厅办理报到手续。",
                "材料清单详见附件。"
            ), false, Arrays.asList("入学材料清单.pdf"));

        // gaokao (高考资讯)
        addArticle("2027-policy", "gaokao", "2026.09.22", "政策解读",
            "2027 年湖北高考报名时间与要求解读",
            "报名时间、报名条件与复读生需要注意的户籍、学籍问题。",
            Arrays.asList(
                "2027 年湖北省普通高考报名预计于 11 月上旬开始，复读生需在户籍所在地报名。",
                "往届生报名需提供高中毕业证书，请提前准备。中心将统一协助学生完成网上报名。"
            ), false, Collections.emptyList());

        addArticle("elective", "gaokao", "2026.09.10", "备考指导",
            "“3+1+2” 模式下，复读生如何调整选科？",
            "从专业覆盖率与个人优势两个维度，给出选科调整建议。",
            Arrays.asList(
                "新高考“3+1+2”模式下，部分复读生会考虑调整选考科目。",
                "我们建议从目标专业覆盖率与个人学科优势两个维度综合判断，并在入学两周内完成调整。"
            ), false, Collections.emptyList());

        addArticle("score-lines", "gaokao", "2026.06.25", "分数线",
            "2026 年湖北省普通高校招生录取控制分数线公布",
            "物理类本科线 437 分，历史类本科线 446 分。",
            Arrays.asList(
                "湖北省教育考试院公布 2026 年普通高校招生录取控制分数线。",
                "物理类本科批 437 分、特殊类型招生控制线 529 分；历史类本科批 446 分、特殊类型招生控制线 541 分。"
            ), false, Collections.emptyList());
    }

    private void addArticle(String id, String kind, String date, String category, String title, String excerpt,
                            List<String> body, boolean pinned, List<String> attachments)
    {
        Map<String, Object> a = new HashMap<>();
        a.put("id", id);
        a.put("kind", kind);
        a.put("date", date);
        a.put("category", category);
        a.put("title", title);
        a.put("excerpt", excerpt);
        a.put("body", body);
        a.put("pinned", pinned);
        a.put("attachments", attachments);
        a.put("views", 1200 + (int)(Math.random() * 800));
        articleList.add(a);
    }

    private void initClassPlans()
    {
        classPlanList.clear();
        Map<String, Object> c1 = new HashMap<>();
        c1.put("id", "foundation");
        c1.put("name", "基础夯实班");
        c1.put("desc", "面向基础相对薄弱、需要系统补齐知识漏洞的学生。");
        c1.put("size", "≤ 40 人");
        c1.put("hours", "每周 52 课时");
        c1.put("dorm", "4 人间 · 独立卫浴");
        c1.put("fee", "咨询获取");
        c1.put("seats", 200);
        c1.put("taken", 136);
        c1.put("req", Arrays.asList("参加过高考", "入学诊断考试", "无总分限制"));
        classPlanList.add(c1);

        Map<String, Object> c2 = new HashMap<>();
        c2.put("id", "advance");
        c2.put("name", "强化提升班");
        c2.put("desc", "面向有一定基础、希望在关键学科实现突破的学生。");
        c2.put("size", "≤ 36 人");
        c2.put("hours", "每周 54 课时");
        c2.put("dorm", "4 人间 · 独立卫浴");
        c2.put("fee", "咨询获取");
        c2.put("seats", 160);
        c2.put("taken", 121);
        c2.put("req", Arrays.asList("高考 480 分以上", "入学诊断考试", "面谈"));
        classPlanList.add(c2);

        Map<String, Object> c3 = new HashMap<>();
        c3.put("id", "elite");
        c3.put("name", "拔尖冲刺班");
        c3.put("desc", "面向目标名校、需要更高强度专题拓展的学生。");
        c3.put("size", "≤ 30 人");
        c3.put("hours", "每周 56 课时");
        c3.put("dorm", "4 人间 · 独立卫浴");
        c3.put("fee", "咨询获取");
        c3.put("seats", 90);
        c3.put("taken", 78);
        c3.put("req", Arrays.asList("高考 580 分以上", "入学诊断考试", "学科首席面谈"));
        classPlanList.add(c3);
    }

    private void initFacilities()
    {
        facilityList.clear();
        addFacility("teaching", "教学楼", "教学", "独立复读楼层", "复读中心独立使用的教学楼层，教室、自习区与答疑室同层布置，减少往返。",
            Arrays.asList("标准教室 24 间", "每班 ≤ 40 人", "护眼灯光 · 新风系统"), "06:50 — 22:30", 42, 30);

        addFacility("library", "图书馆", "教学", "10 万册藏书", "开放式阅览区与安静自习区分开，配备高考真题资料专架。",
            Arrays.asList("藏书 10 万册", "阅览座位 320 个", "真题资料专架"), "12:00 — 14:00 · 17:30 — 19:00", 62, 22);

        addFacility("lab", "实验室", "教学", "理化生实验", "物理、化学、生物独立实验室，满足高考实验题的实操复习。",
            Arrays.asList("物化生实验室各 2 间", "演示实验每周开放", "实验员专人管理"), "按课表开放", 26, 24);

        addFacility("auditorium", "千人礼堂", "教学", "1100 座", "开学典礼、百日誓师、成人礼与讲座都在这里举行。",
            Arrays.asList("1100 座", "专业声光系统", "可容纳全体师生"), "活动期间开放", 78, 40);

        addFacility("dorm", "学生公寓", "生活", "4 人间", "男女生公寓分楼管理，宿管 24 小时值守，统一熄灯作息。",
            Arrays.asList("4 人间 · 独立卫浴", "空调 · 热水 24 小时", "宿管 24 小时值守"), "22:30 统一熄灯", 20, 62);

        addFacility("canteen", "学生食堂", "生活", "三餐 + 夜宵", "两层食堂，每周公示菜单，晚自习后提供夜宵。",
            Arrays.asList("就餐座位 1200 个", "每周公示菜单", "晚自习后夜宵"), "06:30 — 22:40", 44, 70);

        addFacility("gym", "室内体育馆", "运动", "全天候运动", "篮球、羽毛球、乒乓球场地，雨天体育课照常进行。",
            Arrays.asList("篮球场 2 片", "羽毛球场 6 片", "乒乓球台 12 张"), "17:30 — 18:30", 70, 68);

        addFacility("field", "运动场", "运动", "400 米跑道", "标准田径场与棒球场，每天傍晚是全校最热闹的时候。",
            Arrays.asList("400 米标准跑道", "足球场 · 棒球场", "每日大课间跑操"), "06:40 — 18:30", 84, 78);

        addFacility("safety", "安保与医务", "安全", "封闭式管理", "校门人脸识别门禁，校园监控全覆盖，医务室驻校医生。",
            Arrays.asList("人脸识别门禁", "监控全覆盖", "驻校医生 · 医务室"), "24 小时", 8, 40);
    }

    private void addFacility(String id, String name, String zone, String tag, String desc, List<String> specs, String hours, int x, int y)
    {
        Map<String, Object> f = new HashMap<>();
        f.put("id", id);
        f.put("name", name);
        f.put("zone", zone);
        f.put("tag", tag);
        f.put("desc", desc);
        f.put("specs", specs);
        f.put("hours", hours);
        f.put("x", x);
        f.put("y", y);
        facilityList.add(f);
    }

    private void initFaqs()
    {
        faqList.clear();
        addFaq("报名", "复读需要满足什么条件？", "面向参加过高考、希望再拼一年的应往届高三学生。我们会通过学情测评了解学生基础，据此提供分层编班建议。");
        addFaq("报名", "如何报名或预约到校参观？", "可通过网站「预约游园」或「预约咨询」提交联系方式，招生老师会尽快与您电话确认时间。");
        addFaq("报名", "开学后还能插班吗？", "可以。插班生入学后会安排两周衔接课程，班主任单独制定追赶计划。");
        addFaq("费用", "学费包含哪些项目？", "学费包含全部课程、资料与考试费用；住宿费与伙食费单独收取，具体标准请咨询招生老师。");
        addFaq("费用", "有奖学金吗？", "按高考成绩设四档学费减免，最高全免，详见招生简章。");
        addFaq("课程", "班级规模有多大？", "采用小班分层教学，每班不超过 40 人，拔尖冲刺班不超过 30 人。");
        addFaq("课程", "可以换选考科目吗？", "入学两周内可申请调整，教务处会结合测评结果给出建议。");
        addFaq("住宿", "是否封闭管理？住宿条件如何？", "实行全日制封闭管理，4 人间公寓配独立卫浴、空调与 24 小时热水，宿管全天值守。");
        addFaq("管理", "如何了解孩子在校的学习情况？", "每周推送学情报告，每月召开家长会，班主任与家长保持定期沟通。");
        addFaq("管理", "手机怎么管理？", "入校统一保管，每周固定时段可与家长通话，特殊情况可随时通过班主任联系。");
        addFaq("心理", "孩子压力大怎么办？", "班主任、心理教师与专业机构组成三线支持体系，咨询全程保密，可匿名预约。");
    }

    private void addFaq(String c, String q, String a)
    {
        Map<String, Object> item = new HashMap<>();
        item.put("c", c);
        item.put("q", q);
        item.put("a", a);
        faqList.add(item);
    }

    private Map<String, Object> buildStat(String n, String label)
    {
        Map<String, Object> m = new HashMap<>();
        m.put("n", n);
        m.put("label", label);
        return m;
    }

    private Map<String, Object> buildReason(String t, String d, String to)
    {
        Map<String, Object> m = new HashMap<>();
        m.put("t", t);
        m.put("d", d);
        m.put("to", to);
        return m;
    }

    private Map<String, Object> buildStory(String name, int from, int to, String school, String quote)
    {
        Map<String, Object> m = new HashMap<>();
        m.put("name", name);
        m.put("from", from);
        m.put("to", to);
        m.put("school", school);
        m.put("quote", quote);
        return m;
    }

    private Map<String, Object> buildCareer(String y, String t)
    {
        Map<String, Object> m = new HashMap<>();
        m.put("y", y);
        m.put("t", t);
        return m;
    }

    @Override
    public Map<String, Object> getSiteInfo()
    {
        Map<String, Object> copy = new HashMap<>(siteData);
        if (configService != null)
        {
            try
            {
                String hotline = configService.selectConfigByKey("portal.hotline");
                if (StringUtils.isNotEmpty(hotline))
                {
                    copy.put("hotlines", Collections.singletonList(hotline));
                }
                String address = configService.selectConfigByKey("portal.address");
                if (StringUtils.isNotEmpty(address))
                {
                    copy.put("address", address);
                }
                String slogan = configService.selectConfigByKey("portal.slogan");
                if (StringUtils.isNotEmpty(slogan))
                {
                    copy.put("slogan", slogan);
                }
            }
            catch (Exception ignored)
            {
            }
        }
        return copy;
    }

    @Override
    public List<Map<String, Object>> getTeachers(String group, String category, String subject)
    {
        return teacherList.stream().filter(t -> {
            if (group != null && !group.isEmpty() && !group.equals(t.get("group"))) return false;
            if (category != null && !category.isEmpty() && !category.equals(t.get("category"))) return false;
            if (subject != null && !subject.isEmpty() && !subject.equals(t.get("subject"))) return false;
            return true;
        }).collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> getTeacherById(String id)
    {
        return teacherList.stream()
            .filter(t -> id.equals(t.get("id")) || id.equals(t.get("slug")))
            .findFirst()
            .orElse(null);
    }

    @Override
    public List<Map<String, Object>> getArticles(String kind, String category, Integer page, Integer pageSize)
    {
        if (noticeService != null)
        {
            try
            {
                SysNotice query = new SysNotice();
                query.setStatus("0"); // 正常发布的公告
                List<SysNotice> list = noticeService.selectNoticeList(query);
                if (list != null && !list.isEmpty())
                {
                    List<Map<String, Object>> dynamicNotices = new ArrayList<>();
                    for (SysNotice n : list)
                    {
                        Map<String, Object> item = new HashMap<>();
                        item.put("id", String.valueOf(n.getNoticeId()));
                        item.put("title", n.getNoticeTitle());
                        item.put("date", DateUtils.parseDateToStr("yyyy-MM-dd", n.getCreateTime() != null ? n.getCreateTime() : new Date()));
                        item.put("category", "1".equals(n.getNoticeType()) ? "通知公告" : "高招资讯");
                        item.put("kind", "1".equals(n.getNoticeType()) ? "notices" : "updates");
                        item.put("summary", n.getNoticeContent() != null ? n.getNoticeContent().replaceAll("<[^>]*>", "").trim() : "");
                        item.put("content", n.getNoticeContent());
                        if (kind == null || kind.isEmpty() || kind.equals(item.get("kind")))
                        {
                            if (category == null || category.isEmpty() || category.equals(item.get("category")))
                            {
                                dynamicNotices.add(item);
                            }
                        }
                    }
                    if (!dynamicNotices.isEmpty())
                    {
                        return dynamicNotices;
                    }
                }
            }
            catch (Exception ignored)
            {
            }
        }
        return articleList.stream().filter(a -> {
            if (kind != null && !kind.isEmpty() && !kind.equals(a.get("kind"))) return false;
            if (category != null && !category.isEmpty() && !category.equals(a.get("category"))) return false;
            return true;
        }).collect(Collectors.toList());
    }

    @Override
    public Map<String, Object> getArticleDetail(String kind, String id)
    {
        if (noticeService != null)
        {
            try
            {
                Long noticeId = Long.parseLong(id);
                SysNotice n = noticeService.selectNoticeById(noticeId);
                if (n != null)
                {
                    Map<String, Object> item = new HashMap<>();
                    item.put("id", String.valueOf(n.getNoticeId()));
                    item.put("title", n.getNoticeTitle());
                    item.put("date", DateUtils.parseDateToStr("yyyy-MM-dd", n.getCreateTime() != null ? n.getCreateTime() : new Date()));
                    item.put("category", "1".equals(n.getNoticeType()) ? "通知公告" : "高招资讯");
                    item.put("kind", "1".equals(n.getNoticeType()) ? "notices" : "updates");
                    item.put("summary", n.getNoticeContent() != null ? n.getNoticeContent().replaceAll("<[^>]*>", "").trim() : "");
                    item.put("content", n.getNoticeContent());
                    return item;
                }
            }
            catch (Exception ignored)
            {
            }
        }
        return articleList.stream()
            .filter(a -> id.equals(a.get("id")) && (kind == null || kind.isEmpty() || kind.equals(a.get("kind"))))
            .findFirst()
            .orElse(null);
    }

    @Override
    public List<Map<String, Object>> getClassPlans()
    {
        return classPlanList;
    }

    @Override
    public List<Map<String, Object>> getFacilities(String zone)
    {
        return facilityList.stream().filter(f -> {
            if (zone != null && !zone.isEmpty() && !zone.equals("全部") && !zone.equals(f.get("zone"))) return false;
            return true;
        }).collect(Collectors.toList());
    }

    @Override
    public List<Map<String, Object>> getFaqs(String category)
    {
        return faqList.stream().filter(f -> {
            if (category != null && !category.isEmpty() && !category.equals("全部") && !category.equals(f.get("c"))) return false;
            return true;
        }).collect(Collectors.toList());
    }

    @Override
    @SuppressWarnings("unchecked")
    public void updateSiteInfo(Map<String, Object> data)
    {
        if (data == null) return;
        siteData.putAll(data);
        if (configService != null)
        {
            try
            {
                if (data.containsKey("hotlines"))
                {
                    Object h = data.get("hotlines");
                    String val = h instanceof List ? String.join(",", (List<String>) h) : String.valueOf(h);
                    saveOrUpdateConfig("portal.hotline", "官网热线电话", val);
                }
                if (data.containsKey("address"))
                {
                    saveOrUpdateConfig("portal.address", "官网校区地址", String.valueOf(data.get("address")));
                }
                if (data.containsKey("slogan"))
                {
                    saveOrUpdateConfig("portal.slogan", "官网宣传标语", String.valueOf(data.get("slogan")));
                }
                if (data.containsKey("subtitle"))
                {
                    saveOrUpdateConfig("portal.subtitle", "官网副标题", String.valueOf(data.get("subtitle")));
                }
            }
            catch (Exception ignored)
            {
            }
        }
    }

    private void saveOrUpdateConfig(String key, String name, String value)
    {
        if (configService == null) return;
        try
        {
            String existing = configService.selectConfigByKey(key);
            if (existing != null)
            {
                com.doupi.system.domain.SysConfig c = new com.doupi.system.domain.SysConfig();
                c.setConfigKey(key);
                c.setConfigValue(value);
                configService.updateConfig(c);
            }
            else
            {
                com.doupi.system.domain.SysConfig c = new com.doupi.system.domain.SysConfig();
                c.setConfigName(name);
                c.setConfigKey(key);
                c.setConfigValue(value);
                c.setConfigType("Y");
                configService.insertConfig(c);
            }
        }
        catch (Exception ignored)
        {
        }
    }
}
