/**
 * @fileoverview 统一交互反馈工具
 * - Toast：原生 wx.showToast（success/error 文案过长时自动 icon:none，避免截断）
 * - Modal / Loading / ActionSheet：原生 API
 */

/**
 * 带 success/error 图标时，微信对 title 展示极窄（约 7 个汉字内），超出易被截断。
 * 超过该字数则改用 icon:none，保证整句可见（如「扫码失败，请重试」）。
 */
var NATIVE_TOAST_ICON_TITLE_MAX_LEN = 6;

/**
 * @param {string} title
 * @param {'success'|'error'|'none'|'loading'} icon
 * @param {number} duration
 * @param {boolean} mask
 * @param {Function} [callback]
 */
function invokeNativeToast(title, icon, duration, mask, callback) {
  var text = String(title != null && title !== '' ? title : '提示');
  var dur = typeof duration === 'number' && duration > 0 ? duration : 2000;
  var resolvedIcon = icon;
  if (icon === 'success' || icon === 'error') {
    if (text.length > NATIVE_TOAST_ICON_TITLE_MAX_LEN) {
      resolvedIcon = 'none';
    }
  }
  wx.showToast({
    title: text,
    icon: resolvedIcon,
    mask: !!mask,
    duration: dur
  });
  if (callback) {
    setTimeout(callback, dur);
  }
}

/**
 * 中性提示
 *
 * @param {string} title 提示文字
 * @param {number} [duration=2000] 显示时长
 * @param {Function} [callback] 关闭后回调
 */
function showInfo(title, duration, callback) {
  var dur = duration || 2000;
  invokeNativeToast(title || '提示', 'none', dur, false, callback);
}

/**
 * 显示 Toast 提示
 *
 * @param {Object} options 配置选项
 * @param {string} options.title 提示文字
 * @param {'success'|'error'|'warning'|'none'|'loading'} [options.icon='none'] 图标类型
 * @param {number} [options.duration=2000] 显示时长（毫秒）
 * @param {boolean} [options.mask=false] 是否显示透明蒙层（loading 分支默认 true）
 * @param {Function} [options.callback] 关闭后的回调
 * @param {Function} [options.success] 同 callback（兼容 wx.showToast）
 */
function showToast(options) {
  if (typeof options === 'string') {
    options = { title: options };
  }

  var title = options.title || '';
  var duration = typeof options.duration === 'number' && options.duration > 0
    ? options.duration
    : 2000;
  var icon = options.icon || 'none';
  var cb = options.callback || options.success || null;

  if (icon === 'loading') {
    wx.showToast({
      title: title,
      icon: 'loading',
      duration: duration,
      mask: options.mask !== false
    });
    if (cb) {
      setTimeout(cb, duration);
    }
    return;
  }

  if (icon === 'success') {
    invokeNativeToast(title, 'success', duration, false, cb);
    return;
  }
  if (icon === 'error') {
    invokeNativeToast(title, 'error', duration, true, cb);
    return;
  }
  if (icon === 'warning') {
    invokeNativeToast(title, 'none', duration, false, cb);
    return;
  }

  invokeNativeToast(title, 'none', duration, false, cb);
}

/**
 * 显示成功提示
 *
 * @param {string} title 成功提示文字
 * @param {number} [duration=2000] 显示时长
 * @param {Function} [callback] 回调函数
 */
function showSuccess(title, duration, callback) {
  invokeNativeToast(title || '操作成功', 'success', duration || 2000, false, callback);
}

/**
 * 显示错误提示
 *
 * @param {string} title 错误提示文字
 * @param {number} [duration=2500] 显示时长
 * @param {Function} [callback] 回调函数
 */
function showError(title, duration, callback) {
  invokeNativeToast(title || '操作失败', 'error', duration || 2500, true, callback);
}

/**
 * 显示警告提示
 *
 * @param {string} title 警告提示文字
 * @param {number} [duration=2000] 显示时长
 */
function showWarning(title, duration) {
  invokeNativeToast(title || '请注意', 'none', duration || 2000, false, null);
}

/**
 * 显示加载中提示
 *
 * @param {string} [title='加载中...'] 加载文字
 * @param {boolean} [mask=true] 是否显示蒙层
 */
function showLoading(title, mask) {
  wx.showLoading({
    title: title || '加载中...',
    mask: mask !== false
  });
}

/**
 * 隐藏加载提示
 *
 * 所有 loading 都应该配对调用此方法
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 显示确认对话框
 *
 * @param {Object} options 配置选项
 * @param {string} options.title 标题
 * @param {string} [options.content] 内容描述
 * @param {string} [options.confirmText='确定'] 确认按钮文字
 * @param {string} [options.cancelText='取消'] 取消按钮文字
 * @param {boolean} [options.showCancel=true] 是否显示取消按钮
 * @param {boolean} [options.confirmColor='#3088F4'] 确认按钮颜色
 * @param {Function} options.confirmCallback 确认回调
 * @param {Function} [options.cancelCallback] 取消回调
 */
