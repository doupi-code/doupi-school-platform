import request from '../request';

// 查询访校预约列表
export function listAppointment(query?: any) {
  return request({
    url: '/recruit/appointment/list',
    method: 'get',
    params: query,
  });
}

// 查询访校预约详细
export function getAppointment(appointmentId: number | string) {
  return request({
    url: '/recruit/appointment/' + appointmentId,
    method: 'get',
  });
}

// 新增访校预约
export function addAppointment(data: any) {
  return request({
    url: '/recruit/appointment',
    method: 'post',
    data,
  });
}

// 修改访校预约
export function updateAppointment(data: any) {
  return request({
    url: '/recruit/appointment',
    method: 'put',
    data,
  });
}

// 删除访校预约
export function delAppointment(appointmentId: number | string | (number | string)[]) {
  return request({
    url: '/recruit/appointment/' + appointmentId,
    method: 'delete',
  });
}

// 现场核销
export function verifyAppointment(data: { checkInCode: string; verifier?: string }) {
  return request({
    url: '/recruit/appointment/verify',
    method: 'post',
    data,
  });
}
