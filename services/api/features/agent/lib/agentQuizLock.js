const { AppError } = require('../../../shared/errors');

/**
 * @param {Record<string, unknown>|null|undefined} sessionContext
 */
function isAgentQuizLocked(sessionContext) {
  if (!sessionContext || typeof sessionContext !== 'object') return false;
  const lock = sessionContext.quizLock;
  if (lock === 'recall' || lock === 'course_exam') return true;
  if (sessionContext.recallQuizActive === true) return true;
  return false;
}

/**
 * @param {Record<string, unknown>|null|undefined} sessionContext
 */
function assertAgentNotQuizLocked(sessionContext) {
  if (!isAgentQuizLocked(sessionContext)) return;
  throw new AppError(
    403,
    'AGENT_QUIZ_LOCKED',
    'Trợ lý AI bị tắt trong lúc làm kiểm tra. Hoàn thành hoặc đóng bài kiểm tra trước.',
  );
}

module.exports = { isAgentQuizLocked, assertAgentNotQuizLocked };
