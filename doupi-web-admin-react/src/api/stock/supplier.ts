import request from '../request';

// 查询供应商列表
export function listSupplier(query?: any) {
  return request({
    url: '/stock/supplier/list',
    method: 'get',
    params: query,
  });
}

// 查询供应商详细
export function getSupplier(supplierId: number | string) {
  return request({
    url: '/stock/supplier/' + supplierId,
    method: 'get',
  });
}

// 新增供应商
export function addSupplier(data: any) {
  return request({
    url: '/stock/supplier',
    method: 'post',
    data,
  });
}

// 修改供应商
export function updateSupplier(data: any) {
  return request({
    url: '/stock/supplier',
    method: 'put',
    data,
  });
}

// 删除供应商
export function delSupplier(supplierId: number | string | (number | string)[]) {
  return request({
    url: '/stock/supplier/' + supplierId,
    method: 'delete',
  });
}
