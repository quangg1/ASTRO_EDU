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

async function appendLessonChunk(lessonId, text) {
  const source = `lp/${lessonId}`;
  await deleteChunksBySourcePrefix(source);
  if (!text || text.length < 80) return { ok: false, reason: 'text_too_short' };
  const chunk = `# ${lessonId}\n\n${text}`;
  await aiPost('/knowledge/append', { text: chunk, source });
  await aiPost('/knowledge/reload', {}).catch(() => {});
  return { ok: true, source };
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
          await appendLessonChunk(hit.lessonId, text);
          ok += 1;
        } catch (e) {
          console.warn('[ragIndex] lesson', hit.lessonId, e.message);
        }
      }
      console.log(`[ragIndex] reindexed ${ok} LP lessons`);
    } catch (e) {
      console.error('[ragIndex] scheduleReindexAllLessons:', e);
    }
  });
}

module.exports = {
  deleteChunksBySourcePrefix,
  appendLessonChunk,
  reindexLearningPathLesson,
  scheduleReindexAllLessons,
};
