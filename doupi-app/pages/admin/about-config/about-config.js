const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const errorDict = require('../../../utils/errorDict');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

Page({
  data: {
    loading: false,
    saving: false,
    campusTitle: '',
    campusIntro: '',
    formData: {
      contactPhone: '',
      contactEmail: '',
      address: '',
      officeHourWeekday: '',
      officeHourSaturday: '',
      officeHourHoliday: ''
    },
    initialSnapshot: null,
    hasUnsavedChanges: false
  },

  async onLoad() {
    if (!auth.requireRoles([1])) return;
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', 'about-config');
    if (!granted) return;
    this.loadData();
  },

  onUnload() {
    this.toggleUnloadAlert(false);
  },

  toggleUnloadAlert(enabled) {
    try {
      if (enabled) {
        wx.enableAlertBeforeUnload({
          message: '当前有未保存更改，确定离开吗？'
        });
      } else {
        wx.disableAlertBeforeUnload();
      }
    } catch (err) {}
  },

  buildSnapshot() {
    return deepClone({
      formData: this.data.formData,
      campusTitle: this.data.campusTitle,
      campusIntro: this.data.campusIntro
    });
  },

  refreshUnsavedState() {
    const snapshot = this.data.initialSnapshot;
    if (!snapshot) {
      this.setData({ hasUnsavedChanges: false });
      this.toggleUnloadAlert(false);
      return;
    }
    const dirty = JSON.stringify(this.buildSnapshot()) !== JSON.stringify(snapshot);
    if (dirty !== this.data.hasUnsavedChanges) {
      this.setData({ hasUnsavedChanges: dirty });
    }
    this.toggleUnloadAlert(dirty);
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const result = await request('about.summary', {}, { showLoading: false, showError: false });
      const aboutConfig = result.aboutConfig || {};
      const officeHours = Array.isArray(aboutConfig.officeHours) ? aboutConfig.officeHours : [];
      const campus = result.campus || {};

      this.setData({
        campusTitle: campus.title || '',
        campusIntro: campus.intro || campus.summary || '',
        formData: {
          contactPhone: aboutConfig.contactPhone || '',
          contactEmail: aboutConfig.contactEmail || '',
          address: aboutConfig.address || '',
          officeHourWeekday: (officeHours[0] && officeHours[0].value) || '',
          officeHourSaturday: (officeHours[1] && officeHours[1].value) || '',
          officeHourHoliday: (officeHours[2] && officeHours[2].value) || ''
        }
      }, () => {
        this.setData({ initialSnapshot: this.buildSnapshot() });
        this.refreshUnsavedState();
      });
    } catch (err) {
      console.error('加载关于页数据失败:', err);
      feedback.showToast({ title: errorDict.text('LOAD_FAILED_RETRY'), icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  onInputChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({
      [`formData.${field}`]: e.detail.value
    }, () => this.refreshUnsavedState());
  },

  async saveConfig() {
    if (this.data.saving) return;
    this.setData({ saving: true });
    try {
      const { formData } = this.data;
      await request('config.update', {
        aboutConfig: {
          contactPhone: formData.contactPhone.trim(),
          contactEmail: formData.contactEmail.trim(),
          address: formData.address.trim(),
          officeHours: [
            { label: '周一至周五', value: formData.officeHourWeekday.trim() },
            { label: '周六', value: formData.officeHourSaturday.trim() },
            { label: '周日及法定节假日', value: formData.officeHourHoliday.trim() }
          ]
        }
      });
      this.setData({
        initialSnapshot: this.buildSnapshot()
      });
      this.refreshUnsavedState();
      feedback.showToast({ title: '保存成功', icon: 'success' });
    } catch (err) {
      console.error('保存关于页配置失败:', err);
    } finally {
      this.setData({ saving: false });
    }
  },

  discardChanges() {
    const snapshot = this.data.initialSnapshot;
    if (!snapshot) {
      feedback.showToast({ title: '暂无可丢弃的更改', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认丢弃',
      content: '确认丢弃当前未保存的关于我们配置吗？',
      confirmColor: '#FF4D4F',
      success: (res) => {
        if (!res.confirm) return;
        this.setData({
          formData: deepClone(snapshot.formData || {}),
          campusTitle: snapshot.campusTitle || '',
          campusIntro: snapshot.campusIntro || ''
        }, () => {
          this.refreshUnsavedState();
          feedback.showToast({ title: '已恢复最近保存内容', icon: 'none' });
        });
      }
    });
  },

  goToCampus() {
    wx.navigateTo({
      url: '/pages/admin/campus/campus'
    });
  }
});
