/**
 * 获取 Web 用户门户（官网客户端）基础访问地址
 * - 开发环境 (import.meta.env.DEV): 优先读取 VITE_CLIENT_BASE_URL，默认 'http://localhost:5173'
 * - 生产环境 (import.meta.env.PROD): 优先读取 VITE_CLIENT_BASE_URL，默认当前站点根域名 window.location.origin
 */
export const getClientBaseUrl = (): string => {
  if (import.meta.env.VITE_CLIENT_BASE_URL) {
    return import.meta.env.VITE_CLIENT_BASE_URL;
  }
  if (import.meta.env.DEV) {
    return 'http://localhost:5173';
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return '';
};

/**
 * 获取 Web 用户门户（官网客户端）具体页面完整访问/预览 URL
 * 注意：根路径 '/' 对应 Client 首页访问地址为 '/index'（因为不带 index 的根路径为个人作品集）
 */
export const getClientPageUrl = (slug: string = '/'): string => {
  const base = getClientBaseUrl();
  const cleanSlug = !slug || slug === '/' ? '/index' : slug.startsWith('/') ? slug : `/${slug}`;
  return `${base}${cleanSlug}`;
};
