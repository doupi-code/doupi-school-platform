import { dispatch } from './dispatcher';

/**
 * 创建预约
 */
export function createAppointment(data: any) {
  return dispatch('appointment.create', data);
}

/**
 * 根据手机号查询预约
 */
export function queryByPhone(phone: string) {
  return dispatch('appointment.queryByPhone', { phone });
}

/**
 * 获取预约详情
 */
export function getAppointmentDetail(id: number | string) {
  return dispatch('appointment.detail', { id });
}
