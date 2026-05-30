const test = require('node:test');
const assert = require('node:assert/strict');
const { applyLearningPathLearnerPolicy } = require('../shared/security/learnerContentPolicy');

test('applyLearningPathLearnerPolicy redacts recallQuiz in modules', () => {
  const raw = {
    modules: [
      {
        id: 'm1',
        nodes: [
          {
            id: 'n1',
            depths: {
              beginner: [
                {
                  id: 'l1',
                  recallQuiz: [
                    {
                      id: 'q1',
                      question: 'Q?',
                      options: [{ text: 'a' }, { text: 'b' }, { text: 'c' }],
                      answer: 1,
                      explanation: 'secret',
                    },
                  ],
                },
              ],
              explorer: [],
              researcher: [],
            },
          },
        ],
      },
    ],
    concepts: [],
  };
  const out = applyLearningPathLearnerPolicy(raw, { includeQuizSecrets: false });
  const q = out.modules[0].nodes[0].depths.beginner[0].recallQuiz[0];
  assert.equal('answer' in q, false);
  assert.equal('explanation' in q, false);
  assert.equal(q.question, 'Q?');
});

test('applyLearningPathLearnerPolicy preserves secrets for admin flag', () => {
  const raw = {
    modules: [
      {
        nodes: [
          {
            depths: {
              beginner: [{ id: 'l1', recallQuiz: [{ answer: 2, question: 'x', options: [{ text: 'a' }, { text: 'b' }, { text: 'c' }] }] }],
              explorer: [],
              researcher: [],
            },
          },
        ],
      },
    ],
  };
  const out = applyLearningPathLearnerPolicy(raw, { includeQuizSecrets: true });
  assert.equal(out.modules[0].nodes[0].depths.beginner[0].recallQuiz[0].answer, 2);
});
