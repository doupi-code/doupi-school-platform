import request from '../request';

// 查询提分光荣榜列表
export function listCelebration(query?: any) {
  return request({
    url: '/edu/celebration/list',
    method: 'get',
    params: query,
  });
}

// 获取提分光荣榜全局统计指标
export function getCelebrationSummary(batchTitle?: string) {
  return request({
    url: '/edu/celebration/summary',
    method: 'get',
    params: { batchTitle },
  });
}

// 获取所有考试批次列表
export function getCelebrationBatches() {
  return request({
    url: '/edu/celebration/batches',
    method: 'get',
  });
}

// 查询学子成绩详细
export function getCelebration(celebrationId: number | string) {
  return request({
    url: '/edu/celebration/' + celebrationId,
    method: 'get',
  });
}

// 新增提分光荣榜记录
export function addCelebration(data: any) {
  return request({
    url: '/edu/celebration',
    method: 'post',
    data,
  });
}

// 修改提分光荣榜记录
export function updateCelebration(data: any) {
  return request({
    url: '/edu/celebration',
    method: 'put',
    data,
  });
}

// 删除提分光荣榜记录
export function delCelebration(celebrationIds: number | string | (number | string)[]) {
  const ids = Array.isArray(celebrationIds) ? celebrationIds.join(',') : celebrationIds;
  return request({
    url: '/edu/celebration/' + ids,
    method: 'delete',
  });
}

// 一键清空提分光荣榜
export function cleanCelebration() {
  return request({
    url: '/edu/celebration/clean',
    method: 'delete',
  });
}

