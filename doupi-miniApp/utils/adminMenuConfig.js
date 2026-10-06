/**
 * 后台菜单白名单配置（主包 utils，供主包页与 admin 分包共用）
 * 角色: 1-超级管理员 2-招生主任 3-招生老师 5-管理员
 */
const { request } = require('./request');
const auth = require('./auth');
const feedback = require('./feedback');

const ROLE_MENU_WHITELIST = {
  1: {
    recruitment: [
      'bound-teachers',
      'global-appointments',
      'stats',
      'export-data',
      'verify-appointment',
      'teacher-qrcode',
      'binding-audit',
    ],
    systemConfig: [
      'users',
      'campus',
      'banners',
      'media-assets',
      'global-config',
      'content-config',
      'about-config',
      'role-management',
      'permission',
      'logs',
      'system-logs',
    ],
  },
  5: {
    recruitment: [
      'bound-teachers',
      'global-appointments',
      'stats',
      'export-data',
      'verify-appointment',
      'teacher-qrcode',
      'binding-audit',
    ],
    systemConfig: [
      'logs',
    ],
  },
  2: {
    recruitment: [
      'bound-teachers',
      'global-appointments',
      'stats',
      'export-data',
      'verify-appointment',
      'teacher-qrcode',
      'binding-audit',
    ],
    systemConfig: [
      'logs',
    ],
  },
  3: {
    recruitment: [
      'global-appointments',
      'export-data',
      'verify-appointment',
      'teacher-qrcode',
    ],
    systemConfig: [
      'logs',
    ],
  },
};

const ROLE_KEY_MAP = {
  1: 'admin',
  5: 'manager',
  2: 'director',
  3: 'teacher',
};

const MENU_PERMISSION_MAP = {
  recruitment: {
    'bound-teachers': ['entry_recruitment_bound_teachers'],
    'global-appointments': ['entry_recruitment_global_appointments'],
    stats: ['entry_recruitment_stats'],
    'export-data': ['entry_recruitment_export_data'],
    'verify-appointment': ['entry_recruitment_verify_appointment'],
    'teacher-qrcode': ['entry_recruitment_teacher_qrcode'],
    'binding-audit': ['entry_recruitment_binding_audit'],
  },
  systemConfig: {
    users: ['entry_system_users'],
    campus: ['entry_system_campus'],
    banners: ['entry_system_campus'],
    'media-assets': ['entry_system_campus'],
    'global-config': ['entry_system_global_config'],
    'content-config': ['entry_system_global_config'],
    'role-management': ['entry_system_role_management'],
    permission: ['entry_system_permission'],
    logs: ['entry_system_logs'],
    'system-logs': ['entry_system_logs'],
    'about-config': ['entry_system_global_config'],
  },
};

const ROLE_NAME_MAP = {
  1: '超级管理员',
  2: '招生主任',
  3: '招生老师',
  4: '家长',
  5: '管理员',
};

const PERMISSION_NAME_MAP = {
  entry_recruitment_bound_teachers: '招生管理-已绑定老师',
  entry_recruitment_global_appointments: '招生管理-预约管理',
  entry_recruitment_stats: '招生管理-数据统计',
  entry_recruitment_export_data: '招生管理-数据导出',
  entry_recruitment_verify_appointment: '招生管理-核销预约',
  entry_recruitment_teacher_qrcode: '招生管理-招生二维码',
  entry_recruitment_binding_audit: '招生管理-绑定审核',
  entry_system_users: '系统配置-用户管理',
  entry_system_campus: '系统配置-校园管理',
  entry_system_global_config: '系统配置-综合配置',
  entry_system_role_management: '系统配置-角色权限',
  entry_system_permission: '系统配置-权限控制',
  entry_system_logs: '系统配置-操作日志',
};

/** 与云函数无权限文案一致，仅提示、不自动返回上一页 */
const MENU_ACCESS_DENIED_TOAST = '当前权限配置不允许执行此操作';

const MENU_PERM_CACHE_TTL_MS = 2 * 60 * 1000;

let workbenchMenuSnapshot = { at: 0, cacheKey: '', menuRole: 0, permissions: null };

function workbenchMenuCacheKey() {
  const storageRole = Number(auth.getUserRole() || 0);
  return `${storageRole}::${auth.isImpersonating() ? 'support' : 'self'}`;
}

function clearPermissionCache() {
  workbenchMenuSnapshot = { at: 0, cacheKey: '', menuRole: 0, permissions: null };
}

/**
 * 工作台菜单上下文：代维时以云端 config.getMyMenuPermissions（目标用户）为准；
 * 非代维超管不请求接口，menuRole=1、permissions=null 表示全开。
 */
async function fetchWorkbenchMenuContext() {
  const cacheKey = workbenchMenuCacheKey();
  const now = Date.now();
  if (
    workbenchMenuSnapshot.cacheKey === cacheKey &&
    workbenchMenuSnapshot.permissions !== undefined &&
    now - workbenchMenuSnapshot.at < MENU_PERM_CACHE_TTL_MS
  ) {
    return {
      menuRole: workbenchMenuSnapshot.menuRole,
      permissions: workbenchMenuSnapshot.permissions,
    };
  }

  const storageRole = Number(auth.getUserRole() || 0);

  if (!auth.isImpersonating() && storageRole === 1) {
    workbenchMenuSnapshot = { at: now, cacheKey, menuRole: 1, permissions: null };
    return { menuRole: 1, permissions: null };
  }

  try {
    const data = await request('config.getMyMenuPermissions', {}, { showLoading: false, showError: false });
    const menuRole = Number((data && data.role != null ? data.role : storageRole) || 0);
    const permissions = data && data.permissions && typeof data.permissions === 'object' ? data.permissions : {};
    workbenchMenuSnapshot = { at: now, cacheKey, menuRole, permissions };
    return { menuRole, permissions };
  } catch (err) {
    workbenchMenuSnapshot = { at: now, cacheKey, menuRole: storageRole, permissions: {} };
    return { menuRole: storageRole, permissions: {} };
  }
}

