/**
 * @fileoverview 轻量 UI 辅助（Toast / 复制），与 TDesign 并存，减少样板代码。
 * toastFail 与 feedback.showError 对齐（error 图标 + 长文案自动 icon:none）。
 */

const feedback = require('./feedback');

/**
 * 展示成功 Toast。
 * @param {string} title 文案
 * @returns {void}
 */
function toastOk(title) {
  feedback.showToast({ title, icon: "success" });
}

/**
 * 展示失败 Toast。
 * @param {string} title 文案
 * @returns {void}
 */
function toastFail(title) {
  feedback.showError(title);
}

/**
 * 将文本写入剪贴板。
 * @param {string} text 文本
 * @returns {Promise<void>}
 */
async function copyText(text) {
  await wx.setClipboardData({ data: String(text || "") });
}

module.exports = { toastOk, toastFail, copyText };
