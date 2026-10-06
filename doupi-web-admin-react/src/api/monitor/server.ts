import request from '@/api/request';

export function getServerInfo() {
  return request.get('/monitor/server');
}
