import request from '../request';

// 查询入库明细列表
export function listInItem(query?: any) {
  return request({
    url: '/stock/inItem/list',
    method: 'get',
    params: query,
  });
}
