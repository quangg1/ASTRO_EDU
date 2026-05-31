const ShowcaseCatalogBundle = require('../models/ShowcaseCatalogBundle');
const ExploreContextualQuestionPool = require('../models/ExploreContextualQuestionPool');
const Concept = require('../../concepts/models/Concept');
const UserProgress = require('../../learning-path/models/UserProgress');
const { buildExploreContextualQuizTemplate } = require('../lib/buildExploreContextualQuizTemplate');
const { generateExploreContextualQuizFromContext } = require('../../../lib/ai/tasks/generateExploreContextualQuiz');

const GROUP_LABEL_VI = {
  planets_moons: 'Hành tinh · vệ tinh',
  dwarf_asteroids: 'Hành tinh lùn · tiểu hành tinh',
  comets: 'Sao chổi',
  spacecraft: 'Tàu vũ trụ',
};

const PICK_LIMIT = 2;
const RECENT_KEEP = 4;
const MAX_POOL_SIZE = 20;
const AI_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const AI_POOL_FULL_COUNT = 6;
const TEMPLATE_SEED_LIMIT = 8;

function questionKey(q) {
  return String(q?.question || '')
    .trim()
    .toLowerCase();
}

function mergeQuestions(existing, incoming) {
  const seen = new Set((existing || []).map(questionKey));
  const out = [...(existing || [])];
  for (const q of incoming || []) {
    const k = questionKey(q);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(q);
  }
  return out.slice(0, MAX_POOL_SIZE);
}

