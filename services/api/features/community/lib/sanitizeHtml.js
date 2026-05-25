/**
 * Làm sạch HTML bình luận/bài thảo luận — bỏ script/style, giới hạn độ dài.
 */
function sanitizeDiscussionHtml(raw, maxLen = 50000) {
  if (typeof raw !== 'string') return '';
  let html = raw.trim().slice(0, maxLen);
  html = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, '');
  return html;
}

function isEffectivelyEmptyHtml(html) {
  if (!html || !html.trim()) return true;
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length === 0;
}

module.exports = { sanitizeDiscussionHtml, isEffectivelyEmptyHtml };
