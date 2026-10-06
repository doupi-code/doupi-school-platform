/**
 * @fileoverview 高层次API请求封装
 * - 基于 cloudClient.callApi 的业务层封装
 * - 统一错误处理和用户提示
 * - 自动登录态检查
 * - 请求重试机制
 * - loading状态管理
 */

const cloudClient = require("./cloudClient");
const auth = require("./auth");
const errorDict = require("./errorDict");
const feedback = require("./feedback");
let FORCE_LOGOUT_IN_PROGRESS = false;
const READ_CACHE = Object.create(null);
const INFLIGHT_REQUESTS = Object.create(null);

const ACTION_NAMESPACES = {
    "about.summary": ["about", "campus", "config"],
    "campus.summary": ["campus"],
    "campus.detail": ["campus"],
    "campus.adminDetail": ["campus"],
    "config.summary": ["config"],
    "config.detail": ["config"],
    "config.getMyMenuPermissions": ["config"],
    "appointment.meta": ["appointment", "config"],
    "appointment.list": ["appointment"],
    "appointment.adminList": ["appointment"],
    "appointment.detail": ["appointment"],
    "appointment.adminDetail": ["appointment"],
    "message.count": ["message"],
    "message.list": ["message"],
    "dashboard.snapshotBindings": ["dashboard", "binding"],
    "dashboard.snapshotRecruitment": ["dashboard", "appointment", "stats"],
    "dashboard.snapshotLogs": ["dashboard", "log"],
    "stats.dashboard": ["stats"],
    "binding.summary": ["binding"],
    "log.summary": ["log"]
};

const ACTION_CACHE_RULES = {
    "config.summary": 5 * 60 * 1000,
    "config.detail": 60 * 1000,
    "config.getMyMenuPermissions": 60 * 1000,
    "config.getTimeSlots": 5 * 60 * 1000,
    "config.getPermissions": 60 * 1000,
    "campus.summary": 5 * 60 * 1000,
    "campus.detail": 60 * 1000,
    "campus.adminDetail": 60 * 1000,
    "about.summary": 5 * 60 * 1000,
    "dashboard.snapshotBindings": 60 * 1000,
    "dashboard.snapshotRecruitment": 60 * 1000,
    "dashboard.snapshotLogs": 60 * 1000,
    "stats.dashboard": 5 * 60 * 1000,
    "appointment.meta": 5 * 60 * 1000,
    "message.count": 15 * 1000,
};

const WRITE_INVALIDATION_MAP = {
    "config.update": ["config", "about", "appointment", "dashboard", "stats"],
    "config.savePermissions": ["config"],
    "campus.update": ["campus", "about", "dashboard"],
    "user.updateProfile": ["profile", "appointment", "binding", "dashboard", "log", "stats"],
    "message.send": ["message", "profile", "dashboard"],
    "message.read": ["message", "profile"],
    "message.markAllRead": ["message", "profile"],
    "appointment.create": ["appointment", "profile", "dashboard", "stats"],
    "appointment.cancel": ["appointment", "profile", "dashboard", "stats"],
    "appointment.adminCancel": ["appointment", "profile", "dashboard", "stats"],
    "teacher.verifyAppointment": ["appointment", "profile", "dashboard", "stats", "message"],
    "binding.submitBindRequest": ["binding", "dashboard"],
    "binding.approveRequests": ["binding", "dashboard", "stats"],
    "binding.rejectRequest": ["binding", "dashboard"],
    "binding.rejectRequests": ["binding", "dashboard"],
    "binding.unbind": ["binding", "dashboard", "stats"]
};

/** 强制登出提示展示时长（需早于 reLaunch，避免页面销毁导致 Toast 瞬间消失） */
var FORCE_LOGOUT_TOAST_MS = 2000;
/** Toast 淡出后再跳转，略大于 duration */
var FORCE_LOGOUT_RELAUNCH_DELAY_MS = FORCE_LOGOUT_TOAST_MS + 200;

function forceLogoutToLogin(message) {
    if (FORCE_LOGOUT_IN_PROGRESS) return;
    FORCE_LOGOUT_IN_PROGRESS = true;
    try {
        auth.clearAuth();
        feedback.showToast({
            title: message || "登录已失效，请重新登录",
            icon: "none",
            duration: FORCE_LOGOUT_TOAST_MS
        });
        setTimeout(function() {
            FORCE_LOGOUT_IN_PROGRESS = false;
            wx.reLaunch({ url: "/pages/login/login" });
        }, FORCE_LOGOUT_RELAUNCH_DELAY_MS);
    } catch (e) {
        FORCE_LOGOUT_IN_PROGRESS = false;
    }
}

