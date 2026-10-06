import request from '../request';

// 查询在线用户列表
export function listOnline(query?: any) {
  return request({
    url: '/monitor/online/list',
    method: 'get',
    params: query,
  });
}

// 强退用户
export function forceLogout(tokenId: string) {
  return request({
    url: '/monitor/online/' + tokenId,
    method: 'delete',
  });
}
