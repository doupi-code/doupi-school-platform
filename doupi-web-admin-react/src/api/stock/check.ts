import request from '../request';

// 查询盘点单列表
export function listCheck(query?: any) {
  return request({
    url: '/stock/check/list',
    method: 'get',
    params: query,
  });
}

// 查询盘点单详细
export function getCheck(checkId: number | string) {
  return request({
    url: '/stock/check/' + checkId,
    method: 'get',
  });
}

// 预备拉取待盘点明细（自动读取当前账面库存）
export function prepareCheck(params: { checkType: string; category?: string }) {
  return request({
    url: '/stock/check/prepare',
    method: 'get',
    params,
  });
}

// 新增盘点单
export function addCheck(data: any) {
  return request({
    url: '/stock/check',
    method: 'post',
    data,
  });
}

// 修改盘点单
export function updateCheck(data: any) {
  return request({
    url: '/stock/check',
    method: 'put',
    data,
  });
}

// 审核库存盘点（自动调整账面实际库存）
export function auditCheck(checkId: number | string) {
  return request({
    url: '/stock/check/audit/' + checkId,
    method: 'put',
  });
}

// 作废库存盘点
export function cancelCheck(checkId: number | string) {
  return request({
    url: '/stock/check/cancel/' + checkId,
    method: 'put',
  });
}

// 删除盘点单
export function delCheck(checkId: number | string | (number | string)[]) {
  return request({
    url: '/stock/check/' + checkId,
    method: 'delete',
  });
}