function shuffleRandom(items) {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickQuestions(poolQuestions, recentIds, limit = PICK_LIMIT) {
  const recent = new Set(recentIds || []);
  const fresh = poolQuestions.filter((q) => q?.id && !recent.has(q.id));
  const source = fresh.length >= limit ? fresh : poolQuestions;
  return shuffleRandom(source).slice(0, limit);
}

async function loadShowcaseBundle() {
  return ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
}

function resolveCatalogEntry(bundle, entityId) {
  const catalog = bundle?.catalog || [];
  const orbits = bundle?.orbits || [];
  const row = catalog.find((c) => String(c?.id || '').trim() === entityId);
  const orbit = orbits.find((o) => String(o?.id || '').trim() === entityId);
  const displayName = String(row?.nameVi || row?.name || entityId).trim();
  const resolvedCatalog = catalog.map((c) => ({
    ...c,
    id: String(c?.id || '').trim(),
    displayName: String(c?.nameVi || c?.name || c?.id || '').trim(),
  }));
  const item = row
    ? {
        ...row,
        id: entityId,
        displayName,
        group: row.group || 'planets_moons',
      }
    : null;
  return { item, orbit: orbit || null, resolvedCatalog };
}

async function loadConceptsForEntity(item) {
  const ids = Array.isArray(item?.panelConfig?.conceptTagIds)
    ? item.panelConfig.conceptTagIds.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  if (!ids.length) return [];
  const rows = await Concept.find({ id: { $in: ids }, published: { $ne: false } })
    .select('id title short_description')
    .lean();
  return rows.map((c) => ({ id: c.id, title: String(c.title || '').trim() }));
}

function buildAiContext(entityId, item, orbit, concepts) {
  const periodRaw = Number(
    orbit?.orbitalElements?.periodDays ?? orbit?.periodDays ?? orbit?.period ?? NaN,
  );
  return {
    entityId,
    displayName: item?.displayName || entityId,
    museumBlurbVi: String(item?.museumBlurbVi || '').trim(),
    groupLabelVi: GROUP_LABEL_VI[item?.group] || '',
    linkedPlanetName: String(item?.linkedPlanetName || orbit?.orbitAround || '').trim(),
    periodDays: Number.isFinite(periodRaw) && periodRaw > 0 ? periodRaw : null,
    conceptTitles: (concepts || []).map((c) => c.title).filter(Boolean),
  };
}

async function ensureTemplatePool(entityId) {
  const bundle = await loadShowcaseBundle();
  const { item, orbit, resolvedCatalog } = resolveCatalogEntry(bundle, entityId);
  if (!item) return null;

  const concepts = await loadConceptsForEntity(item);
  const templateQs = buildExploreContextualQuizTemplate({
    entityId,
    item,
    orbit,
    concepts,
    catalog: resolvedCatalog,
    limit: TEMPLATE_SEED_LIMIT,
  });
  if (templateQs.length < 1) return null;

  const existing = await ExploreContextualQuestionPool.findOne({ entityId }).lean();
  const merged = mergeQuestions(existing?.questions || [], templateQs);
  const doc = await ExploreContextualQuestionPool.findOneAndUpdate(
    { entityId },
    {
      $set: {
        questions: merged,
        source: existing?.aiGenerationCount ? 'mixed' : 'template_seed',
        templateSeededAt: existing?.templateSeededAt || new Date(),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();
  return doc;
}

async function getRecentQuestionIds(userId, entityId) {
  if (!userId) return [];
  const doc = await UserProgress.findOne({ userId }).select('exploreQuizRecentByEntity').lean();
  const map = doc?.exploreQuizRecentByEntity;
  if (!map || typeof map !== 'object') return [];
  const rows = map[entityId];
  return Array.isArray(rows) ? rows.map((x) => String(x || '').trim()).filter(Boolean) : [];
}

async function recordRecentQuestionIds(userId, entityId, questionIds) {
  if (!userId || !entityId || !questionIds?.length) return;
  const doc = await UserProgress.findOne({ userId }).select('exploreQuizRecentByEntity').lean();
  const map =
    doc?.exploreQuizRecentByEntity && typeof doc.exploreQuizRecentByEntity === 'object'
      ? { ...doc.exploreQuizRecentByEntity }
      : {};
  const prev = Array.isArray(map[entityId]) ? map[entityId] : [];
  const next = [...questionIds, ...prev.filter((id) => !questionIds.includes(id))].slice(0, RECENT_KEEP);
  map[entityId] = next;
  await UserProgress.findOneAndUpdate(
    { userId },
    { $set: { exploreQuizRecentByEntity: map } },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

/**
 * Hot path Explore — KHÔNG gọi AI. Đọc pool; seed template nếu trống.
 */
async function deliverExploreContextualQuiz(entityId, userId) {
  const id = String(entityId || '').trim();
  if (!id) {
    return { ok: false, status: 400, code: 'INVALID_ENTITY', error: 'Thiếu entityId' };
  }

  let pool = await ExploreContextualQuestionPool.findOne({ entityId: id }).lean();
  if (!pool || !Array.isArray(pool.questions) || pool.questions.length < 1) {
    pool = await ensureTemplatePool(id);
  }
  if (!pool || !pool.questions?.length) {
    return { ok: false, status: 404, code: 'NO_QUESTIONS', error: 'Chưa có câu quiz cho thiên thể này' };
  }

  const recent = await getRecentQuestionIds(userId, id);
  const questions = pickQuestions(pool.questions, recent, PICK_LIMIT);
  if (userId && questions.length) {
    await recordRecentQuestionIds(
      userId,
      id,
      questions.map((q) => q.id).filter(Boolean),
    );
  }

  return {
    ok: true,
    questions,
    poolSize: pool.questions.length,
    source: pool.source || 'pool',
  };
}

function countNonTemplateQuestions(questions) {
  return (questions || []).filter((q) => !String(q?.id || '').includes('explore_tpl')).length;
}

function aiCooldownRemainingMs(pool) {
  if (!pool?.lastAiAttemptAt) return 0;
  const elapsed = Date.now() - new Date(pool.lastAiAttemptAt).getTime();
  return Math.max(0, AI_COOLDOWN_MS - elapsed);
}

/**
 * Batch / editor only — gọi AI có cooldown & skip khi pool đủ.
 */
async function generateExploreContextualQuizPool(entityId, opts = {}) {
  const id = String(entityId || '').trim();
  const force = Boolean(opts.force);
  if (!id) {
    return { ok: false, status: 400, code: 'INVALID_ENTITY', error: 'Thiếu entityId' };
  }

  const bundle = await loadShowcaseBundle();
  const { item, orbit } = resolveCatalogEntry(bundle, id);
  if (!item) {
    return { ok: false, status: 404, code: 'ENTITY_NOT_FOUND', error: 'Không tìm thấy entity trong catalog' };
  }

  let pool = await ExploreContextualQuestionPool.findOne({ entityId: id });
  if (!pool) {
    await ensureTemplatePool(id);
    pool = await ExploreContextualQuestionPool.findOne({ entityId: id });
  }

  const cooldownMs = aiCooldownRemainingMs(pool);
  if (!force && cooldownMs > 0) {
    return {
      ok: false,
      status: 429,
      code: 'AI_COOLDOWN',
      error: `Entity này vừa sinh AI — thử lại sau ${Math.ceil(cooldownMs / 3600000)} giờ`,
      cooldownMs,
    };
  }

  const aiCount = countNonTemplateQuestions(pool?.questions);
  if (!force && aiCount >= AI_POOL_FULL_COUNT) {
    return {
      ok: false,
      status: 409,
      code: 'POOL_FULL',
      error: 'Pool đã đủ câu AI — không sinh thêm',
      poolSize: pool?.questions?.length || 0,
    };
  }

  await ExploreContextualQuestionPool.updateOne(
    { entityId: id },
    { $set: { lastAiAttemptAt: new Date() } },
    { upsert: true },
  );

  const concepts = await loadConceptsForEntity(item);
  const context = buildAiContext(id, item, orbit, concepts);
  const gen = await generateExploreContextualQuizFromContext(context);
  if (!gen.ok) {
    return gen;
  }

  const merged = mergeQuestions(pool?.questions || [], gen.questions);
  const updated = await ExploreContextualQuestionPool.findOneAndUpdate(
    { entityId: id },
    {
      $set: {
        questions: merged,
        source: 'mixed',
        aiGeneratedAt: new Date(),
      },
      $inc: { aiGenerationCount: 1 },
    },
    { upsert: true, new: true },
  ).lean();

  return {
    ok: true,
    provider: gen.provider,
    added: gen.questions.length,
    poolSize: updated.questions.length,
    entityId: id,
    displayName: item.displayName,
  };
}

module.exports = {
  deliverExploreContextualQuiz,
  generateExploreContextualQuizPool,
  ensureTemplatePool,
  AI_COOLDOWN_MS,
  AI_POOL_FULL_COUNT,
};
