import axios from 'axios';
import { message } from 'antd';

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
});

// 请求拦截器注入 Token
request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器统一处理业务 code
request.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res.code && res.code !== 200) {
      if (res.code === 401) {
        localStorage.removeItem('token');
        message.warning('您的登录状态已过期，请重新登录', 2.5);
      } else if (res.code === 403) {
        message.error(res.msg || '暂无操作权限，请联系管理员分配后重试', 3);
      } else {
        message.error(res.msg || '操作未成功，请检查后重试', 2.5);
      }
      return Promise.reject(new Error(res.msg || 'Error'));
    }
    return res.data !== undefined ? res.data : res;
  },
  (error) => {
    if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
      message.error('网络请求超时，请检查网络后重试', 3);
    } else if (!window.navigator.onLine || (error.message && error.message.includes('Network Error'))) {
      message.error('网络连接不可用，请检查网络设置后重试', 3);
    } else {
      message.error(error.message || '网络连接异常，请重试', 3);
    }
    return Promise.reject(error);
  }
);

/**
 * 统一网关分发函数
 * @param action 接口行为名称
 * @param payload 请求参数载荷
 */
export async function dispatch<T = any>(action: string, payload: object = {}): Promise<T> {
  const requestId = 'web_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const response: any = await request.post('/api/wx/dispatcher', {
    action,
    requestId,
    payload,
  });
  return response as T;
}
