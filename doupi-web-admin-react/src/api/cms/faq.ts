import request from '../request';

// 查询问答列表
export function listFaq(query?: any) {
  return request({
    url: '/cms/faq/list',
    method: 'get',
    params: query,
  });
}

// 查询问答详情
export function getFaq(faqId: number | string) {
  return request({
    url: '/cms/faq/' + faqId,
    method: 'get',
  });
}

// 新增问答
export function addFaq(data: any) {
  return request({
    url: '/cms/faq',
    method: 'post',
    data,
  });
}

// 修改问答
export function updateFaq(data: any) {
  return request({
    url: '/cms/faq',
    method: 'put',
    data,
  });
}

// 删除问答
export function delFaq(faqId: number | string | (number | string)[]) {
  return request({
    url: '/cms/faq/' + faqId,
    method: 'delete',
  });
}
