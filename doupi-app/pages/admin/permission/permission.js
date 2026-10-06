const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { clearPermissionCache, ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const displayDict = require('../../../utils/displayDict');

function getDefaultRolePermissions() {
  return {
    admin: {
      name: '超级管理员',
      description: '拥有系统全部管理权限',
      permissions: {
        entry_recruitment_bound_teachers: { name: '已绑定老师', desc: '招生管理入口：已绑定老师', enabled: true, locked: true },
        entry_recruitment_global_appointments: { name: '预约管理', desc: '招生管理入口：预约管理', enabled: true, locked: true },
        entry_recruitment_stats: { name: '数据统计', desc: '招生管理入口：数据统计', enabled: true, locked: true },
        entry_recruitment_export_data: { name: '数据导出', desc: '招生管理入口：数据导出', enabled: true, locked: true },
        entry_recruitment_verify_appointment: { name: '核销预约', desc: '招生管理入口：核销预约', enabled: true, locked: true },
        entry_recruitment_teacher_qrcode: { name: '招生二维码', desc: '招生管理入口：招生二维码', enabled: true, locked: true },
        entry_recruitment_binding_audit: { name: '绑定审核', desc: '招生管理入口：绑定审核', enabled: true, locked: true },
        entry_system_users: { name: '用户管理', desc: '系统配置入口：用户管理', enabled: true, locked: true },
        entry_system_campus: { name: '校园管理', desc: '系统配置入口：校园管理', enabled: true, locked: true },
        entry_system_global_config: { name: '综合配置', desc: '系统配置入口：综合配置', enabled: true, locked: true },
        entry_system_role_management: { name: '角色权限', desc: '系统配置入口：角色权限', enabled: true, locked: true },
        entry_system_permission: { name: '权限控制', desc: '系统配置入口：权限控制', enabled: true, locked: true },
        entry_system_logs: { name: '操作日志', desc: '系统配置入口：操作日志', enabled: true, locked: true },
      },
    },
    manager: {
      name: '管理员',
      description: '负责全局招生业务与操作日志查看，不开放其他系统配置能力',
      permissions: {
        entry_recruitment_bound_teachers: { name: '已绑定老师', desc: '招生管理入口：已绑定老师', enabled: true, locked: false },
        entry_recruitment_global_appointments: { name: '预约管理', desc: '招生管理入口：预约管理', enabled: true, locked: false },
        entry_recruitment_stats: { name: '数据统计', desc: '招生管理入口：数据统计', enabled: true, locked: false },
        entry_recruitment_export_data: { name: '数据导出', desc: '招生管理入口：数据导出', enabled: true, locked: false },
        entry_recruitment_verify_appointment: { name: '核销预约', desc: '招生管理入口：核销预约', enabled: true, locked: false },
        entry_recruitment_teacher_qrcode: { name: '招生二维码', desc: '招生管理入口：招生二维码', enabled: true, locked: false },
        entry_recruitment_binding_audit: { name: '绑定审核', desc: '招生管理入口：绑定审核', enabled: true, locked: false },
        entry_system_logs: { name: '操作日志', desc: '系统配置入口：操作日志', enabled: true, locked: false },
      },
    },
    director: {
      name: '招生主任',
      description: '负责校区招生管理和教师团队管理',
      permissions: {
        entry_recruitment_bound_teachers: { name: '已绑定老师', desc: '招生管理入口：已绑定老师', enabled: true, locked: false },
        entry_recruitment_global_appointments: { name: '预约管理', desc: '招生管理入口：预约管理', enabled: true, locked: false },
        entry_recruitment_stats: { name: '数据统计', desc: '招生管理入口：数据统计', enabled: true, locked: false },
        entry_recruitment_export_data: { name: '数据导出', desc: '招生管理入口：数据导出', enabled: true, locked: false },
        entry_recruitment_verify_appointment: { name: '核销预约', desc: '招生管理入口：核销预约', enabled: true, locked: false },
        entry_recruitment_teacher_qrcode: { name: '招生二维码', desc: '招生管理入口：招生二维码', enabled: true, locked: false },
        entry_recruitment_binding_audit: { name: '绑定审核', desc: '招生管理入口：绑定审核', enabled: true, locked: false },
        entry_system_logs: { name: '操作日志', desc: '系统配置入口：操作日志', enabled: true, locked: false },
      },
    },
    teacher: {
      name: '招生老师',
      description: '负责家长接待、预约核销和个人操作日志查看',
      permissions: {
        entry_recruitment_global_appointments: { name: '我的预约管理', desc: '工作台入口：预约管理', enabled: true, locked: false },
        entry_recruitment_teacher_qrcode: { name: '我的招生二维码', desc: '工作台入口：招生二维码', enabled: true, locked: false },
        entry_recruitment_verify_appointment: { name: '核销预约', desc: '工作台入口：核销预约', enabled: true, locked: false },
        entry_system_logs: { name: '操作日志', desc: '系统配置入口：操作日志（仅本人）', enabled: true, locked: false },
      },
    },
  };
}

const PERMISSION_TREE = {
  admin: [
    {
      groupKey: 'recruitment',
      groupName: '招生管理入口',
      keys: [
        'entry_recruitment_bound_teachers',
        'entry_recruitment_global_appointments',
        'entry_recruitment_stats',
        'entry_recruitment_export_data',
        'entry_recruitment_verify_appointment',
        'entry_recruitment_teacher_qrcode',
        'entry_recruitment_binding_audit',
      ],
    },
    {
      groupKey: 'system',
      groupName: '系统配置入口',
      keys: [
        'entry_system_users',
        'entry_system_campus',
        'entry_system_global_config',
        'entry_system_role_management',
        'entry_system_permission',
        'entry_system_logs',
      ],
    },
  ],
  manager: [
    {
      groupKey: 'recruitment',
      groupName: '招生管理入口',
      keys: [
        'entry_recruitment_bound_teachers',
        'entry_recruitment_global_appointments',
        'entry_recruitment_stats',
        'entry_recruitment_export_data',
        'entry_recruitment_verify_appointment',
        'entry_recruitment_teacher_qrcode',
        'entry_recruitment_binding_audit',
      ],
    },
    {
      groupKey: 'system',
      groupName: '系统配置入口',
      keys: [
        'entry_system_logs',
      ],
    },
  ],
  director: [
    {
      groupKey: 'recruitment',
      groupName: '招生管理入口',
      keys: [
        'entry_recruitment_bound_teachers',
        'entry_recruitment_global_appointments',
        'entry_recruitment_stats',
        'entry_recruitment_export_data',
        'entry_recruitment_verify_appointment',
        'entry_recruitment_teacher_qrcode',
        'entry_recruitment_binding_audit',
      ],
    },
    {
      groupKey: 'system',
      groupName: '系统配置入口',
      keys: [
        'entry_system_logs',
      ],
    },
  ],
  teacher: [
    {
      groupKey: 'workbench',
      groupName: '招生老师工作台入口',
      keys: [
        'entry_recruitment_global_appointments',
        'entry_recruitment_teacher_qrcode',
        'entry_recruitment_verify_appointment',
      ],
    },
    {
      groupKey: 'system',
      groupName: '系统配置入口',
      keys: [
        'entry_system_logs',
      ],
    },
  ],
};

function normalizeRolePermissions(inputPermissions) {
  const defaults = getDefaultRolePermissions();
  const source = inputPermissions && typeof inputPermissions === 'object' ? inputPermissions : {};
  const result = {};

  ['admin', 'manager', 'director', 'teacher'].forEach((roleKey) => {
    const defRole = defaults[roleKey];
    const srcRole = (source[roleKey] && typeof source[roleKey] === 'object') ? source[roleKey] : {};
    const srcPerms = (srcRole.permissions && typeof srcRole.permissions === 'object') ? srcRole.permissions : {};
    const perms = {};

    Object.keys(defRole.permissions).forEach((permKey) => {
      const defPerm = defRole.permissions[permKey];
      const srcPerm = (srcPerms[permKey] && typeof srcPerms[permKey] === 'object') ? srcPerms[permKey] : {};
      perms[permKey] = {
        name: srcPerm.name || defPerm.name,
        desc: srcPerm.desc || defPerm.desc,
        enabled: typeof srcPerm.enabled === 'boolean' ? srcPerm.enabled : defPerm.enabled,
        locked: typeof srcPerm.locked === 'boolean' ? srcPerm.locked : defPerm.locked,
      };
    });

    result[roleKey] = {
      name: srcRole.name || defRole.name,
      description: srcRole.description || defRole.description,
      permissions: perms,
    };
  });

  return result;
}

Page({
  data: {
    currentRoleTab: 0,
    roleTabs: [
      { key: 'admin', label: '超级管理员', icon: 'crown' },
      { key: 'manager', label: '管理员', icon: 'secured' },
      { key: 'director', label: '招生主任', icon: 'star' },
      { key: 'teacher', label: '招生老师', icon: 'user' },
    ],
    rolePermissions: getDefaultRolePermissions(),
    saving: false,
    currentPermissions: [],
    currentPermissionTree: [],
    changeLog: [],
    displayText: {
      btnEnableAll: displayDict.text('BTN_ENABLE_ALL'),
      btnDisableAll: displayDict.text('BTN_DISABLE_ALL'),
      btnSavePermissionConfig: displayDict.text('BTN_SAVE_PERMISSION_CONFIG'),
      saving: displayDict.text('SAVING'),
      permissionListTitle: displayDict.text('PERMISSION_LIST_TITLE'),
      permissionListHint: displayDict.text('PERMISSION_LIST_HINT'),
      lockedLabel: displayDict.text('LOCKED_LABEL'),
      permissionHelpEnabledDot: displayDict.text('PERMISSION_HELP_ENABLED_DOT'),
      permissionHelpDisabledDot: displayDict.text('PERMISSION_HELP_DISABLED_DOT'),
      permissionHelpLocked: displayDict.text('PERMISSION_HELP_LOCKED'),
    },
  },

  async onLoad() {
    if (!auth.requireRoles([1])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', 'permission');
    if (!granted) return;
    this.loadPermissions();
    this.updateCurrentPermissions();
  },

  updateCurrentPermissions() {
    const { currentRoleTab, roleTabs, rolePermissions } = this.data;
    const roleKey = roleTabs[currentRoleTab].key;
    const perms = rolePermissions[roleKey].permissions;

    const list = Object.keys(perms).map((key) => ({
      key,
      ...perms[key],
    }));

    const treeSpec = PERMISSION_TREE[roleKey] || [];
    const tree = treeSpec.map((group) => ({
      groupKey: group.groupKey,
      groupName: group.groupName,
      children: group.keys
        .filter((k) => !!perms[k])
        .map((k) => ({ key: k, ...perms[k] })),
    })).filter((g) => g.children.length > 0);

    this.setData({ currentPermissions: list, currentPermissionTree: tree });
  },

  async loadPermissions() {
    try {
      const data = await request('config.getPermissions');
      if (data) {
        this.setData({ rolePermissions: normalizeRolePermissions(data) });
      } else {
        this.setData({ rolePermissions: getDefaultRolePermissions() });
      }
      this.updateCurrentPermissions();
    } catch (error) {
      console.error('加载权限配置失败:', error);
      this.setData({ rolePermissions: getDefaultRolePermissions() });
      this.updateCurrentPermissions();
    }
  },

  onRoleTabChange(e) {
    const index = e.currentTarget.dataset.index;
    this.setData({ currentRoleTab: index });
    this.updateCurrentPermissions();
  },

  onPermissionToggle(e) {
    const role = e.currentTarget.dataset.role;
    const permKey = e.currentTarget.dataset.perm;

    const perm = this.data.rolePermissions[role].permissions[permKey];
    if (perm && perm.locked) {
      feedback.showToast({ title: displayDict.text('PERMISSION_CORE_LOCKED'), icon: 'none' });
      return;
    }

    this.setData({
      [`rolePermissions.${role}.permissions.${permKey}.enabled`]: !this.data.rolePermissions[role].permissions[permKey].enabled,
    });
  },

  enableAll(e) {
    const role = e.currentTarget.dataset.role;
    const permissions = this.data.rolePermissions[role].permissions;
    const updates = {};

    Object.keys(permissions).forEach((key) => {
      if (!permissions[key].locked) {
        updates[`rolePermissions.${role}.permissions.${key}.enabled`] = true;
      }
    });

    if (Object.keys(updates).length > 0) {
      this.setData(updates);
      feedback.showToast({ title: displayDict.text('ALL_ENABLED_DONE'), icon: 'success' });
    }
  },

  disableAll(e) {
    const role = e.currentTarget.dataset.role;
    const permissions = this.data.rolePermissions[role].permissions;
    const updates = {};

    Object.keys(permissions).forEach((key) => {
      if (!permissions[key].locked) {
        updates[`rolePermissions.${role}.permissions.${key}.enabled`] = false;
      }
    });

    if (Object.keys(updates).length > 0) {
      this.setData(updates);
      feedback.showToast({ title: displayDict.text('ALL_DISABLED_DONE'), icon: 'none' });
    }
  },

  getEnabledCount(role) {
    const treeSpec = PERMISSION_TREE[role] || [];
    const perms = (this.data.rolePermissions[role] && this.data.rolePermissions[role].permissions) || {};
    const keys = treeSpec.reduce((acc, g) => acc.concat(g.keys || []), []);
    return keys.filter((k) => perms[k] && perms[k].enabled).length;
  },

  getTotalCount(role) {
    const treeSpec = PERMISSION_TREE[role] || [];
    return treeSpec.reduce((sum, g) => sum + ((g.keys && g.keys.length) || 0), 0);
  },

  async savePermissions() {
    if (this.data.saving) return;

    this.setData({ saving: true });

    try {
      await request('config.savePermissions', {
        permissions: this.data.rolePermissions,
      }, { showError: true });

      clearPermissionCache();
      wx.setStorageSync('adminPermissionUpdatedAt', Date.now());

      feedback.showToast({
        title: displayDict.text('PERMISSION_SAVED'),
        icon: 'success',
        success: () => {
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        },
      });
    } catch (error) {
      console.error('保存权限配置失败:', error);
      // request 已 toast
    } finally {
      this.setData({ saving: false });
    }
  },

  showPermissionHelp() {
    wx.showModal({
      title: displayDict.text('PERMISSION_HELP_TITLE'),
      content: displayDict.text('PERMISSION_HELP_CONTENT'),
      showCancel: false,
      confirmText: displayDict.text('BTN_GOT_IT'),
    });
  },

  goBack() {
    wx.navigateBack();
  },
});
