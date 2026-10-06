const feedback = require('../../../utils/feedback');
const { request } = require('../../../utils/request');
const auth = require('../../../utils/auth');
const { ensureMenuAccessWithModal } = require('../../../utils/adminMenuConfig');

function formatDateTimeValue(value) {
  if (!value) return '-';
  const date = parseDateTimeValue(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function parseDateTimeValue(value) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (value === null || value === undefined) return new Date(NaN);

  const raw = String(value).trim();
  if (!raw) return new Date(NaN);

  let normalized = raw;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalized)) {
    normalized = normalized.replace(' ', 'T') + ':00';
  } else if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(normalized)) {
    normalized = normalized.replace(' ', 'T');
  }

  let date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) return date;

  const fallback = normalized.replace(/-/g, '/').replace('T', ' ');
  date = new Date(fallback);
  return Number.isNaN(date.getTime()) ? new Date(NaN) : date;
}

/** 与云函数 getOperationTypeText 对齐，未部署云时详情页仍能显示中文 */
const OP_TYPE_LABEL_FALLBACK = {
  BIND_APPROVE: '通过绑定申请',
  BIND_REJECT: '驳回绑定申请',
  BIND_REJECT_BATCH: '批量驳回绑定申请',
  BIND_TEACHER: '绑定老师',
  UNBIND_TEACHER: '解绑老师',
  CREATE: '创建预约',
  VERIFY: '核销预约',
  CANCEL: '取消预约',
  AUDIT_PASS: '审核通过',
  AUDIT_REJECT: '审核驳回',
  CONFIG: '配置变更',
  LOGIN: '登录'
};

const TARGET_TYPE_LABEL_FALLBACK = {
  appointment: '预约',
  bind_request: '绑定申请'
};

function isBindingLog(detail) {
  const lt = String(detail.logType || '').toLowerCase();
  const op = String(detail.operationType || '').toUpperCase();
  const tt = String(detail.targetType || '').toLowerCase();
  return lt === 'binding' || op.indexOf('BIND_') === 0 || tt === 'bind_request';
}

function operationTypeLabel(detail) {
  const key = String(detail.operationType || '').toUpperCase();
  return detail.operationTypeText || OP_TYPE_LABEL_FALLBACK[key] || detail.operationType || '-';
}

function targetTypeLabel(detail) {
  const key = String(detail.targetType || '').toLowerCase();
  return detail.targetTypeText || TARGET_TYPE_LABEL_FALLBACK[key] || detail.targetType || '-';
}

