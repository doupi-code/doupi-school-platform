import request from '@/api/request';

// 查询生成表数据
export function listTable(query: any) {
  return request.get('/tool/gen/list', { params: query });
}

// 查询db数据库列表
export function listDbTable(query: any) {
  return request.get('/tool/gen/db/list', { params: query });
}

// 导入表
export function importTable(data: any) {
  return request.post('/tool/gen/importTable', null, { params: data });
}

// 删除表数据
export function delTable(tableId: any) {
  return request.delete('/tool/gen/' + tableId);
}

// 生成代码 (自定义路径)
export function genCode(tableName: string) {
  return request.get('/tool/gen/genCode/' + tableName);
}
