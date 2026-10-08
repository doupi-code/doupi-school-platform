import request from '../request';

// 查询印刷登记列表
export function listRecord(query?: any) {
  return request({
    url: '/edu/record/list',
    method: 'get',
    params: query,
  });
}

// 查询印刷登记详细
export function getRecord(printId: number | string) {
  return request({
    url: '/edu/record/' + printId,
    method: 'get',
  });
}

// 新增印刷登记
export function addRecord(data: any) {
  return request({
    url: '/edu/record',
    method: 'post',
    data,
  });
}

// 修改印刷登记
export function updateRecord(data: any) {
  return request({
    url: '/edu/record',
    method: 'put',
    data,
  });
}

// 删除印刷登记
export function delRecord(printId: number | string | (number | string)[]) {
  return request({
    url: '/edu/record/' + printId,
    method: 'delete',
  });
}

// 作废印刷登记
export function cancelRecord(printId: number | string) {
  return request({
    url: '/edu/record/cancel/' + printId,
    method: 'put',
  });
}

// 批量完成印刷登记
export function completeRecords(printIds: (number | string)[]) {
  return request({
    url: '/edu/record/complete/batch',
    method: 'put',
    data: printIds,
  });
}

// 批量作废印刷登记
export function cancelRecords(printIds: (number | string)[]) {
  return request({
    url: '/edu/record/cancel/batch',
    method: 'put',
    data: printIds,
  });
}

// 记录印刷错误（损耗）
export function recordPrintError(data: {
  printId: number | string;
  errorCount: number;
  errorRemark?: string;
  operator?: string;
}) {
  return request({
    url: '/edu/record/recordPrintError',
    method: 'put',
    data,
  });
}

// 完成印刷登记
export function completeRecord(data: any) {
  return request({
    url: '/edu/record/complete',
    method: 'put',
    data,
  });
}

// 通用文件/截图上传
export function uploadFile(formData: FormData) {
  return request({
    url: '/common/upload',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
}

// 本地离线OCR微信截图智能预填解析
export function ocrParse(formData: FormData) {
  return request({
    url: '/edu/record/ocr-parse',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
}

// 微信聊天文本智能直接提取预填（支持直接粘贴微信对话）
export function textParse(data: { text: string }) {
  return request({
    url: '/edu/record/text-parse',
    method: 'post',
    data,
  });
}

// 根据出库单ID查询关联文印登记详细
export function getRecordByOutId(outId: number | string) {
  return request({
    url: '/edu/record/by-out/' + outId,
    method: 'get',
  });
}

