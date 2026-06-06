/**
 * Chuẩn hóa câu hỏi agent — dùng cho FAQ exact match & cache key.
 */
function normalizeAgentQuery(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hashQueryKey(normalized) {
  let h = 2166136261;
  for (let i = 0; i < normalized.length; i += 1) {
    h ^= normalized.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

module.exports = { normalizeAgentQuery, hashQueryKey };
