// 全局配置
export default {
  // 应用名称
  appName: '豆皮校园移动端',
  
  // API地址：优先通过环境变量注入，开发环境默认本地后端，生产环境使用相对网关路径
  baseUrl: (typeof process !== 'undefined' && process.env && process.env.VUE_APP_BASE_API)
    ? process.env.VUE_APP_BASE_API
    : (process.env.NODE_ENV === 'development' ? 'http://localhost:8080' : '/prod-api'),

  // token 请求头
  tokenKey: 'Authorization',
  // token 前缀
  tokenPrefix: 'Bearer '
}
