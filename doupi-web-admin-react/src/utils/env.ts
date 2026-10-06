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
