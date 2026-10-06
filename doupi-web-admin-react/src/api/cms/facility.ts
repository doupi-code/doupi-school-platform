import request from '../request';

// 查询校园设施列表
export function listFacility(query?: any) {
  return request({
    url: '/cms/facility/list',
    method: 'get',
    params: query,
  });
}

// 查询设施详情
export function getFacility(facilityId: number | string) {
  return request({
    url: '/cms/facility/' + facilityId,
    method: 'get',
  });
}

// 新增设施
export function addFacility(data: any) {
  return request({
    url: '/cms/facility',
    method: 'post',
    data,
  });
}

// 修改设施
export function updateFacility(data: any) {
  return request({
    url: '/cms/facility',
    method: 'put',
    data,
  });
}

// 删除设施
export function delFacility(facilityId: number | string | (number | string)[]) {
  return request({
    url: '/cms/facility/' + facilityId,
    method: 'delete',
  });
}