/**
 * 获取错误的人类可读提示（服务端 errMsg 优先；系统类 errCode 强制走字典兜底）
 * @param {string|number} errCode 错误码
 * @param {string} [serverMsg] 服务端返回的 errMsg
 * @returns {string}
 */
function getErrorMessage(errCode, serverMsg) {
    if (errorDict.isSystemCode(errCode)) {
        return errorDict.byCode(errCode, "服务异常，请稍后重试");
    }
    var sm = serverMsg && typeof serverMsg === "string" && serverMsg.trim() ? serverMsg.trim() : "";
    if (sm) return sm;
    return errorDict.byCode(errCode, "操作失败，请稍后重试");
}

function sortObjectKeys(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return input;
    }
    var next = {};
    Object.keys(input).sort().forEach(function(key) {
        next[key] = sortObjectKeys(input[key]);
    });
    return next;
}

function createCacheKey(action, payload) {
    return action + "::" + JSON.stringify(sortObjectKeys(payload || {}));
}

function getCacheTtl(action, options) {
    if (options && options.cache === false) return 0;
    if (options && options.forceRefresh) return 0;
    if (options && typeof options.cacheTtl === "number") {
        return Math.max(0, options.cacheTtl);
    }
    return ACTION_CACHE_RULES[action] || 0;
}

function getCachedValue(cacheKey) {
    var record = READ_CACHE[cacheKey];
    if (!record) return null;
    if (record.expireAt <= Date.now()) {
        delete READ_CACHE[cacheKey];
        return null;
    }
    return record.value;
}

function setCachedValue(cacheKey, value, ttl) {
    if (!ttl || ttl <= 0) return;
    READ_CACHE[cacheKey] = {
        value: value,
        expireAt: Date.now() + ttl,
        namespaces: []
    };
}

function getActionNamespaces(action) {
    return ACTION_NAMESPACES[action] || [];
}

function setCacheNamespaces(cacheKey, action) {
    if (!cacheKey || !READ_CACHE[cacheKey]) return;
    READ_CACHE[cacheKey].namespaces = getActionNamespaces(action);
}

function invalidateCacheByNamespaces(namespaces) {
    var target = Array.isArray(namespaces) ? namespaces.filter(Boolean) : [];
    if (target.length === 0) return;
    Object.keys(READ_CACHE).forEach(function(key) {
        var record = READ_CACHE[key];
        var recordNamespaces = record && Array.isArray(record.namespaces) ? record.namespaces : [];
        var shouldDelete = recordNamespaces.some(function(namespace) {
            return target.indexOf(namespace) !== -1;
        });
        if (shouldDelete) {
            delete READ_CACHE[key];
        }
    });
}

/**
 * 核心请求方法
 *
 * 功能：
 * - 自动携带 `_userId / _openid`
 * - 统一错误码转人类可读提示
 * - 支持选项：showLoading(是否显示loading), showError(是否自动toast错误), retry(重试次数)
 * - 返回 Promise<data>，失败时抛出包含errCode/errMsg的错误
 *
 * @param {string} action 云函数action名称
 * @param {object} [payload] 请求参数
 * @param {object} [options] 配置选项
 * @param {boolean} [options.showLoading=true] 是否显示loading
 * @param {boolean} [options.showError=true] 失败时是否自动 toast；为 false 时调用方须在 catch/UI 自备提示（勿误写「request 已 toast」）
 * @param {number} [options.retry=0] 失败时自动重试次数
 * @param {string} [options.loadingText='加载中...'] loading提示文字
 * @returns {Promise<any>} 返回业务数据
 */
