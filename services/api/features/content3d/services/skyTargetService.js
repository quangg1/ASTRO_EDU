const path = require('path');
const fs = require('fs');
const { skyExploreContentRepository } = require('../repositories/skyExploreContentRepository');
const { normalizePanelConfig } = require('../lib/skyPanelNormalize');
const { trimTo } = require('../lib/showcaseFieldNormalize');

const SEED_PATH = path.join(__dirname, '../../../data/skyExploreSeed.json');
const MAX_CONCEPT_HINTS = 24;

/** Seed thiên văn là file tĩnh đọc-một-lần; nội dung biên tập nằm trong DB. */
let cachedSeed = null;

function loadSkySeed() {
  if (!cachedSeed) cachedSeed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  return cachedSeed;
}

function normalizeSkyContentItem(raw) {
  const targetId = String(raw?.targetId || '').trim();
  if (!targetId || targetId.length > 120) return null;

  return {
    targetId,
    nameVi: trimTo(raw?.nameVi, 200),
    museumBlurbVi: trimTo(raw?.museumBlurbVi, 4000),
    conceptHints: (Array.isArray(raw?.conceptHints) ? raw.conceptHints : [])
      .map((hint) => String(hint || '').trim().toLowerCase())
      .filter(Boolean)
      .slice(0, MAX_CONCEPT_HINTS),
    panelConfig: normalizePanelConfig(raw?.panelConfig),
    published: raw?.published !== false,
  };
}

async function loadPublishedContentMap() {
  try {
    const items = await skyExploreContentRepository.listItems();
    const map = {};
    for (const row of items) {
      const item = normalizeSkyContentItem(row);
      if (item?.published) map[item.targetId] = item;
    }
    return map;
  } catch {
    // Mất kết nối CMS thì vẫn phục vụ được seed thiên văn.
    return {};
  }
}

/** Nội dung biên tập chỉ ghi đè khi thực sự có giá trị, còn lại giữ seed. */
function mergeSeedTargets(seedTargets, contentById) {
  return (seedTargets || []).map((target) => {
    const content = contentById[String(target?.id || '').trim()];
    if (!content) return target;
    return {
      ...target,
      nameVi: content.nameVi || target.nameVi,
      museumBlurbVi: content.museumBlurbVi || undefined,
      conceptHints: content.conceptHints?.length ? content.conceptHints : target.conceptHints,
      panelConfig: content.panelConfig || undefined,
    };
  });
}

async function getPublicCatalog() {
  const seed = loadSkySeed();
  const contentById = await loadPublishedContentMap();
  return {
    version: seed.version,
    attribution: seed.attribution,
    targets: mergeSeedTargets(seed.targets || [], contentById),
    contentById,
  };
}

async function getEditorCatalog() {
  const seed = loadSkySeed();
  const saved = await skyExploreContentRepository.listItems();

  const byId = new Map();
  for (const row of saved) {
    const item = normalizeSkyContentItem(row);
    if (item) byId.set(item.targetId, item);
  }

  return {
    items: [...byId.values()].sort((a, b) => a.targetId.localeCompare(b.targetId)),
    catalog: (seed.targets || []).map((target) => ({
      targetId: target.id,
      kind: target.kind,
      nameVi: target.nameVi,
      nameEn: target.nameEn || '',
    })),
  };
}

async function saveEditorItems(rows) {
  const seen = new Set();
  const items = [];
  const invalidTargetIds = [];

  for (const row of rows) {
    const item = normalizeSkyContentItem(row);
    if (!item) {
      invalidTargetIds.push(String(row?.targetId || ''));
      continue;
    }
    if (seen.has(item.targetId)) continue;
    seen.add(item.targetId);
    items.push(item);
  }

  items.sort((a, b) => a.targetId.localeCompare(b.targetId));
  await skyExploreContentRepository.saveItems(items);

  return { items, invalidTargetIds: invalidTargetIds.filter(Boolean) };
}

module.exports = { getPublicCatalog, getEditorCatalog, saveEditorItems };
