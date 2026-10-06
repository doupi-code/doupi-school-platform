/**
 * @fileoverview 运行时错误文案与 errCode → 中文映射（本地静态）
 * - 用于接口失败 toast、通用错误提示
 * - 表单校验请用 validationDict；按钮/标题等展示请用 displayDict
 */

/** 场景错误文案（非 errCode 映射） */
const ERROR_TEXT = Object.freeze({
  ACTION_FAILED: "操作失败",
  APPOINTMENT_NO_UNAVAILABLE: "预约号不可用，无法生成核销码",
  BIND_FAILED: "绑定失败",
  CANCEL_FAILED_RETRY: "取消失败，请重试",
  COPY_FAILED: "复制失败",
  CREATE_FAILED: "创建失败",
  DATA_LOAD_ERROR_CANNOT_OPERATE: "数据加载异常，无法操作",
  DELETE_FAILED: "删除失败",
  DOWNLOAD_FAILED: "下载失败",
  EXPORT_FAILED: "导出失败",
  GENERATE_FAILED_RETRY: "生成失败，请重试",
  GET_PHONE_FAILED: "获取手机号失败",
  IMAGE_DOWNLOAD_FAILED: "下载图片失败",
  LOAD_FAILED_RETRY: "加载失败，请重试",
  LOGIN_FAILED_RETRY: "登录失败，请重试",
  NETWORK_ERROR_RETRY: "网络异常，请重试",
  OPEN_FILE_FAILED: "无法打开文件",
  RESET_FAILED: "重置失败",
  ROLE_UPDATE_FAILED: "修改失败",
  SAVE_FAILED: "保存失败",
  SCAN_FAILED_RETRY: "扫码失败，请重试",
  UNRECOGNIZED_QRCODE: "无法识别的二维码",
  UPLOAD_FAILED: "上传失败",
  USER_DELETE_FAILED: "删除失败",
  VERIFY_FAILED: "核销失败",
  BIND_QR_UNRECOGNIZED: "未识别到绑定二维码，请重试",
  BINDING_NOT_FOUND: "绑定记录不存在",
  EMPTY_BOOKING_DETAIL_NOT_FOUND: "未找到预约详情",
});

/** errCode → 用户可读中文（服务端未返回 errMsg 时使用） */
const ERR_BY_CODE = Object.freeze({
  NETWORK: "网络异常，请检查网络连接",
  EMPTY_RESULT: "服务器返回空结果",
  TIMEOUT: "请求超时，请稍后重试",

  PARAM_ERROR: "参数错误，请检查输入信息",
  INVALID_PARAM: "参数错误，请检查输入信息",
  PARAM_REQUIRED: "请填写必填信息",
  INVALID_PHONE: "手机号格式不正确",
  INVALID_ID_CARD: "身份证号格式不正确",

  UNAUTHORIZED: "未登录或登录已过期",
  TOKEN_EXPIRED: "登录已过期，请重新登录",
  FORBIDDEN: "无权限执行此操作",
  ACCOUNT_FROZEN: "账号已被禁用，请联系管理员",
  AUTH_PHONE_REQUIRED: "请先授权手机号后再继续",
  AUTH_PHONE_WECHAT_CONFLICT: "请使用绑定该手机号的微信登录",
  CODE_INVALID_OR_EXPIRED: "验证码错误或已过期",
  CODE_SEND_FAILED: "验证码发送失败，请稍后重试",
  SMS_SEND_FAILED: "短信发送失败，请稍后重试",

  NOT_FOUND: "请求的资源不存在",
  USER_NOT_FOUND: "用户不存在",
  APPOINTMENT_NOT_FOUND: "预约记录不存在",

  DUPLICATE_APPOINTMENT: "当天已有预约记录",
  PHONE_EXISTS: "该手机号已被注册",
  APPOINTMENT_VERIFIED: "该预约已核销",

  SERVER_ERROR: "服务器内部错误，请联系管理员",
  DATABASE_ERROR: "数据库操作失败",
  DB_ERROR: "数据库操作失败",
  INTERNAL_ERROR: "服务器内部错误，请联系管理员",
  CLOUD_FUNCTION_ERROR: "云函数执行异常",
  UNKNOWN: "服务异常，请稍后重试",

  QUOTA_EXCEEDED: "当日预约已满",
  QUOTA_FULL: "当日预约已满",
  INVALID_STATE: "当前状态不允许此操作",
  STATUS_INVALID: "当前状态不允许此操作",
  DUPLICATE_SUBMIT: "请勿重复提交，请稍后重试",

  TEACHER_NOT_BOUND: "请先绑定招生主任",
  INVALID_QR: "二维码无效或已过期",
  INVITE_REVOKED: "邀请码已失效",
  VERIFY_NOT_OWNER: "无权核销此预约",
  CANCEL_TOO_LATE: "已超过取消时限，无法取消",

  RATE_LIMITED: "操作过于频繁，请稍后再试",
  RATE_LIMIT: "操作过于频繁，请稍后再试",
});

/** 系统类 errCode：不向用户展示服务端原始 errMsg */
const SYSTEM_ERROR_CODES = new Set([
  "UNKNOWN",
  "INTERNAL_ERROR",
  "DB_ERROR",
  "CLOUD_FUNCTION_ERROR",
  "SERVER_ERROR",
  "DATABASE_ERROR",
  "NETWORK",
  "TIMEOUT",
  "EMPTY_RESULT",
]);

function isSystemCode(code) {
  return SYSTEM_ERROR_CODES.has(String(code || ""));
}

function text(key) {
  if (ERROR_TEXT[key]) return ERROR_TEXT[key];
  return ERROR_TEXT.ACTION_FAILED || "操作失败";
}

function byCode(code, fallback) {
  var k = String(code || "");
  if (ERR_BY_CODE[k]) return ERR_BY_CODE[k];
  if (fallback && String(fallback).trim()) return String(fallback).trim();
  return ERROR_TEXT.ACTION_FAILED || "操作失败，请稍后重试";
}

module.exports = {
  ERROR_TEXT,
  ERR_BY_CODE,
  SYSTEM_ERROR_CODES,
  isSystemCode,
  text,
  byCode,
};
