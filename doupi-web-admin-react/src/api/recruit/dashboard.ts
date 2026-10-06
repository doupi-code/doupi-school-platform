import request from '../request';

// 获取招生看板统计数据
export function getRecruitDashboardStats() {
  return request({
    url: '/recruit/dashboard/stats',
    method: 'get',
  });
}
