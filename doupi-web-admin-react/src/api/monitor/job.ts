import request from '../request';

// 查询定时任务列表
export function listJob(query?: any) {
  return request({
    url: '/monitor/job/list',
    method: 'get',
    params: query,
  });
}

// 查询定时任务详细
export function getJob(jobId: number | string) {
  return request({
    url: '/monitor/job/' + jobId,
    method: 'get',
  });
}

// 新增定时任务
export function addJob(data: any) {
  return request({
    url: '/monitor/job',
    method: 'post',
    data,
  });
}

// 修改定时任务
export function updateJob(data: any) {
  return request({
    url: '/monitor/job',
    method: 'put',
    data,
  });
}

// 删除定时任务
export function delJob(jobId: number | string | (number | string)[]) {
  return request({
    url: '/monitor/job/' + jobId,
    method: 'delete',
  });
}

// 任务状态修改
export function changeJobStatus(jobId: number | string, status: string) {
  return request({
    url: '/monitor/job/changeStatus',
    method: 'put',
    data: { jobId, status },
  });
}

// 定时任务立即执行一次
export function runJob(jobId: number | string, jobGroup: string) {
  return request({
    url: '/monitor/job/run',
    method: 'put',
    data: { jobId, jobGroup },
  });
}
