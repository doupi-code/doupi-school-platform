import request from '../request';

// 获取文印报表汇总统计
export function getPrintReport(query?: any) {
  return request({
    url: '/edu/record/report',
    method: 'get',
    params: query,
  });
}
