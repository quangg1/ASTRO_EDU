const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAgentQuery } = require('../features/agent/lib/textNormalize');
const { resolveSmallTalkFastPath } = require('../features/agent/services/smallTalkFastPath');
const { resolveFaqFastPath } = require('../features/agent/services/agentFaqStatic');

test('normalizeAgentQuery strips diacritics', () => {
  assert.equal(normalizeAgentQuery('  Chào bạn!  '), 'chao ban');
});

test('small talk greeting without substantive follow-up', () => {
  const hit = resolveSmallTalkFastPath('Chào bạn');
  assert.ok(hit);
  assert.equal(hit.source, 'small_talk');
  assert.equal(hit.kind, 'greeting');
});

test('small talk skipped when substantive question', () => {
  assert.equal(resolveSmallTalkFastPath('Chào, giải thích bài đang học về hóa thạch'), null);
});

test('FAQ exact match', () => {
  const hit = resolveFaqFastPath('Cosmo Learn là gì?');
  assert.ok(hit);
  assert.equal(hit.source, 'faq');
  assert.match(hit.content, /CosmoLearn/i);
});

test('thanks fast path', () => {
  const hit = resolveSmallTalkFastPath('cảm ơn bạn nhé');
  assert.ok(hit);
  assert.equal(hit.kind, 'thanks');
});
