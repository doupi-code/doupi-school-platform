import axios from "axios";
import type { SiteConfig, Teacher, Article, Facility, FaqItem } from "./types";

const api = axios.create({
  baseURL: "/api/public/v1",
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res && typeof res.code === "number" && res.code !== 0 && res.code !== 200) {
      return Promise.reject(new Error(res.msg || res.message || "请求处理失败"));
    }
    return res.data !== undefined ? res.data : res;
  },
  (error) => {
    return Promise.reject(error);
  }
);

function safeParseJson(val: any, fallback: any = []) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim()) {
    try {
      const p = JSON.parse(val);
      if (Array.isArray(p)) return p;
    } catch {}
    return val.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean);
  }
  return fallback;
}

export function normalizeSiteConfig(raw: any): Partial<SiteConfig> {
  if (!raw) return {};
  const d = raw?.data || raw;
  return {
    siteName: d.siteName || d.site_name,
    siteNameEn: d.siteNameEn || d.site_name_en,
    slogan: d.slogan,
    subtitle: d.subtitle,
    kicker: d.kicker,
    address: d.address,
    hotlines: safeParseJson(d.hotlines, typeof d.hotlines === "string" ? d.hotlines.split(/[,，]/) : []),
    admissionsLine: d.admissionsLine || d.admissions_line,
    officeHours: d.officeHours || d.office_hours,
    icp: d.icp,
    statResults: safeParseJson(d.statResults || d.stat_results),
    statCampus: safeParseJson(d.statCampus || d.stat_campus),
  };
}

