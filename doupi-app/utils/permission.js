import store from '@/store'

/**
 * 字符权限校验
 * @param {Array} value 校验值
 * @returns {Boolean}
 */
export function hasPermission(value) {
  if (value && value instanceof Array && value.length > 0) {
    const permissions = store.getters && store.getters.permissions
    const permissionRoles = value

    const hasPermission = permissions.some(permission => {
      return permission === '*:*:*' || permissionRoles.includes(permission)
    })

    return hasPermission
  } else {
    console.error(`need roles! Like hasPermission("['system:user:add','system:user:edit']")`)
    return false
  }
}

/**
 * 角色权限校验
 * @param {Array} value 校验值
 * @returns {Boolean}
 */
export function hasRole(value) {
  if (value && value instanceof Array && value.length > 0) {
    const roles = store.getters && store.getters.roles
    const permissionRoles = value

    const hasRole = roles.some(role => {
      return role === 'admin' || permissionRoles.includes(role)
    })

    return hasRole
  } else {
    console.error(`need roles! Like hasRole("['admin','editor']")`)
    return false
  }
}
