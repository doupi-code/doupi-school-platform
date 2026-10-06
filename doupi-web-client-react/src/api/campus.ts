import { dispatch } from './dispatcher';

/**
 * 获取校区列表摘要
 */
export function getCampusList() {
  return dispatch('campus.summary', {});
}
