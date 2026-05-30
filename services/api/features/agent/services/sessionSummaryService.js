const AgentSession = require('../models/AgentSession');

/**
 * Ghi tóm tắt ngắn phiên agent khi rời bài / idle.
 * @param {string} userId
 * @param {{ sessionId: string, lessonId?: string, lessonTitle?: string, messageCount?: number }} payload
 */
async function saveSessionSummary(userId, payload) {
  if (!userId || !payload?.sessionId) return { ok: false };
  const lessonLabel = payload.lessonTitle || payload.lessonId || 'bài học';
  const n = Number(payload.messageCount) || 0;
  const summary =
    n > 0
      ? `Đã trao đổi ${n} lượt với trợ lý trong "${lessonLabel}".`
      : `Đã xem "${lessonLabel}" (chưa hỏi trợ lý).`;

  await AgentSession.findOneAndUpdate(
    { userId, sessionId: payload.sessionId },
    { $set: { summary, lastContext: { lessonId: payload.lessonId, lessonTitle: payload.lessonTitle } } },
    { upsert: true },
  );
  return { ok: true, summary };
}

module.exports = { saveSessionSummary };
