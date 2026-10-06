const VALID_RUNTIME_STAGES = ["develop", "trial", "release"];

function normalizeRuntimeStage(input) {
  const value = String(input || "").trim().toLowerCase();
  return VALID_RUNTIME_STAGES.indexOf(value) >= 0 ? value : "";
}

function getCurrentRuntimeStage() {
  try {
    const info = wx.getAccountInfoSync && wx.getAccountInfoSync();
    return normalizeRuntimeStage(info && info.miniProgram && info.miniProgram.envVersion);
  } catch (e) {
    return "";
  }
}

module.exports = {
  VALID_RUNTIME_STAGES,
  normalizeRuntimeStage,
  getCurrentRuntimeStage,
};
