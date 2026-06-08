const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const { sanitizeAssistantContent } = require('../features/agent/lib/assistantContentSanitize');

describe('sanitizeAssistantContent table unfold', () => {
  it('splits collapsed GFM table rows', () => {
    const collapsed =
      '| Nhóm | Ví dụ | Đặc điểm | |---|---|---| | Trilobita | *Paradoxides* | Nhiều loài |';
    const out = sanitizeAssistantContent(collapsed);
    assert.ok(out.includes('\n'));
    assert.ok(out.includes('|---|'));
    assert.ok(out.includes('| Trilobita |'));
  });

  it('leaves plain pipe-separated text alone', () => {
    const line = 'Catalog: Earth | Mars | Venus';
    assert.equal(sanitizeAssistantContent(line), line);
  });
});
