import request from '../request';

// 查询出库明细列表
export function listOutItem(query?: any) {
  return request({
    url: '/stock/outItem/list',
    method: 'get',
    params: query,
  });
}
