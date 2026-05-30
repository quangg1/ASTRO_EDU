const test = require('node:test');
const assert = require('node:assert/strict');
const { isAgentQuizLocked, assertAgentNotQuizLocked } = require('../features/agent/lib/agentQuizLock');
const { AppError } = require('../shared/errors');

test('isAgentQuizLocked detects recall lock', () => {
  assert.equal(isAgentQuizLocked({ quizLock: 'recall' }), true);
  assert.equal(isAgentQuizLocked({ recallQuizActive: true }), true);
  assert.equal(isAgentQuizLocked({ surface: 'learning_path' }), false);
});

test('assertAgentNotQuizLocked throws AGENT_QUIZ_LOCKED', () => {
  assert.throws(
    () => assertAgentNotQuizLocked({ quizLock: 'recall' }),
    (err) => err instanceof AppError && err.code === 'AGENT_QUIZ_LOCKED',
  );
});
