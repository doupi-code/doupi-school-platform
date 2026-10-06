import request from '../request';

// 查询招生日历与排班配置
export function getRecruitConfig(configKey: string) {
  return request({
    url: '/recruit/config/' + configKey,
    method: 'get',
  });
}

// 保存招生日历与排班配置
export function saveRecruitConfig(data: any) {
  return request({
    url: '/recruit/config',
    method: 'post',
    data,
  });
}
