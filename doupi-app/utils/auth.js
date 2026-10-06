/**
 * @fileoverview 认证与权限管理工具
 * - 登录态检查与跳转
 * - 角色权限判断
 * - 用户信息缓存管理
 * - 微信登录/手机号获取/手机号登录封装
 */

const feedback = require('./feedback');
const cloudClient = require("./cloudClient");

const APP = getApp();

/** 代维操作者快照（发起代维的超管 id/名称，仅用于请求记日志；与 userInfo 分离） */
const ADMIN_INFO_KEY = "adminInfo";

/** 微信登录未完成：云端已建用户但未写入本地登录态，仅存此草稿；退出完善页须清理 */
const PENDING_LOGIN_DRAFT_KEY = "pendingLoginDraft";
const PROFILE_JUST_UPDATED_KEY = "profileJustUpdated";

function setPendingLoginDraft(draft) {
    try {
        wx.setStorageSync(PENDING_LOGIN_DRAFT_KEY, draft || null);
    } catch (e) {}
}

function getPendingLoginDraft() {
    try {
        return wx.getStorageSync(PENDING_LOGIN_DRAFT_KEY) || null;
    } catch (e) {
        return null;
    }
}

function clearPendingLoginDraft() {
    try {
        wx.removeStorageSync(PENDING_LOGIN_DRAFT_KEY);
    } catch (e) {}
}

function markProfileJustUpdated() {
    try {
        wx.setStorageSync(PROFILE_JUST_UPDATED_KEY, true);
    } catch (e) {}
}

function consumeProfileJustUpdated() {
    try {
        const updated = !!wx.getStorageSync(PROFILE_JUST_UPDATED_KEY);
        if (updated) {
            wx.removeStorageSync(PROFILE_JUST_UPDATED_KEY);
        }
        return updated;
    } catch (e) {
        return false;
    }
}

/**
 * 角色字段标准化（前端统一只认 userInfo.role）
 * 1-超级管理员 2-招生主任 3-招生老师 4-家长 5-管理员
 */
function normalizeRole(role) {
    if (role === null || role === undefined) return 0;
    const n = Number(role);
    if ([1, 2, 3, 4, 5].indexOf(n) !== -1) return n;
    return 0;
}

/**
 * 检查是否已登录
 * @returns {boolean}
 */
function isLoggedIn() {
    try {
        const userInfo = wx.getStorageSync("userInfo");
        return !!(userInfo && userInfo.userId);
    } catch (e) {
        return false;
    }
}

/**
 * 获取当前用户信息
 * @returns {object|null}
 */
function getUserInfo() {
    try {
        return wx.getStorageSync("userInfo") || null;
    } catch (e) {
        return null;
    }
}

/**
 * 获取当前用户角色（代维后 userInfo 已是目标用户）
 * @returns {number} 1-超级管理员 2-招生主任 3-招生老师 4-家长 5-管理员
 */
function getUserRole() {
    const userInfo = getUserInfo();
    return normalizeRole(userInfo && userInfo.role);
}

function getAdminInfo() {
    try {
        return wx.getStorageSync(ADMIN_INFO_KEY) || null;
    } catch (e) {
        return null;
    }
}

function setAdminInfo(info) {
    try {
        const operatorUserId = String((info && info.operatorUserId) || "").trim();
        if (!operatorUserId) {
            wx.removeStorageSync(ADMIN_INFO_KEY);
            return;
        }
        wx.setStorageSync(ADMIN_INFO_KEY, {
            operatorUserId,
            operatorName: String((info && info.operatorName) || "").trim(),
        });
    } catch (e) {}
}

function clearAdminInfo() {
    try {
        wx.removeStorageSync(ADMIN_INFO_KEY);
    } catch (e) {}
}

/** 是否处于代维模式（已写入 adminInfo） */
function isImpersonating() {
    const admin = getAdminInfo();
    return !!(admin && admin.operatorUserId);
}

