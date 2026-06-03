/**
 * Phát hiện ý định "giới thiệu / tìm bài" để auto search_learning_content.
 */

const TRIGGERS =
  /giới thiệu|gợi ý|có bài|tìm bài|bài (?:về|nói về|liên quan)|lesson about|introduce.*lesson/i;

/**
 * @param {string} text
 * @returns {string|null} query cho RAG search (≥2 ký tự)
 */
function extractLessonSearchQuery(text) {
  const s = String(text || '').trim();
  if (s.length < 4 || !TRIGGERS.test(s)) return null;

  const about = s.match(
    /(?:về|ve|about|on)\s+([^?.!]+?)(?:\?|\.|!|$|,)/i,
  );
  if (about && about[1]) {
    const q = about[1].trim();
    if (q.length >= 2) return q.slice(0, 120);
  }

  const cleaned = s
    .replace(
      /^(?:xin )?(?:cho )?(?:tôi |mình )?(?:hãy )?(?:giới thiệu|gợi ý|tìm|cho xem)\s*/i,
      '',
    )
    .replace(/^(?:một |1 )?bài(?: học)?\s*/i, '')
    .replace(/\?+$/, '')
    .trim();
  if (cleaned.length >= 2 && cleaned.length <= 120) return cleaned;

  return null;
}

/**
 * @param {string} text
 */
function wantsLessonSearch(text) {
  return extractLessonSearchQuery(text) !== null;
}

module.exports = { extractLessonSearchQuery, wantsLessonSearch };
