/**
 * CMS 门户内容系统核心类型定义
 */

export type Locale = "zh-CN" | "en-US";

export interface NavigationChild {
  title: string;
  slug: string;
  desc: string;
}

export interface NavigationNode {
  title: string;
  en: string;
  slug: string;
  desc: string;
  children?: NavigationChild[];
}

export type FacultyCategory = "management" | "faculty";
export type FacultyGroup = "principal" | "senior" | "backbone" | "excellent";

export interface Teacher {
  id: string;
  name: string;
  subject: string;
  role: string;
  tags: string[];
  intro: string;
  category: FacultyCategory;
  avatarUrl?: string;
  years?: number;
  stats?: { n: string; label: string }[];
  motto?: string;
  career?: { y: string; t: string }[];
  review?: string;
}

export type ArticleKind = "updates" | "notices" | "gaokao";

export interface Article {
  id: string | number;
  articleId?: number;
  kind: ArticleKind;
  date: string;
  category: string;
  title: string;
  summary?: string;
  excerpt?: string;
  body: string[];
  content?: string;
  coverUrl?: string;
  pinned?: boolean;
  author?: string;
  attachments?: string[];
}

export interface Facility {
  id: string;
  name: string;
  zone: string;
  tag: string;
  desc: string;
  specs: string[];
  hours: string;
  x: number;
  y: number;
  imageUrl?: string;
}

export interface ClassPlan {
  id: string;
  name: string;
  desc: string;
  size: string;
  hours: string;
  dorm: string;
  fee: string;
  seats: number;
  taken: number;
  req: string[];
}

export interface TrackModule {
  n: string;
  d: string;
}

export interface TrackFaq {
  q: string;
  a: string;
}

export interface Track {
  id: string;
  name: string;
  en: string;
  subject: string;
  lead: string;
  fit: string[];
  modules: TrackModule[];
  result: { n: string; label: string }[];
  faq: TrackFaq[];
}

export interface FaqItem {
  q: string;
  a: string;
  c: string;
}

export interface StatItem {
  n: string;
  label: string;
}

export interface SuccessStory {
  name: string;
  from: number;
  to: number;
  school: string;
  quote: string;
}

export interface SiteConfig {
  siteName: string;
  siteNameEn: string;
  slogan: string;
  subtitle: string;
  kicker: string;
  address: string;
  hotlines: string[];
  admissionsLine: string;
  officeHours: string;
  icp: string;
  statResults: StatItem[];
  statCampus: StatItem[];
}
