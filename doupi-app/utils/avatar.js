const { uploadFile } = require('./request');

const DEFAULT_AVATAR = '/images/icons/default-avatar.png';

function buildAvatarCloudPath(userId) {
  return `avatars/${String(userId || 'anonymous').trim() || 'anonymous'}_${Date.now()}.png`;
}

function downloadTempFile(url) {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url,
      success(res) {
        if (res && Number(res.statusCode) === 200 && res.tempFilePath) {
          resolve(res.tempFilePath);
          return;
        }
        const err = new Error('AVATAR_TEMP_URL_EXPIRED');
        err.errCode = 'AVATAR_TEMP_URL_EXPIRED';
        reject(err);
      },
      fail() {
        const err = new Error('AVATAR_TEMP_URL_EXPIRED');
        err.errCode = 'AVATAR_TEMP_URL_EXPIRED';
        reject(err);
      }
    });
  });
}

async function normalizeAvatarForSave(options) {
  const opts = options || {};
  let avatar = String(opts.avatar || '').trim();
  const avatarFileID = String(opts.avatarFileID || '').trim();
  const userId = String(opts.userId || 'anonymous').trim() || 'anonymous';

  if (!avatar) return '';
  if (avatar.indexOf('cloud://') === 0 || avatar.indexOf('/images/') === 0) {
    return avatar;
  }
  if (avatarFileID && avatarFileID.indexOf('cloud://') === 0) {
    return avatarFileID;
  }

  let localFilePath = avatar;
  if (/^https?:\/\//i.test(avatar)) {
    localFilePath = await downloadTempFile(avatar);
  }

  const uploadRes = await uploadFile(localFilePath, {
    cloudPath: buildAvatarCloudPath(userId),
    showLoading: false
  });
  const fileID = String((uploadRes && uploadRes.fileID) || '').trim();
  if (!fileID) {
    throw new Error('头像上传失败');
  }
  return fileID;
}

function resolveAvatarDisplay(avatar) {
  const value = String(avatar || '').trim();
  return value || DEFAULT_AVATAR;
}

function hasCompletedBasicProfile(userInfo) {
  if (!userInfo || typeof userInfo !== 'object') return false;
  const nickname = String(userInfo.nickname || '').trim();
  const avatar = String(userInfo.avatar || '').trim();
  return !!(nickname && avatar);
}

module.exports = {
  DEFAULT_AVATAR,
  resolveAvatarDisplay,
  hasCompletedBasicProfile,
  normalizeAvatarForSave,
};
