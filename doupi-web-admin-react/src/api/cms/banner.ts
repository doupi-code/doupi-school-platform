import request from '../request';

// 查询轮播横幅列表
export function listBanner(query?: any) {
  return request({
    url: '/cms/banner/list',
    method: 'get',
    params: query,
  });
}

// 查询轮播详情
export function getBanner(bannerId: number | string) {
  return request({
    url: '/cms/banner/' + bannerId,
    method: 'get',
  });
}

// 新增轮播
export function addBanner(data: any) {
  return request({
    url: '/cms/banner',
    method: 'post',
    data,
  });
}

// 修改轮播
export function updateBanner(data: any) {
  return request({
    url: '/cms/banner',
    method: 'put',
    data,
  });
}

// 删除轮播
export function delBanner(bannerId: number | string | (number | string)[]) {
  return request({
    url: '/cms/banner/' + bannerId,
    method: 'delete',
  });
}
