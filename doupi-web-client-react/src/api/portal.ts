import axios from 'axios';

const api = axios.create({
  baseURL: '/api/public/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => {
    const res = response.data;
    if (res && typeof res.code === 'number' && res.code !== 0 && res.code !== 200) {
      return Promise.reject(new Error(res.msg || res.message || '请求处理失败'));
    }
    return res.data !== undefined ? res.data : res;
  },
  (error) => {
    console.warn('[Portal API Warning]', error.message);
    return Promise.reject(error);
  }
);

export interface BookingPayload {
  student: string;
  parent: string;
  phone: string;
  score?: number | string;
  type?: string;
  preferredDate?: string;
  trackInterest?: string;
  remark?: string;
}

export interface BookingRecord {
  appointmentId: number;
  appointmentNo: string;
  studentName: string;
  parentName: string;
  campusName: string;
  visitDate: string;
  timeSlot: string;
  status: string;
  checkInCode: string;
  teacherName?: string;
  createTime: string;
}

export const portalApi = {
  // 1. 提交访校/咨询预约
  submitBooking: (payload: BookingPayload) => {
    return api.post<{
      appointmentId: number;
      appointmentNo: string;
      checkInCode: string;
      visitDate: string;
      message: string;
    }>('/bookings', payload);
  },

  // 2. 手机号查询预约进度与核销凭证
  queryBookings: (phone: string) => {
    return api.get<BookingRecord[]>('/bookings/query', { params: { phone } });
  },

  // 3. 获取站点设置与公信力统计
  getSiteInfo: () => {
    return api.get<any>('/site');
  },

  // 4. 获取教师名录
  getTeachers: (params?: { group?: string; category?: string; subject?: string }) => {
    return api.get<any[]>('/teachers', { params });
  },

  // 5. 教师档案详情
  getTeacherDetail: (id: string) => {
    return api.get<any>(`/teachers/${id}`);
  },

  // 6. 获取校园资讯与公告
  getArticles: (params?: { kind?: string; category?: string; page?: number; pageSize?: number }) => {
    return api.get<any[]>('/articles', { params });
  },

  // 7. 资讯详情
  getArticleDetail: (kind: string, id: string) => {
    return api.get<any>(`/articles/${kind}/${id}`);
  },

  // 8. 班型设置与名额
  getClassPlans: () => {
    return api.get<any[]>('/class-plans');
  },

  // 9. 校园设施导览
  getFacilities: (zone?: string) => {
    return api.get<any[]>('/facilities', { params: { zone } });
  },

  // 10. 常见问答
  getFaqs: (category?: string) => {
    return api.get<any[]>('/faqs', { params: { category } });
  },
};
