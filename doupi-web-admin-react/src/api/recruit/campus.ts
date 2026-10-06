import request from '../request';

// 查询校区列表
export function listCampus(query?: any) {
  return request({
    url: '/recruit/campus/list',
    method: 'get',
    params: query,
  });
}

// 查询校区详细
export function getCampus(campusId: string | number) {
  return request({
    url: '/recruit/campus/' + campusId,
    method: 'get',
  });
}

// 新增校区
export function addCampus(data: any) {
  return request({
    url: '/recruit/campus',
    method: 'post',
    data,
  });
}

// 修改校区
export function updateCampus(data: any) {
  return request({
    url: '/recruit/campus',
    method: 'put',
    data,
  });
}

// 删除校区
export function delCampus(campusId: string | number) {
  return request({
    url: '/recruit/campus/' + campusId,
    method: 'delete',
  });
}
