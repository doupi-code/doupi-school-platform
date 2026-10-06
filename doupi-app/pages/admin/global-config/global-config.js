const feedback = require('../../../utils/feedback');
const { requestSubscribeAuthorization } = require('../../../utils/subscribe');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');

const TAB_KEYS = ['basic', 'subscribe', 'sms'];
const RUNTIME_STAGE_OPTIONS = ['develop', 'trial', 'release'];

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function timeToMinutes(value) {
  const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  return Number(match[1]) * 60 + Number(match[2]);
}

function sortTimeSlots(slots) {
  if (!Array.isArray(slots)) return [];
  return slots.slice().sort((a, b) => {
    const startDiff = timeToMinutes(a && a.startTime) - timeToMinutes(b && b.startTime);
    if (startDiff !== 0) return startDiff;
    const endDiff = timeToMinutes(a && a.endTime) - timeToMinutes(b && b.endTime);
    if (endDiff !== 0) return endDiff;
    return Number((a && a.id) || 0) - Number((b && b.id) || 0);
  });
}

function formatSlotLabel(slot) {
  if (!slot) return '';
  return `${slot.startTime || '--:--'}-${slot.endTime || '--:--'}`;
}

function validateTimeSlots(slots) {
  const enabledSlots = (Array.isArray(slots) ? slots : [])
    .filter((slot) => slot && slot.enabled !== false)
    .map((slot, index) => Object.assign({}, slot, {
      _index: index,
      _startValid: timeToMinutes(slot.startTime) !== Number.MAX_SAFE_INTEGER,
      _endValid: timeToMinutes(slot.endTime) !== Number.MAX_SAFE_INTEGER,
      _start: timeToMinutes(slot.startTime),
      _end: timeToMinutes(slot.endTime)
    }))
    .sort((a, b) => {
      const startDiff = a._start - b._start;
      if (startDiff !== 0) return startDiff;
      return a._end - b._end;
    });

  for (let i = 0; i < enabledSlots.length; i += 1) {
    const slot = enabledSlots[i];
    if (!slot._startValid || !slot._endValid || slot._start >= slot._end) {
      return {
        valid: false,
        message: `时段 ${formatSlotLabel(slot)} 时间范围无效，开始时间必须早于结束时间`
      };
    }

    const prev = enabledSlots[i - 1];
    if (!prev) continue;
    if (slot._start === prev._start && slot._end === prev._end) {
      return {
        valid: false,
        message: `时段 ${formatSlotLabel(slot)} 重复，请调整后再保存`
      };
    }
    if (slot._start < prev._end) {
      return {
        valid: false,
        message: `时段 ${formatSlotLabel(slot)} 与 ${formatSlotLabel(prev)} 时间范围重叠`
      };
    }
  }

  return { valid: true, message: '' };
}

function defaultReminderRule() {
  return {
    id: `rule_${Date.now()}`,
    name: '',
    enabled: true,
    offsetUnit: 'hour',
    offsetValue: 1,
    fixedTime: '',
    channels: {
      inapp: true,
      subscribe: false,
      sms: false
    }
  };
}

