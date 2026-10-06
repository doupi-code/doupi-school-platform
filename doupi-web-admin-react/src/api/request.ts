import axios, { AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { message } from 'antd';
import { getToken, removeToken } from '../utils/auth';

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
});

service.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getToken();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 防止并发请求同时报 401 导致多次重复弹窗和重复跳转
let isRedirectingToLogin = false;

const handleSessionExpired = (tip = '登录状态已过期，请重新登录') => {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  removeToken();
  message.warning(`${tip}（正在为您跳转登录页...）`, 2.5);

  const baseUrl = import.meta.env.BASE_URL || '/';
  const loginPath = baseUrl.endsWith('/') ? `${baseUrl}login` : `${baseUrl}/login`;
  const currentPath = window.location.pathname + window.location.search;
  const redirectQuery = currentPath && !currentPath.includes('/login') ? `?redirect=${encodeURIComponent(currentPath)}` : '';

  setTimeout(() => {
    window.location.href = `${loginPath}${redirectQuery}`;
  }, 1200);
};

service.interceptors.response.use(
  (response: AxiosResponse) => {
    // 处理文件下载或二进制流
    if (response.config.responseType === 'blob') {
      return response;
    }

    const res = response.data;
    if (res.code !== 200) {
      if (res.code === 401) {
        handleSessionExpired('登录状态已失效或凭证过期，请重新登录');
      } else if (res.code === 403) {
        message.error(res.msg || '您暂无此功能操作权限，请联系管理员分配权限后重试', 3);
      } else if (res.code === 500) {
        message.error(res.msg || '系统服务处理异常，请稍后刷新重试或联系管理员', 3);
      } else {
        message.error(res.msg || '操作未成功，请检查后重试', 2.5);
      }
      return Promise.reject(new Error(res.msg || '业务操作失败'));
    }
    return res;
  },
  (error) => {
    const { response } = error;
    if (response) {
      if (response.status === 401) {
        handleSessionExpired('登录身份已失效，请重新登录');
      } else if (response.status === 403) {
        message.error('您暂无此功能操作权限，请联系管理员分配权限后重试', 3);
      } else if (response.status === 404) {
        message.error('请求的服务资源不存在，请核对访问地址或刷新重试 (404)', 3);
      } else if (response.status === 500) {
        message.error('服务器内部响应异常，请稍后重试或联系系统管理员 (500)', 3);
      } else {
        message.error(response.data?.msg || `服务请求失败 (${response.status})，请稍后重试`, 3);
      }
    } else if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
      message.error('网络请求超时，请检查您的网络连接后刷新重试', 3);
    } else if (!window.navigator.onLine || (error.message && error.message.includes('Network Error'))) {
      message.error('网络连接已断开，请检查网络设置后重试', 3);
    } else {
      message.error(error.message || '网络通信异常，请检查网络后重试', 3);
    }
    return Promise.reject(error);
  }
);

export const get = (url: string, params?: any) => service.get(url, { params });
export const post = (url: string, data?: any) => service.post(url, data);
export const put = (url: string, data?: any) => service.put(url, data);
export const del = (url: string, params?: any) => service.delete(url, { params });

export const download = (url: string, params?: any) => {
  return service.get(url, {
    params,
    responseType: 'blob',
  }).then((res: any) => {
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'download');
    document.body.appendChild(link);
    link.click();
  });
};

export default service;
