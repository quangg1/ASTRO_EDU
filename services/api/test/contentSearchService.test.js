const test = require('node:test');
const assert = require('node:assert');

test('RAG source lp/ parses lesson id', () => {
  const src = 'lp/lesson-abc-extra';
  const lessonId = src.slice(3).split('/')[0];
  assert.equal(lessonId, 'lesson-abc-extra');
});

test('RAG source community/ parses post id', () => {
  const src = 'community/507f1f77bcf86cd799439011';
  const postId = src.slice(10).split('/')[0];
  assert.equal(postId, '507f1f77bcf86cd799439011');
});
