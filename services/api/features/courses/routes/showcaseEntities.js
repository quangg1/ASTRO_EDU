const express = require('express');
const ShowcaseCatalogBundle = require('../models/ShowcaseCatalogBundle');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');

const router = express.Router();

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

function normalizeEntityId(id) {
  const s = String(id || '').trim();
  if (!s || s.length > 80) return '';
  return s;
}

function normalizeUrlField(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  if (!isSafeHttpUrl(t)) return '';
  return t;
}

/** Cho phép `/files/...` từ upload local (same-origin API). */
function normalizeMediaUrlField(raw) {
  const t = String(raw || '').trim();
  if (!t) return '';
  if (t.startsWith('/files/') && t.length < 500) return t;
  return normalizeUrlField(t);
}

function normalizeColorHex(raw, fallback = '') {
  const s = String(raw || '').trim();
  if (!s) return fallback;
  if (/^#[0-9a-fA-F]{6}$/.test(s)) return s.toLowerCase();
  return fallback;
}

function normalizePanelBlock(raw, idx) {
  const type = String(raw?.type || '').trim().toLowerCase();
  if (!['text', 'image', 'chart'].includes(type)) return null;
  const id = String(raw?.id || `${type}-${idx + 1}`).trim().slice(0, 80);
  const title = String(raw?.title || '').trim().slice(0, 160);
  const body = String(raw?.body || '').trim();
  const imageUrl = normalizeMediaUrlField(raw?.imageUrl);
  const chartKind = String(raw?.chartKind || '').trim().slice(0, 40);
  const points = Array.isArray(raw?.points)
    ? raw.points
        .map((p) => {
          const label = String(p?.label || '').trim().slice(0, 80);
          const value = Number(p?.value);
          if (!label || !Number.isFinite(value)) return null;
          return { label, value };
        })
        .filter(Boolean)
        .slice(0, 24)
    : [];
  const styleRaw = raw?.style && typeof raw.style === 'object' ? raw.style : {};
  const style = {
    variant: ['glass', 'solid', 'minimal'].includes(String(styleRaw.variant || '').trim().toLowerCase())
      ? String(styleRaw.variant || '').trim().toLowerCase()
      : 'glass',
    align: ['left', 'center', 'right'].includes(String(styleRaw.align || '').trim().toLowerCase())
      ? String(styleRaw.align || '').trim().toLowerCase()
      : 'left',
    bgColor: normalizeColorHex(styleRaw.bgColor, ''),
    borderColor: normalizeColorHex(styleRaw.borderColor, ''),
    textColor: normalizeColorHex(styleRaw.textColor, ''),
    accentColor: normalizeColorHex(styleRaw.accentColor, ''),
  };
  return {
    id,
    type,
    title,
    body,
    imageUrl,
    chartKind,
    points,
    style,
  };
}

function normalizePanelConfig(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const stateBadge = String(raw?.stateBadge || '').trim().slice(0, 220);
  const tabsRaw = Array.isArray(raw?.tabs) ? raw.tabs : [];
  const tabs = tabsRaw
    .map((t) => String(t || '').trim().toLowerCase())
    .filter((t) => ['overview', 'physical', 'sky'].includes(t))
    .slice(0, 3);
  const tabLabelsRaw = raw?.tabLabels && typeof raw.tabLabels === 'object' ? raw.tabLabels : {};
  const tabLabels = {
    overview: String(tabLabelsRaw.overview || '').trim().slice(0, 40),
    physical: String(tabLabelsRaw.physical || '').trim().slice(0, 40),
    sky: String(tabLabelsRaw.sky || '').trim().slice(0, 40),
  };
  const normBlocks = (arr) =>
    (Array.isArray(arr) ? arr : [])
      .map((b, i) => normalizePanelBlock(b, i))
      .filter(Boolean)
      .slice(0, 16);
  const overviewBlocks = normBlocks(raw?.overviewBlocks);
  const physicalBlocks = normBlocks(raw?.physicalBlocks);
  const skyBlocks = normBlocks(raw?.skyBlocks);
  const conceptTagIds = (Array.isArray(raw?.conceptTagIds) ? raw.conceptTagIds : [])
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .slice(0, 32);
  const lessonIds = (Array.isArray(raw?.lessonIds) ? raw.lessonIds : [])
    .map((x) => String(x || '').trim())
    .filter(Boolean)
    .slice(0, 64);
  if (
    !stateBadge &&
    tabs.length === 0 &&
    overviewBlocks.length === 0 &&
    physicalBlocks.length === 0 &&
    skyBlocks.length === 0 &&
    conceptTagIds.length === 0 &&
    lessonIds.length === 0
  ) {
    return null;
  }
  return {
    stateBadge,
    tabs,
    tabLabels,
    overviewBlocks,
    physicalBlocks,
    skyBlocks,
    conceptTagIds,
    lessonIds,
  };
}

function normalizeDoc(doc) {
  const entityId = normalizeEntityId(doc?.entityId);
  if (!entityId || entityId.length > 80) return null;
  const nameVi = String(doc?.nameVi || '').trim();
  const museumBlurbVi = String(doc?.museumBlurbVi || '').trim();
  const legacyTexture = String(doc?.textureUrl || '').trim();
  const diffuseMapUrl =
    normalizeMediaUrlField(doc?.diffuseMapUrl) || normalizeMediaUrlField(legacyTexture);
  const textureUrl = diffuseMapUrl;
  const radiusKmRaw = Number(doc?.radiusKm);
  const radiusKm = Number.isFinite(radiusKmRaw) && radiusKmRaw > 0 ? radiusKmRaw : 0;
  const oeRaw = doc?.orbitalElements && typeof doc.orbitalElements === 'object' ? doc.orbitalElements : {};
  const n = (v) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  const orbitalElements = {
    a: n(oeRaw.a),
    e: n(oeRaw.e),
    i: n(oeRaw.i),
    om: n(oeRaw.om),
    w: n(oeRaw.w),
    m: n(oeRaw.m),
    periodDays: Math.max(0, n(oeRaw.periodDays)),
  };
  return {
    entityId,
    nameVi,
    museumBlurbVi,
    textureUrl,
    diffuseMapUrl,
    normalMapUrl: normalizeMediaUrlField(doc?.normalMapUrl),
    specularMapUrl: normalizeMediaUrlField(doc?.specularMapUrl),
    cloudMapUrl: normalizeMediaUrlField(doc?.cloudMapUrl),
    modelUrl: normalizeMediaUrlField(doc?.modelUrl),
    horizonsId: String(doc?.horizonsId || '').trim().slice(0, 80),
    orbitAround: String(doc?.orbitAround || '').trim().slice(0, 80),
    parentId: String(doc?.parentId || '').trim().slice(0, 120),
    parentPlanetName: String(doc?.parentPlanetName || '').trim().slice(0, 80),
    radiusKm,
    orbitColor: normalizeColorHex(doc?.orbitColor),
    orbitalElements,
    horizonsCommand: String(doc?.horizonsCommand || '').trim().slice(0, 80),
    horizonsCenter: String(doc?.horizonsCenter || '').trim().slice(0, 80),
    published: doc?.published !== false,
    panelConfig: normalizePanelConfig(doc?.panelConfig),
  };
}

function normalizeCatalogContent(raw) {
  const entityId = normalizeEntityId(raw?.id);
  if (!entityId) return null;
  const legacyTexture = String(raw?.textureUrl || '').trim();
  const diffuseMapUrl =
    normalizeMediaUrlField(raw?.diffuseMapUrl) || normalizeMediaUrlField(legacyTexture);
  return {
    entityId,
    nameVi: String(raw?.nameVi || '').trim(),
    museumBlurbVi: String(raw?.museumBlurbVi || '').trim(),
    textureUrl: diffuseMapUrl,
    diffuseMapUrl,
    normalMapUrl: normalizeMediaUrlField(raw?.normalMapUrl),
    specularMapUrl: normalizeMediaUrlField(raw?.specularMapUrl),
    cloudMapUrl: normalizeMediaUrlField(raw?.cloudMapUrl),
    modelUrl: normalizeMediaUrlField(raw?.modelUrl),
    horizonsId: String(raw?.horizonsId || '').trim(),
    orbitAround: String(raw?.orbitAround || '').trim(),
    parentId: String(raw?.parentId || '').trim(),
    parentPlanetName: String(raw?.parentPlanetName || raw?.linkedPlanetName || '').trim().slice(0, 80),
    radiusKm:
      Number.isFinite(Number(raw?.radiusKm)) && Number(raw?.radiusKm) > 0 ? Number(raw?.radiusKm) : 0,
    orbitColor: normalizeColorHex(raw?.orbitColor),
    orbitalElements:
      raw?.orbitalElements && typeof raw.orbitalElements === 'object'
        ? {
            a: Number(raw.orbitalElements.a) || 0,
            e: Number(raw.orbitalElements.e) || 0,
            i: Number(raw.orbitalElements.i) || 0,
            om: Number(raw.orbitalElements.om) || 0,
            w: Number(raw.orbitalElements.w) || 0,
            m: Number(raw.orbitalElements.m) || 0,
            periodDays: Number(raw.orbitalElements.periodDays) || 0,
          }
        : null,
    horizonsCommand: String(raw?.horizonsCommand || '').trim(),
    horizonsCenter: String(raw?.horizonsCenter || '').trim(),
    published: raw?.published !== false,
    panelConfig: normalizePanelConfig(raw?.panelConfig),
  };
}

/** Public: đọc trực tiếp từ bundle.catalog (single source of truth). */
router.get('/', async (req, res) => {
  try {
    const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const catalog = Array.isArray(doc?.catalog) ? doc.catalog : [];
    const orbitMap = new Map(
      (Array.isArray(doc?.orbits) ? doc.orbits : []).map((o) => [String(o?.id || '').trim(), o]),
    );
    const items = catalog
      .map((c) => {
        const row = normalizeCatalogContent(c);
        if (!row) return null;
        const orbit = orbitMap.get(row.entityId);
        return {
          ...row,
          horizonsCommand: String(orbit?.horizonsCommand || '').trim(),
          horizonsCenter: String(orbit?.horizonsCenter || '').trim(),
          horizonsId: String(orbit?.horizonsId || row.horizonsId || '').trim(),
          orbitAround: String(orbit?.orbitAround || row.orbitAround || '').trim(),
          parentId: String(orbit?.parentId || row.parentId || '').trim(),
          parentPlanetName: String(orbit?.parentPlanetName || row.parentPlanetName || '').trim(),
          radiusKm:
            Number.isFinite(Number(orbit?.radiusKm)) && Number(orbit?.radiusKm) > 0
              ? Number(orbit?.radiusKm)
              : Number(row.radiusKm || 0),
          orbitColor: normalizeColorHex(orbit?.orbitColor, normalizeColorHex(row.orbitColor)),
          orbitalElements:
            orbit?.orbitalElements && typeof orbit.orbitalElements === 'object'
              ? orbit.orbitalElements
              : row.orbitalElements || null,
        };
      })
      .filter((x) => x && x.published)
      .map((x) => ({ ...x, published: true }));
    res.json({ success: true, data: { items } });
  } catch (err) {
    console.error('GET showcase-entities error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.get('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const catalog = Array.isArray(doc?.catalog) ? doc.catalog : [];
    const orbitMap = new Map(
      (Array.isArray(doc?.orbits) ? doc.orbits : []).map((o) => [String(o?.id || '').trim(), o]),
    );
    const items = catalog
      .map((c) => {
        const row = normalizeCatalogContent(c);
        if (!row) return null;
        const orbit = orbitMap.get(row.entityId);
        return {
          ...row,
          horizonsCommand: String(orbit?.horizonsCommand || '').trim(),
          horizonsCenter: String(orbit?.horizonsCenter || '').trim(),
          horizonsId: String(orbit?.horizonsId || row.horizonsId || '').trim(),
          orbitAround: String(orbit?.orbitAround || row.orbitAround || '').trim(),
          parentId: String(orbit?.parentId || row.parentId || '').trim(),
          parentPlanetName: String(orbit?.parentPlanetName || row.parentPlanetName || '').trim(),
          radiusKm:
            Number.isFinite(Number(orbit?.radiusKm)) && Number(orbit?.radiusKm) > 0
              ? Number(orbit?.radiusKm)
              : Number(row.radiusKm || 0),
          orbitColor: normalizeColorHex(orbit?.orbitColor, normalizeColorHex(row.orbitColor)),
          orbitalElements:
            orbit?.orbitalElements && typeof orbit.orbitalElements === 'object'
              ? orbit.orbitalElements
              : row.orbitalElements || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.entityId.localeCompare(b.entityId));
    res.json({ success: true, data: { items } });
  } catch (err) {
    console.error('GET showcase-entities/editor error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.put('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const raw = req.body?.items;
    if (!Array.isArray(raw)) {
      return res.status(400).json({ success: false, error: 'items phải là mảng' });
    }
    const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const catalog = Array.isArray(doc?.catalog) ? [...doc.catalog] : [];
    const orbits = Array.isArray(doc?.orbits) ? [...doc.orbits] : [];
    if (catalog.length === 0) {
      return res.status(400).json({ success: false, error: 'Catalog bundle chưa có dữ liệu' });
    }
    const byId = new Map(catalog.map((x, i) => [String(x?.id || '').trim(), i]));
    const orbitById = new Map(orbits.map((x, i) => [String(x?.id || '').trim(), i]));
    const seen = new Set();
    const invalid = [];
    for (const row of raw) {
      const n = normalizeDoc(row);
      if (!n) {
        invalid.push(String(row?.entityId || ''));
        continue;
      }
      if (seen.has(n.entityId)) continue;
      seen.add(n.entityId);
      const idx = byId.get(n.entityId);
      if (idx == null) {
        invalid.push(n.entityId);
        continue;
      }
      const base = catalog[idx] || {};
      catalog[idx] = {
        ...base,
        id: n.entityId,
        nameVi: n.nameVi,
        museumBlurbVi: n.museumBlurbVi,
        textureUrl: n.textureUrl,
        diffuseMapUrl: n.diffuseMapUrl,
        normalMapUrl: n.normalMapUrl,
        specularMapUrl: n.specularMapUrl,
        cloudMapUrl: n.cloudMapUrl,
        modelUrl: n.modelUrl,
        horizonsId: n.horizonsId,
        orbitAround: n.orbitAround,
        parentId: n.parentId,
        radiusKm: n.radiusKm,
        orbitColor: n.orbitColor || '',
        orbitalElements: n.orbitalElements,
        published: n.published,
        panelConfig: n.panelConfig,
      };
      const orbitIdx = orbitById.get(n.entityId);
      if (orbitIdx != null) {
        const orbitBase = orbits[orbitIdx] || {};
        const hid = n.horizonsId || n.horizonsCommand || '';
        const center = n.orbitAround || n.horizonsCenter || '';
        orbits[orbitIdx] = {
          ...orbitBase,
          horizonsId: hid || orbitBase.horizonsId || '',
          orbitAround: center || orbitBase.orbitAround || '',
          parentId: n.parentId || orbitBase.parentId || '',
          parentPlanetName: String(n.parentPlanetName ?? orbitBase.parentPlanetName ?? '').trim().slice(0, 80),
          radiusKm: n.radiusKm || orbitBase.radiusKm || 0,
          orbitColor: n.orbitColor || orbitBase.orbitColor || '',
          orbitalElements: n.orbitalElements || orbitBase.orbitalElements || null,
          horizonsCommand: hid || '',
          horizonsCenter: center || '',
        };
      }
    }
    await ShowcaseCatalogBundle.updateOne(
      { slug: 'main' },
      { $set: { catalog, orbits } },
      { upsert: true },
    );
    const freshDoc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const freshOrbitMap = new Map(
      (Array.isArray(freshDoc?.orbits) ? freshDoc.orbits : []).map((o) => [String(o?.id || '').trim(), o]),
    );
    const items = (Array.isArray(freshDoc?.catalog) ? freshDoc.catalog : [])
      .map((c) => {
        const row = normalizeCatalogContent(c);
        if (!row) return null;
        const orbit = freshOrbitMap.get(row.entityId);
        return {
          ...row,
          horizonsCommand: String(orbit?.horizonsCommand || '').trim(),
          horizonsCenter: String(orbit?.horizonsCenter || '').trim(),
          horizonsId: String(orbit?.horizonsId || row.horizonsId || '').trim(),
          orbitAround: String(orbit?.orbitAround || row.orbitAround || '').trim(),
          parentId: String(orbit?.parentId || row.parentId || '').trim(),
          parentPlanetName: String(orbit?.parentPlanetName || row.parentPlanetName || '').trim(),
          radiusKm:
            Number.isFinite(Number(orbit?.radiusKm)) && Number(orbit?.radiusKm) > 0
              ? Number(orbit?.radiusKm)
              : Number(row.radiusKm || 0),
          orbitColor: normalizeColorHex(orbit?.orbitColor, normalizeColorHex(row.orbitColor)),
          orbitalElements:
            orbit?.orbitalElements && typeof orbit.orbitalElements === 'object'
              ? orbit.orbitalElements
              : row.orbitalElements || null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.entityId.localeCompare(b.entityId));
    res.json({ success: true, data: { items, invalidEntityIds: invalid.filter(Boolean) } });
  } catch (err) {
    console.error('PUT showcase-entities/editor error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