function showModal(options) {
  return new Promise((resolve, reject) => {
    wx.showModal({
      title: options.title || '提示',
      content: options.content || '',
      confirmText: options.confirmText || '确定',
      cancelText: options.cancelText || '取消',
      showCancel: options.showCancel !== false,
      confirmColor: options.confirmColor || '#3088F4',
      success(res) {
        if (res.confirm) {
          if (options.confirmCallback) {
            options.confirmCallback();
          }
          resolve(true);
        } else {
          if (options.cancelCallback) {
            options.cancelCallback();
          }
          resolve(false);
        }
      },
      fail(err) {
        console.error('[Feedback] showModal failed:', err);
        reject(err);
      }
    });
  });
}

/**
 * 显示危险操作确认框（红色确认按钮）
 *
 * 用于删除、取消等不可逆操作的二次确认
 *
 * @param {string} title 标题
 * @param {string} [content] 详细说明
 * @returns {Promise<boolean>} 用户是否确认
 */
function showDangerConfirm(title, content) {
  return showModal({
    title: title || '确认操作',
    content: content || '此操作不可撤销，是否继续？',
    confirmText: '确认',
    confirmColor: '#FF4D4F'
  });
}

/**
 * 显示操作菜单
 *
 * @param {Array<string>} itemList 菜单项列表
 * @param {Object} [options] 配置项
 * @param {string} [options.title] 菜单标题
 * @returns {Promise<number>} 选中的索引
 */
function showActionSheet(itemList, options) {
  return new Promise((resolve, reject) => {
    wx.showActionSheet({
      itemList: itemList,
      itemColor: options && options.itemColor || '#333333',
      success(res) {
        resolve(res.tapIndex);
      },
      fail(err) {
        if (err.errMsg.indexOf('cancel') !== -1) {
          resolve(-1); // 用户取消
        } else {
          reject(err);
        }
      }
    });
  });
}

/**
 * 带加载状态的异步操作包装器
 *
 * 自动显示/隐藏 loading，处理成功/失败提示
 *
 * @param {Function} asyncOperation 异步操作函数（返回 Promise）
 * @param {Object} [options] 配置选项
 * @param {string} [options.loadingText='处理中...'] 加载文字
 * @param {string} [options.successText] 成功提示文字（不设置则不提示）
 * @param {string} [options.errorText='操作失败'] 失败提示文字
 * @param {boolean} [options.showErrorToast=true] 失败时是否显示 Toast
 * @param {boolean} [options.showSuccessToast=false] 成功时是否显示 Toast
 * @returns {Promise} 异步操作结果
 */
async function withLoading(asyncOperation, options) {
  const config = Object.assign({
    loadingText: '处理中...',
    successText: '',
    errorText: '操作失败，请重试',
    showErrorToast: true,
    showSuccessToast: false
  }, options);

  try {
    showLoading(config.loadingText);
    const result = await asyncOperation();

    hideLoading();

    if (config.showSuccessToast && config.successText) {
      showSuccess(config.successText);
    }

    return result;
  } catch (error) {
    hideLoading();
    console.error('[Feedback] withLoading error:', error);

    if (config.showErrorToast) {
      const errorMsg = error.message || error.msg || config.errorText;
      showError(errorMsg);
    }

    throw error;
  }
}

/**
 * 防重复点击装饰器
 *
 * 返回一个新函数，在指定时间内只执行一次
 *
 * @param {Function} fn 原始函数
 * @param {number} [delay=1000] 防抖间隔（毫秒）
 * @returns {Function} 包装后的函数
 */
function preventDoubleClick(fn, delay) {
  let lastTime = 0;
  let timer = null;

  return function(...args) {
    const now = Date.now();

    // 清除之前的定时器
    if (timer) {
      clearTimeout(timer);
    }

    // 如果距离上次调用时间太短，忽略本次调用
    if (now - lastTime < (delay || 1000)) {
      return;
    }

    lastTime = now;

    // 设置定时器，延迟执行
    timer = setTimeout(() => {
      fn.apply(this, args);
      timer = null;
    }, 50); // 50ms 的微小延迟确保视觉反馈先触发
  };
}

module.exports = {
  showToast,
  showInfo,
  showSuccess,
  showError,
  showWarning,
  showLoading,
  hideLoading,
  showModal,
  showDangerConfirm,
  showActionSheet,
  withLoading,
  preventDoubleClick
};
