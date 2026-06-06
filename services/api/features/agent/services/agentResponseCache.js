const { randomUUID } = require('crypto');
const { getRedisClient } = require('../../../shared/redisClient');
const { normalizeAgentQuery, hashQueryKey } = require('../lib/textNormalize');
const { embedOne } = require('./embeddingClient');

const CACHE_ENABLED = process.env.AGENT_CACHE_ENABLED !== '0';
const SIM_THRESHOLD = Math.min(
  0.99,
  Math.max(0.75, parseFloat(process.env.AGENT_CACHE_SIM_THRESHOLD || '0.88') || 0.88),
);
const MAX_ENTRIES = Math.max(50, parseInt(process.env.AGENT_CACHE_MAX_ENTRIES || '500', 10) || 500);
const TTL_SEC = Math.max(3600, parseInt(process.env.AGENT_CACHE_TTL_SEC || '259200', 10) || 259200);
const EXACT_TTL_SEC = Math.max(TTL_SEC, parseInt(process.env.AGENT_FAQ_CACHE_TTL_SEC || '604800', 10) || 604800);

/** @type {Map<string, { id: string, qNorm: string, embedding: number[], answer: string, surface: string, thumbsUp: number, thumbsDown: number, createdAt: number }>} */
const memorySem = new Map();
/** @type {Map<string, { answer: string, expiresAt: number }>} */
const memoryExact = new Map();

function cacheScope(surface) {
  const s = String(surface || 'general').trim() || 'general';
  return s.slice(0, 40);
}

