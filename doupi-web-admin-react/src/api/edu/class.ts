import request from '../request';

// 查询班级列表
export function listClass(query?: any) {
  return request({
    url: '/edu/class/list',
    method: 'get',
    params: query,
  });
}

// 查询班级详细
export function getClass(classId: number | string) {
  return request({
    url: '/edu/class/' + classId,
    method: 'get',
  });
}

// 新增班级
export function addClass(data: any) {
  return request({
    url: '/edu/class',
    method: 'post',
    data,
  });
}

// 修改班级
export function updateClass(data: any) {
  return request({
    url: '/edu/class',
    method: 'put',
    data,
  });
}

// 删除班级
export function delClass(classId: number | string | (number | string)[]) {
  return request({
    url: '/edu/class/' + classId,
    method: 'delete',
  });
}
