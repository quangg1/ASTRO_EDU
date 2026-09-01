const DEFAULT_MAX_LENGTH = 64;

const VIETNAMESE_MARKS = /[\u0300-\u0301\u0303\u0309\u0323\u031B\u0306\u0302]/g;

/**
 * URL-safe slug. Vietnamese diacritics are folded (`Lớp Thiên Văn` -> `lop-thien-van`)
 * instead of being stripped, which previously collapsed titles to empty strings.
 */
function slugify(text, maxLength = DEFAULT_MAX_LENGTH) {
  return String(text || '')
    .normalize('NFD')
    .replace(VIETNAMESE_MARKS, '')
    .replace(/[đĐ]/g, 'd')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
}

module.exports = { slugify };