export function parseTeacherTags(t: any): string[] {
  if (!t) return [];
  const raw = t.tags ?? t.honorTags;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string" && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {}
    return raw.split(/[,，、|\s]+/).map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

export function normalizeTeacher(t: any): Teacher {
  return {
    id: t.teacherId ? `t-${t.teacherId}` : (t.teacher_id ? `t-${t.teacher_id}` : String(t.slug || t.id || "")),
    name: t.name || "",
    subject: t.subject || "通识",
    role: t.title || t.roleTitle || t.role || "学科名师",
    tags: parseTeacherTags(t),
    intro: t.bio || t.introduction || t.intro || "",
    category: t.category === "principal" || t.groupName === "management" || t.group_name === "management" ? "management" : "faculty",
    avatarUrl: t.avatarUrl || t.avatar_url || "",
    years: t.years || t.teachingYears,
    motto: t.quote || t.motto || "",
    review: t.achievement || t.studentReview || t.review,
  };
}

export const cmsClient = {
  // 获取站点门户参数配置 (100% 对齐 MySQL doupi_cms_config)
  async getSiteConfig(): Promise<Partial<SiteConfig>> {
    try {
      const res: any = await api.get("/cms/site");
      return normalizeSiteConfig(res);
    } catch {
      try {
        const res: any = await api.get("/site");
        return normalizeSiteConfig(res);
      } catch (e) {
        throw e;
      }
    }
  },

  // 获取公文资讯列表 (100% 对齐 MySQL doupi_cms_article)
  async getArticles(params?: { kind?: string; category?: string }): Promise<Article[]> {
    try {
      const data: any = await api.get("/cms/articles", { params });
      const list = Array.isArray(data) ? data : data?.rows || [];
      return list.map((item: any) => ({
        id: item.articleId ? String(item.articleId) : (item.article_id ? String(item.article_id) : item.id),
        articleId: item.articleId || item.article_id,
        kind: item.kind || "updates",
        date: item.publishedDate || item.published_date || item.date || "2026.09.20",
        category: item.category || "校园动态",
        title: item.title,
        summary: item.summary || item.excerpt,
        excerpt: item.summary || item.excerpt,
        body: item.content ? item.content.split("\n\n").filter(Boolean) : (item.body || []),
        content: item.content,
        coverUrl: item.coverUrl || item.cover_url,
        pinned: (item.sortOrder || item.sort_order) && (item.sortOrder || item.sort_order) > 20,
        author: item.author,
      }));
    } catch {
      const data: any = await api.get("/articles", { params });
      return Array.isArray(data) ? data : data?.rows || [];
    }
  },

  // 获取单篇公文详情 (100% 对齐 MySQL doupi_cms_article)
  async getArticleDetail(id: string | number): Promise<Article | null> {
    try {
      const data: any = await api.get(`/cms/articles/${id}`);
      if (!data) return null;
      return {
        id: data.articleId ? String(data.articleId) : (data.article_id ? String(data.article_id) : data.id),
        articleId: data.articleId || data.article_id,
        kind: data.kind || "updates",
        date: data.publishedDate || data.published_date || data.date || "2026.09.20",
        category: data.category || "校园动态",
        title: data.title,
        summary: data.summary,
        excerpt: data.summary,
        body: data.content ? data.content.split("\n\n").filter(Boolean) : (data.body || []),
        content: data.content,
        coverUrl: data.coverUrl || data.cover_url,
        author: data.author,
      };
    } catch {
      return null;
    }
  },

  // 获取名师天团列表 (100% 对齐 MySQL doupi_cms_teacher)
  async getTeachers(params?: { category?: string; subject?: string }): Promise<Teacher[]> {
    try {
      const data: any = await api.get("/cms/teachers", { params });
      const list = Array.isArray(data) ? data : data?.rows || [];
      if (!list || list.length === 0) return [];
      return list.map(normalizeTeacher);
    } catch {
      try {
        const data: any = await api.get("/teachers", { params });
        const list = Array.isArray(data) ? data : data?.rows || [];
        return list.map(normalizeTeacher);
      } catch {
        return [];
      }
    }
  },

  // 获取校园建筑设施 (100% 对齐 MySQL doupi_cms_facility)
  async getFacilities(params?: { zone?: string }): Promise<Facility[]> {
    try {
      const data: any = await api.get("/cms/facilities", { params });
      const list = Array.isArray(data) ? data : data?.rows || [];
      if (!list || list.length === 0) return [];
      return list.map((f: any) => ({
        id: f.facilityCode || f.facility_code || String(f.facilityId || f.id),
        name: f.name,
        zone: f.zone || "教学",
        tag: f.tag || f.featureTag,
        desc: f.detail || f.description || f.desc,
        specs: f.specsJson ? JSON.parse(f.specsJson) : (f.specs || (f.tag ? f.tag.split(" · ") : [])),
        hours: f.openHours || f.hours || "全天开放",
        x: Number(f.mapCoordX ?? f.x ?? 50),
        y: Number(f.mapCoordY ?? f.y ?? 50),
        imageUrl: f.imageUrl || f.image_url || f.coverUrl,
      }));
    } catch {
      const data: any = await api.get("/facilities", { params });
      return Array.isArray(data) ? data : [];
    }
  },

  // 获取常见问答 FAQ (100% 对齐 MySQL doupi_cms_faq)
  async getFaqs(params?: { category?: string }): Promise<FaqItem[]> {
    try {
      const data: any = await api.get("/cms/faqs", { params });
      const list = Array.isArray(data) ? data : data?.rows || [];
      return list.map((item: any) => ({
        c: item.category,
        q: item.question,
        a: item.answer,
      }));
    } catch {
      return [];
    }
  },

  // 获取页面全量聚合渲染数据 (Page + Sections + Global)
  async getPageRender(slug: string = "/"): Promise<any> {
    try {
      const res: any = await api.get("/cms/page-render", { params: { slug } });
      return res;
    } catch {
      return null;
    }
  },

  // 获取全局布局配置 (header/footer/seo)
  async getGlobalLayout(category: string): Promise<any> {
    try {
      const res: any = await api.get(`/cms/global/${category}`);
      if (typeof res === "string") {
        try {
          return JSON.parse(res);
        } catch {
          return res;
        }
      }
      return res;
    } catch {
      return null;
    }
  },
};
