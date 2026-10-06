const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');
const validationDict = require('../../../utils/validationDict');

const PERMISSION_CATEGORY_META = {
  recruitment: { key: 'recruitment', label: '招生管理' },
  system: { key: 'system', label: '系统配置' }
};

const PERMISSION_ORDER = [
  'entry_recruitment_bound_teachers',
  'entry_recruitment_global_appointments',
  'entry_recruitment_stats',
  'entry_recruitment_export_data',
  'entry_recruitment_verify_appointment',
  'entry_recruitment_teacher_qrcode',
  'entry_recruitment_binding_audit',
  'entry_system_users',
  'entry_system_campus',
  'entry_system_global_config',
  'entry_system_role_management',
  'entry_system_permission',
  'entry_system_logs'
];

function getRoleVisual(role) {
  const code = String(role.code || '').toLowerCase();
  const visualMap = {
    super_admin: { tIcon: 'crown', color: '#FA8C16', bgColor: '#FFF7E6' },
    admin: { tIcon: 'secured', color: '#2F54EB', bgColor: '#EDF3FF' },
    director: { tIcon: 'star', color: '#722ED1', bgColor: '#F9F0FF' },
    teacher: { tIcon: 'user', color: '#3088F4', bgColor: '#E8F2FE' },
    parent: { tIcon: 'usergroup', color: '#52C41A', bgColor: '#F6FFED' }
  };

  if (visualMap[code]) return visualMap[code];
  return { tIcon: 'setting', color: '#13C2C2', bgColor: '#E6FFFB' };
}

function normalizeRoleItem(role) {
  const visual = getRoleVisual(role || {});
  return Object.assign({}, role, visual, {
    id: String(role.id || role._id || ''),
    name: role.name || '',
    code: role.code || '',
    description: role.description || '',
    userCount: Number(role.userCount || 0),
    permissionCount: Number(role.permissionCount || 0),
    isSystem: !!role.isSystem,
    status: role.status === 'disabled' ? 'disabled' : 'active'
  });
}

