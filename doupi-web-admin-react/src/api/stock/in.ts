import request from '../request';

// 查询入库单列表
export function listIn(query?: any) {
  return request({
    url: '/stock/in/list',
    method: 'get',
    params: query,
  });
}

// 查询入库单详细
export function getIn(inId: number | string) {
  return request({
    url: '/stock/in/' + inId,
    method: 'get',
  });
}

// 新增入库单
export function addIn(data: any) {
  return request({
    url: '/stock/in',
    method: 'post',
    data,
  });
}

// 修改入库单
export function updateIn(data: any) {
  return request({
    url: '/stock/in',
    method: 'put',
    data,
  });
}

// 删除入库单
export function delIn(inId: number | string | (number | string)[]) {
  return request({
    url: '/stock/in/' + inId,
    method: 'delete',
  });
}

// 作废入库单
export function cancelIn(inId: number | string) {
  return request({
    url: '/stock/in/cancel/' + inId,
    method: 'put',
  });
}

export const voidIn = cancelIn;
