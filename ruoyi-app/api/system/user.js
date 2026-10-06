import request from '@/utils/request'
import { tansParams } from '@/utils/common'

// 查询用户列表
export function listUser(query) {
  return request.get('/system/user/list?' + tansParams(query))
}

// 查询用户详细
export function getUser(userId) {
  return request.get('/system/user/' + userId)
}

// 查询用户个人信息
export function getUserProfile() {
  return request.get('/system/user/profile')
}

// 修改用户个人信息
export function updateUserProfile(data) {
  return request.put('/system/user/profile', data)
}

// 用户密码重置
export function updateUserPwd(oldPassword, newPassword) {
  const data = {
    oldPassword,
    newPassword
  }
  return request.put('/system/user/profile/updatePwd', data)
}

// 用户头像上传
export function uploadAvatar(data) {
  return request.upload('/system/user/profile/avatar', data.filePath, data.name, data.formData)
}
