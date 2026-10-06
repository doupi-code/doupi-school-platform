import { useState, useEffect, useMemo } from "react";
import { cmsClient } from "./client";
import {
  defaultSiteConfig,
  defaultArticles,
  defaultTeachers,
  defaultFacilities,
  defaultClassPlans,
  defaultFaqList,
  defaultTracks,
} from "./fallback";
import type {
  SiteConfig,
  Article,
  Teacher,
  Facility,
  ClassPlan,
  FaqItem,
  Track,
  ArticleKind,
} from "./types";

/**
 * 站点基础设置与看板数据 Hook
 */
export function useSiteConfig(): { config: SiteConfig; loading: boolean } {
  const [config, setConfig] = useState<SiteConfig>(defaultSiteConfig);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    cmsClient
      .getSiteConfig()
      .then((res) => {
        if (mounted && res && Object.keys(res).length > 0) {
          setConfig((prev) => ({
            ...prev,
            ...res,
            statResults: res.statResults?.length ? res.statResults : prev.statResults,
            statCampus: res.statCampus?.length ? res.statCampus : prev.statCampus,
          }));
        }
      })
      .catch(() => {
        // 静默降级到 Figma 高质量设计数据
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // 监听来自管理后台嵌入 iframe 的实时预览草稿消息 (0延迟直达)
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data && event.data.type === "CMS_PREVIEW_UPDATE") {
          const draft = event.data.payload;
          if (draft && typeof draft === "object") {
            setConfig((prev) => {
              const hotlinesArr = Array.isArray(draft.hotlines)
                ? draft.hotlines
                : typeof draft.hotlines === "string"
                ? draft.hotlines.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean)
                : prev.hotlines;

              const statResultsArr = Array.isArray(draft.stat_results)
                ? draft.stat_results
                : Array.isArray(draft.statResults)
                ? draft.statResults
                : prev.statResults;

              const statCampusArr = Array.isArray(draft.stat_campus)
                ? draft.stat_campus
                : Array.isArray(draft.statCampus)
                ? draft.statCampus
                : prev.statCampus;

              return {
                ...prev,
                siteName: draft.site_name !== undefined ? draft.site_name : draft.siteName ?? prev.siteName,
                siteNameEn: draft.site_name_en !== undefined ? draft.site_name_en : draft.siteNameEn ?? prev.siteNameEn,
                slogan: draft.slogan !== undefined ? draft.slogan : prev.slogan,
                subtitle: draft.subtitle !== undefined ? draft.subtitle : prev.subtitle,
                kicker: draft.kicker !== undefined ? draft.kicker : prev.kicker,
                address: draft.address !== undefined ? draft.address : prev.address,
                admissionsLine: draft.admissions_line !== undefined ? draft.admissions_line : draft.admissionsLine ?? prev.admissionsLine,
                officeHours: draft.office_hours !== undefined ? draft.office_hours : draft.officeHours ?? prev.officeHours,
                icp: draft.icp !== undefined ? draft.icp : prev.icp,
                hotlines: hotlinesArr,
                statResults: statResultsArr,
                statCampus: statCampusArr,
              };
            });
          }
        }
      } catch (err) {
        console.warn("[CMS Preview] Failed to parse preview draft message", err);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      mounted = false;
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return { config, loading };
}

/**
 * 资讯公文列表 Hook
 */
