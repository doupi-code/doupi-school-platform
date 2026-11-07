const API_BASE_URL = 'https://doupi.cloud/api/v1';
const SESSION_KEYS = ['token', 'userInfo', 'sessionKey', 'adminInfo', 'profileJustUpdated', 'pendingLoginDraft'];
const inFlight = new Map();

function normalizeToken(value) {
    if (typeof value !== 'string') return '';
    const token = value.trim().replace(/^Bearer /i, '');
    return /^[\w-]+\.[\w-]+\.[\w-]+$/.test(token) ? token : '';
}

function getToken() {
    return normalizeToken(wx.getStorageSync('token'));
}

function clearSession(expectedToken) {
    if (expectedToken !== undefined && getToken() !== expectedToken) return;
    SESSION_KEYS.forEach(key => wx.removeStorageSync(key));
    const app = typeof getApp === 'function' && getApp();
    if (app && app.globalData) {
        Object.assign(app.globalData, { userInfo: null, isLoggedIn: false, role: 4, session: null });
    }
}

function failure(message, status, errCode, traceId) {
    return Object.assign(new Error(message), { status, errCode, errMsg: message, traceId });
}

async function request(path, options = {}) {
    if (!/^\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(path)) {
        throw failure('接口路径无效', 0, 'INVALID_PATH');
    }
    const token = options.auth === false ? '' : getToken();
    if (options.auth !== false && !token) {
        throw failure('请先登录', 401, 'UNAUTHORIZED');
    }
    const header = { 'Content-Type': 'application/json' };
    if (token) header.Authorization = 'Bearer ' + token;
    if (options.key) header['Idempotency-Key'] = options.key;

    return new Promise((resolve, reject) => wx.request({
        url: API_BASE_URL + path,
        method: options.method || 'GET',
        data: options.body,
        timeout: options.timeout || 12000,
        header,
        success(response) {
            const payload = response.data || {};
            const status = payload.code === 401 || payload.code === 403 ? payload.code : response.statusCode;
            if (token && getToken() !== token) {
                reject(failure('会话已变更，请重新请求', status, 'SESSION_CHANGED', payload.traceId));
                return;
            }
            if (status === 401 && token) clearSession(token);
            if (status >= 200 && status < 300 && payload.code === 0) {
                resolve(payload.data);
                return;
            }
            const code = status === 401 ? 'UNAUTHORIZED' : status === 403 ? 'FORBIDDEN' : payload.code || status;
            reject(failure(payload.msg || '请求失败', status, code, payload.traceId));
        },
        fail(error) {
            const timedOut = /timeout/i.test(error.errMsg || '');
            reject(failure(timedOut ? '请求超时，结果尚未确认' : '网络请求失败', 0, timedOut ? 'TIMEOUT' : 'NETWORK'));
        }
    }));
}

function command(path, body, storageKey) {
    if (!getToken() || !storageKey || SESSION_KEYS.includes(storageKey) || storageKey === 'api_base_url') {
        return Promise.reject(failure('命令缺少有效会话或存储键', 0, 'INVALID_COMMAND'));
    }
    const user = wx.getStorageSync('userInfo') || {};
    const identityId = String(user.identityId || '0');
    const owner = identityId !== '0' ? 'identity:' + identityId : user.userId ? 'staff:' + user.userId : '';
    if (!owner) return Promise.reject(failure('请先刷新会话', 401, 'UNAUTHORIZED'));
    if (inFlight.has(storageKey)) {
        const active = inFlight.get(storageKey);
        return active.path === path && active.owner === owner
            ? active.promise : Promise.reject(failure('命令正在由其他会话处理', 0, 'PENDING_COMMAND'));
    }
    const token = getToken();
    const promise = (async () => {
        let pending = wx.getStorageSync(storageKey);
        if (!pending) {
            const originalBody = JSON.parse(JSON.stringify(body));
            const random = await new Promise((resolve, reject) => {
                if (typeof wx.getRandomValues !== 'function') return reject(new Error('微信版本不支持安全随机数'));
                wx.getRandomValues({ length: 32, success: resolve, fail: reject });
            });
            if (getToken() !== token) throw failure('会话已变更，请重新提交', 0, 'SESSION_CHANGED');
            const key = wx.arrayBufferToBase64(random.randomValues).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            pending = { path, owner, body: originalBody, key };
            wx.setStorageSync(storageKey, pending);
        }
        if (pending.path !== path || pending.owner !== owner || !/^[\w-]{8,64}$/.test(pending.key)) {
            throw failure('待确认命令与当前操作或账号不匹配', 0, 'PENDING_COMMAND');
        }
        try {
            const result = await request(path, { method: 'POST', body: pending.body, key: pending.key });
            wx.removeStorageSync(storageKey);
            return result;
        } catch (error) {
            if (error.errCode !== 'SESSION_CHANGED' && [404, 409, 422].includes(error.status)) {
                wx.removeStorageSync(storageKey);
            }
            throw error;
        }
    })().finally(() => inFlight.delete(storageKey));
    inFlight.set(storageKey, { owner, path, promise });
    return promise;
}

module.exports = { request, command, getToken, normalizeToken, clearSession };
