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

  it('peels title before header row and splits collapsed ordovician-style table', () => {
    const collapsed =
      'Các sinh vật tiêu biểu trong Kỷ Ordovician (~485 – 444 Ma) | Nhóm sinh vật | Ví dụ | Đặc điểm | |---|---|---| | Động vật thân mềm | Nautilus | Mô tả | | Graptolit | fossil | Mô tả 2 |';
    const out = sanitizeAssistantContent(collapsed);
    assert.ok(out.startsWith('Các sinh vật tiêu biểu'));
    assert.ok(out.includes('\n\n| Nhóm sinh vật |'));
    assert.ok(out.includes('|---|'));
    assert.ok(out.includes('| Động vật thân mềm |'));
    assert.ok(out.includes('| Graptolit |'));
  });
});
