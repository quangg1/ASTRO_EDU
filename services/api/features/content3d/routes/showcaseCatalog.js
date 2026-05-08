const express = require('express');
const ShowcaseCatalogBundle = require('../models/ShowcaseCatalogBundle');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');

const router = express.Router();

const GROUPS = new Set(['planets_moons', 'dwarf_asteroids', 'comets', 'spacecraft']);
const MAX_CATALOG = 300;
const MAX_ORBITS = 200;
const MAX_STORIES = 50;

function isSafeHttpUrl(s) {
  const t = String(s || '').trim();
  if (!t) return true;
  try {
    const u = new URL(t);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function normalizeMediaUrlField(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  if (t.startsWith('/files/') && t.length < 500) return t;
  if (!isSafeHttpUrl(t)) return '';
  return t;
}

function normalizeCatalogEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  const name = String(raw.name || '').trim();
  const group = String(raw.group || '').trim();
  if (!id || id.length > 120 || !name || name.length > 200 || !GROUPS.has(group)) return null;
  const out = { id, name, group };
  const lp = String(raw.linkedPlanetName || '').trim();
  if (lp) out.linkedPlanetName = lp.slice(0, 80);
  const tp = String(raw.texturePath || '').trim();
  if (tp && tp.length < 500 && tp.startsWith('/')) out.texturePath = tp;
  const legacyTexture = String(raw.textureUrl || '').trim();
  const diffuseMapUrl =
    normalizeMediaUrlField(raw.diffuseMapUrl) || normalizeMediaUrlField(legacyTexture);
  if (diffuseMapUrl) {
    out.textureUrl = diffuseMapUrl;
    out.diffuseMapUrl = diffuseMapUrl;
  }
  const normalMapUrl = normalizeMediaUrlField(raw.normalMapUrl);
  if (normalMapUrl) out.normalMapUrl = normalMapUrl;
  const specularMapUrl = normalizeMediaUrlField(raw.specularMapUrl);
  if (specularMapUrl) out.specularMapUrl = specularMapUrl;
  const cloudMapUrl = normalizeMediaUrlField(raw.cloudMapUrl);
  if (cloudMapUrl) out.cloudMapUrl = cloudMapUrl;
  const modelUrl = normalizeMediaUrlField(raw.modelUrl);
  if (modelUrl) out.modelUrl = modelUrl;
  out.nameVi = String(raw.nameVi || '').trim();
  out.museumBlurbVi = String(raw.museumBlurbVi || '').trim();
  out.published = raw.published !== false;
  return out;
}

function normalizeStory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  const title = String(raw.title || '').trim();
  const subtitle = String(raw.subtitle || '').trim();
  const detail = String(raw.detail || '').trim();
  const targetPlanetName = String(raw.targetPlanetName || '').trim();
  if (!id || id.length > 120 || !title || !targetPlanetName) return null;
  return {
    id,
    title: title.slice(0, 200),
    subtitle: subtitle.slice(0, 300),
    detail: detail.slice(0, 2000),
    targetPlanetName: targetPlanetName.slice(0, 80),
  };
}

function normalizeOrbit(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  const name = String(raw.name || '').trim();
  if (!id || id.length > 120 || !name || name.length > 200) return null;
  const n = (x, def) => (typeof x === 'number' && Number.isFinite(x) ? x : def);
  const out = {
    id,
    name: name.slice(0, 200),
    distance: n(raw.distance, 0),
    period: n(raw.period, 0),
    size: n(raw.size, 0.05),
    color: String(raw.color || '#94a3b8').slice(0, 32),
    orbitColor: String(raw.orbitColor || '#64748b').slice(0, 32),
  };
  const pp = String(raw.parentPlanetName || '').trim();
  if (pp) out.parentPlanetName = pp.slice(0, 80);
  const ps = String(raw.parentShowcaseEntityId || '').trim();
  if (ps) out.parentShowcaseEntityId = ps.slice(0, 120);
  const hc = String(raw.horizonsCommand || '').trim();
  if (hc) out.horizonsCommand = hc.slice(0, 80);
  const hcenter = String(raw.horizonsCenter || '').trim();
  if (hcenter) out.horizonsCenter = hcenter.slice(0, 80);
  ['phaseDeg', 'inclinationDeg', 'ascendingNodeDeg'].forEach((k) => {
    if (raw[k] != null && Number.isFinite(Number(raw[k]))) out[k] = Number(raw[k]);
  });
  const tp = String(raw.texturePath || '').trim();
  if (tp && tp.length < 500 && tp.startsWith('/')) out.texturePath = tp;
  const mp = String(raw.modelPath || '').trim();
  if (mp && mp.length < 500 && mp.startsWith('/')) out.modelPath = mp;
  if (raw.modelScale != null && Number.isFinite(Number(raw.modelScale))) out.modelScale = Number(raw.modelScale);
  if (Array.isArray(raw.modelRotationDeg) && raw.modelRotationDeg.length === 3) {
    const rot = raw.modelRotationDeg.map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0));
    out.modelRotationDeg = rot;
  }
  return out;
}

router.get('/', async (req, res) => {
  try {
    const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const stories = Array.isArray(doc?.stories) ? doc.stories : [];
    const catalog = Array.isArray(doc?.catalog) ? doc.catalog : [];
    const orbits = Array.isArray(doc?.orbits) ? doc.orbits : [];
    if (!doc || catalog.length === 0 || orbits.length === 0) {
      return res.json({ success: true, data: null });
    }
    res.json({
      success: true,
      data: { stories, catalog, orbits, updatedAt: doc?.updatedAt || null },
    });
  } catch (err) {
    console.error('GET showcase-catalog error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.put('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const body = req.body || {};
    const rawCatalog = Array.isArray(body.catalog) ? body.catalog : null;
    const rawOrbits = Array.isArray(body.orbits) ? body.orbits : null;
    const rawStories = Array.isArray(body.stories) ? body.stories : null;
    if (!rawCatalog || !rawOrbits || rawStories == null || !Array.isArray(rawStories)) {
      return res.status(400).json({ success: false, error: 'Thiếu catalog, orbits hoặc stories (mảng)' });
    }
    if (rawCatalog.length > MAX_CATALOG || rawOrbits.length > MAX_ORBITS || rawStories.length > MAX_STORIES) {
      return res.status(400).json({ success: false, error: 'Payload quá lớn' });
    }
    const catalog = rawCatalog.map(normalizeCatalogEntry).filter(Boolean);
    const orbits = rawOrbits.map(normalizeOrbit).filter(Boolean);
    const stories = rawStories.map(normalizeStory).filter(Boolean);
    if (catalog.length === 0 || orbits.length === 0) {
      return res.status(400).json({ success: false, error: 'catalog/orbits sau chuẩn hóa rỗng' });
    }
    await ShowcaseCatalogBundle.updateOne(
      { slug: 'main' },
      { $set: { stories, catalog, orbits } },
      { upsert: true },
    );
    const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    res.json({
      success: true,
      data: {
        stories: doc?.stories || [],
        catalog: doc?.catalog || [],
        orbits: doc?.orbits || [],
        updatedAt: doc?.updatedAt || null,
      },
    });
  } catch (err) {
    console.error('PUT showcase-catalog/editor error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
