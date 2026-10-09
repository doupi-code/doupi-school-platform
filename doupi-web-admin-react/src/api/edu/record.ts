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

// 相同文件秒传轻量预检接口（0流量探测）
export function checkFileHash(fileHash: string, extension: string, originalFilename?: string) {
  return request({
    url: '/common/check-hash',
    method: 'get',
    params: {
      fileHash,
      extension,
      originalFilename,
    },
  });
}

// 计算文件内容 SHA-256 哈希
export async function computeFileHash(file: File): Promise<string> {
  try {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buf);
    const bytes = Array.from(new Uint8Array(digest));
    return bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    return '';
  }
}

/**
 * 智能秒传上传工具（全站通用）：
 * 1. 优先通过 SHA-256 进行极速预检，若已存在则 0 流量秒传直接返回链接；
 * 2. 未存在则附带 fileHash 上传，并在服务端存入全局 hash 库以供后续永久秒传。
 */
export async function uploadFileSmart(file: File): Promise<any> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  const fileHash = await computeFileHash(file);

  // 1. 预检秒传探测（0流量快速返回）
  if (fileHash && ext) {
    try {
      const checkRes: any = await checkFileHash(fileHash, ext, file.name);
      if (checkRes && (checkRes.found || checkRes.deduplicated)) {
        return {
          ...checkRes,
          deduplicated: true,
          url: checkRes.url,
          fileName: checkRes.fileName,
          originalFilename: checkRes.originalFilename || file.name,
        };
      }
    } catch (ignored) {
      // 预检降级为正常上传
    }
  }

  // 2. 正常流式上传（带哈希用于服务端归档）
  const formData = new FormData();
  formData.append('file', file);
  if (fileHash) {
    formData.append('fileHash', fileHash);
  }
  const res: any = await uploadFile(formData);
  return res;
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

// 解析文档文件页数与纸张规格（PDF/Word/Excel），用于登记自动换算耗纸数
export function analyzeDocument(formData: FormData) {
  return request({
    url: '/edu/record/analyze-document',
    method: 'post',
    headers: { 'Content-Type': 'multipart/form-data' },
    data: formData,
  });
}

// 根据出库单ID查询关联文印登记详细
export function getRecordByOutId(outId: number | string) {
  return request({
    url: '/edu/record/by-out/' + outId,
    method: 'get',
  });
}

