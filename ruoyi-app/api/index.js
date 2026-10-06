import * as login from './login'
import * as user from './system/user'
import * as notice from './system/notice'
import * as dict from './system/dict'
import * as operlog from './monitor/operlog'

const api = {
  login: {
    ...login,
    getCaptcha: login.getCaptchaImage
  },
  user: {
    ...user
  },
  system: {
    ...user,
    ...notice,
    ...dict
  },
  monitor: {
    ...operlog
  }
}

export default api
