/**
 * @fileoverview 用户管理 - 对接真实API（v2.0）
 */

const feedback = require('../../../utils/feedback');
const { request, invalidateAllReadCache } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const adminMenuConfig = require('../../../utils/adminMenuConfig');
const { ensureMenuAccessWithModal } = adminMenuConfig;
const displayDict = require('../../../utils/displayDict');
const errorDict = require('../../../utils/errorDict');

Page({
  data: {
    searchKeyword: '',
    selectedRole: 'all',
    showRoleFilter: false,
    
    activeMenuId: null,
    showUserDetail: false,
    showEditModal: false,
    showDeleteConfirm: false,
    currentUser: null,
    
    roleOptions: [
      { value: 'all', label: '全部角色' },
      { value: '1', label: '超级管理员' },
      { value: '5', label: '管理员' },
      { value: '2', label: '招生主任' },
      { value: '3', label: '招生老师' },
      { value: '4', label: '家长' },
    ],

    roleMap: {
      all: '全部角色',
      1: '超级管理员',
      5: '管理员',
      2: '招生主任',
      3: '招生老师',
      4: '家长'
    },
    
    users: [],
    filteredUsers: [],
    
    page: 1,
    pageSize: 20,
    total: 0,
    loading: false,
    displayText: {
      noUsers: displayDict.text('NO_USERS'),
      btnBatchUserManage: displayDict.text('BTN_BATCH_USER_MANAGE'),
      btnDetail: displayDict.text('BTN_DETAIL'),
      btnEditRole: displayDict.text('BTN_EDIT_ROLE'),
      btnDelete: displayDict.text('BTN_DELETE'),
      statusDisabled: displayDict.text('STATUS_DISABLED'),
      labelAppointmentCount: displayDict.text('LABEL_BOOKING_COUNT'),
      labelRegisterTime: displayDict.text('LABEL_REGISTER_TIME'),
      labelLastLogin: displayDict.text('LABEL_LAST_LOGIN'),
      labelName: displayDict.text('LABEL_NAME'),
      labelPhone: displayDict.text('LABEL_PHONE'),
      labelRole: displayDict.text('LABEL_ROLE'),
      labelStatus: displayDict.text('LABEL_STATUS'),
      titleUserDetail: displayDict.text('TITLE_USER_DETAIL'),
      titleEditRole: displayDict.text('TITLE_EDIT_ROLE'),
      titleDeleteUser: displayDict.text('TITLE_DELETE_USER'),
      btnClose: displayDict.text('BTN_CLOSE'),
      btnCancel: displayDict.text('BTN_CANCEL'),
      btnConfirmDelete: displayDict.text('BTN_CONFIRM_DELETE')
      ,
      roleAdmin: displayDict.text('ROLE_ADMIN'),
      roleDirector: displayDict.text('ROLE_DIRECTOR'),
      roleTeacher: displayDict.text('ROLE_TEACHER'),
      roleParent: displayDict.text('ROLE_PARENT')
    },
    emptyHint: displayDict.text('SCOPE_EMPTY_USERS')
  },

  async onLoad() {
    if (!auth.requireRoles([1])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', 'users');
    if (!granted) return;
    this.loadUsers();
  },

  async loadUsers(refresh = false) {
    if (this.data.loading) return;
    const nextPage = refresh ? 1 : this.data.page;
    
    if (refresh) {
      this.setData({ 
        page: 1, 
        users: [] 
      });
    }
    
    this.setData({ loading: true });

    try {
      const result = await request('user.adminList', {
        role: this.data.selectedRole !== 'all' ? parseInt(this.data.selectedRole) : undefined,
        keyword: this.data.searchKeyword || undefined,
        page: nextPage,
        pageSize: this.data.pageSize
      }, { showError: false });

      const { list, total } = result;

      const formattedUsers = (list || []).map(user => {
        const phoneStatus = user.phoneStatus || 'bound';
        const phoneDisplay = phoneStatus === 'released'
          ? '手机号已重新归属'
          : displayDict.valueOr(user.phone, 'NO_PHONE_BOUND');
        return {
          roleValue: Number(user.role),
          id: user.id || user._id,
          name: user.name || user.nickname || displayDict.text('UNKNOWN'),
          avatar: user.avatar || '',
          phone: phoneDisplay,
          fullPhone: phoneDisplay,
          phoneStatus,
          phoneReleasedMask: user.phoneReleasedMask || '',
          role: Number(user.role),
          roleText: user.roleText || { 1: '超级管理员', 2: '招生主任', 3: '招生老师', 4: '家长', 5: '管理员' }[Number(user.role)] || displayDict.text('UNKNOWN'),
          appointmentCount: user.appointmentCount || 0,
          registerDate: displayDict.valueOr(user.registerDate, 'NO_RECORD'),
          lastLoginDate: displayDict.valueOr(user.lastLoginDate, 'NO_RECORD'),
          status: user.status,
          statusText: user.status === 1 ? '正常' : '禁用'
        };
      });

      if (refresh) {
        this.setData({
          users: formattedUsers,
          total: total || 0,
          page: 1
        });
      } else {
        this.setData({
          users: [...this.data.users, ...formattedUsers],
          total: total || 0
        });
      }

      this.applyFilters();
    } catch (err) {
      console.error('加载用户列表失败:', err);
      
      feedback.showToast({
        title: errorDict.text('LOAD_FAILED_RETRY'),
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  handleSearch(e) {
    this.setData({
      searchKeyword: e.detail.value
    });
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.loadUsers(true);
    }, 500);
  },

  toggleRoleFilter() {
    this.setData({
      showRoleFilter: !this.data.showRoleFilter
    });
  },

  selectRole(e) {
    const role = e.currentTarget.dataset.role;
    this.setData({
      selectedRole: role,
      showRoleFilter: false
    });
    this.loadUsers(true);
  },

  goBatchUsers() {
    wx.navigateTo({ url: '/pages/admin/batch-users/batch-users' });
  },

  applyFilters() {
    let filtered = [...this.data.users];

    if (this.data.searchKeyword) {
      const keyword = this.data.searchKeyword.toLowerCase();
      filtered = filtered.filter(user =>
        (user.name && user.name.toLowerCase().includes(keyword)) ||
        (user.phone && user.phone.includes(keyword))
      );
    }

    if (this.data.selectedRole !== 'all') {
      filtered = filtered.filter(user => String(user.role) === this.data.selectedRole);
    }

    const hasFilter = !!this.data.searchKeyword || this.data.selectedRole !== 'all';
    this.setData({
      filteredUsers: filtered,
      emptyHint: hasFilter ? displayDict.text('FILTER_EMPTY_USERS') : displayDict.text('SCOPE_EMPTY_USERS')
    });
  },

  onUserTap(e) {
    const id = e.currentTarget.dataset.id;
    const user = this.data.users.find(u => u.id === id);
    if (user) {
      this.setData({
        activeMenuId: id,
        currentUser: user,
        showUserDetail: true
      });
    }
  },

  getUserById(id) {
    return this.data.users.find((u) => u.id === id) || null;
  },

  openUserDetail(e) {
    const id = e.currentTarget.dataset.id;
    const user = this.getUserById(id);
    if (!user) return;
    this.setData({
      currentUser: user,
      showUserDetail: true
    });
  },

  openEditRole(e) {
    const id = e.currentTarget.dataset.id;
    const user = this.getUserById(id);
    if (!user) return;
    this.setData({ currentUser: user });
    this.handleEditRole();
  },

  openToggleStatus(e) {
    const id = e.currentTarget.dataset.id;
    const user = this.getUserById(id);
    if (!user) return;
    this.setData({ currentUser: user });
    this.handleToggleStatus();
  },

  openDeleteConfirm(e) {
    const id = e.currentTarget.dataset.id;
    const user = this.getUserById(id);
    if (!user) return;
    this.setData({ currentUser: user });
    this.confirmDelete();
  },

  closeUserDetail() {
    this.setData({
      activeMenuId: null,
      showUserDetail: false
    });
  },

  /** 管理员代维：userInfo 换为目标用户，adminInfo 记录操作者供日志 */
  startSupportView() {
    const u = this.data.currentUser;
    if (!u || !u.id) return;
    if (Number(u.roleValue) === 1) {
      feedback.showToast({ title: '不可代维超级管理员账号', icon: 'none' });
      return;
    }
    this.closeUserDetail();
    wx.showModal({
      title: '代维查看',
      content: '将以前台用户视角查看其工作台与数据；退出代维将登出当前账号并需重新登录。确定后前往「我的」页面。',
      confirmText: '前往我的',
      showCancel: true,
      cancelText: '取消',
      success: async (res) => {
        if (!res.confirm) return;
        const operator = auth.getUserInfo();
        if (!auth.beginSupportView(operator)) {
          feedback.showToast({ title: '仅超级管理员可代维', icon: 'none' });
          return;
        }
        wx.showLoading({ title: '加载用户资料...', mask: true });
        try {
          const data = await request('user.getProfile', {}, {
            supportViewTargetUserId: u.id,
            showLoading: false,
            showError: false
          });
          const targetProfile = data && data.userInfo;
          if (!targetProfile || !targetProfile.userId) {
            throw new Error('无法获取目标用户资料');
          }
          auth.enterImpersonation(targetProfile);
          adminMenuConfig.clearPermissionCache();
          invalidateAllReadCache();
          wx.hideLoading();
          wx.reLaunch({ url: '/pages/profile/profile' });
        } catch (err) {
          auth.rollbackSupportView();
          wx.hideLoading();
          feedback.showToast({
            title: (err && err.message) || '进入代维失败，请稍后重试',
            icon: 'none'
          });
        }
      }
    });
  },

  async handleEditRole() {
    if (!this.data.currentUser) return;

    wx.showActionSheet({
      itemList: ['超级管理员', '管理员', '招生主任', '招生老师', '家长'],
      success: async (res) => {
        const roles = [1, 5, 2, 3, 4];
        const newRole = roles[res.tapIndex];
        
        try {
          await request('user.updateRole', {
            userId: this.data.currentUser.id,
            role: newRole
          }, { showError: true });

          feedback.showToast({
            title: displayDict.text('ROLE_UPDATE_SUCCESS'),
            icon: 'success'
          });

          this.closeUserDetail();
          this.loadUsers(true);
        } catch (err) {
          console.error('修改角色失败:', err);
          // request 已 toast
        }
      }
    });
  },

  async handleToggleStatus() {
    if (!this.data.currentUser) return;

    const newStatus = this.data.currentUser.status === 1 ? 0 : 1;
    const actionText = newStatus === 0 ? '禁用' : '启用';

    wx.showModal({
      title: displayDict.text('MODAL_CONFIRM_ACTION_TITLE'),
      content: `确定要${actionText}用户 "${this.data.currentUser.name}" 吗？`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await request('user.updateStatus', {
              userId: this.data.currentUser.id,
              status: newStatus
            }, { showError: true });

            feedback.showToast({
              title: `${actionText}成功`,
              icon: 'success'
            });

            this.closeUserDetail();
            this.loadUsers(true);
          } catch (err) {
            console.error(`${actionText}用户失败:`, err);
            // request 已 toast
          }
        }
      }
    });
  },

  confirmDelete() {
    if (!this.data.currentUser) return;

    wx.showModal({
      title: displayDict.text('MODAL_CONFIRM_DELETE_TITLE'),
      content: `确定要删除用户 "${this.data.currentUser.name}" 吗？此操作不可恢复！`,
      confirmColor: '#FF4D4F',
      success: async (res) => {
        if (res.confirm) {
          try {
            await request('user.delete', {
              userId: this.data.currentUser.id
            }, { showError: true });

            feedback.showToast({
              title: displayDict.text('USER_DELETE_SUCCESS'),
              icon: 'success'
            });

            this.closeUserDetail();
            this.loadUsers(true);
          } catch (err) {
            console.error('删除用户失败:', err);
            // request 已 toast
          }
        }
      }
    });
  },

  closeEditModal() {
    this.setData({ showEditModal: false });
  },

  closeDeleteConfirm() {
    this.setData({ showDeleteConfirm: false });
  },

  loadNextPage() {
    if (this.data.users.length < this.data.total && !this.data.loading) {
      this.setData({ page: this.data.page + 1 });
      this.loadUsers();
    }
  },

  onUsersScrollToLower() {
    this.loadNextPage();
  },

  onReachBottom() {
    this.loadNextPage();
  },

  onPullDownRefresh() {
    this.loadUsers(true).finally(() => {
      wx.stopPullDownRefresh();
    });
  }
});
