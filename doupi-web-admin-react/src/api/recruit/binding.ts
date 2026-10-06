import request from '../request';

// 查询教师绑定列表
export function listTeacherBinding(query?: any) {
  return request({
    url: '/recruit/teacherBinding/list',
    method: 'get',
    params: query,
  });
}

// 查询教师绑定详细
export function getTeacherBinding(bindingId: number | string) {
  return request({
    url: '/recruit/teacherBinding/' + bindingId,
    method: 'get',
  });
}

// 新增教师绑定
export function addTeacherBinding(data: any) {
  return request({
    url: '/recruit/teacherBinding',
    method: 'post',
    data,
  });
}

// 修改教师绑定
export function updateTeacherBinding(data: any) {
  return request({
    url: '/recruit/teacherBinding',
    method: 'put',
    data,
  });
}

// 删除教师绑定
export function delTeacherBinding(bindingId: number | string | (number | string)[]) {
  return request({
    url: '/recruit/teacherBinding/' + bindingId,
    method: 'delete',
  });
}
