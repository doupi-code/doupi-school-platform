const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');
const displayDict = require('../../../utils/displayDict');
const validationDict = require('../../../utils/validationDict');

function splitPhones(raw) {
  const text = String(raw || '').trim();
  if (!text) return [];
  return text
    .split(/[\s,，、;；|/]+/g)
    .map((s) => String(s || '').trim())
    .filter(Boolean);
}

function isValidPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || '').trim());
}

Page({
  data: {
    roleOptions: [
      { value: '1', label: '超级管理员' },
      { value: '5', label: '管理员' },
      { value: '2', label: '招生主任' },
      { value: '3', label: '招生老师' },
      { value: '4', label: '家长' },
    ],
    selectedRole: '',
    roleLabel: '',
    rawPhones: '',

    previewList: [],
    previewSummary: { total: 0, valid: 0, invalid: 0, duplicated: 0 },
    canSave: false,
    displayText: {
      titleRoleSelect: displayDict.text('TITLE_ROLE_SELECT'),
      titlePhoneMultiInput: displayDict.text('TITLE_PHONE_MULTI_INPUT'),
      placeholderPhoneExamples: displayDict.text('PLACEHOLDER_PHONE_EXAMPLES'),
      hintPhoneSplitSupported: displayDict.text('HINT_PHONE_SPLIT_SUPPORTED'),
      btnReset: displayDict.text('BTN_RESET'),
      btnPreview: displayDict.text('BTN_PREVIEW'),
      titlePreview: displayDict.text('TITLE_PREVIEW'),
      labelValid: displayDict.text('LABEL_VALID'),
      labelInvalid: displayDict.text('LABEL_INVALID'),
      labelDuplicated: displayDict.text('LABEL_DUPLICATED'),
      labelRolePrefix: displayDict.text('LABEL_ROLE_PREFIX'),
      btnSaveNew: displayDict.text('BTN_SAVE_NEW')
    }
  },

  async onLoad() {
    if (!auth.requireRoles([1])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', 'users');
    if (!granted) return;
  },

  onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    const hit = (this.data.roleOptions || []).find((r) => r.value === role);
    this.setData({ selectedRole: role, roleLabel: hit ? hit.label : '' });
  },

  onPhonesInput(e) {
    this.setData({ rawPhones: e.detail.value });
  },

  onPreview() {
    if (!this.data.selectedRole) {
      feedback.showToast({ title: validationDict.text('SELECT_ROLE_FIRST'), icon: 'none' });
      return;
    }

    const list = splitPhones(this.data.rawPhones);
    if (list.length === 0) {
      feedback.showToast({ title: validationDict.text('ENTER_PHONE_FIRST'), icon: 'none' });
      return;
    }

    const seen = new Set();
    let valid = 0;
    let invalid = 0;
    let duplicated = 0;

    const previewList = list.map((p, idx) => {
      const phone = String(p || '').trim();
      const key = `${phone}_${idx}`;

      if (seen.has(phone)) {
        duplicated += 1;
        return { key, phone, status: 'duplicated' };
      }
      seen.add(phone);

      if (!isValidPhone(phone)) {
        invalid += 1;
        return { key, phone, status: 'invalid' };
      }

      valid += 1;
      return { key, phone, status: 'valid' };
    });

    const previewSummary = {
      total: previewList.length,
      valid,
      invalid,
      duplicated,
    };

    this.setData({
      previewList,
      previewSummary,
      canSave: valid > 0,
    });
  },

  async onSave() {
    if (!this.data.selectedRole) {
      feedback.showToast({ title: validationDict.text('SELECT_ROLE_FIRST'), icon: 'none' });
      return;
    }

    const phones = (this.data.previewList || [])
      .filter((x) => x.status === 'valid')
      .map((x) => x.phone);

    if (phones.length === 0) {
      feedback.showToast({ title: validationDict.text('NO_VALID_PHONE_TO_SAVE'), icon: 'none' });
      return;
    }

    try {
      const res = await request(
        'user.batchCreate',
        { role: Number(this.data.selectedRole), phones },
        { showLoading: true, loadingText: displayDict.text('SAVING') }
      );

      const created = Number(res && res.created) || 0;
      const skipped = Number(res && (res.skipped || res.existed)) || 0;
      const released = Number(res && res.released) || 0;
      const handled = res && res.total ? res.total : phones.length;
      const title = released > 0
        ? `创建${created}个，跳过${skipped}个（${released}个已释放手机号）`
        : skipped > 0
          ? `创建${created}个，跳过${skipped}个`
          : `${displayDict.text('PROCESSED_COUNT_PREFIX')}${handled}${displayDict.text('PROCESSED_COUNT_SUFFIX')}`;
      feedback.showToast({
        title,
        icon: 'success'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 800);
    } catch (err) {
      // toast 已由 request 统一处理
      console.error('批量新增失败:', err);
    }
  },

  onReset() {
    this.setData({
      selectedRole: '',
      roleLabel: '',
      rawPhones: '',
      previewList: [],
      previewSummary: { total: 0, valid: 0, invalid: 0, duplicated: 0 },
      canSave: false,
    });
  },
});