function getPermissionSortWeight(key) {
  const index = PERMISSION_ORDER.indexOf(key);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function getPermissionCategory(key) {
  if (String(key || '').indexOf('entry_system_') === 0) return 'system';
  return 'recruitment';
}

function buildPermissionGroups(permissionConfig) {
  const roleKeys = ['admin', 'manager', 'director', 'teacher'];
  const mergedPermissions = {};

  roleKeys.forEach((roleKey) => {
    const roleNode = permissionConfig && permissionConfig[roleKey];
    const permissions = roleNode && roleNode.permissions ? roleNode.permissions : {};
    Object.keys(permissions).forEach((permKey) => {
      if (mergedPermissions[permKey]) return;
      const perm = permissions[permKey] || {};
      mergedPermissions[permKey] = {
        key: permKey,
        name: perm.name || permKey,
        desc: perm.desc || '',
        category: getPermissionCategory(permKey)
      };
    });
  });

  const permissionList = Object.keys(mergedPermissions)
    .map((key) => mergedPermissions[key])
    .sort((a, b) => {
      const weightDiff = getPermissionSortWeight(a.key) - getPermissionSortWeight(b.key);
      if (weightDiff !== 0) return weightDiff;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });

  const groupedMap = {};
  permissionList.forEach((item) => {
    if (!groupedMap[item.category]) groupedMap[item.category] = [];
    groupedMap[item.category].push(item);
  });

  return Object.keys(PERMISSION_CATEGORY_META)
    .map((categoryKey) => ({
      key: categoryKey,
      label: PERMISSION_CATEGORY_META[categoryKey].label,
      permissions: groupedMap[categoryKey] || []
    }))
    .filter((group) => group.permissions.length > 0);
}

function buildPermissionNameMap(permissionGroups) {
  const map = {};
  (permissionGroups || []).forEach((group) => {
    (group.permissions || []).forEach((perm) => {
      map[perm.key] = perm.name || perm.key;
    });
  });
  return map;
}

function decorateRolePermissionInfo(role, permissionNameMap) {
  const permissionKeys = Array.isArray(role.permissions) ? Array.from(new Set(role.permissions.map((key) => String(key || '').trim()).filter(Boolean))) : [];
  const permissionNames = permissionKeys.map((key) => permissionNameMap[key] || key);
  return Object.assign({}, role, {
    permissions: permissionKeys,
    permissionNames,
    permissionSummary: permissionNames.join('、')
  });
}

Page({
  data: {
    roles: [],
    filteredRoles: [],
    searchKeyword: '',
    filterStatus: 'all',
    statusTabs: [
      { value: 'all', label: '' },
      { value: 'active', label: '' },
      { value: 'disabled', label: '' }
    ],

    expandedRoleId: null,
    showCreateModal: false,
    showEditModal: false,
    editingRole: null,
    newRoleForm: {
      name: '',
      code: '',
      description: '',
      permissions: []
    },
    permissionGroups: [],

    activeMenuId: null,
    loading: false,
    saving: false,
    activeRoleCount: 0,
    customRoleCount: 0,
    displayText: {
      noMatchedRoles: displayDict.text('NO_MATCHED_ROLES'),
      emptyTryAdjustFilter: displayDict.text('EMPTY_TRY_ADJUST_SEARCH_FILTER'),
      overviewRoleTotal: displayDict.text('OVERVIEW_ROLE_TOTAL'),
      overviewEnabled: displayDict.text('OVERVIEW_ENABLED'),
      overviewCustom: displayDict.text('OVERVIEW_CUSTOM'),
      placeholderSearchRole: displayDict.text('PLACEHOLDER_SEARCH_ROLE'),
      tabAll: displayDict.text('STAT_ALL'),
      tabEnabled: displayDict.text('STATUS_ENABLED'),
      tabDisabled: displayDict.text('STATUS_DISABLED'),
      badgeBuiltIn: displayDict.text('BADGE_BUILTIN'),
      unitPerson: displayDict.text('UNIT_PERSON'),
      titleRoleDesc: displayDict.text('TITLE_ROLE_DESC'),
      titlePermissionCount: displayDict.text('TITLE_PERMISSION_COUNT'),
      permissionCountSuffix: displayDict.text('PERMISSION_COUNT_SUFFIX'),
      titleUserStats: displayDict.text('TITLE_USER_STATS'),
      labelLinkedUsers: displayDict.text('LABEL_LINKED_USERS'),
      btnDisable: displayDict.text('BTN_DISABLE'),
      btnEnable: displayDict.text('BTN_ENABLE'),
      titleEditRole: displayDict.text('TITLE_EDIT_ROLE'),
      labelRoleName: displayDict.text('LABEL_ROLE_NAME'),
      placeholderEnterRoleName: displayDict.text('PLACEHOLDER_ENTER_ROLE_NAME'),
      labelRoleCode: displayDict.text('LABEL_ROLE_CODE'),
      hintBuiltinRoleCodeReadonly: displayDict.text('HINT_BUILTIN_ROLE_CODE_READONLY'),
      placeholderEnterRoleDesc: displayDict.text('PLACEHOLDER_ENTER_ROLE_DESC'),
      labelPermissionConfig: displayDict.text('LABEL_PERMISSION_CONFIG'),
      hintPermissionConfigAtPermissionPage: displayDict.text('HINT_PERMISSION_CONFIG_AT_PAGE'),
      titleCreateRole: displayDict.text('TITLE_CREATE_ROLE'),
      placeholderRoleNameExample: displayDict.text('PLACEHOLDER_ROLE_NAME_EXAMPLE'),
      placeholderRoleCodeFormat: displayDict.text('PLACEHOLDER_ROLE_CODE_FORMAT'),
      hintRoleCodeReadonlyAfterCreate: displayDict.text('HINT_ROLE_CODE_READONLY_AFTER_CREATE'),
      placeholderRoleDescScope: displayDict.text('PLACEHOLDER_ROLE_DESC_SCOPE'),
      labelAssignPermissions: displayDict.text('LABEL_ASSIGN_PERMISSIONS'),
      btnEdit: displayDict.text('BTN_EDIT_ROLE'),
      btnDelete: displayDict.text('BTN_DELETE'),
      btnCancel: displayDict.text('BTN_CANCEL'),
      btnSave: displayDict.text('BTN_SAVE'),
      saving: displayDict.text('SAVING'),
      creating: displayDict.text('CREATING'),
      btnCreateRole: displayDict.text('BTN_CREATE_ROLE')
    }
  },

  async onLoad() {
    if (!auth.requireRoles([1])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', 'role-management');
    if (!granted) return;
    this.setData({
      'statusTabs[0].label': this.data.displayText.tabAll,
      'statusTabs[1].label': this.data.displayText.tabEnabled,
      'statusTabs[2].label': this.data.displayText.tabDisabled
    });
    this.loadPermissionOptions();
    this.loadRoles();
  },

  /**
   * 计算角色统计数据
   */
  computeRoleStats() {
    const { roles } = this.data;
    const activeCount = roles.filter(r => r.status === 'active').length;
    const customCount = roles.filter(r => !r.isSystem).length;
    this.setData({
      activeRoleCount: activeCount,
      customRoleCount: customCount
    });
  },

  decorateRoles(roles, permissionGroups) {
    const nameMap = buildPermissionNameMap(permissionGroups || this.data.permissionGroups);
    return (roles || []).map((role) => decorateRolePermissionInfo(role, nameMap));
  },

  onShow() {
    this.filterRoles();
  },

  /**
   * 加载角色列表
   */
  async loadRoles() {
    this.setData({ loading: true });
    try {
      const data = await request('user.getRoles');

      if (Array.isArray(data)) {
        const roles = this.decorateRoles(data.map(normalizeRoleItem), this.data.permissionGroups);
        this.setData({ roles });
        this.computeRoleStats();
        this.filterRoles();
      }
    } catch (error) {
      console.error('加载角色列表失败:', error);
      this.setData({ roles: [], filteredRoles: [] });
    } finally {
      this.setData({ loading: false });
    }
  },

  async loadPermissionOptions() {
    try {
      const permissionConfig = await request('config.getPermissions');
      const permissionGroups = buildPermissionGroups(permissionConfig);
      this.setData({
        permissionGroups,
        roles: this.decorateRoles(this.data.roles, permissionGroups)
      });
      this.filterRoles();
    } catch (error) {
      console.error('加载权限选项失败:', error);
      this.setData({ permissionGroups: [] });
    }
  },

  /**
   * 筛选角色列表
   */
  filterRoles() {
    const { roles, searchKeyword, filterStatus } = this.data;
    let filtered = roles;

    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(role =>
        role.name.toLowerCase().includes(keyword) ||
        role.code.toLowerCase().includes(keyword)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(role => role.status === filterStatus);
    }

    this.setData({ filteredRoles: filtered });
  },

  /**
   * 搜索输入处理
   */
  handleSearch(e) {
    this.setData({ searchKeyword: e.detail.value });
    this.filterRoles();
  },

  /**
   * 切换筛选状态
   */
  onFilterStatus(e) {
    const status = e.currentTarget.dataset.status;
    this.setData({ filterStatus: status });
    this.filterRoles();
  },

  /**
   * 展开/收起角色详情
   */
  toggleRoleDetail(e) {
    const roleId = e.currentTarget.dataset.id;
    this.setData({
      expandedRoleId: this.data.expandedRoleId === roleId ? null : roleId,
      activeMenuId: null
    });
  },

  /**
   * 切换操作菜单
   */
  toggleMenu(e) {
    const roleId = e.currentTarget.dataset.id;
    this.setData({
      activeMenuId: this.data.activeMenuId === roleId ? null : roleId
    });
  },

  /**
   * 关闭菜单
   */
  closeMenu() {
    this.setData({ activeMenuId: null });
  },

  /**
   * 显示编辑弹窗
   */
  showEditModal(e) {
    const roleId = e.currentTarget.dataset.id;
    const role = this.data.roles.find(r => r.id === roleId);
    if (!role) return;

    this.setData({
      editingRole: { ...role },
      showEditModal: true,
      activeMenuId: null
    });
  },

  /**
   * 隐藏编辑弹窗
   */
  hideEditModal() {
    this.setData({ showEditModal: false, editingRole: null });
  },

  /**
   * 编辑角色名称
   */
  onEditNameInput(e) {
    this.setData({ 'editingRole.name': e.detail.value });
  },

  /**
   * 编辑角色描述
   */
  onEditDescInput(e) {
    this.setData({ 'editingRole.description': e.detail.value });
  },

  /**
   * 保存角色编辑
   */
  async saveRoleEdit() {
    if (!this.data.editingRole.name.trim()) {
      feedback.showToast({ title: validationDict.text('ENTER_ROLE_NAME'), icon: 'none' });
      return;
    }

    if (this.data.saving) return;
    this.setData({ saving: true });

    try {
      await request('user.updateRole', {
        role_id: this.data.editingRole.id,
        name: this.data.editingRole.name,
        description: this.data.editingRole.description
      });

      // 更新本地数据
      const roles = this.data.roles.map(r =>
        r.id === this.data.editingRole.id ? { ...this.data.editingRole } : r
      );
      this.setData({ roles, showEditModal: false, editingRole: null });
      this.computeRoleStats();
      feedback.showToast({ title: displayDict.text('SAVE_SUCCESS'), icon: 'success' });
      this.filterRoles();
    } catch (error) {
      console.error('保存失败:', error);
      // request 已 toast
    } finally {
      this.setData({ saving: false });
    }
  },

  /**
   * 显示新建角色弹窗
   */
  showCreateModal() {
    this.setData({
      showCreateModal: true,
      newRoleForm: {
        name: '',
        code: '',
        description: '',
        permissions: []
      }
    });
  },

  /**
   * 隐藏新建弹窗
   */
  hideCreateModal() {
    this.setData({ showCreateModal: false });
  },

  /**
   * 新建角色名称输入
   */
  onCreateNameInput(e) {
    this.setData({ 'newRoleForm.name': e.detail.value });
  },

  /**
   * 新建角色编码输入
   */
  onCreateCodeInput(e) {
    // 自动转换为英文和数字
    let value = e.detail.value.replace(/[^a-zA-Z0-9_]/g, '');
    this.setData({ 'newRoleForm.code': value.toLowerCase() });
  },

  /**
   * 新建角色描述输入
   */
  onCreateDescInput(e) {
    this.setData({ 'newRoleForm.description': e.detail.value });
  },

  /**
   * 切换新建角色的权限选择
   */
  toggleNewPerm(e) {
    const permKey = e.currentTarget.dataset.perm;
    let perms = [...this.data.newRoleForm.permissions];
    const index = perms.indexOf(permKey);

    if (index > -1) {
      perms.splice(index, 1);
    } else {
      perms.push(permKey);
    }

    this.setData({ 'newRoleForm.permissions': perms });
  },

  /**
   * 检查权限是否已选中
   */
  isNewPermChecked(permKey) {
    return this.data.newRoleForm.permissions.includes(permKey);
  },

  /**
   * 创建新角色
   */
  async createRole() {
    const form = this.data.newRoleForm;

    if (!form.name.trim()) {
      feedback.showToast({ title: validationDict.text('ENTER_ROLE_NAME'), icon: 'none' });
      return;
    }

    if (!form.code.trim()) {
      feedback.showToast({ title: validationDict.text('ENTER_ROLE_CODE'), icon: 'none' });
      return;
    }

    if (this.data.saving) return;
    this.setData({ saving: true });

    try {
      const result = await request('user.createRole', form);
      const newRole = decorateRolePermissionInfo({
        id: result.role_id,
        ...form,
        userCount: 0,
        permissionCount: form.permissions.length,
        isSystem: false,
        status: 'active',
        tIcon: 'setting',
        color: '#13C2C2',
        bgColor: '#E6FFFB'
      }, buildPermissionNameMap(this.data.permissionGroups));

      this.setData({
        roles: [...this.data.roles, newRole],
        showCreateModal: false
      });
      this.computeRoleStats();
      this.filterRoles();
      wx.showModal({
        title: displayDict.text('ROLE_CREATED_SUCCESS'),
        content: newRole.permissionNames && newRole.permissionNames.length
          ? `已分配权限：\n${newRole.permissionNames.join('\n')}`
          : '当前未分配任何权限',
        showCancel: false,
        confirmText: '知道了'
      });
    } catch (error) {
      console.error('创建角色失败:', error);
      // request 已 toast
    } finally {
      this.setData({ saving: false });
    }
  },

  /**
   * 切换角色状态（启用/禁用）
   */
  async toggleRoleStatus(e) {
    const roleId = e.currentTarget.dataset.id;
    const role = this.data.roles.find(r => r.id === roleId);
    if (!role || role.isSystem) {
      feedback.showToast({ title: displayDict.text('SYSTEM_ROLE_CANNOT_DISABLE'), icon: 'none' });
      return;
    }

    const newStatus = role.status === 'active' ? 'disabled' : 'active';
    try {
      await request('user.updateRole', {
        role_id: roleId,
        status: newStatus
      });

      const roles = this.data.roles.map(r => {
        if (r.id === roleId) {
          return { ...r, status: newStatus };
        }
        return r;
      });

      this.setData({ roles, activeMenuId: null });
      this.computeRoleStats();
      this.filterRoles();
      feedback.showToast({
        title: newStatus === 'active' ? displayDict.text('ENABLED_DONE') : displayDict.text('DISABLED_DONE'),
        icon: 'success'
      });
    } catch (error) {
      console.error('切换角色状态失败:', error);
      // request 已 toast
    }
  },

  /**
   * 删除角色确认
   */
  confirmDeleteRole(e) {
    const roleId = e.currentTarget.dataset.id;
    const role = this.data.roles.find(r => r.id === roleId);

    if (!role) return;

    if (role.isSystem) {
      feedback.showToast({ title: displayDict.text('SYSTEM_ROLE_CANNOT_DELETE'), icon: 'none' });
      return;
    }

    if (role.userCount > 0) {
      wx.showModal({
        title: displayDict.text('MODAL_CANNOT_DELETE_TITLE'),
        content: `该角色下还有${role.userCount}名用户，请先将用户移至其他角色后再删除`,
        showCancel: false
      });
      return;
    }

    wx.showModal({
      title: displayDict.text('MODAL_DELETE_ROLE_TITLE'),
      content: `确定要删除角色「${role.name}」吗？此操作不可撤销。`,
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (res.confirm) {
          this.deleteRole(roleId);
        }
      }
    });
  },

  /**
   * 执行删除角色
   */
  async deleteRole(roleId) {
    try {
      await request('user.deleteRole', { role_id: roleId });

      const roles = this.data.roles.filter(r => r.id !== roleId);
      this.setData({ roles, activeMenuId: null });
      this.computeRoleStats();
      feedback.showToast({ title: displayDict.text('DELETE_SUCCESS'), icon: 'success' });
      this.filterRoles();
    } catch (error) {
      console.error('删除角色失败:', error);
      // request 已 toast
    }
  },

  /**
   * 查看角色下的用户列表
   */
  viewRoleUsers(e) {
    const roleId = e.currentTarget.dataset.id;
    const role = this.data.roles.find(r => r.id === roleId);
    if (role && role.userCount > 0) {
      wx.navigateTo({
        url: `/pages/admin/users/users?roleId=${roleId}&roleName=${role.name}`
      });
    } else {
      feedback.showToast({ title: displayDict.text('NO_USERS'), icon: 'none' });
    }
  },

  goBack() {
    wx.navigateBack();
  }
});
