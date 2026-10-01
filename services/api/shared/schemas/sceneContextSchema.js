const mongoose = require('mongoose');

/**
 * Bối cảnh cảnh 3D của một bài học (Lộ trình hoặc Khóa học): entity chính,
 * các entity liên quan và (tùy chọn) mốc Deep History. Hai loại bài dùng chung
 * một dạng để cầu nối Edu ↔ 3D đọc được cả hai.
 */
const sceneContextSchema = new mongoose.Schema(
  {
    primaryEntityId: { type: String, default: '' },
    entityIds: [{ type: String }],
    historyFocus: {
      type: new mongoose.Schema(
        {
          beatId: { type: Number, required: true },
          pinId: { type: String, default: '' },
          labelVi: { type: String, default: '' },
        },
        { _id: false },
      ),
      default: undefined,
    },
  },
  { _id: false },
);

const uniqueIds = (value) =>
  Array.isArray(value)
    ? [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))]
    : [];

/** Bối cảnh cảnh 3D chỉ có nghĩa khi trỏ tới ít nhất một thực thể hoặc mốc lịch sử. */
function normalizeSceneContext(source) {
  if (!source || typeof source !== 'object') return undefined;

  const primaryEntityId = String(source.primaryEntityId || '').trim();
  const entityIds = uniqueIds(source.entityIds).filter((id) => id !== primaryEntityId);

  let historyFocus;
  const rawFocus = source.historyFocus;
  if (rawFocus && typeof rawFocus === 'object' && primaryEntityId) {
    const beatId = Number(rawFocus.beatId);
    if (Number.isFinite(beatId)) {
      historyFocus = { beatId };
      const pinId = String(rawFocus.pinId || '').trim();
      if (pinId) historyFocus.pinId = pinId;
      const labelVi = String(rawFocus.labelVi || '').trim();
      if (labelVi) historyFocus.labelVi = labelVi;
    }
  }

  if (!primaryEntityId && entityIds.length === 0 && !historyFocus) return undefined;

  return {
    ...(primaryEntityId ? { primaryEntityId } : {}),
    ...(entityIds.length ? { entityIds } : {}),
    ...(historyFocus ? { historyFocus } : {}),
  };
}

/** Entity chính đứng đầu, rồi các entity liên quan; không trùng. */
function sceneEntityIds(sceneContext) {
  const sc = sceneContext || {};
  return uniqueIds([sc.primaryEntityId, ...(Array.isArray(sc.entityIds) ? sc.entityIds : [])]);
}

module.exports = { sceneContextSchema, normalizeSceneContext, sceneEntityIds };
