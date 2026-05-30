const TTL_MS = 5 * 60 * 1000;

/** @type {Map<string, { value: unknown, expiresAt: number }>} */
const store = new Map();

function cacheKey(userId, lessonId, narrativeKey, activeSectionId) {
  const part = lessonId || narrativeKey || 'global';
  const section = activeSectionId ? `:sec:${activeSectionId}` : '';
  return `${userId || 'anon'}:${part}${section}`;
}

function getCachedContext(userId, sessionContext) {
  const lessonId = sessionContext?.lessonId;
  const narrativeKey = sessionContext?.narrativeKey;
  const activeSectionId = sessionContext?.activeSectionId;
  const key = cacheKey(userId, lessonId, narrativeKey, activeSectionId);
  const hit = store.get(key);
  if (!hit || hit.expiresAt < Date.now()) {
    if (hit) store.delete(key);
    return null;
  }
  return hit.value;
}

function setCachedContext(userId, sessionContext, value) {
  const lessonId = sessionContext?.lessonId;
  const narrativeKey = sessionContext?.narrativeKey;
  const activeSectionId = sessionContext?.activeSectionId;
  const key = cacheKey(userId, lessonId, narrativeKey, activeSectionId);
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

module.exports = { getCachedContext, setCachedContext, TTL_MS };
