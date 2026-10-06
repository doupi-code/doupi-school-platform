import request from '../request';

// 查询出库单列表
export function listOut(query?: any) {
  return request({
    url: '/stock/out/list',
    method: 'get',
    params: query,
  });
}

// 查询出库单详细
export function getOut(outId: number | string) {
  return request({
    url: '/stock/out/' + outId,
    method: 'get',
  });
}

// 新增出库单
export function addOut(data: any) {
  return request({
    url: '/stock/out',
    method: 'post',
    data,
  });
}

// 修改出库单
export function updateOut(data: any) {
  return request({
    url: '/stock/out',
    method: 'put',
    data,
  });
}

// 删除出库单
export function delOut(outId: number | string | (number | string)[]) {
  return request({
    url: '/stock/out/' + outId,
    method: 'delete',
  });
}

// 作废出库单
export function cancelOut(outId: number | string) {
  return request({
    url: '/stock/out/cancel/' + outId,
    method: 'put',
  });
}

export const voidOut = cancelOut;
