const feedback = require('../../utils/feedback');
const { requestWithCheck } = require('../../utils/request');
const displayDict = require('../../utils/displayDict');
const auth = require('../../utils/auth');
const { DEFAULT_AVATAR, normalizeAvatarForSave, resolveAvatarDisplay } = require('../../utils/avatar');

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    force: {
      type: Boolean,
      value: false
    },
    avoidTabBar: {
      type: Boolean,
      value: true
    }
  },

  data: {
    saving: false,
    draft: {
      avatar: '',
      avatarFileID: '',
      nickname: ''
    }
  },

  observers: {
    visible(nextVisible) {
      if (!nextVisible) return;
      const user = wx.getStorageSync('userInfo') || {};
      this.setData({
        draft: {
          avatar: resolveAvatarDisplay(user.avatar),
          avatarFileID: String(user.avatarFileID || '').trim(),
          nickname: String(user.nickname || '').trim()
        }
      });
    }
  },

  methods: {
    onSheetTap() {},

    onMaskTap() {
      if (this.data.force) return;
      this.triggerEvent('close');
    },

    onClose() {
      if (this.data.force) return;
      this.triggerEvent('close');
    },

    onChooseAvatar(e) {
      const avatarUrl = String((e && e.detail && e.detail.avatarUrl) || '').trim();
      if (!avatarUrl) return;
      this.setData({
        'draft.avatar': avatarUrl,
        'draft.avatarFileID': ''
      });
    },

    onNicknameInput(e) {
      this.setData({ 'draft.nickname': (e.detail && e.detail.value) || '' });
    },

    onUseDefault() {
      const nickname = this._generateDefaultNickname();
      this.setData({
        draft: {
          avatar: DEFAULT_AVATAR,
          avatarFileID: '',
          nickname
        }
      });
      feedback.showToast({ title: '已生成默认昵称和头像', icon: 'none' });
    },

    _generateDefaultNickname() {
      // 规则：固定前缀 + 随机后缀（两位中文名词 + 4位数字）
      const a = ['小', '暖', '星', '乐', '萌', '安', '青', '糖', '橙', '云', '米', '鹿'];
      const b = ['同学', '家长', '朋友', '来访', '参观', '同伴', '小伙伴', '访客', '用户', '小可爱'];
      const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
      const digits = String(Math.floor(1000 + Math.random() * 9000));
      return `华襄${pick(a)}${pick(b)}${digits}`.slice(0, 20);
    },

    async onSave() {
      if (this.data.saving) return;
      if (auth.isImpersonating()) {
        feedback.showToast({ title: '代维模式下不可修改资料', icon: 'none' });
        return;
      }
      const nickname = String(this.data.draft.nickname || '').trim();
      let avatar = String(this.data.draft.avatar || '').trim();
      const avatarFileID = String(this.data.draft.avatarFileID || '').trim();

      if (!avatar) {
        feedback.showToast({ title: '请先选择头像', icon: 'none' });
        return;
      }
      if (!nickname) {
        feedback.showToast({ title: '请先填写昵称', icon: 'none' });
        return;
      }

      this.setData({ saving: true });
      try {
        const oldUser = wx.getStorageSync('userInfo') || {};
        avatar = await normalizeAvatarForSave({
          avatar,
          avatarFileID,
          userId: String(oldUser.userId || 'anonymous').trim() || 'anonymous',
        });

        const saveRes = await requestWithCheck('user.updateProfile', { nickname, avatar }, { showLoading: false, showError: true });
        const savedUser = (saveRes && saveRes.userInfo) || {};
        const mergedUser = Object.assign({}, oldUser, {
          nickname: savedUser.nickname || nickname,
          avatar: savedUser.avatar || avatar,
          avatarFileID: savedUser.avatarFileID || (avatar.indexOf('cloud://') === 0 ? avatar : ''),
          profile: savedUser.profile || oldUser.profile || {},
          needCompleteProfile: false
        });
        auth.setUserInfo(mergedUser);
        auth.markProfileJustUpdated();
        feedback.showToast({ title: displayDict.text('SAVE_SUCCESS') || '保存成功', icon: 'success' });
        this.triggerEvent('saved', { userInfo: mergedUser });
      } catch (err) {
        if (err && (err.errCode === 'AVATAR_TEMP_URL_EXPIRED' || err.message === 'AVATAR_TEMP_URL_EXPIRED')) {
          feedback.showToast({ title: '当前头像链接已过期，请重新选择头像后再保存', icon: 'none' });
        }
        // requestWithCheck 已 toast
      } finally {
        this.setData({ saving: false });
      }
    }
  }
});
