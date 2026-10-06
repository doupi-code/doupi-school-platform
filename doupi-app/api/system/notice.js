import request from '@/utils/request'
import { tansParams } from '@/utils/common'

// 查询公告列表
export function listNotice(query) {
  return request.get('/system/notice/list?' + tansParams(query))
}

// 查询公告详细
export function getNotice(noticeId) {
  return request.get('/system/notice/' + noticeId)
}
