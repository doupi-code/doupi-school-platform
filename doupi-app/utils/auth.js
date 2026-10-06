const TOKEN_KEY = 'App-Token'

export function getToken() {
  return uni.getStorageSync(TOKEN_KEY)
}

export function setToken(token) {
  return uni.setStorageSync(TOKEN_KEY, token)
}

export function removeToken() {
  return uni.removeStorageSync(TOKEN_KEY)
}
