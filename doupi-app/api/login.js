import request from '@/utils/request'

// 登录方法
export function login(data) {
  return request.post('/login', data)
}

// 获取用户详细信息
export function getInfo() {
  return request.get('/getInfo')
}

// 退出方法
export function logout() {
  return request.post('/logout')
}

// 获取验证码
export function getCaptchaImage() {
  return request.get('/captchaImage')
}
