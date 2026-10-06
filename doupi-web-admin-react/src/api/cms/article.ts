import request from '../request';

// 查询文章资讯列表
export function listArticle(query?: any) {
  return request({
    url: '/cms/article/list',
    method: 'get',
    params: query,
  });
}

// 查询文章详情
export function getArticle(articleId: number | string) {
  return request({
    url: '/cms/article/' + articleId,
    method: 'get',
  });
}

// 新增文章
export function addArticle(data: any) {
  return request({
    url: '/cms/article',
    method: 'post',
    data,
  });
}

// 修改文章
export function updateArticle(data: any) {
  return request({
    url: '/cms/article',
    method: 'put',
    data,
  });
}

// 删除文章
export function delArticle(articleId: number | string | (number | string)[]) {
  return request({
    url: '/cms/article/' + articleId,
    method: 'delete',
  });
}
