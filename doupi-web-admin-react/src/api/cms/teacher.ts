import request from '../request';

// 查询名师列表
export function listTeacher(query?: any) {
  return request({
    url: '/cms/teacher/list',
    method: 'get',
    params: query,
  });
}

// 查询名师详情
export function getTeacher(teacherId: number | string) {
  return request({
    url: '/cms/teacher/' + teacherId,
    method: 'get',
  });
}

// 新增名师
export function addTeacher(data: any) {
  return request({
    url: '/cms/teacher',
    method: 'post',
    data,
  });
}

// 修改名师
export function updateTeacher(data: any) {
  return request({
    url: '/cms/teacher',
    method: 'put',
    data,
  });
}

// 删除名师
export function delTeacher(teacherId: number | string | (number | string)[]) {
  return request({
    url: '/cms/teacher/' + teacherId,
    method: 'delete',
  });
}
