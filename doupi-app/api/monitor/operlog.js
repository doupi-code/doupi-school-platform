import request from '@/utils/request'
import { tansParams } from '@/utils/common'

// 查询操作日志列表
export function listOperlog(query) {
  return request.get('/monitor/operlog/list?' + tansParams(query))
}
