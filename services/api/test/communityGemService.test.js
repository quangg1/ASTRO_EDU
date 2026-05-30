const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const {
  stripHtml,
  plainPostLength,
  normalizeTitle,
  canMarkCommentHelpful,
  helpfulMarkTriggersGem,
} = require('../features/community/services/communityGemService');

describe('communityGemService helpers', () => {
  it('stripHtml removes tags and collapses whitespace', () => {
    assert.equal(stripHtml('<p>Hello <b>world</b></p>'), 'Hello world');
  });

  it('plainPostLength sums title and content', () => {
    assert.equal(plainPostLength('Tiêu đề', '<p>Nội dung đủ dài</p>'), 'Tiêu đề'.length + 'Nội dung đủ dài'.length);
  });

  it('normalizeTitle lowercases and strips html', () => {
    assert.equal(normalizeTitle('  <b>ABC</b>  '), 'abc');
  });

  it('canMarkCommentHelpful denies self-mark and allows post author', () => {
    assert.equal(
      canMarkCommentHelpful({
        markerId: 'u1',
        markerRole: 'student',
        postAuthorId: 'u1',
        commentAuthorId: 'u2',
        canModTools: false,
      }),
      true,
    );
    assert.equal(
      canMarkCommentHelpful({
        markerId: 'u2',
        markerRole: 'student',
        postAuthorId: 'u1',
        commentAuthorId: 'u2',
        canModTools: false,
      }),
      false,
    );
  });

  it('helpfulMarkTriggersGem allows mod and post author', () => {
    assert.equal(
      helpfulMarkTriggersGem({
        markerId: 'mod1',
        markerRole: 'moderator',
        postAuthorId: 'u1',
        commentAuthorId: 'u2',
        canModTools: true,
      }),
      true,
    );
    assert.equal(
      helpfulMarkTriggersGem({
        markerId: 'u1',
        markerRole: 'student',
        postAuthorId: 'u1',
        commentAuthorId: 'u2',
        canModTools: false,
      }),
      true,
    );
  });
});
