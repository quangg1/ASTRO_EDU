const mongoose = require('mongoose');
const { normalizeQueryString } = require('../../community/lib/postListQuery');
const Post = require('../../community/models/Post');
const Forum = require('../../community/models/Forum');
const { getLearningPathLessonIndex } = require('./toolAuthorizers/lpCurriculum');
const { appendCommunityPostChunk, callRagSearch } = require('./ragIndexService');

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function snippetFromText(text, maxLen = 140) {
  const t = stripHtml(text);
  if (!t) return '';
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t;
}

/**
 * @param {Array<{ source?: string, text?: string, score?: number }>} hits
 * @param {number} limit
 */
async function mapLpRagHitsToLessons(hits, limit) {
  const { byId } = await getLearningPathLessonIndex();
  const bestByLesson = new Map();

  for (const h of hits || []) {
    const src = String(h.source || '');
    if (!src.startsWith('lp/')) continue;
    const lessonId = src.slice(3).split('/')[0];
    if (!lessonId) continue;
    const score = Number(h.score) || 0;
    const prev = bestByLesson.get(lessonId);
    if (prev && prev.score >= score) continue;
    const hit = byId.get(lessonId);
    if (!hit) continue;
    bestByLesson.set(lessonId, {
      score,
      lessonId: hit.lessonId,
      title: hit.titleVi || hit.lessonId,
      moduleId: hit.moduleId,
      nodeId: hit.nodeId,
      href: `/tutorial/${encodeURIComponent(hit.moduleId)}/${encodeURIComponent(hit.nodeId)}/${encodeURIComponent(hit.lessonId)}`,
      snippet: snippetFromText(h.text || hit.titleVi),
    });
  }

  return [...bestByLesson.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _s, ...rest }) => rest);
}

/**
 * @param {Array<{ source?: string, text?: string, score?: number }>} hits
 * @param {number} limit
 */
async function mapCommunityRagHitsToThreads(hits, limit) {
  const bestByPost = new Map();

  for (const h of hits || []) {
    const src = String(h.source || '');
    if (!src.startsWith('community/')) continue;
    const postId = src.slice(10).split('/')[0];
    if (!postId) continue;
    const score = Number(h.score) || 0;
    const prev = bestByPost.get(postId);
    if (prev && prev.score >= score) continue;
    bestByPost.set(postId, { score, postId, snippet: snippetFromText(h.text) });
  }

  const ids = [...bestByPost.entries()]
    .sort((a, b) => b[1].score - a[1].score)
    .slice(0, limit)
    .map(([id]) => id);
  if (!ids.length) return [];

  const objectIds = ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
  const posts = await Post.find({ _id: { $in: objectIds }, isHidden: { $ne: true } }).lean();
  const forums = await Forum.find().lean();
  const forumById = new Map(forums.map((f) => [String(f._id), f]));

  return ids
    .map((id) => {
      const p = posts.find((row) => String(row._id) === id);
      if (!p) return null;
      const meta = bestByPost.get(id);
      const forum = forumById.get(String(p.forumId));
      return {
        postId: id,
        title: p.title,
        forumSlug: forum?.slug || 'hoi-dap-hoc-tap',
        href: `/community/post/${id}`,
        voteCount: p.voteCount ?? 0,
        commentCount: p.commentCount ?? 0,
        contextTitle: p.contextTitle || null,
        snippet: meta?.snippet || snippetFromText(p.content),
      };
    })
    .filter(Boolean);
}

function postRowToCommunityThread(p) {
  const id = String(p._id);
  return {
    postId: id,
    title: p.title,
    forumSlug: p.forumSlug || 'hoi-dap-hoc-tap',
    href: `/community/post/${id}`,
    voteCount: p.voteCount ?? 0,
    commentCount: p.commentCount ?? 0,
    contextTitle: p.contextTitle || null,
    snippet: snippetFromText(p.content),
  };
}

