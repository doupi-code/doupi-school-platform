import { getToken, removeToken } from '@/utils/auth'
import config from '@/config'

const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = getToken()
    const header = options.header || {}
    
    // 是否需要带token
    const isToken = (options.headers || {}).isToken === false
    if (token && !isToken) {
      header[config.tokenKey] = config.tokenPrefix + token
    }
    
    uni.request({
      url: config.baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: header,
      success: (res) => {
        const data = res.data || {}
        const code = typeof data === 'object' ? (data.code || 200) : res.statusCode
        const msg = typeof data === 'object' ? (data.msg || '系统未知错误') : '服务端返回异常'
        
        if (code === 401) {
          uni.showToast({ title: '登录已过期，请重新登录', icon: 'none' })
          removeToken()
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/login/login' })
          }, 1500)
          reject('无效的会话，或者会话已过期，请重新登录。')
        } else if (code === 500) {
          uni.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        } else if (code !== 200) {
          uni.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
        } else {
          resolve(data)
        }
      },
      fail: (err) => {
        uni.showToast({ title: '网络请求失败，请稍后重试', icon: 'none' })
        reject(err)
      }
    })
  })
}

export default {
  get(url, data, options) {
    return request({ url, data, method: 'GET', ...options })
  },
  post(url, data, options) {
    return request({ url, data, method: 'POST', ...options })
  },
  put(url, data, options) {
    return request({ url, data, method: 'PUT', ...options })
  },
  delete(url, data, options) {
    return request({ url, data, method: 'DELETE', ...options })
  },
  upload(url, filePath, name, formData) {
    return new Promise((resolve, reject) => {
      const token = getToken()
      uni.uploadFile({
        url: config.baseUrl + url,
        filePath,
        name,
        formData,
        header: {
          [config.tokenKey]: config.tokenPrefix + token
        },
        success: (res) => {
          let data = JSON.parse(res.data)
          if (data.code === 200) {
            resolve(data)
          } else {
            uni.showToast({ title: data.msg, icon: 'none' })
            reject(new Error(data.msg))
          }
        },
        fail: (err) => {
          reject(err)
        }
      })
    })
  }
}