function cosine(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

async function redisGet(key) {
  const r = await getRedisClient();
  if (!r) return null;
  try {
    return await r.get(key);
  } catch {
    return null;
  }
}

async function redisSet(key, value, ttlSec) {
  const r = await getRedisClient();
  if (!r) return false;
  try {
    await r.set(key, value, { EX: ttlSec });
    return true;
  } catch {
    return false;
  }
}

async function redisDel(key) {
  const r = await getRedisClient();
  if (!r) return;
  try {
    await r.del(key);
  } catch {
    /* ignore */
  }
}

function exactMemoryKey(scope, qNorm) {
  return `${scope}:${hashQueryKey(qNorm)}`;
}

async function lookupExact(query, surface) {
  const qNorm = normalizeAgentQuery(query);
  if (!qNorm) return null;
  const scope = cacheScope(surface);
  const memKey = exactMemoryKey(scope, qNorm);
  const memHit = memoryExact.get(memKey);
  if (memHit && memHit.expiresAt > Date.now()) {
    return { source: 'cache_exact', content: memHit.answer, cacheEntryId: memKey };
  }

  const redisKey = `agent:cache:exact:${scope}:${hashQueryKey(qNorm)}`;
  const raw = await redisGet(redisKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.answer) {
        memoryExact.set(memKey, { answer: parsed.answer, expiresAt: Date.now() + EXACT_TTL_SEC * 1000 });
        return {
          source: 'cache_exact',
          content: parsed.answer,
          cacheEntryId: parsed.id || memKey,
        };
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function loadSemanticEntries(scope) {
  const listKey = `agent:cache:sem:ids:${cacheScope(scope)}`;
  const raw = await redisGet(listKey);
  let idList = [];
  if (raw) {
    try {
      idList = JSON.parse(raw);
    } catch {
      idList = [];
    }
  }
  if (!Array.isArray(idList)) idList = [];

  const entries = [...memorySem.values()].filter((e) => e.surface === cacheScope(scope));

  for (const id of idList.slice(0, MAX_ENTRIES)) {
    if (memorySem.has(id)) continue;
    const entryRaw = await redisGet(`agent:cache:sem:${id}`);
    if (!entryRaw) continue;
    try {
      const e = JSON.parse(entryRaw);
      if (e?.embedding?.length && e.answer) {
        memorySem.set(id, e);
        entries.push(e);
      }
    } catch {
      /* ignore */
    }
  }

  return entries;
}

/**
 * @returns {Promise<{ source: 'cache_semantic', content: string, cacheEntryId: string, similarity: number } | null>}
 */
async function lookupSemantic(query, surface) {
  if (!CACHE_ENABLED) return null;
  const qNorm = normalizeAgentQuery(query);
  if (!qNorm || qNorm.length < 8) return null;

  const embedding = await embedOne(query);
  if (!embedding) return null;

  const scope = cacheScope(surface);
  const entries = await loadSemanticEntries(scope);
  let best = null;

  for (const e of entries) {
    if (e.thumbsDown >= 2) continue;
    const sim = cosine(embedding, e.embedding);
    if (sim >= SIM_THRESHOLD && (!best || sim > best.similarity)) {
      best = {
        source: 'cache_semantic',
        content: e.answer,
        cacheEntryId: e.id,
        similarity: sim,
      };
    }
  }

  return best;
}

async function storeExact(query, answer, surface, entryId) {
  const qNorm = normalizeAgentQuery(query);
  if (!qNorm || !answer) return null;
  const scope = cacheScope(surface);
  const id = entryId || `exact:${scope}:${hashQueryKey(qNorm)}`;
  const payload = JSON.stringify({ id, answer, qNorm, surface: scope });
  const memKey = exactMemoryKey(scope, qNorm);
  memoryExact.set(memKey, { answer, expiresAt: Date.now() + EXACT_TTL_SEC * 1000 });
  await redisSet(`agent:cache:exact:${scope}:${hashQueryKey(qNorm)}`, payload, EXACT_TTL_SEC);
  return id;
}

async function storeSemantic(query, answer, surface) {
  if (!CACHE_ENABLED) return null;
  const qNorm = normalizeAgentQuery(query);
  if (!qNorm || qNorm.length < 12 || !answer || answer.length < 40) return null;

  const embedding = await embedOne(query);
  if (!embedding) return null;

  const scope = cacheScope(surface);
  const id = randomUUID();
  const entry = {
    id,
    qNorm,
    embedding,
    answer: answer.slice(0, 4000),
    surface: scope,
    thumbsUp: 0,
    thumbsDown: 0,
    createdAt: Date.now(),
  };

  memorySem.set(id, entry);
  while (memorySem.size > MAX_ENTRIES) {
    const first = memorySem.keys().next().value;
    if (first) memorySem.delete(first);
  }

  await redisSet(`agent:cache:sem:${id}`, JSON.stringify(entry), TTL_SEC);

  const listKey = `agent:cache:sem:ids:${scope}`;
  let ids = [];
  const raw = await redisGet(listKey);
  if (raw) {
    try {
      ids = JSON.parse(raw);
    } catch {
      ids = [];
    }
  }
  if (!Array.isArray(ids)) ids = [];
  ids.unshift(id);
  ids = ids.slice(0, MAX_ENTRIES);
  await redisSet(listKey, JSON.stringify(ids), TTL_SEC);

  return id;
}

/**
 * Lưu câu trả lời LLM vào cache (P2 write path).
 */
async function cacheAgentResponse({ query, answer, surface }) {
  if (!CACHE_ENABLED || !query || !answer) return null;
  const exact = await lookupExact(query, surface);
  if (exact) return exact.cacheEntryId;
  return storeSemantic(query, answer, surface);
}

async function invalidateCacheEntry(entryId) {
  if (!entryId) return;
  memorySem.delete(entryId);
  await redisDel(`agent:cache:sem:${entryId}`);
  if (String(entryId).startsWith('exact:')) {
    /* exact keys use hash — drop from memory by prefix scan */
    for (const [k] of memoryExact.entries()) {
      if (k.includes(entryId.split(':').pop())) memoryExact.delete(k);
    }
  }
}

async function invalidateByQuery(query, surface) {
  const qNorm = normalizeAgentQuery(query);
  if (!qNorm) return;
  const scope = cacheScope(surface);
  memoryExact.delete(exactMemoryKey(scope, qNorm));
  await redisDel(`agent:cache:exact:${scope}:${hashQueryKey(qNorm)}`);

  const embedding = await embedOne(query);
  if (!embedding) return;
  const entries = await loadSemanticEntries(scope);
  for (const e of entries) {
    if (cosine(embedding, e.embedding) >= SIM_THRESHOLD - 0.05) {
      await invalidateCacheEntry(e.id);
    }
  }
}

async function recordCacheFeedback(entryId, rating) {
  const entry = memorySem.get(entryId);
  if (entry) {
    if (rating === 1) entry.thumbsUp += 1;
    if (rating === -1) entry.thumbsDown += 1;
    if (entry.thumbsDown >= 2) {
      await invalidateCacheEntry(entryId);
      return;
    }
    await redisSet(`agent:cache:sem:${entryId}`, JSON.stringify(entry), TTL_SEC);
  }
}

module.exports = {
  lookupExact,
  lookupSemantic,
  storeExact,
  cacheAgentResponse,
  invalidateCacheEntry,
  invalidateByQuery,
  recordCacheFeedback,
  CACHE_ENABLED,
  SIM_THRESHOLD,
};