/** Khớp title/content (tin RSS có credit X-ray trong body). */
function mergeCommunityThreadResults(lexical, semantic, limit) {
  const seen = new Set();
  const out = [];
  for (const row of [...lexical, ...semantic]) {
    if (!row?.postId || seen.has(row.postId)) continue;
    seen.add(row.postId);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

async function searchCommunityLexicalForAgent(opts = {}) {
  const q = normalizeQueryString(opts.q);
  if (!q) return [];
  const limit = Math.min(5, Math.max(1, opts.limit || 3));
  const { searchCommunityPosts } = require('../../community/services/communitySearchService');
  const { data } = await searchCommunityPosts({
    q,
    scope: 'all',
    sort: 'newest',
    page: 1,
    limit: Math.max(limit, 8),
  });
  return (data || []).slice(0, limit).map(postRowToCommunityThread);
}

/**
 * Index post cộng đồng (thảo luận + tin RSS) khớp q (lần đầu) rồi search lại bằng RAG.
 * @param {string} q
 * @param {number} bootstrapLimit
 */
async function bootstrapCommunityRagForQuery(q, bootstrapLimit = 12) {
  const { searchCommunityPosts } = require('../../community/services/communitySearchService');
  const { data } = await searchCommunityPosts({
    q,
    scope: 'all',
    sort: 'top',
    page: 1,
    limit: bootstrapLimit,
  });
  let indexed = 0;
  for (const p of data || []) {
    try {
      const r = await appendCommunityPostChunk(p);
      if (r?.ok) indexed += 1;
    } catch (e) {
      console.warn('[contentSearch] community index', p._id, e.message);
    }
  }
  return indexed;
}

/**
 * @param {{ q: string, limit?: number }} opts
 */
async function searchLpLessonsForAgent(opts = {}) {
  const q = normalizeQueryString(opts.q);
  if (!q) return [];
  const limit = Math.min(5, Math.max(1, opts.limit || 3));
  const topK = Math.min(40, Math.max(limit * 6, 12));

  let hits = [];
  try {
    const res = await callRagSearch({
      query: q,
      top_k: topK,
      source_prefixes: ['lp/'],
    });
    hits = res.hits || [];
  } catch (e) {
    console.warn('[contentSearch] LP RAG search failed:', e.message);
    return [];
  }

  const lessons = await mapLpRagHitsToLessons(hits, limit);
  if (!lessons.length) {
    console.warn(
      '[contentSearch] No LP RAG hits — kiểm tra EMBEDDING_URL, rag_index có source lp/{lessonId} (npm run rag:build hoặc lưu bài LP).',
    );
  }
  return lessons;
}

/**
 * @param {{ q: string, limit?: number }} opts
 */
async function searchCommunityByQueryForAgent(opts = {}) {
  const q = normalizeQueryString(opts.q);
  if (!q) return [];
  const limit = Math.min(5, Math.max(1, opts.limit || 3));
  const topK = Math.min(40, Math.max(limit * 6, 12));

  const lexical = await searchCommunityLexicalForAgent({ q, limit });

  let hits = [];
  try {
    const res = await callRagSearch({
      query: q,
      top_k: topK,
      source_prefixes: ['community/'],
    });
    hits = res.hits || [];
  } catch (e) {
    console.warn('[contentSearch] community RAG search failed:', e.message);
    return lexical;
  }

  let semantic = await mapCommunityRagHitsToThreads(hits, limit);
  let merged = mergeCommunityThreadResults(lexical, semantic, limit);
  if (merged.length) return merged;

  const indexed = await bootstrapCommunityRagForQuery(q, 15);
  if (indexed > 0) {
    try {
      const retry = await callRagSearch({
        query: q,
        top_k: topK,
        source_prefixes: ['community/'],
      });
      semantic = await mapCommunityRagHitsToThreads(retry.hits || [], limit);
      merged = mergeCommunityThreadResults(lexical, semantic, limit);
    } catch (e) {
      console.warn('[contentSearch] community RAG retry failed:', e.message);
    }
  }

  return merged.length ? merged : lexical;
}

const VALID_SCOPES = new Set(['lp', 'community']);

/**
 * @param {{ q: string, scopes?: string[], limitPerScope?: number }} opts
 */
async function searchLearningContentForAgent(opts = {}) {
  const q = typeof opts.q === 'string' ? opts.q.trim() : '';
  const rawScopes = Array.isArray(opts.scopes) ? opts.scopes : ['lp', 'community'];
  const scopes = rawScopes.map((s) => String(s).toLowerCase()).filter((s) => VALID_SCOPES.has(s));
  const useScopes = scopes.length ? scopes : ['lp', 'community'];
  const limit = Math.min(5, Math.max(1, opts.limitPerScope || 3));

  const out = { lpLessons: [], communityThreads: [] };
  if (q.length < 2) return out;

  const tasks = [];
  if (useScopes.includes('lp')) {
    tasks.push(
      searchLpLessonsForAgent({ q, limit })
        .then((rows) => {
          out.lpLessons = rows;
        })
        .catch((e) => {
          console.warn('[contentSearch] LP scope failed:', e.message);
        }),
    );
  }
  if (useScopes.includes('community')) {
    tasks.push(
      searchCommunityByQueryForAgent({ q, limit })
        .then((rows) => {
          out.communityThreads = rows;
        })
        .catch((e) => {
          console.warn('[contentSearch] community scope failed:', e.message);
        }),
    );
  }
  await Promise.all(tasks);
  return out;
}

module.exports = {
  searchLpLessonsForAgent,
  searchCommunityByQueryForAgent,
  searchLearningContentForAgent,
};