async function request(action, payload, options) {
    var opts = Object.assign({
        showLoading: true,
        showError: true,
        retry: 0,
        loadingText: "加载中...",
    }, options);

    var userInfo = auth.getUserInfo();
    var finalPayload = Object.assign({}, payload || {});
    var supportTargetId = opts.supportViewTargetUserId
        ? String(opts.supportViewTargetUserId).trim()
        : "";

    if (supportTargetId) {
        finalPayload._userId = supportTargetId;
    } else if (userInfo && userInfo.userId) {
        finalPayload._userId = userInfo.userId;
    }

    if (auth.isImpersonating()) {
        var adminInfo = auth.getAdminInfo();
        if (adminInfo && adminInfo.operatorUserId) {
            finalPayload._operatorUserId = adminInfo.operatorUserId;
            if (adminInfo.operatorName) {
                finalPayload._operatorName = adminInfo.operatorName;
            }
        }
    } else if (userInfo && userInfo.openid) {
        finalPayload._openid = userInfo.openid;
    }
    var cacheTtl = getCacheTtl(action, opts);
    var cacheKey = cacheTtl > 0 ? createCacheKey(action, finalPayload) : "";
    if (cacheKey) {
        var cachedValue = getCachedValue(cacheKey);
        if (cachedValue !== null) {
            return cachedValue;
        }
        if (INFLIGHT_REQUESTS[cacheKey]) {
            return INFLIGHT_REQUESTS[cacheKey];
        }
    }

    var promise = (async function() {
        var lastError = null;
        var attempt = 0;
        var maxAttempts = 1 + (opts.retry || 0);
        var loadingShown = false;

        while (attempt < maxAttempts) {
            attempt++;
            lastError = null;

            if (opts.showLoading && attempt === 1) {
                wx.showLoading({ title: opts.loadingText, mask: true });
                loadingShown = true;
            }

            try {
                var result = await cloudClient.callApi(action, finalPayload);
                if (loadingShown) {
                    wx.hideLoading();
                    loadingShown = false;
                }

                if (result.ok) {
                    invalidateCacheByNamespaces(WRITE_INVALIDATION_MAP[action]);
                    setCachedValue(cacheKey, result.data, cacheTtl);
                    setCacheNamespaces(cacheKey, action);
                    return result.data;
                }

                lastError = new Error(getErrorMessage(result.errCode, result.errMsg));
                lastError.errCode = result.errCode;
                lastError.errMsg = getErrorMessage(result.errCode, result.errMsg);
                lastError.rawResult = result;

                if (lastError.errCode === "ACCOUNT_FROZEN" || lastError.errCode === "UNAUTHORIZED") {
                    forceLogoutToLogin(lastError.errMsg);
                }

                throw lastError;

            } catch (err) {
                if (loadingShown) {
                    wx.hideLoading();
                    loadingShown = false;
                }

                if (err.errCode && attempt < maxAttempts) {
                    console.log("[REQUEST] " + action + " 第" + attempt + "次失败，准备重试...");
                    continue;
                }

                if (!err.errCode) {
                    err.errCode = err.message === "云函数调用超时" ? "TIMEOUT" : "NETWORK";
                    err.errMsg = getErrorMessage(err.errCode, "");
                }

                if (opts.showError) {
                    var skipToast = err.errCode === "ACCOUNT_FROZEN" || err.errCode === "UNAUTHORIZED";
                    if (!skipToast) {
                        feedback.showError(err.errMsg || "操作失败", 2000);
                    }
                }

                throw err;
            }
        }
    })();

    if (cacheKey) {
        INFLIGHT_REQUESTS[cacheKey] = promise.finally(function() {
            delete INFLIGHT_REQUESTS[cacheKey];
        });
        return INFLIGHT_REQUESTS[cacheKey];
    }

    return promise;
}

/**
 * 带登录检查的请求
 *
 * 调用前自动检查登录态，未登录时跳转登录页，
 * 登录成功后自动重发请求。
 *
 * @param {string} action 云函数action名称
 * @param {object} [payload] 请求参数
 * @param {object} [options] 同request的选项
 * @returns {Promise<any>} 返回业务数据
 */
async function requestWithCheck(action, payload, options) {
    if (!auth.isLoggedIn()) {
        wx.hideLoading();
        auth.requireLogin();
        throw new Error("UNAUTHORIZED");
    }
    return request(action, payload, options);
}

/**
 * GET语义化别名（用于查询类操作）
 *
 * @param {string} action 云函数action名称
 * @param {object} [payload] 请求参数
 * @param {object} [options] 配置选项
 * @returns {Promise<any>}
 */
async function get(action, payload, options) {
    return request(action, payload, Object.assign({ showLoading: false }, options));
}

/**
 * POST语义化别名（用于写入类操作）
 *
 * 内部可加确认提示（当options.confirmMessage存在时）。
 *
 * @param {string} action 云函数action名称
 * @param {object} [payload] 请求参数
 * @param {object} [options] 配置选项
 * @param {string} [options.confirmMessage] 操作前的确认提示文案
 * @returns {Promise<any>}
 */
