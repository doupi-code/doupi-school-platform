import request from '../request';

// 查询物品列表
export function listGoods(query?: any) {
  return request({
    url: '/stock/goods/list',
    method: 'get',
    params: query,
  });
}

// 查询物品详细
export function getGoods(goodsId: number | string) {
  return request({
    url: '/stock/goods/' + goodsId,
    method: 'get',
  });
}

// 新增物品
export function addGoods(data: any) {
  return request({
    url: '/stock/goods',
    method: 'post',
    data,
  });
}

// 修改物品
export function updateGoods(data: any) {
  return request({
    url: '/stock/goods',
    method: 'put',
    data,
  });
}

// 删除物品
export function delGoods(goodsId: number | string | (number | string)[]) {
  return request({
    url: '/stock/goods/' + goodsId,
    method: 'delete',
  });
}
