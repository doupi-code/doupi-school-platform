import request from '../request';

// 查询物资套装列表
export function listKit(query?: any) {
  return request({
    url: '/edu/kit/list',
    method: 'get',
    params: query,
  });
}

// 查询物资套装详细（包含明细物品列表及库存）
export function getKit(kitId: number | string) {
  return request({
    url: `/edu/kit/${kitId}`,
    method: 'get',
  });
}

// 新增物资套装
export function addKit(data: any) {
  return request({
    url: '/edu/kit',
    method: 'post',
    data,
  });
}

// 修改物资套装
export function updateKit(data: any) {
  return request({
    url: '/edu/kit',
    method: 'put',
    data,
  });
}

// 删除物资套装
export function delKit(kitId: number | string) {
  return request({
    url: `/edu/kit/${kitId}`,
    method: 'delete',
  });
}
