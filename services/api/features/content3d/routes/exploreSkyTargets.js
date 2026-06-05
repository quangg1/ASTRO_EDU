const express = require('express');
const path = require('path');
const fs = require('fs');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const SkyExploreContentBundle = require('../models/SkyExploreContentBundle');
const { normalizePanelConfig } = require('../services/panelConfigNormalize');

const router = express.Router();

let cachedSeed = null;

function loadSkySeed() {
  if (cachedSeed) return cachedSeed;
  const filePath = path.join(__dirname, '../../../data/skyExploreSeed.json');
  const raw = fs.readFileSync(filePath, 'utf8');
  cachedSeed = JSON.parse(raw);
  return cachedSeed;
}

function normalizeTargetId(raw) {
  const id = String(raw || '').trim();
  if (!id || id.length > 120) return null;
  return id;
}

function normalizeSkyContentItem(raw) {
  const targetId = normalizeTargetId(raw?.targetId);
  if (!targetId) return null;
  const nameVi = String(raw?.nameVi || '').trim().slice(0, 200);
  const museumBlurbVi = String(raw?.museumBlurbVi || '').trim().slice(0, 4000);
  const conceptHints = (Array.isArray(raw?.conceptHints) ? raw.conceptHints : [])
    .map((x) => String(x || '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 24);
  return {
    targetId,
    nameVi,
    museumBlurbVi,
    conceptHints,
    panelConfig: normalizePanelConfig(raw?.panelConfig),
    published: raw?.published !== false,
  };
}

function itemsToContentMap(items) {
  const map = {};
  for (const row of items || []) {
    const n = normalizeSkyContentItem(row);
    if (!n || !n.published) continue;
    map[n.targetId] = {
      targetId: n.targetId,
      nameVi: n.nameVi,
      museumBlurbVi: n.museumBlurbVi,
      conceptHints: n.conceptHints,
      panelConfig: n.panelConfig,
      published: true,
    };
  }
  return map;
}

function mergeSeedTargets(seedTargets, contentMap) {
  return (seedTargets || []).map((t) => {
    const id = String(t?.id || '').trim();
    const c = contentMap[id];
    if (!c) return t;
    return {
      ...t,
      nameVi: c.nameVi || t.nameVi,
      museumBlurbVi: c.museumBlurbVi || undefined,
      conceptHints: c.conceptHints?.length ? c.conceptHints : t.conceptHints,
      panelConfig: c.panelConfig || undefined,
    };
  });
}

async function loadPublishedContentMap() {
  try {
    const doc = await SkyExploreContentBundle.findOne({ slug: 'main' }).lean();
    const items = Array.isArray(doc?.items) ? doc.items : [];
    return itemsToContentMap(items);
  } catch {
    return {};
  }
}

/** Public catalog for La bàn chòm sao — astronomy seed + CMS copy overrides. */
router.get('/', async (_req, res) => {
  try {
    const data = loadSkySeed();
    const contentById = await loadPublishedContentMap();
    const targets = mergeSeedTargets(data.targets || [], contentById);
    res.json({
      version: data.version,
      attribution: data.attribution,
      targets,
      contentById,
    });
  } catch (err) {
    res.status(500).json({ error: 'sky_targets_unavailable', message: String(err?.message || err) });
  }
});

router.get('/editor', authMiddleware, requireRole('teacher', 'admin'), async (_req, res) => {
  try {
    const seed = loadSkySeed();
    const doc = await SkyExploreContentBundle.findOne({ slug: 'main' }).lean();
    const saved = Array.isArray(doc?.items) ? doc.items : [];
    const byId = new Map();
    for (const row of saved) {
      const n = normalizeSkyContentItem(row);
      if (!n) continue;
      byId.set(n.targetId, n);
    }
    const catalog = (seed.targets || []).map((t) => ({
      targetId: t.id,
      kind: t.kind,
      nameVi: t.nameVi,
      nameEn: t.nameEn || '',
    }));
    const items = Array.from(byId.values()).sort((a, b) => a.targetId.localeCompare(b.targetId));
    res.json({ success: true, data: { items, catalog } });
  } catch (err) {
    console.error('GET explore/sky-targets/editor error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.put('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const raw = req.body?.items;
    if (!Array.isArray(raw)) {
      return res.status(400).json({ success: false, error: 'items phải là mảng' });
    }
    const seen = new Set();
    const items = [];
    const invalid = [];
    for (const row of raw) {
      const n = normalizeSkyContentItem(row);
      if (!n) {
        invalid.push(String(row?.targetId || ''));
        continue;
      }
      if (seen.has(n.targetId)) continue;
      seen.add(n.targetId);
      items.push(n);
    }
    items.sort((a, b) => a.targetId.localeCompare(b.targetId));
    await SkyExploreContentBundle.updateOne(
      { slug: 'main' },
      { $set: { items } },
      { upsert: true },
    );
    res.json({ success: true, data: { items, invalidTargetIds: invalid.filter(Boolean) } });
  } catch (err) {
    console.error('PUT explore/sky-targets/editor error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
