const LearningPathEvent = require('../models/LearningPathEvent');

/**
 * Gán userId cho guest events đã ghi với anonSessionId (sau đăng ký / login).
 */
async function attributeGuestLearningSession(userId, anonSessionId) {
  const uid = String(userId || '').trim();
  const anon = String(anonSessionId || '').trim();
  if (!uid || !anon) {
    return { ok: false, code: 'INVALID_ARGS', error: 'Thiếu userId hoặc anonSessionId' };
  }

  const result = await LearningPathEvent.updateMany(
    { anonSessionId: anon, userId: null },
    { $set: { userId: uid } },
  );

  return {
    ok: true,
    matched: result.matchedCount || 0,
    modified: result.modifiedCount || 0,
  };
}

module.exports = { attributeGuestLearningSession };
