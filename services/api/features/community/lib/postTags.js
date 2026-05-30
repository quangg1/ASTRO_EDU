/** Hashtag thảo luận — không dùng rssCategories (chỉ tin crawl). */

const TAG_RE = /#([\p{L}\p{N}_][\p{L}\p{N}_-]{1,39})/gu;

function normalizeTag(raw) {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^#/, '');
  if (!s || s.length < 2 || s.length > 40) return null;
  return s;
}

function extractHashtagsFromText(...parts) {
  const found = new Set();
  for (const part of parts) {
    const text = String(part || '');
    if (!text) continue;
    let m;
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(text)) !== null) {
      const t = normalizeTag(m[1]);
      if (t) found.add(t);
    }
  }
  return [...found].slice(0, 15);
}

function mergePostTags({ explicitTags, title, content }) {
  const fromExplicit = (Array.isArray(explicitTags) ? explicitTags : [])
    .map(normalizeTag)
    .filter(Boolean);
  const fromText = extractHashtagsFromText(title, content);
  return [...new Set([...fromExplicit, ...fromText])].slice(0, 15);
}

module.exports = {
  extractHashtagsFromText,
  mergePostTags,
  normalizeTag,
};