Page({
  data: {
    configTabs: [
      { key: 'basic', label: '基础参数', icon: 'setting' },
      { key: 'subscribe', label: '订阅消息', icon: 'notification' },
      { key: 'sms', label: '短信通知', icon: 'chat' }
    ],
    activeTab: 'basic',
    loading: false,
    saving: false,
    notifyTesting: false,
    smsTesting: false,
    subscribeAuthCursor: 0,
    notifyTestResultText: '',
    smsTestResultText: '',
    initialSnapshot: null,
    hasUnsavedChanges: false,
    showAddSlot: false,
    newSlotStart: '',
    newSlotEnd: '',
    showReminderPopup: false,
    reminderFormMode: 'create',
    editingReminderIndex: -1,
    reminderForm: defaultReminderRule(),
    formData: {
      runtimeStage: '',
      appName: '',
      maxBookingsPerDay: '',
      advanceDays: '',
      cancelHours: ''
    },
    timeSlots: [],
    rules: {
      requirePhone: true,
      requireIdCard: true,
      allowSameDayCancel: false
    },
    reminderRules: [],
    notificationConfig: {
      templateConfig: {
        enabled: true,
        appointmentSuccess: true,
        appointmentCancel: true,
        appointmentVerify: true
      },
      templateIds: {
        remindTemplateId: '',
        appointmentReminderTemplateId: '',
        successTemplateId: '',
        cancelTemplateId: '',
        verifyTemplateId: ''
      }
    },
    smsConfig: {
      smsLoginCodeEnabled: false,
      smsAppointmentReminderEnabled: false,
      debugCodeEnabled: false,
      region: 'ap-guangzhou',
      secretId: '',
      secretKey: '',
      sdkAppId: '',
      signName: '',
      templates: {
        loginTemplateId: '',
        appointmentReminderBeforeDayTemplateId: '',
        appointmentReminderBeforeHoursTemplateId: '',
        genericTemplateId: ''
      },
      masked: {
        secretId: '',
        secretKey: '',
        hasSecretId: false,
        hasSecretKey: false
      }
    },
    smsTestPhone: '',
    smsTestContent: '这是一条短信配置测试消息'
  },

  async onLoad() {
    if (!auth.requireRoles([1])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', 'global-config');
    if (!granted) return;
    this.loadConfig();
  },

  onUnload() {
    this.toggleUnloadAlert(false);
  },

  toggleUnloadAlert(enabled) {
    try {
      if (enabled) {
        wx.enableAlertBeforeUnload({ message: '当前有未保存更改，确定离开吗？' });
      } else {
        wx.disableAlertBeforeUnload();
      }
    } catch (err) {}
  },

  refreshUnsavedState() {
    const snapshot = this.data.initialSnapshot;
    if (!snapshot) {
      this.setData({ hasUnsavedChanges: false });
      this.toggleUnloadAlert(false);
      return;
    }
    const current = this.buildSnapshotFromData();
    const dirty = JSON.stringify(current) !== JSON.stringify(snapshot);
    this.setData({ hasUnsavedChanges: dirty });
    this.toggleUnloadAlert(dirty);
  },

  buildSnapshotFromData() {
    return clone({
      formData: this.data.formData,
      timeSlots: this.data.timeSlots,
      rules: this.data.rules,
      reminderRules: this.data.reminderRules,
      notificationConfig: this.data.notificationConfig,
      smsConfig: {
        smsLoginCodeEnabled: this.data.smsConfig.smsLoginCodeEnabled,
        smsAppointmentReminderEnabled: this.data.smsConfig.smsAppointmentReminderEnabled,
        debugCodeEnabled: this.data.smsConfig.debugCodeEnabled,
        region: this.data.smsConfig.region,
        secretId: this.data.smsConfig.secretId,
        secretKey: this.data.smsConfig.secretKey,
        sdkAppId: this.data.smsConfig.sdkAppId,
        signName: this.data.smsConfig.signName,
        templates: this.data.smsConfig.templates
      }
    });
  },

  async loadConfig() {
    this.setData({ loading: true });
    try {
      const result = await request('config.detail', {}, { showLoading: false });
      const config = result && result.config ? result.config : (result || {});
      const loadedTimeSlots = Array.isArray(config.timeSlots) && config.timeSlots.length ? config.timeSlots : [
        { id: 1, startTime: '09:00', endTime: '10:00', enabled: true },
        { id: 2, startTime: '10:00', endTime: '11:00', enabled: true }
      ];
      this.setData({
        formData: {
          runtimeStage: config.runtimeStage || '',
          appName: config.appName || '华襄预约',
          maxBookingsPerDay: String(config.maxBookingsPerDay || 50),
          advanceDays: String(config.advanceDays || 7),
          cancelHours: String(config.cancelHours || 24)
        },
        timeSlots: sortTimeSlots(loadedTimeSlots),
        rules: Object.assign({}, this.data.rules, config.rules || {}),
        reminderRules: Array.isArray(config.reminder_rules) ? config.reminder_rules : [],
        notificationConfig: config.subscribe_message_config || this.data.notificationConfig,
        smsConfig: Object.assign({}, this.data.smsConfig, config.sms_config || {}, {
          templates: Object.assign({}, this.data.smsConfig.templates, config.sms_config && config.sms_config.templates ? config.sms_config.templates : {}),
          masked: Object.assign({}, this.data.smsConfig.masked, config.sms_config && config.sms_config.masked ? config.sms_config.masked : {})
        })
      }, () => {
        this.setData({ initialSnapshot: this.buildSnapshotFromData() });
        this.refreshUnsavedState();
      });
    } catch (err) {
      console.error('加载配置失败', err);
    } finally {
      this.setData({ loading: false });
    }
  },

  switchTab(e) {
    const key = e.currentTarget.dataset.key;
    if (!TAB_KEYS.includes(key)) return;
    this.setData({ activeTab: key });
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`formData.${field}`]: e.detail.value }, () => this.refreshUnsavedState());
  },

  onRuntimeStageChange(e) {
    const index = Number(e.detail.value);
    const value = RUNTIME_STAGE_OPTIONS[index] || '';
    this.setData({ 'formData.runtimeStage': value }, () => this.refreshUnsavedState());
  },

  onRuleSwitchChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`rules.${field}`]: !!e.detail.value }, () => this.refreshUnsavedState());
  },

  showAddSlotPanel() {
    this.setData({ showAddSlot: true, newSlotStart: '', newSlotEnd: '' });
  },

  hideAddSlotPanel() {
    this.setData({ showAddSlot: false });
  },

  onNewSlotStartChange(e) {
    this.setData({ newSlotStart: e.detail.value });
  },

  onNewSlotEndChange(e) {
    this.setData({ newSlotEnd: e.detail.value });
  },

  confirmAddSlot() {
    const { newSlotStart, newSlotEnd, timeSlots } = this.data;
    if (!newSlotStart || !newSlotEnd) {
      feedback.showToast({ title: '请填写完整时间', icon: 'none' });
      return;
    }
    const next = sortTimeSlots(timeSlots.concat([{ id: Date.now(), startTime: newSlotStart, endTime: newSlotEnd, enabled: true }]));
    const slotCheck = validateTimeSlots(next);
    if (!slotCheck.valid) {
      feedback.showToast({ title: slotCheck.message, icon: 'none', duration: 2600 });
      return;
    }
    this.setData({
      timeSlots: next,
      showAddSlot: false,
      newSlotStart: '',
      newSlotEnd: ''
    }, () => this.refreshUnsavedState());
  },

  onSlotStartTimeChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    const next = clone(this.data.timeSlots);
    const previousValue = next[index].startTime;
    next[index].startTime = e.detail.value;
    const slotCheck = validateTimeSlots(next);
    if (!slotCheck.valid) {
      next[index].startTime = previousValue;
      feedback.showToast({ title: slotCheck.message, icon: 'none', duration: 2600 });
      return;
    }
    this.setData({ timeSlots: sortTimeSlots(next) }, () => this.refreshUnsavedState());
  },

  onSlotEndTimeChange(e) {
    const index = Number(e.currentTarget.dataset.index);
    const next = clone(this.data.timeSlots);
    const previousValue = next[index].endTime;
    next[index].endTime = e.detail.value;
    const slotCheck = validateTimeSlots(next);
    if (!slotCheck.valid) {
      next[index].endTime = previousValue;
      feedback.showToast({ title: slotCheck.message, icon: 'none', duration: 2600 });
      return;
    }
    this.setData({ timeSlots: sortTimeSlots(next) }, () => this.refreshUnsavedState());
  },

  onSlotToggle(e) {
    const index = Number(e.currentTarget.dataset.index);
    const next = clone(this.data.timeSlots);
    const previousValue = next[index].enabled;
    next[index].enabled = !!e.detail.value;
    const slotCheck = validateTimeSlots(next);
    if (!slotCheck.valid) {
      next[index].enabled = previousValue;
      feedback.showToast({ title: slotCheck.message, icon: 'none', duration: 2600 });
      return;
    }
    this.setData({ timeSlots: sortTimeSlots(next) }, () => this.refreshUnsavedState());
  },

  deleteSlot(e) {
    const index = Number(e.currentTarget.dataset.index);
    const next = clone(this.data.timeSlots);
    next.splice(index, 1);
    this.setData({ timeSlots: next }, () => this.refreshUnsavedState());
  },

  openCreateReminder() {
    this.setData({
      showReminderPopup: true,
      reminderFormMode: 'create',
      editingReminderIndex: -1,
      reminderForm: defaultReminderRule()
    });
  },

  openEditReminder(e) {
    const index = Number(e.currentTarget.dataset.index);
    const item = this.data.reminderRules[index];
    if (!item) return;
    this.setData({
      showReminderPopup: true,
      reminderFormMode: 'edit',
      editingReminderIndex: index,
      reminderForm: clone(item)
    });
  },

  closeReminderPopup() {
    this.setData({ showReminderPopup: false });
  },

  onReminderFieldChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`reminderForm.${field}`]: e.detail.value });
  },

  onReminderSwitchChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`reminderForm.${field}`]: !!e.detail.value });
  },

  onReminderUnitChange(e) {
    const value = Number(e.detail.value);
    const unit = value === 0 ? 'minute' : (value === 1 ? 'hour' : 'day');
    const next = Object.assign({}, this.data.reminderForm, {
      offsetUnit: unit
    });
    if (unit !== 'day') next.fixedTime = '';
    this.setData({ reminderForm: next });
  },

  onReminderChannelChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`reminderForm.channels.${field}`]: !!e.detail.value });
  },

  saveReminderRule() {
    const form = clone(this.data.reminderForm);
    if (!form.name.trim()) {
      feedback.showToast({ title: '请填写提醒名称', icon: 'none' });
      return;
    }
    form.offsetValue = Math.max(1, parseInt(form.offsetValue || 1, 10));
    if (form.offsetUnit !== 'day') {
      form.fixedTime = '';
    }
    const next = clone(this.data.reminderRules);
    if (this.data.reminderFormMode === 'edit' && this.data.editingReminderIndex >= 0) {
      next[this.data.editingReminderIndex] = form;
    } else {
      next.push(form);
    }
    this.setData({
      reminderRules: next,
      showReminderPopup: false
    }, () => this.refreshUnsavedState());
  },

  toggleReminderEnabled(e) {
    const index = Number(e.currentTarget.dataset.index);
    const next = clone(this.data.reminderRules);
    next[index].enabled = !!e.detail.value;
    this.setData({ reminderRules: next }, () => this.refreshUnsavedState());
  },

  deleteReminderRule(e) {
    const index = Number(e.currentTarget.dataset.index);
    const next = clone(this.data.reminderRules);
    next.splice(index, 1);
    this.setData({ reminderRules: next }, () => this.refreshUnsavedState());
  },

  onTemplateConfigSwitch(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`notificationConfig.templateConfig.${field}`]: !!e.detail.value }, () => this.refreshUnsavedState());
  },

  onTemplateIdInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`notificationConfig.templateIds.${field}`]: e.detail.value }, () => this.refreshUnsavedState());
  },

  collectSubscribeTemplateIds() {
    const templateIds = this.data.notificationConfig.templateIds || {};
    const candidates = [
      templateIds.appointmentReminderTemplateId,
      templateIds.successTemplateId,
      templateIds.cancelTemplateId,
      templateIds.verifyTemplateId,
      templateIds.remindTemplateId
    ];
    const seen = {};
    return candidates
      .map((item) => String(item || '').trim())
      .filter((item) => item && !seen[item] && (seen[item] = true));
  },

  requestSubscribeAuthorization() {
    this.requestSubscribeAuthorizationInternal();
  },

  async requestSubscribeAuthorizationInternal() {
    try {
      const result = await requestSubscribeAuthorization({ scenes: 'all' });
      if (!result.requested) {
        feedback.showToast({ title: '请先配置模板ID', icon: 'none' });
        return;
      }
      feedback.showToast({
        title: `授权结果：允${result.acceptedCount} 拒${result.deniedCount}`,
        icon: result.acceptedCount > 0 ? 'success' : 'none'
      });
    } catch (err) {
      wx.showModal({ title: '授权失败', content: (err && err.errMsg) || '拉起授权失败', showCancel: false });
    }
  },

  formatNotifyTestResult(action, result) {
    if (!result) return `${action}: 无返回数据`;
    if (action === 'appointment.testNotifyAll') {
      const rows = Array.isArray(result.results) ? result.results : [];
      if (!rows.length) return '全量测试：未返回明细';
      return rows.map((item) => {
        const scene = item.scene || 'unknown';
        if (item.ok) {
          const sendResult = item.data && item.data.sendResult;
          const sendOk = !!(sendResult && sendResult.success);
          return `${scene}: ${sendOk ? '发送成功' : '发送失败'}${sendResult && sendResult.reason ? ` (${sendResult.reason})` : ''}`;
        }
        return `${scene}: 请求失败 (${item.errCode || 'UNKNOWN'})`;
      }).join('\n');
    }
    const sendResult = result.sendResult || {};
    return `${result.scene || action}: ${sendResult.success ? '发送成功' : '发送失败'}${sendResult.reason ? ` (${sendResult.reason})` : ''}`;
  },

  async runNotifyTest(e) {
    if (this.data.notifyTesting) return;
    const action = (e.currentTarget.dataset && e.currentTarget.dataset.action) || 'appointment.testNotifyAll';
    this.setData({ notifyTesting: true });
    try {
      if (action === 'appointment.testNotifyAll') {
        const [appointmentResult, auditPendingResult, auditApprovedResult] = await Promise.all([
          request('appointment.testNotifyAll', {}, { showLoading: true, loadingText: '通知测试中...' }),
          request('binding.testNotifyAuditPending', {}, { showLoading: false }),
          request('binding.testNotifyAuditApproved', {}, { showLoading: false })
        ]);
        this.setData({
          notifyTestResultText: [
            this.formatNotifyTestResult('appointment.testNotifyAll', appointmentResult),
            this.formatNotifyTestResult('binding.testNotifyAuditPending', auditPendingResult),
            this.formatNotifyTestResult('binding.testNotifyAuditApproved', auditApprovedResult)
          ].join('\n')
        });
      } else {
        const result = await request(action, {}, { showLoading: true, loadingText: '通知测试中...' });
        this.setData({ notifyTestResultText: this.formatNotifyTestResult(action, result) });
      }
      feedback.showToast({ title: '通知测试已触发', icon: 'success' });
    } catch (err) {
      this.setData({ notifyTestResultText: `${action}: ${(err && err.errMsg) || '通知测试失败'}` });
    } finally {
      this.setData({ notifyTesting: false });
    }
  },

  onSmsSwitchChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`smsConfig.${field}`]: !!e.detail.value }, () => this.refreshUnsavedState());
  },

  onSmsInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`smsConfig.${field}`]: e.detail.value }, () => this.refreshUnsavedState());
  },

  onSmsTemplateInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`smsConfig.templates.${field}`]: e.detail.value }, () => this.refreshUnsavedState());
  },

  onSmsTestInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [field]: e.detail.value });
  },

  getSmsSceneLabel(scene) {
    if (scene === 'login') return '验证码模板';
    if (scene === 'reminder_before_day') return '预约前一天提醒模板';
    if (scene === 'reminder_before_hours') return '预约前几小时提醒模板';
    return '通用测试模板';
  },

  validateForm() {
    const { formData, timeSlots, reminderRules } = this.data;
    if (!formData.runtimeStage) {
      feedback.showToast({ title: '请选择当前运行环境', icon: 'none' });
      return false;
    }
    if (!formData.appName.trim()) {
      feedback.showToast({ title: '请填写小程序名称', icon: 'none' });
      return false;
    }
    if (!timeSlots.filter((item) => item.enabled !== false).length) {
      feedback.showToast({ title: '请至少保留一个可预约时段', icon: 'none' });
      return false;
    }
    const slotCheck = validateTimeSlots(timeSlots);
    if (!slotCheck.valid) {
      feedback.showToast({ title: slotCheck.message, icon: 'none', duration: 2600 });
      return false;
    }
    if (!reminderRules.length) {
      feedback.showToast({ title: '请至少配置一条提醒规则', icon: 'none' });
      return false;
    }
    return true;
  },

  buildSavePayload() {
    return {
      appName: this.data.formData.appName,
      runtimeStage: this.data.formData.runtimeStage,
      maxBookingsPerDay: parseInt(this.data.formData.maxBookingsPerDay || 50, 10) || 50,
      advanceDays: parseInt(this.data.formData.advanceDays || 7, 10) || 7,
      cancelHours: parseInt(this.data.formData.cancelHours || 24, 10) || 24,
      timeSlots: sortTimeSlots(this.data.timeSlots),
      rules: this.data.rules,
      subscribe_message_config: this.data.notificationConfig,
      inapp_notify_config: this.data.notificationConfig.templateConfig,
      template_ids: this.data.notificationConfig.templateIds,
      sms_config: {
        smsLoginCodeEnabled: this.data.smsConfig.smsLoginCodeEnabled,
        smsAppointmentReminderEnabled: this.data.smsConfig.smsAppointmentReminderEnabled,
        debugCodeEnabled: this.data.smsConfig.debugCodeEnabled,
        region: this.data.smsConfig.region,
        secretId: this.data.smsConfig.secretId,
        secretKey: this.data.smsConfig.secretKey,
        sdkAppId: this.data.smsConfig.sdkAppId,
        signName: this.data.smsConfig.signName,
        templates: this.data.smsConfig.templates
      },
      reminder_rules: this.data.reminderRules
    };
  },

  async saveConfig() {
    if (!this.validateForm() || this.data.saving) return;
    this.setData({ saving: true });
    try {
      await request('config.update', this.buildSavePayload(), { showLoading: true, loadingText: '保存中...' });
      feedback.showToast({ title: '保存成功', icon: 'success' });
      this.setData({
        smsConfig: Object.assign({}, this.data.smsConfig, {
          secretId: '',
          secretKey: ''
        })
      }, async () => {
        await this.loadConfig();
      });
    } catch (err) {
      console.error('保存配置失败', err);
    } finally {
      this.setData({ saving: false });
    }
  },

  async discardChanges() {
    if (!this.data.initialSnapshot) return;
    this.setData({
      formData: clone(this.data.initialSnapshot.formData),
      timeSlots: sortTimeSlots(clone(this.data.initialSnapshot.timeSlots)),
      rules: clone(this.data.initialSnapshot.rules),
      reminderRules: clone(this.data.initialSnapshot.reminderRules),
      notificationConfig: clone(this.data.initialSnapshot.notificationConfig),
      smsConfig: Object.assign({}, this.data.smsConfig, clone(this.data.initialSnapshot.smsConfig), {
        masked: this.data.smsConfig.masked
      })
    }, () => this.refreshUnsavedState());
  },

  async validateSmsConfig() {
    if (this.data.smsTesting) return;
    this.setData({ smsTesting: true });
    try {
      await request('config.update', this.buildSavePayload(), { showLoading: true, loadingText: '保存并校验中...' });
      const result = await request('config.validateSmsConfig', {}, { showLoading: true, loadingText: '校验中...' });
      this.setData({
        smsTestResultText: result.valid ? '短信配置完整，可继续发送测试短信。' : `缺少配置：${(result.missing || []).join('、')}`
      });
      await this.loadConfig();
    } catch (err) {
      this.setData({ smsTestResultText: (err && err.errMsg) || '短信配置校验失败' });
    } finally {
      this.setData({ smsTesting: false });
    }
  },

  async sendSmsTest(e) {
    if (this.data.smsTesting) return;
    if (!/^1[3-9]\d{9}$/.test(String(this.data.smsTestPhone || '').trim())) {
      feedback.showToast({ title: '请输入正确的测试手机号', icon: 'none' });
      return;
    }
    const scene = (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.scene) || 'generic';
    this.setData({ smsTesting: true });
    try {
      await request('config.update', this.buildSavePayload(), { showLoading: true, loadingText: '保存配置中...' });
      const result = await request('config.sendSmsTest', {
        phone: this.data.smsTestPhone,
        content: this.data.smsTestContent,
        scene
      }, { showLoading: true, loadingText: '测试发送中...' });
      this.setData({
        smsTestResultText: `${this.getSmsSceneLabel(scene)}已发送，请检查手机。请求ID：${result.providerRequestId || ''}`
      });
      await this.loadConfig();
      feedback.showToast({ title: '测试短信已发送', icon: 'success' });
    } catch (err) {
      this.setData({ smsTestResultText: (err && err.errMsg) || '测试短信发送失败' });
    } finally {
      this.setData({ smsTesting: false });
    }
  },

});
