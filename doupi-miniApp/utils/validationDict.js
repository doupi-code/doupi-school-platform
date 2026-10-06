/**
 * @fileoverview 表单与输入校验提示文案（本地静态）
 * - 用于客户端校验、必填项、格式、日期范围等
 * - 接口错误请用 errorDict；界面标题按钮请用 displayDict
 */

const VALIDATION_TEXT = Object.freeze({
  APPOINTMENT_ID_MISSING: "预约ID不存在",
  ENTER_APP_NAME: "请输入应用名称",
  ENTER_CAMPUS_NAME: "请输入校园名称",
  ENTER_COMPLETE_TIME: "请填写完整时间",
  ENTER_CONTACT_PHONE: "请输入联系电话",
  ENTER_DETAIL_ADDRESS: "请输入详细地址",
  ENTER_NAME: "请输入姓名",
  ENTER_PHONE_FIRST: "请输入手机号",
  ENTER_ROLE_CODE: "请输入角色编码",
  ENTER_ROLE_NAME: "请输入角色名称",
  ENTER_SCHOOL_INTRO: "请输入学校简介",
  ENTER_VALID_DAILY_LIMIT: "请输入有效的每日上限",
  INVALID_PHONE_FORMAT: "手机号格式不正确",
  KEEP_AT_LEAST_ONE_VALID_SLOT: "至少保留一个有效时间段",
  NO_VALID_PHONE_TO_SAVE: "没有可保存的有效手机号",
  QRCODE_EMPTY: "二维码内容为空",
  SELECT_END_TIME: "请选择结束时间",
  SELECT_ROLE_FIRST: "请先选择角色",
  SELECT_SCHOOL_NATURE: "请选择办学性质",
  SELECT_SCHOOL_SECTION: "请选择学段",
  SELECT_START_TIME: "请选择开始时间",
  DATE_RANGE_EXCEED_YEAR: "日期范围不能超过一年",
  DATE_RANGE_REQUIRED: "请选择日期范围",
  DATE_RANGE_START_AFTER_END: "开始日期不能晚于结束日期",
});

function text(key) {
  if (VALIDATION_TEXT[key]) return VALIDATION_TEXT[key];
  return "请检查输入信息";
}

module.exports = {
  VALIDATION_TEXT,
  text,
};