async function post(action, payload, options) {
    var opts = options || {};

    // 支持操作前确认
    if (opts.confirmMessage) {
        return new Promise(function(resolve, reject) {
            wx.showModal({
                title: "确认操作",
                content: opts.confirmMessage,
                success: function(res) {
                    if (res.confirm) {
                        request(action, payload, opts).then(resolve).catch(reject);
                    } else {
                        reject(new Error("USER_CANCEL"));
                    }
                },
                fail: function() {
                    reject(new Error("MODAL_FAILED"));
                },
            });
        });
    }

    return request(action, payload, opts);
}

/**
 * 并发请求
 *
 * 同时发起多个请求，统一管理loading状态。
 * 任一失败时可选择是否继续。
 *
 * @param {Array<{action: string, payload?: object, options?: object}>} requests 请求配置数组
 * @param {object} [options] 全局配置
 * @param {boolean} [options.failFast=true] 任一失败时是否立即终止其他请求
 * @param {boolean} [options.showLoading=true] 是否显示全局loading
 * @returns {Promise<Array<any>>} 返回所有请求的结果数组
 */
async function batchRequest(requests, options) {
    var opts = Object.assign({
        failFast: true,
        showLoading: true,
    }, options);

    if (!requests || requests.length === 0) {
        return [];
    }

    if (opts.showLoading) {
        wx.showLoading({ title: "加载中...", mask: true });
    }

    var results = [];
    var errors = [];

    try {
        if (opts.failFast) {
            results = await Promise.all(requests.map(function(req) {
                return request(req.action, req.payload, Object.assign({}, req.options, { showLoading: false }));
            }));
        } else {
            var settled = await Promise.allSettled(requests.map(function(req) {
                return request(req.action, req.payload, Object.assign({}, req.options, { showLoading: false }));
            }));

            settled.forEach(function(item) {
                if (item.status === "fulfilled") {
                    results.push(item.value);
                    return;
                }
                errors.push(item.reason);
                results.push(null);
            });

            if (errors.length > 0) {
                var error = new Error("部分请求失败");
                error.errors = errors;
                error.results = results;
                throw error;
            }
        }

        return results;

    } finally {
        if (opts.showLoading) {
            wx.hideLoading();
        }
    }
}

/**
 * 文件上传封装
 *
 * 基于wx.cloud.uploadFile，支持进度回调。
 *
 * @param {string} filePath 本地临时文件路径
 * @param {object} [options] 上传选项
 * @param {string} [options.cloudPath] 云存储路径，默认自动生成
 * @param {Function} [options.onProgress] 进度回调 function(progress)
 * @returns {Promise<{fileID: string}>}
 */
async function uploadFile(filePath, options) {
    if (!filePath) {
        throw new Error("文件路径不能为空");
    }

    var opts = options || {};
    var cloudPath = opts.cloudPath || ("upload/" + Date.now() + "_" + Math.random().toString(36).slice(2, 8));
    var showLoading = opts.showLoading !== false;

    // 提取文件扩展名
    var extMatch = filePath.match(/\.(jpg|jpeg|png|gif|bmp|webp|mp4|pdf|doc|docx|xls|xlsx)$/i);
    if (extMatch && !cloudPath.match(/\.[a-z]+$/i)) {
        cloudPath += "." + extMatch[1].toLowerCase();
    }

    if (showLoading) {
        wx.showLoading({ title: "上传中...", mask: true });
    }

    try {
        var res = await new Promise(function(resolve, reject) {
            wx.cloud.uploadFile({
                cloudPath: cloudPath,
                filePath: filePath,
                success: function(res) {
                    resolve(res);
                },
                fail: function(err) {
                    reject(err);
                },
            });
        });

        if (showLoading) {
            wx.hideLoading();
        }

        if (res.fileID) {
            return {
                fileID: res.fileID,
            };
        }

        throw new Error("文件上传失败");

    } catch (err) {
        if (showLoading) {
            wx.hideLoading();
        }
        var error = new Error("文件上传失败：" + (err.errMsg || err.message || "未知错误"));
        error.errCode = "UPLOAD_FAILED";
        error.originalError = err;
        throw error;
    }
}

function invalidateAllReadCache() {
    Object.keys(READ_CACHE).forEach(function(key) {
        delete READ_CACHE[key];
    });
}

module.exports = {
    request: request,
    requestWithCheck: requestWithCheck,
    get: get,
    post: post,
    batchRequest: batchRequest,
    uploadFile: uploadFile,
    getErrorMessage: getErrorMessage,
    invalidateAllReadCache: invalidateAllReadCache,
};
