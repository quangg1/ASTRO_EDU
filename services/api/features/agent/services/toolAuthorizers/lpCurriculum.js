const {
  getMainCurriculum,
} = require('../../../learning-path/services/learningPathQueryService');
const { collectLpLessons } = require('../../../learning-path/lib/collectLpLessons');

let cachedIds = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

async function getLearningPathLessonIndex() {
  const now = Date.now();
  if (cachedIds && now - cachedAt < CACHE_MS) return cachedIds;
  const doc = await getMainCurriculum();
  const byId = new Map();
  const byConceptId = new Map();
  const allIds = [];
  const concepts = new Map();
  for (const c of doc?.concepts || []) {
    const cid = String(c?.id || '').trim();
    if (!cid) continue;
    concepts.set(cid, {
      conceptId: cid,
      title: c.title || c.titleVi || cid,
    });
  }
  for (const { mod, node, lesson, depth } of collectLpLessons(doc)) {
    const id = String(lesson.id || '').trim();
    if (!id) continue;
    allIds.push(id);
    const conceptIds = [
      ...(lesson.conceptIds || []),
      ...(lesson.conceptAnchors || []).map((a) => a?.conceptId).filter(Boolean),
    ]
      .map(String)
      .filter(Boolean);
    const uniqueConcepts = [...new Set(conceptIds)];
    const sections = (lesson.sections || []).map((s) => ({
      id: String(s?.id || ''),
      title: s?.title || s?.subtitle || '',
      excerpt: String(s?.body || s?.content || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 400),
    }));
    byId.set(id, {
      lessonId: id,
      titleVi: lesson.titleVi || lesson.title || '',
      body: lesson.body || '',
      moduleId: mod.id,
      nodeId: node.id,
      depth: depth || null,
      conceptIds: uniqueConcepts,
      sections,
      sectionTitles: sections.map((s) => s.title).filter(Boolean).slice(0, 8),
    });
    for (const cid of uniqueConcepts) {
      if (!byConceptId.has(cid)) byConceptId.set(cid, []);
      byConceptId.get(cid).push(id);
    }
  }
  cachedIds = { byId, allIds, concepts, byConceptId };
  cachedAt = now;
  return cachedIds;
}

module.exports = { getLearningPathLessonIndex };
