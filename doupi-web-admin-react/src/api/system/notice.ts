import request from '../request';

// 查询公告列表
export function listNotice(query?: any) {
  return request({
    url: '/system/notice/list',
    method: 'get',
    params: query,
  });
}

// 查询公告详细
export function getNotice(noticeId: number | string) {
  return request({
    url: '/system/notice/' + noticeId,
    method: 'get',
  });
}

// 新增公告
export function addNotice(data: any) {
  return request({
    url: '/system/notice',
    method: 'post',
    data,
  });
}

// 修改公告
export function updateNotice(data: any) {
  return request({
    url: '/system/notice',
    method: 'put',
    data,
  });
}

// 删除公告
export function delNotice(noticeId: number | string | (number | string)[]) {
  return request({
    url: '/system/notice/' + noticeId,
    method: 'delete',
  });
}