Page({
  data: {
    loading: true,
    mode: 'operation',
    logId: '',
    title: '日志详情',
    detail: null,
    detailRows: [],
    rawJsonText: ''
  },

  async onLoad(options) {
    if (!auth.requireRoles([1, 2, 3, 5])) return;
    const mode = options && options.mode === 'system' ? 'system' : 'operation';
    const menuId = mode === 'system' ? 'system-logs' : 'logs';
    const granted = await ensureMenuAccessWithModal(auth.getUserRole(), 'systemConfig', menuId);
    if (!granted) return;

    const logId = String((options && options.id) || '').trim();
    if (!logId) {
      feedback.showToast({ title: '缺少日志ID', icon: 'none' });
      return;
    }

    this.setData({
      mode,
      logId,
      title: mode === 'system' ? '系统日志详情' : '操作日志详情'
    });
    wx.setNavigationBarTitle({ title: mode === 'system' ? '系统日志详情' : '操作日志详情' });
    await this.loadDetail();
  },

  async loadDetail() {
    this.setData({ loading: true });
    try {
      const res = this.data.mode === 'system'
        ? await request('admin.logDetail', { logId: this.data.logId })
        : await request('log.detail', { logId: this.data.logId });
      const detail = res && res.detail ? res.detail : null;
      if (!detail) {
        feedback.showToast({ title: '日志不存在', icon: 'none' });
        this.setData({ loading: false });
        return;
      }
      this.setData({
        detail,
        detailRows:
          this.data.mode === 'system' ? this.buildSystemDetailRows(detail) : this.buildDetailRows(detail),
        rawJsonText: JSON.stringify(detail, null, 2),
        loading: false
      });
    } catch (err) {
      console.error('加载日志详情失败:', err);
      this.setData({ loading: false });
      // request 已 toast
    }
  },

  buildDetailRows(detail) {
    const binding = isBindingLog(detail);
    const remarkRaw = String(detail.remark != null ? detail.remark : '').trim();
    const relatedTeacher =
      detail.relatedTeacherName || detail.related_teacher_name || '';

    const rows = [
      { label: '日志ID', value: detail._id || '-' },
      {
        label: '业务分类',
        value:
          detail.logCategoryText ||
          (binding ? '绑定审核' : String(detail.appointmentId || detail.appointmentNo || '').trim() ? '预约' : '其他')
      },
      { label: '操作类型', value: operationTypeLabel(detail) },
      { label: '操作时间', value: formatDateTimeValue(detail.operationTime || detail.createdAt) },
      { label: '操作人ID', value: detail.operatorId || '-' },
      { label: '操作人名称', value: detail.operatorName || '-' },
      { label: '操作人角色', value: detail.operatorRoleText || String(detail.operatorRole || '-') }
    ];

    if (binding) {
      rows.push(
        { label: '绑定申请记录ID', value: detail.targetId || '-' },
        { label: '目标类型', value: targetTypeLabel(detail) },
        {
          label: '申请绑定老师',
          value: relatedTeacher && String(relatedTeacher).trim() ? relatedTeacher : '（见操作内容）'
        }
      );
    } else {
      rows.push(
        { label: '预约号', value: detail.appointmentNo || '-' },
        { label: '预约ID', value: detail.appointmentId || '-' },
        { label: '目标类型', value: targetTypeLabel(detail) },
        { label: '目标ID', value: detail.targetId || detail.appointmentId || '-' },
        { label: '关联老师', value: relatedTeacher || '-' }
      );
    }

    rows.push(
      { label: '操作IP', value: detail.ip && String(detail.ip).trim() ? detail.ip : '未记录' },
      { label: '操作内容', value: detail.operationContent || detail.content || '-' },
      { label: '备注', value: remarkRaw || '（无）' }
    );
    return rows;
  },

  /** admin_logs：与操作日志字段不同，单独展示 */
  buildSystemDetailRows(detail) {
    const operatorId = String(detail.operatorId || '').trim();
    const payloadDirectorId =
      detail.payload && typeof detail.payload === 'object'
        ? String(detail.payload.directorId || '').trim()
        : '';
    const rows = [
      { label: '日志ID', value: detail._id || '-' },
      { label: '操作', value: detail.actionLabel || detail.action || '-' },
      { label: '动作代码', value: detail.action || '-' },
      { label: '操作时间', value: formatDateTimeValue(detail.createdAt) },
      { label: '操作人ID', value: operatorId || '-' },
      { label: '操作人', value: detail.operatorName || '-' },
      {
        label: '操作人角色',
        value: detail.operatorRoleName || (detail.operatorRole != null ? String(detail.operatorRole) : '-')
      }
    ];
    if (String(detail.targetUserId || '').trim()) {
      rows.push(
        { label: '目标用户ID', value: String(detail.targetUserId).trim() },
        { label: '目标用户', value: detail.targetUserName || '-' },
        {
          label: '目标用户角色',
          value: detail.targetUserRoleName || (detail.targetUserRole != null ? String(detail.targetUserRole) : '-')
        }
      );
    }
    if (payloadDirectorId && payloadDirectorId !== operatorId) {
      rows.push({
        label: '关联主任',
        value: detail.directorUserName ? `${detail.directorUserName}（${payloadDirectorId}）` : payloadDirectorId
      });
    }
    if (detail.targetKind) {
      rows.push({ label: '对象类型', value: detail.targetKind });
    }
    rows.push({ label: '关联对象ID', value: detail.targetId || '-' });
    rows.push({ label: '执行结果', value: detail.resultText || detail.result || '-' });
    const payloadText = String(detail.payloadSummary || '').trim();
    rows.push({ label: '请求载荷', value: payloadText || '-' });
    return rows;
  }
});