function normalizeSupportTargetUser(raw) {
    const user = raw || {};
    return {
        userId: String(user.userId || user._id || "").trim(),
        openid: String(user.openid || "").trim(),
        phone: user.phone || "",
        nickname: user.nickname || user.name || "",
        avatar: user.avatar || "",
        avatarFileID: user.avatarFileID || "",
        role: normalizeRole(user.role),
        roleName: user.roleName || "",
        status: user.status == null ? 1 : user.status,
        profile: user.profile || {},
        appointmentCount: user.appointmentCount || 0,
        needCompleteProfile: !!user.needCompleteProfile,
    };
}

/**
 * 进入代维前调用：写入操作者 adminInfo（userInfo 仍为超管）
 * @param {object} [operatorUserInfo] 默认取当前 userInfo
 * @returns {boolean}
 */
function beginSupportView(operatorUserInfo) {
    const op = operatorUserInfo || getUserInfo();
    if (!op || !op.userId || normalizeRole(op.role) !== 1) return false;
    setAdminInfo({
        operatorUserId: op.userId,
        operatorName: op.nickname || op.name || "",
    });
    return true;
}

/** 拉取目标资料失败时回滚 */
function rollbackSupportView() {
    clearAdminInfo();
}

/**
 * 拉取目标 profile 成功后：将 userInfo 替换为目标用户
 * @param {object} targetUserInfo user.getProfile 返回的 userInfo
 */
function enterImpersonation(targetUserInfo) {
    const admin = getAdminInfo();
    if (!admin || !admin.operatorUserId) {
        throw new Error("代维操作者信息缺失");
    }
    const normalized = normalizeSupportTargetUser(targetUserInfo);
    if (!normalized.userId) {
        throw new Error("目标用户信息无效");
    }
    setUserInfo(normalized, { allowDuringImpersonation: true });
}

/**
 * 判断是否为管理员
 * @returns {boolean}
 */
function isAdmin() {
    return getUserRole() === 1;
}

function isManager() {
    return getUserRole() === 5;
}

/**
 * 判断是否为招生主任
 * @returns {boolean}
 */
function isDirector() {
    return getUserRole() === 2;
}

/**
 * 判断是否为招生老师
 * @returns {boolean}
 */
function isTeacher() {
    return getUserRole() === 3;
}

/**
 * 判断是否为家长
 * @returns {boolean}
 */
function isParent() {
    return getUserRole() === 4;
}

/**
 * 判断当前角色是否禁止发起家长预约
 * 招生主任、招生老师属于招生端角色，只能管理/核销预约，不允许作为家长提交预约。
 * @returns {boolean}
 */
function isAppointmentRestrictedRole() {
    const role = getUserRole();
    return role === 2 || role === 3;
}

/**
 * 登录/完善资料后的回跳地址：招生端角色不允许进入预约 Tab
 * @param {string} url 原始回跳路径
 * @returns {{ url: string, blocked: boolean }}
 */
function resolvePostLoginRedirect(url) {
    const raw = String(url || "").trim();
    if (!raw) return { url: "", blocked: false };
    const purePath = raw.split("?")[0];
    if (purePath === "/pages/appointment/appointment" && isAppointmentRestrictedRole()) {
        return { url: "/pages/profile/profile", blocked: true };
    }
    return { url: raw, blocked: false };
}

/**
 * 判断是否有后台管理权限（超级管理员、管理员、招办主任、招生老师）
 * @returns {boolean}
 */
function hasAdminAccess() {
    const role = getUserRole();
    return [1, 2, 3, 5].indexOf(role) !== -1;
}

/**
 * 要求登录：未登录时跳转登录页
 * @param {string} [redirectUrl] 登录后返回的页面路径
 * @returns {boolean} 是否已登录
 */
