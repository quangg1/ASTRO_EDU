const test = require('node:test');
const assert = require('node:assert/strict');
const {
  truncateText,
  buildSessionTitle,
  formatSessionListItem,
} = require('../features/agent/services/sessionHistoryService');

test('truncateText shortens long strings', () => {
  const long = 'a'.repeat(100);
  assert.equal(truncateText(long, 20).length, 20);
  assert.match(truncateText(long, 20), /…$/);
});

test('buildSessionTitle uses first user line', () => {
  assert.equal(buildSessionTitle('  Trái Đất có bao nhiêu tuổi?  '), 'Trái Đất có bao nhiêu tuổi?');
  assert.equal(buildSessionTitle(''), 'Cuộc trò chuyện mới');
});

test('formatSessionListItem builds preview from last message', () => {
  const item = formatSessionListItem({
    sessionId: 's1',
    title: 'Hỏi về hóa thạch',
    messageCount: 2,
    lastContext: { lessonTitle: 'Hóa thạch cổ', surface: 'learning_path' },
    messages: [
      { role: 'user', content: 'Hóa thạch là gì?' },
      { role: 'assistant', content: 'Hóa thạch là dấu vết sinh vật cổ.' },
    ],
    createdAt: new Date('2026-05-28T10:00:00Z'),
    updatedAt: new Date('2026-05-29T10:00:00Z'),
  });
  assert.equal(item.sessionId, 's1');
  assert.equal(item.contextLabel, 'Hóa thạch cổ');
  assert.match(item.preview, /dấu vết sinh vật/);
});
