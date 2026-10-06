import request from '../request';

// 获取官网门户配置
export function getCmsConfig() {
  return request({
    url: '/cms/config',
    method: 'get',
  });
}

// 保存官网门户配置
export function saveCmsConfig(data: any) {
  return request({
    url: '/cms/config',
    method: 'put',
    data,
  });
}
