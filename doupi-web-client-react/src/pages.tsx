import type { ReactNode } from "react";
import { useParams } from "react-router-dom";
import { defaultNavigation, defaultTracks, defaultClassPlans } from "@/cms/fallback";
import { useArticles, useTeachers, useFacilities, usePageRender } from "@/cms/hooks";
import { ComponentResolver } from "@/components/cms/ComponentResolver";
import { PageTemplate } from "@/pages/PageTemplate";
import Home from "@/pages/home";
import NotFound from "@/pages/not-found";

// 各栏目模块组件
import { AboutOverview, IntroductionBody, PhilosophyBody, CampusBody, FacilityDetailView } from "@/pages/about";
import { SeniorOverview, CurriculumBody, FeaturedBody, TrackDetailView, TeachingBody, PlanningBody } from "@/pages/senior-year";
import { FacultyOverview, TeachersBody, TeacherProfileView, ResearchBody } from "@/pages/faculty";
import { LifeOverview, DailyBody, WellbeingBody } from "@/pages/campus-life";
import { AdmissionsOverview, GuideBody, ClassDetailView, ConsultBody, FaqBody } from "@/pages/admissions";
import { NewsOverview, NewsDirectory, ArticleDetailView } from "@/pages/news";

export { Home, NotFound };
export { SearchBar, MobileBar } from "@/components/common";

function findSection(slug?: string) {
  return defaultNavigation.find((n) => n.slug === slug) || defaultNavigation[0];
}

/* ───────────── 一级栏目总览页分发 ───────────── */
export function SectionPage() {
  const { section } = useParams();
  const slug = `/${section || ""}`;
  const { sections } = usePageRender(slug);

  if (sections && sections.length > 0) {
    return <ComponentResolver sections={sections} />;
  }

  const item = findSection(section);

  const overviewMap: Record<string, (p: { section: typeof item }) => ReactNode> = {
    about: AboutOverview,
    "senior-year": SeniorOverview,
    faculty: FacultyOverview,
    "campus-life": LifeOverview,
    admissions: AdmissionsOverview,
    news: NewsOverview,
  };

  const Component = overviewMap[item.slug];
  return Component ? <Component section={item} /> : <PageTemplate section={item} />;
}

/* ───────────── 二级栏目详情页分发 ───────────── */
export function DetailPage() {
  const { section, page } = useParams();
  const slug = `/${section || ""}/${page || ""}`;
  const { sections } = usePageRender(slug);

  if (sections && sections.length > 0) {
    return <ComponentResolver sections={sections} />;
  }

  const item = findSection(section);
  const child = item.children?.find((c) => c.slug === page) || item.children?.[0];

  // 资讯类特殊目录页 (校园动态、校园公告、高考资讯)
  if (section === "news" && (page === "updates" || page === "notices" || page === "gaokao")) {
    return <NewsDirectory kind={page} />;
  }

  const bodies: Record<string, () => ReactNode> = {
    "about/introduction": IntroductionBody,
    "about/philosophy": PhilosophyBody,
    "about/campuses": CampusBody,
    "senior-year/curriculum": CurriculumBody,
    "senior-year/featured-courses": FeaturedBody,
    "senior-year/teaching": TeachingBody,
    "senior-year/planning": PlanningBody,
    "faculty/teachers": TeachersBody,
    "faculty/research": ResearchBody,
    "campus-life/daily-life": DailyBody,
    "campus-life/wellbeing": WellbeingBody,
    "admissions/guide": GuideBody,
    "admissions/consultation": ConsultBody,
    "admissions/faq": FaqBody,
  };

  const BodyComponent = bodies[`${item.slug}/${child?.slug}`];
  return <PageTemplate section={item} child={child} body={BodyComponent ? <BodyComponent /> : undefined} />;
}

/* ───────────── 三级专页详情页分发 ───────────── */
export function ThirdLevel() {
  const { section, page, id } = useParams();
  const item = findSection(section);
  const child = item.children?.find((c) => c.slug === page);
  if (!child) return <NotFound />;

  const key = `${section}/${page}`;

  // 1. 名师独立档案专页
  const { teachers } = useTeachers();
  if (key === "faculty/teachers") {
    const t = teachers.find((x) => x.id === id);
    if (t) {
      return <PageTemplate section={item} child={child} third={t.name} body={<TeacherProfileView teacher={t} />} />;
    }
  }

  // 2. 资讯/公文阅读器
  const { articles } = useArticles();
  if (section === "news") {
    const a = articles.find((x) => String(x.id) === String(id) && x.kind === page);
    if (a) {
      const shortTitle = a.title.length > 18 ? a.title.slice(0, 18) + "…" : a.title;
      return <PageTemplate section={item} child={child} third={shortTitle} body={<ArticleDetailView a={a} />} />;
    }
  }

  // 3. 特色方向专页
  if (key === "senior-year/featured-courses") {
    const t = defaultTracks.find((x) => x.id === id);
    if (t) {
      return <PageTemplate section={item} child={child} third={t.name} body={<TrackDetailView t={t} />} />;
    }
  }

  // 4. 招生简章班型对比与详情专页
  if (key === "admissions/guide") {
    const c = defaultClassPlans.find((x) => x.id === id);
    if (c) {
      return <PageTemplate section={item} child={child} third={c.name} body={<ClassDetailView c={c} />} />;
    }
  }

  // 5. 校园设施导览专页
  const { facilities } = useFacilities();
  if (key === "about/campuses") {
    const f = facilities.find((x) => x.id === id);
    if (f) {
      return <PageTemplate section={item} child={child} third={f.name} body={<FacilityDetailView f={f} />} />;
    }
  }

  return <NotFound />;
}