function getAllowedMenuIds(role, scene) {
  const roleNum = Number(role || 0);
  const conf = ROLE_MENU_WHITELIST[roleNum] || {};
  return conf[scene] || [];
}

function isMenuAllowed(role, scene, menuId) {
  return getAllowedMenuIds(role, scene).indexOf(menuId) !== -1;
}

function buildAllowedFromPermissions(scene, rolePermissions) {
  const sceneMap = MENU_PERMISSION_MAP[scene] || {};
  const allowIds = [];
  Object.keys(sceneMap).forEach((menuId) => {
    const permKeys = sceneMap[menuId] || [];
    const canAccess = permKeys.some((k) => {
      const p = rolePermissions[k];
      return p && p.enabled === true;
    });
    if (canAccess) allowIds.push(menuId);
  });
  return allowIds;
}

async function getAllowedMenuIdsAsync(role, scene) {
  const ctx = await fetchWorkbenchMenuContext();
  const menuRole = ctx.menuRole;
  const fallback = getAllowedMenuIds(menuRole, scene);
  const whitelistSet = new Set(fallback);
  const storageRole = Number(auth.getUserRole() || 0);
  if (!auth.isImpersonating() && storageRole === 1) {
    return fallback;
  }
  const rolePermissions = ctx.permissions || {};
  const enabledIds = buildAllowedFromPermissions(scene, rolePermissions);
  return enabledIds.filter((id) => whitelistSet.has(id));
}

function getRequiredPermissionKeys(scene, menuId) {
  const sceneMap = MENU_PERMISSION_MAP[scene] || {};
  return sceneMap[menuId] || [];
}

function getRequiredPermissionNames(scene, menuId) {
  return getRequiredPermissionKeys(scene, menuId).map((k) => PERMISSION_NAME_MAP[k] || k);
}

async function ensureMenuAccessWithModal(role, scene, menuId) {
  const allowed = await getAllowedMenuIdsAsync(role, scene);
  if ((allowed || []).includes(menuId)) return true;
  feedback.showToast({ title: MENU_ACCESS_DENIED_TOAST, icon: 'none' });
  return false;
}

async function hasAnyWorkbenchMenu(role) {
  const storageRole = Number(auth.getUserRole() || 0);
  if (!auth.isImpersonating() && storageRole === 1) return true;
  const ctx = await fetchWorkbenchMenuContext();
  const menuRole = Number(ctx.menuRole || 0);
  if (![1, 2, 3, 5].includes(menuRole)) return false;
  const [rec, sys] = await Promise.all([
    getAllowedMenuIdsAsync(role, 'recruitment'),
    getAllowedMenuIdsAsync(role, 'systemConfig'),
  ]);
  return ((rec && rec.length > 0) || (sys && sys.length > 0));
}

function permKeyEnabled(rolePermissions, key) {
  const p = rolePermissions && rolePermissions[key];
  return !!(p && p.enabled === true);
}

/**
 * 数据导出页：导出卡片与概览区展示能力（与云函数 action / getOverview 语义一致）
 */
async function getDataExportPaneCaps() {
  const storageRole = Number(auth.getUserRole() || 0);
  if (!auth.isImpersonating() && storageRole === 1) {
    return {
      appointment: true,
      user: true,
      log: true,
      stats: true,
      overviewAppointments: true,
      overviewUsers: true,
      overviewLogs: true,
      overviewToday: true,
    };
  }
  const ctx = await fetchWorkbenchMenuContext();
  const menuRole = Number(ctx.menuRole || 0);
  const p = ctx.permissions || {};
  const exportData = permKeyEnabled(p, 'entry_recruitment_export_data');
  const globalAppt = permKeyEnabled(p, 'entry_recruitment_global_appointments');
  const logs = permKeyEnabled(p, 'entry_system_logs');
  const statsPerm = permKeyEnabled(p, 'entry_recruitment_stats');
  const users = permKeyEnabled(p, 'entry_system_users');

  const canAppointmentExport = exportData || globalAppt;
  const canLogExport = logs && (exportData || globalAppt);
  const canStatsExport = (exportData && statsPerm) || (logs && globalAppt);

  return {
    appointment: canAppointmentExport,
    user: (menuRole === 1 || menuRole === 5) && users,
    log: canLogExport,
    stats: canStatsExport,
    overviewAppointments: canAppointmentExport,
    overviewUsers: (menuRole === 1 || menuRole === 5) && users,
    overviewLogs: logs,
    overviewToday: canAppointmentExport,
  };
}

module.exports = {
  ROLE_MENU_WHITELIST,
  ROLE_KEY_MAP,
  getAllowedMenuIds,
  getAllowedMenuIdsAsync,
  isMenuAllowed,
  ensureMenuAccessWithModal,
  hasAnyWorkbenchMenu,
  clearPermissionCache,
  getRequiredPermissionKeys,
  getRequiredPermissionNames,
  ROLE_NAME_MAP,
  PERMISSION_NAME_MAP,
  getDataExportPaneCaps,
};
