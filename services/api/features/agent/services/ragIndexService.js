const { getLearningPathLessonIndex } = require('./toolAuthorizers/lpCurriculum');

const AI_URL = (process.env.AI_SERVICE_URL || 'http://127.0.0.1:5005').replace(/\/$/, '');
const TOKEN = (process.env.KNOWLEDGE_ADMIN_TOKEN || '').trim();

function adminHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

function stripHtml(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lessonChunkText(hit) {
  const parts = [hit.titleVi || hit.lessonId || '', hit.body || ''];
  for (const t of hit.sectionTitles || []) parts.push(t);
  return stripHtml(parts.filter(Boolean).join('\n\n')).slice(0, 12000);
}

async function aiPost(path, body) {
  const res = await fetch(`${AI_URL}${path}`, {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || res.statusText);
  return data;
}

/**
 * @param {string} sourcePrefix e.g. lp/lesson-abc
 */
async function deleteChunksBySourcePrefix(sourcePrefix) {
  try {
    return await aiPost('/knowledge/delete-prefix', { source_prefix: sourcePrefix });
  } catch (e) {
    console.warn('[ragIndex] delete-prefix failed:', e.message);
    return { ok: false, removed: 0 };
  }
}

async function appendLessonChunk(lessonId, text, opts = {}) {
  const source = `lp/${lessonId}`;
  await deleteChunksBySourcePrefix(source);
  if (!text || text.length < 80) return { ok: false, reason: 'text_too_short' };
  const chunk = `# ${lessonId}\n\n${text}`;
  await aiPost('/knowledge/append', { text: chunk, source });
  if (!opts.skipReload) await aiPost('/knowledge/reload', {}).catch(() => {});
  return { ok: true, source };
}

function communityPostChunkText(post) {
  const title = String(post?.title || '').trim();
  const body = stripHtml(post?.content || '');
  const tags = Array.isArray(post?.tags) ? post.tags.join(' ') : '';
  const ctx = post?.contextTitle ? String(post.contextTitle) : '';
  const sourceName = post?.sourceName ? String(post.sourceName).trim() : '';
  const categories = Array.isArray(post?.rssCategories) ? post.rssCategories.join(' ') : '';
  const kind = post?.isCrawled || post?.isExternalArticle ? 'tin thiên văn' : 'thảo luận';
  return [title, sourceName, categories, ctx, tags, kind, body].filter(Boolean).join('\n\n').slice(0, 12000);
}

/**
 * @param {{ _id: unknown, title?: string, content?: string, tags?: string[], contextTitle?: string }} post
 */
async function appendCommunityPostChunk(post, opts = {}) {
  const postId = String(post?._id || '').trim();
  if (!postId) return { ok: false, reason: 'missing_id' };
  const source = `community/${postId}`;
  const text = communityPostChunkText(post);
  if (text.length < 40) return { ok: false, reason: 'text_too_short' };
  await deleteChunksBySourcePrefix(source);
  const chunk = `# ${post.title || postId}\n\n${text}`;
  await aiPost('/knowledge/append', { text: chunk, source });
  if (!opts.skipReload) await aiPost('/knowledge/reload', {}).catch(() => {});
  return { ok: true, source };
}

async function fetchKnowledgeStatus() {
  const res = await fetch(`${AI_URL}/knowledge/status`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || res.statusText);
  return data;
}

/**
 * Rebuild RAG đầy đủ cho CosmoLearn: corpus/seed + mọi bài LP + post cộng đồng (thảo luận + tin RSS).
 * Cần: MONGODB_URI, AI_SERVICE_URL, EMBEDDING_URL (qua AI rebuild/append).
 */
async function rebuildFullProjectRagIndex(opts = {}) {
  const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
  const lpMinChars = Math.max(24, parseInt(process.env.LP_RAG_MIN_CHARS || '80', 10) || 80);
  const discussionLimit = Math.max(
    1,
    parseInt(process.env.RAG_COMMUNITY_MAX_POSTS || '500', 10) || 500,
  );
  const newsLimit = Math.max(
    1,
    parseInt(process.env.RAG_NEWS_MAX_POSTS || '300', 10) || 300,
  );

  onProgress('rebuild_corpus', { message: 'Đang build corpus + seed…' });
  const rebuild = await aiPost('/knowledge/rebuild', {});
  onProgress('rebuild_corpus_done', rebuild);

  const { byId } = await getLearningPathLessonIndex();
  let lpOk = 0;
  let lpSkip = 0;
  let lpFail = 0;
  const lpTotal = byId.size;
  let lpI = 0;
  for (const hit of byId.values()) {
    lpI += 1;
    const text = lessonChunkText(hit);
    if (text.length < lpMinChars) {
      lpSkip += 1;
      continue;
    }
    try {
      const r = await appendLessonChunk(hit.lessonId, text, { skipReload: true });
      if (r.ok) lpOk += 1;
      else lpSkip += 1;
    } catch (e) {
      lpFail += 1;
      console.warn('[ragIndex] LP', hit.lessonId, e.message);
    }
    if (lpI % 10 === 0 || lpI === lpTotal) {
      onProgress('lp', { done: lpI, total: lpTotal, ok: lpOk, skip: lpSkip, fail: lpFail });
    }
  }

  const Post = require('../../community/models/Post');
  const Forum = require('../../community/models/Forum');
  const { isNewsForum } = require('../../community/constants/forumCatalog');

  const forums = await Forum.find().lean();
  const discussionIds = forums.filter((f) => !isNewsForum(f)).map((f) => f._id);
  const newsIds = forums.filter((f) => isNewsForum(f)).map((f) => f._id);

  const discussionPosts =
    discussionIds.length > 0
      ? await Post.find({
          forumId: { $in: discussionIds },
          isHidden: { $ne: true },
        })
          .sort({ voteCount: -1, commentCount: -1, createdAt: -1 })
          .limit(discussionLimit)
          .lean()
      : [];

  const newsPosts =
    newsIds.length > 0
      ? await Post.find({
          forumId: { $in: newsIds },
          isHidden: { $ne: true },
        })
          .sort({ publishedAt: -1, createdAt: -1 })
          .limit(newsLimit)
          .lean()
      : [];

  const posts = [...discussionPosts, ...newsPosts];

  let commOk = 0;
  let commSkip = 0;
  let commFail = 0;
  const commTotal = posts.length;
  for (let i = 0; i < posts.length; i += 1) {
    const p = posts[i];
    try {
      const r = await appendCommunityPostChunk(p, { skipReload: true });
      if (r.ok) commOk += 1;
      else commSkip += 1;
    } catch (e) {
      commFail += 1;
      console.warn('[ragIndex] community', p._id, e.message);
    }
    if ((i + 1) % 20 === 0 || i + 1 === commTotal) {
      onProgress('community', {
        done: i + 1,
        total: commTotal,
        ok: commOk,
        skip: commSkip,
        fail: commFail,
      });
    }
  }

  onProgress('reload', { message: 'Đang reload index vào RAM…' });
  await aiPost('/knowledge/reload', {});
  const status = await fetchKnowledgeStatus().catch(() => ({}));

  const summary = {
    ok: true,
    corpus: rebuild,
    lp: { indexed: lpOk, skipped: lpSkip, failed: lpFail, total: lpTotal },
    community: {
      indexed: commOk,
      skipped: commSkip,
      failed: commFail,
      total: commTotal,
      discussion: discussionPosts.length,
      news: newsPosts.length,
      limits: { discussion: discussionLimit, news: newsLimit },
    },
    index: status,
  };
  onProgress('done', summary);
  return summary;
}

const RAG_SEARCH_TIMEOUT_MS = Math.max(
  3000,
  parseInt(process.env.AGENT_RAG_SEARCH_TIMEOUT_MS || '8000', 10) || 8000,
);

/**
 * @param {{ query: string, top_k?: number, source_prefixes?: string[], lesson_id?: string }} opts
 */
async function callRagSearch(opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RAG_SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch(`${AI_URL}/rag/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: opts.query,
        top_k: opts.top_k ?? 12,
        source_prefixes: opts.source_prefixes,
        lesson_id: opts.lesson_id,
      }),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.detail || data.error || res.statusText);
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {string} lessonId
 */
async function reindexLearningPathLesson(lessonId) {
  const { byId } = await getLearningPathLessonIndex();
  const hit = byId.get(String(lessonId).trim());
  if (!hit) return { ok: false, reason: 'lesson_not_found' };
  const text = lessonChunkText(hit);
  return appendLessonChunk(hit.lessonId, text);
}

let reindexAllScheduled = false;

function scheduleReindexAllLessons() {
  if (reindexAllScheduled) return;
  reindexAllScheduled = true;
  setImmediate(async () => {
    reindexAllScheduled = false;
    try {
      const { byId } = await getLearningPathLessonIndex();
      let ok = 0;
      for (const hit of byId.values()) {
        const text = lessonChunkText(hit);
        if (text.length < 80) continue;
        try {
          await appendLessonChunk(hit.lessonId, text, { skipReload: true });
          ok += 1;
        } catch (e) {
          console.warn('[ragIndex] lesson', hit.lessonId, e.message);
        }
      }
      await aiPost('/knowledge/reload', {}).catch(() => {});
      console.log(`[ragIndex] reindexed ${ok} LP lessons`);
    } catch (e) {
      console.error('[ragIndex] scheduleReindexAllLessons:', e);
    }
  });
}

module.exports = {
  deleteChunksBySourcePrefix,
  appendLessonChunk,
  appendCommunityPostChunk,
  callRagSearch,
  fetchKnowledgeStatus,
  rebuildFullProjectRagIndex,
  reindexLearningPathLesson,
  scheduleReindexAllLessons,
};
