/**
 * @fileoverview 云函数统一调用封装与「全链路请求日志」。
 *
 * 日志字段（控制台输出，便于真机 vConsole / 开发者工具过滤）：
 * - 精确时间戳（ISO8601，含毫秒）
 * - requestId：唯一请求标识（小程序生成，云函数回显）
 * - action：云函数路由名
 * - 入参类型映射、云函数返回体、错误对象（含 errCode/errMsg）
 */

/**
 * 生成唯一请求 ID。
 * @returns {string}
 */
function createRequestId() {
  return `req_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

/**
 * 递归标注值的类型，便于排查「字段类型不符合预期」类问题。
 * @param {any} value 任意值
 * @returns {any} 原始值或带类型描述的结构
 */
function annotateTypes(value) {
  const t = value === null ? "null" : typeof value;
  if (t !== "object") {
    return { __t: t, v: value };
  }
  if (Array.isArray(value)) {
    return { __t: "array", len: value.length, sample: value.slice(0, 3).map(annotateTypes) };
  }
  const out = { __t: "object", keys: Object.keys(value || {}) };
  return out;
}

/**
 * 输出毫秒级时间戳字符串。
 * @returns {string}
 */
function nowIso() {
  const d = new Date();
  return d.toISOString();
}

/**
 * 调用统一云函数 `api`。
 *
 * @param {string} action 必填，例如 `user.getProfile`
 * @param {object} [payload] 选填，业务入参（需可 JSON 序列化）
 * @param {object} [options] 选填扩展项
 * @param {string} [options.name] 云函数名称，默认 `api`
 * @returns {Promise<{ ok: boolean, data?: any, errCode: string|number, errMsg: string, requestId?: string }>}
 */
async function callApi(action, payload, options) {
  const requestId = createRequestId();
  const fnName = (options && options.name) || "api";
  const started = Date.now();
  const safePayload = payload === undefined ? {} : payload;
  console.log(
    `[CLOUD][${nowIso()}][${requestId}] INVOKE -> ${fnName}.${action}`,
    annotateTypes(safePayload)
  );
  
  // 添加超时处理
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error('云函数调用超时'));
    }, 30000); // 30秒超时
  });
  
  try {
    const callRes = await Promise.race([
      new Promise((resolve, reject) => {
        const baseUrl = wx.getStorageSync('api_base_url') || 'http://localhost:8080';
        const rawToken = wx.getStorageSync('token') || '';
        const authHeader = rawToken ? (rawToken.startsWith('Bearer ') ? rawToken : `Bearer ${rawToken}`) : '';

        wx.request({
          url: `${baseUrl}/api/wx/dispatcher`,
          method: 'POST',
          header: {
            'content-type': 'application/json',
            'Authorization': authHeader
          },
          data: {
            action,
            payload: safePayload,
            requestId
          },
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              const respData = res.data;
              if (respData && (respData.code === 401 || respData.errCode === 401)) {
                wx.removeStorageSync('token');
                wx.removeStorageSync('userInfo');
                console.warn('[CLOUD] 登录态失效 (401)，已清理本地凭证');
              }
              resolve({ result: respData });
            } else {
              reject(new Error(`后端服务响应异常(${res.statusCode})`));
            }
          },
          fail: (err) => {
            reject(new Error(err.errMsg || '后端网络连接失败，请检查doupi-server是否运行'));
          }
        });
      }),
      timeoutPromise
    ]);
    const ms = Date.now() - started;
    const result = callRes && callRes.result;
    console.log(`[CLOUD][${nowIso()}][${requestId}] RESULT <- ${action}`, {
      ms,
      ok: result && result.ok,
      errCode: result && result.errCode,
      errMsg: result && result.errMsg,
      data: annotateTypes(result && result.data),
    });
    if (!result) {
      return {
        ok: false,
        errCode: "EMPTY_RESULT",
        errMsg: "云函数返回空结果",
        data: null,
        requestId,
      };
    }
    if (!result.requestId) {
      result.requestId = requestId;
    }
    return result;
  } catch (err) {
    const ms = Date.now() - started;
    const rawMessage = String(err && err.message ? err.message : err || '');
    const normalizedCode = /超时|timeout/i.test(rawMessage)
      ? "TIMEOUT"
      : (/login|auth|permission|denied|unauthorized|forbidden/i.test(rawMessage) ? "CLOUD_AUTH" : "CLOUD_CALL_FAILED");
    const normalizedMsg = normalizedCode === "TIMEOUT"
      ? "云函数调用超时"
      : (normalizedCode === "CLOUD_AUTH" ? "云函数鉴权失败" : "云函数调用失败");
    console.error(`[CLOUD][${nowIso()}][${requestId}] ERROR !! ${action}`, {
      ms,
      message: rawMessage,
      err,
    });
    return {
      ok: false,
      errCode: normalizedCode,
      errMsg: normalizedMsg,
      data: { raw: String(err), rawMessage },
      requestId,
    };
  }
}

module.exports = {
  callApi,
  createRequestId,
  annotateTypes,
};
