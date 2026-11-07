const http = require('./http');

const PUBLIC_READS = new Set([
    'campus.summary', 'campus.detail', 'about.summary', 'config.summary',
    'config.listBanner', 'config.getTimeSlots', 'config.getCampusList',
    'config.getBasicConfig', 'appointment.meta'
]);
const LEGACY_SIGN_IN = new Set(['auth.login', 'auth.loginByPhone', 'auth.phoneLogin', 'auth.sendSmsCode', 'auth.getPhoneNumber']);
const CAMPUS_ACTIONS = new Set(['campus.summary', 'campus.detail', 'campus.adminDetail']);

function adaptData(action, data) {
    if (data && CAMPUS_ACTIONS.has(action) && !data.campus) {
        return { campus: { ...data, coverImageUrl: data.coverImage || '' } };
    }
    if (action === 'config.listBanner' && Array.isArray(data)) {
        return { list: data.map(item => ({ ...item, id: String(item.banner_id || '') })) };
    }
    return data;
}

async function callApi(action, payload) {
    const anonymous = PUBLIC_READS.has(action) || action === 'appointment.create' || LEGACY_SIGN_IN.has(action);
    try {
        const data = await http.request('/wx/dispatcher', {
            method: 'POST',
            auth: !anonymous,
            body: { action, payload: payload || {} }
        });
        return { ok: true, data: adaptData(action, data), errCode: 0 };
    } catch (error) {
        return {
            ok: false,
            status: error.status,
            traceId: error.traceId,
            errCode: error.errCode,
            errMsg: error.errMsg || error.message
        };
    }
}

module.exports = { callApi, isPublicRead: action => PUBLIC_READS.has(action) };
