import request from '../request';

// 查询教师列表
export function listTeacher(query?: any) {
  return request({
    url: '/edu/teacher/list',
    method: 'get',
    params: query,
  });
}

// 查询教师详细
export function getTeacher(teacherId: number | string) {
  return request({
    url: '/edu/teacher/' + teacherId,
    method: 'get',
  });
}

// 新增教师
export function addTeacher(data: any) {
  return request({
    url: '/edu/teacher',
    method: 'post',
    data,
  });
}

// 修改教师
export function updateTeacher(data: any) {
  return request({
    url: '/edu/teacher',
    method: 'put',
    data,
  });
}

// 删除教师
export function delTeacher(teacherId: number | string | (number | string)[]) {
  return request({
    url: '/edu/teacher/' + teacherId,
    method: 'delete',
  });
}
