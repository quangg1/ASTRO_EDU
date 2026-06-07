const TTL_MS = 5 * 60 * 1000;

/** @type {Map<string, { value: unknown, expiresAt: number }>} */
const store = new Map();

function cacheKey(userId, lessonId, narrativeKey, activeSectionId, focusedFossilId, exploreSceneKey) {
  const part = lessonId || narrativeKey || 'global';
  const section = activeSectionId ? `:sec:${activeSectionId}` : '';
  const fossil = focusedFossilId ? `:fossil:${focusedFossilId}` : '';
  const explore = exploreSceneKey ? `:ex:${exploreSceneKey}` : '';
  return `${userId || 'anon'}:${part}${section}${fossil}${explore}`;
}

function exploreSceneCacheKey(sessionContext) {
  if (sessionContext?.surface !== 'explore') return '';
  const parts = [
    sessionContext.narrativeBeatId ?? '',
    sessionContext.selectedSite?.siteId ?? '',
    sessionContext.skyContext?.pinnedTargetId ?? '',
    sessionContext.skyContext?.sceneHighlightId ?? '',
  ];
  return parts.filter(Boolean).join('|') || '';
}

function getCachedContext(userId, sessionContext) {
  const lessonId = sessionContext?.lessonId;
  const narrativeKey = sessionContext?.narrativeKey;
  const activeSectionId = sessionContext?.activeSectionId;
  const focusedFossilId = sessionContext?.focusedFossilId;
  const exploreSceneKey = exploreSceneCacheKey(sessionContext);
  const key = cacheKey(
    userId,
    lessonId,
    narrativeKey,
    activeSectionId,
    focusedFossilId,
    exploreSceneKey,
  );
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
  const focusedFossilId = sessionContext?.focusedFossilId;
  const exploreSceneKey = exploreSceneCacheKey(sessionContext);
  const key = cacheKey(
    userId,
    lessonId,
    narrativeKey,
    activeSectionId,
    focusedFossilId,
    exploreSceneKey,
  );
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

module.exports = { getCachedContext, setCachedContext, TTL_MS };
