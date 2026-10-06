import request from '../request';

// 获取库存明细报表
export function getStockDetailReport(query?: any) {
  return request({
    url: '/stock/report/detail',
    method: 'get',
    params: query,
  });
}

// 获取库存月度台账报表
export function getStockMonthlyReport(query?: any) {
  return request({
    url: '/stock/report/monthly',
    method: 'get',
    params: query,
  });
}
