import request from '../request';

// 获取页面列表
export function getPages(params?: any) {
  return request({
    url: '/cms/builder/pages',
    method: 'get',
    params,
  });
}

// 获取页面详情 (包含区块)
export function getPageDetail(pageId: number | string) {
  return request({
    url: `/cms/builder/pages/${pageId}`,
    method: 'get',
  });
}

// 创建或修改页面
export function savePage(data: any) {
  return request({
    url: '/cms/builder/pages',
    method: data.pageId ? 'put' : 'post',
    data,
  });
}

// 删除页面
export function deletePage(pageId: number | string) {
  return request({
    url: `/cms/builder/pages/${pageId}`,
    method: 'delete',
  });
}

// 获取页面所有区块
export function getPageSections(pageId: number | string) {
  return request({
    url: `/cms/builder/pages/${pageId}/sections`,
    method: 'get',
  });
}

// 批量保存并发布页面区块排版
export function savePageSections(pageId: number | string, sections: any[]) {
  return request({
    url: `/cms/builder/pages/${pageId}/sections`,
    method: 'put',
    data: sections,
  });
}

// 一键发布页面上线
export function publishPage(pageId: number | string) {
  return request({
    url: `/cms/builder/publish/${pageId}`,
    method: 'post',
  });
}

// 获取全局布局配置 (header/footer)
export function getGlobalConfig(category: string) {
  return request({
    url: `/cms/builder/global/${category}`,
    method: 'get',
  });
}

// 保存全局布局配置
export function saveGlobalConfig(data: { category: string; configContent: string; remark?: string }) {
  return request({
    url: '/cms/builder/global',
    method: 'put',
    data,
  });
}
