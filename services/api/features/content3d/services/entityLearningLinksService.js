const path = require('path');
const fs = require('fs');
const { AppError } = require('../../../shared/errors');
const conceptService = require('../../concepts/services/conceptService');
const learningPathContent = require('../../learning-path/services/learningPathContentService');
const catalogService = require('./showcaseCatalogService');
const skyTargetService = require('./skyTargetService');
const {
  resolveEntityLearningLinks,
  buildLearningLinkCoverage,
} = require('../lib/entityLearningLinks');

const HINTS_PATH = path.join(__dirname, '../../../data/showcaseEntityConceptHints.json');
const ENTITY_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,119}$/i;

let cachedHints = null;
function loadStaticHints() {
  if (!cachedHints) cachedHints = JSON.parse(fs.readFileSync(HINTS_PATH, 'utf8')).hints || {};
  return cachedHints;
}

/** Lộ trình chưa publish thì Explore vẫn chạy — chỉ là chưa có bài để nối. */
async function loadPublishedModules() {
  try {
    const published = await learningPathContent.getPublishedPath({ userRole: null });
    return published.modules || [];
  } catch (err) {
    if (err instanceof AppError && err.status === 404) return [];
    throw err;
  }
}

/** Entity hệ Mặt Trời nằm trong catalog bundle; chòm sao / sao nằm trong sky catalog. */
async function loadEntitySources(entityId) {
  const bundle = await catalogService.getBundle();
  const row = (bundle?.catalog || []).find((c) => String(c?.id || '').trim() === entityId);
  if (row) {
    return { found: true, panelConfig: row.panelConfig || null, hints: loadStaticHints()[entityId] || [] };
  }
  const sky = await skyTargetService.getPublicCatalog();
  const target = (sky.targets || []).find((t) => String(t?.id || '').trim() === entityId);
  if (target) {
    return { found: true, panelConfig: target.panelConfig || null, hints: target.conceptHints || [] };
  }
  return { found: false, panelConfig: null, hints: loadStaticHints()[entityId] || [] };
}

async function describeConcepts(conceptIds) {
  if (!conceptIds.length) return [];
  const rows = await conceptService.listConceptsByIds(conceptIds);
  const byId = new Map(
    rows.filter((c) => c.published !== false).map((c) => [String(c.id), String(c.title || '').trim()]),
  );
  return conceptIds.filter((id) => byId.has(id)).map((id) => ({ id, title: byId.get(id) }));
}

/**
 * Nguồn sự thật duy nhất cho "entity này dạy gì": concept + bài học,
 * kèm nguồn của từng liên kết để client và Studio biết cái nào là đoán.
 */
async function getEntityLearningLinks(entityIdRaw) {
  const entityId = String(entityIdRaw || '').trim();
  if (!ENTITY_ID_PATTERN.test(entityId)) throw AppError.badRequest('entityId không hợp lệ');

  const [sources, modules] = await Promise.all([loadEntitySources(entityId), loadPublishedModules()]);
  const hasCmsConcepts = Array.isArray(sources.panelConfig?.conceptTagIds)
    && sources.panelConfig.conceptTagIds.length > 0;
  const hintConceptIds = hasCmsConcepts
    ? []
    : (await conceptService.findConceptsMatchingHints(sources.hints, { limit: 12 })).map((c) => c.id);

  const links = resolveEntityLearningLinks({
    entityId,
    panelConfig: sources.panelConfig,
    modules,
    hintConceptIds,
  });

  return {
    entityId,
    known: sources.found,
    explicit: links.explicit,
    conceptSource: links.conceptSource,
    concepts: await describeConcepts(links.conceptIds),
    lessons: links.lessons,
  };
}

/** Báo cáo cho Studio: entity chưa gắn nội dung học + bài học trỏ tới entity không tồn tại. */
async function getLearningLinkCoverage() {
  const [bundle, sky, modules] = await Promise.all([
    catalogService.getBundle(),
    skyTargetService.getPublicCatalog(),
    loadPublishedModules(),
  ]);
  const entities = [
    ...(bundle?.catalog || []).map((c) => ({
      entityId: String(c?.id || '').trim(),
      nameVi: c?.nameVi || c?.name || '',
      panelConfig: c?.panelConfig || null,
    })),
    ...(sky.targets || []).map((t) => ({
      entityId: String(t?.id || '').trim(),
      nameVi: t?.nameVi || t?.name || '',
      panelConfig: t?.panelConfig || null,
    })),
  ].filter((e) => e.entityId);
  return buildLearningLinkCoverage({ entities, modules });
}

module.exports = { getEntityLearningLinks, getLearningLinkCoverage };
