import request from '../request';

// 查询教务日常领退流水列表
export function listMaterialRecord(query?: any) {
  return request({
    url: '/edu/material/list',
    method: 'get',
    params: query,
  });
}

// 查询领退详细信息
export function getMaterialRecord(recordId: number | string) {
  return request({
    url: `/edu/material/${recordId}`,
    method: 'get',
  });
}

// 物资发放登记（教师办公品/日常零星耗材/学生发书，自动扣减库存并生成流水）
export function grantMaterial(data: any) {
  return request({
    url: '/edu/material/grant',
    method: 'post',
    data,
  });
}

// 物资退还回收登记（离职收回/退学退书，完好品自动累加库存）
export function returnMaterial(data: any) {
  return request({
    url: '/edu/material/recovery',
    method: 'post',
    data,
  });
}

// 撤销领退单
export function cancelMaterialRecord(recordId: number | string) {
  return request({
    url: `/edu/material/cancel/${recordId}`,
    method: 'put',
  });
}

// 获取领退工作台统计看板
export function getMaterialStats() {
  return request({
    url: '/edu/material/stats',
    method: 'get',
  });
}

// ====================== 物资领退统计分析与穿透报表 ======================

// 获取物资领退统计大屏概览与图表数据
export function getMaterialReportSummary(params?: any) {
  return request({
    url: '/edu/material/report/summary',
    method: 'get',
    params,
  });
}

// 查询最细化领退台账（单品穿透到各班、个人、各个物资）
export function listMaterialReportDetail(params?: any) {
  return request({
    url: '/edu/material/report/detail',
    method: 'get',
    params,
  });
}

// 查询各班级物资领用汇总透视列表
export function listMaterialReportByClass(params?: any) {
  return request({
    url: '/edu/material/report/by-class',
    method: 'get',
    params,
  });
}

// 查询个人(教师/学生)物资领用汇总透视列表
export function listMaterialReportByPerson(params?: any) {
  return request({
    url: '/edu/material/report/by-person',
    method: 'get',
    params,
  });
}
