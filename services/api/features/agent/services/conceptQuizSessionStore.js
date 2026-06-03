const { randomUUID } = require('crypto');

const TTL_MS = 35 * 60 * 1000;
/** @type {Map<string, { userId: string, questions: object[], conceptId: string, expiresAt: number }>} */
const sessions = new Map();

function prune() {
  const now = Date.now();
  for (const [id, row] of sessions) {
    if (row.expiresAt <= now) sessions.delete(id);
  }
}

/**
 * @param {string} userId
 * @param {{ conceptId: string, conceptTitle: string, lessonId?: string, questions: object[] }} payload
 */
function createConceptQuizSession(userId, payload) {
  prune();
  const id = randomUUID();
  sessions.set(id, {
    userId: String(userId),
    conceptId: payload.conceptId,
    conceptTitle: payload.conceptTitle,
    lessonId: payload.lessonId || null,
    questions: payload.questions,
    expiresAt: Date.now() + TTL_MS,
  });
  return id;
}

function getConceptQuizSession(sessionId, userId) {
  prune();
  const row = sessions.get(String(sessionId || '').trim());
  if (!row) return null;
  if (row.userId !== String(userId)) return null;
  if (row.expiresAt <= Date.now()) {
    sessions.delete(String(sessionId));
    return null;
  }
  return row;
}

function deleteConceptQuizSession(sessionId) {
  sessions.delete(String(sessionId || '').trim());
}

module.exports = {
  createConceptQuizSession,
  getConceptQuizSession,
  deleteConceptQuizSession,
};
