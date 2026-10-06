const { request } = require('./request');

const SCENE_TEMPLATE_FIELDS = {
  appointment_create: [
    'appointmentReminderTemplateId',
    'successTemplateId',
    'cancelTemplateId',
    'verifyTemplateId',
  ],
  binding_apply: ['remindTemplateId'],
  binding_audit: ['remindTemplateId'],
  all: [
    'appointmentReminderTemplateId',
    'successTemplateId',
    'cancelTemplateId',
    'verifyTemplateId',
    'remindTemplateId',
  ],
};

function uniqTemplateIds(templateIds) {
  const seen = {};
  return (templateIds || []).filter((item) => {
    const value = String(item || '').trim();
    if (!value || seen[value]) return false;
    seen[value] = true;
    return true;
  });
}

function collectTemplateIdsByScenes(templateConfig, scenes) {
  const normalizedScenes = Array.isArray(scenes) ? scenes : [scenes || 'all'];
  const fieldList = normalizedScenes.flatMap((scene) => SCENE_TEMPLATE_FIELDS[scene] || []);
  return uniqTemplateIds(fieldList.map((field) => templateConfig && templateConfig[field]));
}

function requestSubscribeChunk(tmplIds) {
  return new Promise((resolve) => {
    wx.requestSubscribeMessage({
      tmplIds,
      success: (res) => resolve({ ok: true, result: res || {} }),
      fail: (err) => resolve({ ok: false, error: err || {} }),
    });
  });
}

async function requestSubscribeAuthorization(options = {}) {
  const scenes = options.scenes || 'all';
  const config = await request('config.detail', {}, { showLoading: false, showError: false });
  const templateConfig = (config && config.template_ids) || {};
  const templateIds = uniqTemplateIds(options.templateIds || collectTemplateIdsByScenes(templateConfig, scenes));

  if (!templateIds.length) {
    return {
      requested: false,
      templateIds: [],
      reason: 'template_id_empty',
      acceptedCount: 0,
      deniedCount: 0,
      batches: [],
    };
  }

  const chunks = [];
  for (let i = 0; i < templateIds.length; i += 3) {
    chunks.push(templateIds.slice(i, i + 3));
  }

  const batches = [];
  let acceptedCount = 0;
  let deniedCount = 0;

  for (const chunk of chunks) {
    const response = await requestSubscribeChunk(chunk);
    const batchResult = {
      tmplIds: chunk,
      ok: response.ok,
      result: response.result || {},
      error: response.error || null,
    };
    if (response.ok) {
      chunk.forEach((templateId) => {
        const status = batchResult.result[templateId];
        if (status === 'accept') acceptedCount += 1;
        if (status === 'reject' || status === 'ban') deniedCount += 1;
      });
    }
    batches.push(batchResult);
  }

  return {
    requested: true,
    templateIds,
    acceptedCount,
    deniedCount,
    batches,
  };
}

module.exports = {
  requestSubscribeAuthorization,
  collectTemplateIdsByScenes,
};