export function useArticles(kind?: ArticleKind, category?: string): {
  articles: Article[];
  loading: boolean;
} {
  const [list, setList] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    cmsClient
      .getArticles({ kind, category: category === "全部" ? undefined : category })
      .then((data) => {
        if (mounted) {
          if (data && data.length > 0) {
            setList(data);
          } else {
            // 回退到默认高质量公文
            let filtered = defaultArticles;
            if (kind) {
              filtered = filtered.filter((a) => a.kind === kind);
            }
            if (category && category !== "全部") {
              filtered = filtered.filter((a) => a.category === category);
            }
            setList(filtered);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          let filtered = defaultArticles;
          if (kind) {
            filtered = filtered.filter((a) => a.kind === kind);
          }
          if (category && category !== "全部") {
            filtered = filtered.filter((a) => a.category === category);
          }
          setList(filtered);
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [kind, category]);

  return { articles: list, loading };
}

/**
 * 单篇公文/资讯详情 Hook
 */
export function useArticleDetail(kind: string | undefined, id: string | undefined): {
  article: Article | null;
  loading: boolean;
} {
  const [article, setArticle] = useState<Article | null>(() => {
    return defaultArticles.find((a) => String(a.id) === String(id) && (!kind || a.kind === kind)) || null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let mounted = true;
    setLoading(true);
    cmsClient
      .getArticleDetail(id)
      .then((data) => {
        if (mounted && data) {
          setArticle(data);
        }
      })
      .catch(() => {
        // 使用 fallback
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  return { article, loading };
}

/**
 * 教师名录 Hook
 */
export function useTeachers(category?: string, subject?: string): {
  teachers: Teacher[];
  loading: boolean;
} {
  const [teachers, setTeachers] = useState<Teacher[]>(defaultTeachers);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    cmsClient
      .getTeachers({ category, subject: subject === "全部" ? undefined : subject })
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setTeachers(data);
        }
      })
      .catch(() => {
        // 使用 fallback
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [category, subject]);

  const filtered = useMemo(() => {
    return teachers.filter((t) => {
      const matchCat = !category || category === "all" || t.category === category;
      const matchSub = !subject || subject === "全部" || t.subject === subject;
      return matchCat && matchSub;
    });
  }, [teachers, category, subject]);

  return { teachers: filtered, loading };
}

/**
 * 单个教师详情 Hook
 */
export function useTeacherDetail(id: string | undefined): Teacher | null {
  const { teachers } = useTeachers();
  return useMemo(() => {
    if (!id) return null;
    return teachers.find((t) => t.id === id) || defaultTeachers.find((t) => t.id === id) || null;
  }, [id, teachers]);
}

/**
 * 校园设施列表 Hook
 */
export function useFacilities(zone?: string): { facilities: Facility[]; loading: boolean } {
  const [facilities, setFacilities] = useState<Facility[]>(defaultFacilities);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    cmsClient
      .getFacilities({ zone })
      .then((data) => {
        if (mounted && Array.isArray(data)) {
          setFacilities(data);
        }
      })
      .catch(() => {
        // fallback
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [zone]);

  const filtered = useMemo(() => {
    if (!zone || zone === "全部") return facilities;
    return facilities.filter((f) => f.zone === zone);
  }, [facilities, zone]);

  return { facilities: filtered, loading };
}

/**
 * 班型设置 Hook
 */
export function useClassPlans(): ClassPlan[] {
  return defaultClassPlans;
}

/**
 * 特色课程方向 Hook
 */
export function useTracks(): Track[] {
  return defaultTracks;
}

/**
  * 常见问答 FAQ Hook (动态读取数据库)
  */
export function useFaqs(category = "全部", keyword = ""): FaqItem[] {
  const [faqs, setFaqs] = useState<FaqItem[]>(defaultFaqList);

  useEffect(() => {
    let mounted = true;
    cmsClient
      .getFaqs({ category: category === "全部" ? undefined : category })
      .then((data) => {
        if (mounted && data && data.length > 0) {
          setFaqs(data);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [category]);

  return useMemo(() => {
    return faqs.filter((f) => {
      const matchCat = category === "全部" || f.c === category;
      const matchKw = !keyword.trim() || (f.q + f.a).includes(keyword.trim());
      return matchCat && matchKw;
    });
  }, [faqs, category, keyword]);
}

/**
 * 页面全量动态渲染数据 Hook (包含区块列表与实时草稿预览注入)
 */
export function usePageRender(slug: string = "/"): {
  pageData: any;
  sections: any[];
  loading: boolean;
  refresh: () => void;
} {
  const [data, setData] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPage = () => {
    let mounted = true;
    setLoading(true);
    cmsClient
      .getPageRender(slug)
      .then((res) => {
        if (mounted && res) {
          setData(res.page || null);
          const secs = res.sections || [];
          setSections(
            secs.map((s: any) => {
              let parsedContent = s.content;
              if (!parsedContent || typeof parsedContent !== "object" || Object.keys(parsedContent).length === 0) {
                if (typeof s.contentData === "string" && s.contentData.trim()) {
                  try {
                    parsedContent = JSON.parse(s.contentData);
                  } catch (e) {
                    parsedContent = {};
                  }
                } else if (typeof s.contentData === "object") {
                  parsedContent = s.contentData;
                } else {
                  parsedContent = {};
                }
              }
              return {
                ...s,
                content: parsedContent,
              };
            })
          );
        }
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  };

  useEffect(() => {
    fetchPage();

    // 监听来自后台 Page Builder 的动态区块实时草稿广播 (0延迟无感热更新)
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data && event.data.type === "CMS_PAGE_PREVIEW_UPDATE") {
          const { pageSlug: targetSlug, sections: draftSections } = event.data.payload || {};
          if (!targetSlug || targetSlug === slug) {
            if (Array.isArray(draftSections)) {
              setSections(
                draftSections.map((s: any) => {
                  let parsedContent = s.content;
                  if (!parsedContent || typeof parsedContent !== "object" || Object.keys(parsedContent).length === 0) {
                    if (typeof s.contentData === "string" && s.contentData.trim()) {
                      try {
                        parsedContent = JSON.parse(s.contentData);
                      } catch (e) {
                        parsedContent = {};
                      }
                    } else if (typeof s.contentData === "object") {
                      parsedContent = s.contentData;
                    } else {
                      parsedContent = {};
                    }
                  }
                  return {
                    ...s,
                    content: parsedContent,
                  };
                })
              );
            }
          }
        }
      } catch (err) {
        console.warn("[PageBuilder Preview] Draft sync error", err);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [slug]);

  return { pageData: data, sections, loading, refresh: fetchPage };
}

/**
 * 全局布局 (Header/Footer/SEO) 动态 Hook
 */
export function useGlobalLayout(category: string): { config: any; loading: boolean } {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    cmsClient
      .getGlobalLayout(category)
      .then((res) => {
        if (mounted && res) setConfig(res);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    // 监听来自后台全局配置的实时预览草稿广播
    const handleMessage = (event: MessageEvent) => {
      try {
        if (event.data && event.data.type === "CMS_GLOBAL_PREVIEW_UPDATE") {
          const { category: cat, content } = event.data.payload || {};
          if (cat === category && content) {
            setConfig(content);
          }
        }
      } catch (err) {}
    };

    window.addEventListener("message", handleMessage);
    return () => {
      mounted = false;
      window.removeEventListener("message", handleMessage);
    };
  }, [category]);

  return { config, loading };
}