function requireLogin(redirectUrl) {
    if (isLoggedIn()) return true;
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const url = redirectUrl || buildPageUrlWithQuery(currentPage) || "/pages/index/index";
    wx.removeStorageSync("userInfo");
    wx.redirectTo({
        url: `/pages/login/login?redirect=${encodeURIComponent(url)}`,
    });
    return false;
}

/**
 * 构建「当前页完整路径」(含 query) 用于登录回跳
 * @param {any} page getCurrentPages() 中的 page 实例
 * @returns {string} 例如 /pages/appointment/appointment?inviteKey=xxx
 */
function buildPageUrlWithQuery(page) {
    try {
        if (!page || !page.route) return "";
        const base = `/${page.route}`;
        const opts = page.options || {};
        const keys = Object.keys(opts || {}).filter((k) => typeof opts[k] !== "undefined" && opts[k] !== null && String(opts[k]) !== "");
        if (keys.length === 0) return base;
        const qs = keys
            .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(opts[k]))}`)
            .join("&");
        return `${base}?${qs}`;
    } catch (_) {
        return "";
    }
}

/**
 * 要求特定角色：无权限时提示
 * @param {number[]} allowedRoles 允许的角色列表
 * @returns {boolean} 是否有权限
 */
function requireRoles(allowedRoles) {
    const role = getUserRole();
    if (allowedRoles.indexOf(role) !== -1) return true;
    feedback.showToast({ title: "无权限访问", icon: "none" });
    return false;
}

/**
 * 清除登录态
 * @returns {void}
 */
function clearAuth() {
    try {
        wx.removeStorageSync("userInfo");
        wx.removeStorageSync("sessionKey");
        wx.removeStorageSync(ADMIN_INFO_KEY);
        wx.removeStorageSync(PROFILE_JUST_UPDATED_KEY);
        clearPendingLoginDraft();
    } catch (e) {}
}

/**
 * 缓存用户信息
 * @param {object} userInfo 用户信息
 * @param {{ allowDuringImpersonation?: boolean }} [options]
 * @returns {void}
 */
function setUserInfo(userInfo, options) {
    try {
        if (isImpersonating() && !(options && options.allowDuringImpersonation)) {
            return;
        }
        const normalized = Object.assign({}, userInfo || {}, {
            role: normalizeRole(userInfo && userInfo.role),
            _cachedAt: Date.now(),
        });
        wx.setStorageSync("userInfo", normalized);
        try {
            const app = getApp && getApp();
            if (app && app.globalData) {
                app.globalData.userInfo = normalized;
                app.globalData.isLoggedIn = !!normalized.userId;
                app.globalData.role = normalized.role || 4;
            }
        } catch (_) {}
    } catch (e) {
        console.error("[AUTH] setUserInfo failed", e);
        try {
            feedback.showToast({ title: "本地存储异常，资料可能未保存", icon: "none" });
        } catch (_) {}
    }
}

/**
 * 微信登录封装
 *
 * 调用 auth.login 云函数，完成微信授权登录流程，
 * 并缓存返回的用户信息。
 *
 * @param {string} code wx.login 获取的 code
 * @returns {Promise<object>} 用户信息对象 { userId, openid, phone, nickname, avatar, role, status }
 */
async function login(code) {
    try {
        var result = await cloudClient.callApi("auth.login", { code: code });

        if (!result.ok) {
            throw new Error(result.errMsg || "登录失败");
        }

        var userInfo = result.data && result.data.user_info;
        if (userInfo) {
            setUserInfo(userInfo);
        }

        return userInfo;

    } catch (err) {
        console.error("[AUTH] login failed", err);
        clearAuth();
        throw err;
    }
}

/**
 * 获取手机号封装
 *
 * 处理微信获取手机号的完整流程：
 * - 调用云函数解密手机号
 * - 更新缓存的用户信息
 *
 * @param {object} e getPhoneNumber 事件对象（推荐使用 `e.detail.code`）
 * @returns {Promise<string>} 手机号字符串
 */
async function getPhoneNumber(e) {
    try {
        // v2（推荐）：微信 getPhoneNumber 直接返回 code（无需旧版解密参数）
        // https://developers.weixin.qq.com/miniprogram/dev/framework/open-ability/getPhoneNumber.html
        const detail = (e && e.detail) || {};
        const phoneCode = detail.code ? String(detail.code).trim() : "";
        if (!phoneCode) {
            // 用户拒绝授权或参数异常
            var errMsg = detail && detail.errMsg;
            if (errMsg && errMsg.indexOf("fail") !== -1) {
                throw new Error("USER_DENIED_PHONE");
            }
            throw new Error("获取手机号参数异常");
        }

        var result = await cloudClient.callApi("auth.getPhoneNumber", { code: phoneCode });

        if (!result.ok) {
            throw new Error(result.errMsg || "获取手机号失败");
        }

        var phoneNumber = result.data && result.data.phoneNumber;
        if (phoneNumber && !isImpersonating()) {
            var currentUserInfo = getUserInfo();
            if (currentUserInfo) {
                setUserInfo(Object.assign({}, currentUserInfo, { phone: phoneNumber }));
            }
        }

        return phoneNumber;

    } catch (err) {
        console.error("[AUTH] getPhoneNumber failed", err);
        throw err;
    }
}

/**
 * 手机号登录封装
 *
 * 通过手机号+验证码方式登录，
 * 登录成功后缓存用户信息。
 *
 * @param {string} phone 手机号
 * @param {string} code 短信验证码
 * @returns {Promise<object>} 用户信息对象
 */
async function phoneLogin(phone, code) {
    if (!phone || !code) {
        throw new Error("手机号和验证码不能为空");
    }

    try {
        var result = await cloudClient.callApi("auth.phoneLogin", {
            phone: String(phone).trim(),
            code: String(code).trim(),
        });

        if (!result.ok) {
            // 处理特定错误码
            if (result.errCode === "INVALID_CODE" || result.errCode === "CODE_EXPIRED") {
                throw new Error("验证码错误或已过期");
            }
            throw new Error(result.errMsg || "登录失败");
        }

        var userInfo = result.data && result.data.user_info;
        if (userInfo) {
            setUserInfo(userInfo);
        }

        return userInfo;

    } catch (err) {
        console.error("[AUTH] phoneLogin failed", err);
        clearAuth();
        throw err;
    }
}

/**
 * 检查微信 session 有效性
 *
 * 调用 wx.checkSession 检查当前登录态是否有效，
 * 过期时自动清除本地缓存。
 *
 * @returns {Promise<boolean>} session是否有效
 */
async function checkSession() {
    return new Promise(function(resolve) {
        wx.checkSession({
            success: function() {
                resolve(true);
            },
            fail: function() {
                console.log("[AUTH] session 已过期");
                clearAuth();
                resolve(false);
            },
        });
    });
}

/**
 * 刷新登录态（预留接口）
 *
 * 用于在 session 过期时重新获取登录态。
 * 当前实现：清除旧状态并返回提示。
 *
 * @returns {Promise<void>}
 */
async function refreshToken() {
    try {
        // 当前会话模型基于 OPENID + _userId，后续若引入正式会话票据，再在此处扩展刷新逻辑。

        // 当前实现：清除过期状态
        clearAuth();

        console.log("[AUTH] refreshToken: 登录态已清除，需要重新登录");

    } catch (err) {
        console.error("[AUTH] refreshToken failed", err);
        clearAuth();
    }
}

/**
 * 角色ID转中文名称
 *
 * @param {number} role 角色ID
 * @returns {string} 角色中文名称
 */
function getRoleName(role) {
    var roleMap = {
        0: "未知",
        1: "超级管理员",
        2: "招生主任",
        3: "招生老师",
        4: "家长",
        5: "管理员",
    };
    return roleMap[role] || "未知";
}

/**
 * 判断当前角色是否有效
 *
 * 有效条件：角色非0且用户状态正常(status=1)
 *
 * @returns {boolean}
 */
function isRoleValid() {
    var userInfo = getUserInfo();
    if (!userInfo) return false;

    var role = normalizeRole(userInfo.role);
    var status = userInfo.status; // undefined 或 1 表示正常

    // 角色必须有效(1-4)，状态不能是禁用(0)
    return [1, 2, 3, 4, 5].indexOf(role) !== -1 && status !== 0;
}

/**
 * 弹窗引导式登录检查
 * 未登录时弹出模态框询问用户是否前往登录
 * @param {string} [redirectUrl] 登录后回跳的页面路径
 * @returns {Promise<boolean>} true=已登录或即将去登录 false=用户取消
 */
async function requireLoginWithPrompt(redirectUrl) {
    if (isLoggedIn()) return true;

    const res = await new Promise(function(resolve) {
        wx.showModal({
            title: '需要登录',
            content: '该功能需要登录后才能使用，是否前往登录？',
            confirmText: '去登录',
            cancelText: '暂不',
            success: function(modalRes) {
                resolve(modalRes.confirm);
            },
            fail: function() {
                resolve(false);
            },
        });
    });

    if (!res) return false;

    // 构建登录页路径
    let url = '/pages/login/login';
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    const backUrl = redirectUrl || buildPageUrlWithQuery(currentPage) || "/pages/index/index";
    url += '?redirect=' + encodeURIComponent(backUrl);
    wx.navigateTo({ url: url });
    return false; // 返回false表示尚未登录（正在去登录的路上）
}

/**
 * 检查登录态并跳转到指定页面（需登录时弹窗引导）
 * @param {string} targetUrl 要跳转的目标页面路径
 * @param {string} [redirectParam] 登录后回跳参数名
 * @returns {boolean} 是否已执行跳转
 */
async function navigateIfLoggedIn(targetUrl, redirectParam) {
    // 如果已登录，直接跳转目标页
    if (isLoggedIn()) {
        wx.navigateTo({ url: targetUrl });
        return true;
    }

    // 未登录时弹窗引导去登录
    var redirectValue = targetUrl;
    if (redirectParam) {
        // 如果有自定义参数名，使用该参数名
        redirectValue = redirectParam + '=' + encodeURIComponent(targetUrl);
    }

    const res = await new Promise(function(resolve) {
        wx.showModal({
            title: '需要登录',
            content: '该功能需要登录后才能使用，是否前往登录？',
            confirmText: '去登录',
            cancelText: '暂不',
            success: function(modalRes) {
                resolve(modalRes.confirm);
            },
            fail: function() {
                resolve(false);
            },
        });
    });

    if (!res) return false;

    // 构建登录页路径，携带回跳参数
    let loginUrl = '/pages/login/login?redirect=' + encodeURIComponent(targetUrl);
    wx.navigateTo({ url: loginUrl });
    return false;
}

module.exports = {
    setPendingLoginDraft,
    getPendingLoginDraft,
    clearPendingLoginDraft,
    markProfileJustUpdated,
    consumeProfileJustUpdated,
    isLoggedIn,
    getUserInfo,
    getAdminInfo,
    setAdminInfo,
    clearAdminInfo,
    isImpersonating,
    beginSupportView,
    rollbackSupportView,
    enterImpersonation,
    getUserRole,
    isAdmin,
    isDirector,
    isTeacher,
    isParent,
    isAppointmentRestrictedRole,
    resolvePostLoginRedirect,
    hasAdminAccess,
    requireLogin,
    requireRoles,
    clearAuth,
    setUserInfo,
    login,
    getPhoneNumber,
    phoneLogin,
    checkSession,
    refreshToken,
    getRoleName,
    isManager,
    isRoleValid,
    requireLoginWithPrompt,
    navigateIfLoggedIn,
};
