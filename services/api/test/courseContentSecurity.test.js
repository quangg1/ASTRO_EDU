const test = require('node:test');
const assert = require('node:assert/strict');
const {
  redactQuizQuestions,
  redactLessonForLearnerDelivery,
  sanitizeQuizQuestionForDelivery,
} = require('../features/courses/services/courseContentRedact');

test('redactQuizQuestions strips answer and explanations', () => {
  const out = redactQuizQuestions([
    {
      id: 'q1',
      type: 'mcq',
      question: '2+2?',
      options: [{ text: '3' }, { text: '4' }, { text: '5' }],
      answer: 1,
      explanation: 'secret',
      optionExplanations: ['a', 'b', 'c'],
    },
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].question, '2+2?');
  assert.equal(out[0].options.length, 3);
  assert.equal('answer' in out[0], false);
  assert.equal('explanation' in out[0], false);
  assert.equal('optionExplanations' in out[0], false);
});

test('redactLessonForLearnerDelivery only touches quiz lessons', () => {
  const text = redactLessonForLearnerDelivery({
    type: 'text',
    slug: 'a',
    content: 'hello',
    quizQuestions: [{ answer: 0 }],
  });
  assert.equal(text.content, 'hello');

  const quiz = redactLessonForLearnerDelivery({
    type: 'quiz',
    slug: 'q',
    quizQuestions: [{ id: 'q1', question: 'Q?', options: [{ text: 'x' }, { text: 'y' }, { text: 'z' }], answer: 2 }],
  });
  assert.equal('answer' in quiz.quizQuestions[0], false);
});

test('sanitizeQuizQuestionForDelivery matches exam-safe shape', () => {
  const s = sanitizeQuizQuestionForDelivery(
    { id: 'x', question: 'Hi', options: [{ text: 'a' }], answer: 0 },
    0,
  );
  assert.deepEqual(Object.keys(s).sort(), ['id', 'options', 'question', 'type']);
});
