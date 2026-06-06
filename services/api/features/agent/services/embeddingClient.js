const EMBEDDING_URL = (process.env.EMBEDDING_URL || 'http://127.0.0.1:5004').trim().replace(/\/$/, '');
const EMBEDDING_API_KEY = (process.env.EMBEDDING_API_KEY || '').trim();
const EMBED_TIMEOUT_MS = Math.max(3000, parseInt(process.env.AGENT_EMBED_TIMEOUT_MS || '8000', 10) || 8000);

function embedHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (EMBEDDING_API_KEY) {
    h.Authorization = `Bearer ${EMBEDDING_API_KEY}`;
    h['X-Embedding-Token'] = EMBEDDING_API_KEY;
  }
  return h;
}

/**
 * @param {string} text
 * @returns {Promise<number[] | null>}
 */
async function embedOne(text) {
  const t = String(text || '').trim();
  if (!t || !EMBEDDING_URL) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EMBED_TIMEOUT_MS);

  try {
    const res = await fetch(`${EMBEDDING_URL}/embed_one`, {
      method: 'POST',
      headers: embedHeaders(),
      body: JSON.stringify({ text: t.slice(0, 512) }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => ({}));
    return Array.isArray(data.embedding) ? data.embedding : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { embedOne };
