const { AppError } = require('../../../shared/errors');
const { learningPathEventRepository } = require('../repositories/learningPathRepository');

/**
 * Gán userId cho các sự kiện khách đã ghi kèm anonSessionId, để tiến độ học
 * trước khi đăng ký không bị mất sau khi tạo tài khoản.
 */
async function attributeGuestLearningSession(userId, anonSessionId) {
  const uid = String(userId || '').trim();
  const anon = String(anonSessionId || '').trim();
  if (!uid || !anon) {
    throw new AppError(400, 'INVALID_ARGS', 'Thiếu userId hoặc anonSessionId');
  }

  const result = await learningPathEventRepository.claimGuestSession(anon, uid);
  return { matched: result.matchedCount || 0, modified: result.modifiedCount || 0 };
}

module.exports = { attributeGuestLearningSession };
