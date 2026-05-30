const express = require('express');
const ShowcaseCatalogBundle = require('../models/ShowcaseCatalogBundle');
const PlanetNarrative = require('../planet-narrative/models/PlanetNarrative');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');

const router = express.Router();

const ENTITY_GROUPS = new Set(['planets_moons', 'dwarf_asteroids', 'comets', 'spacecraft']);
const GROUP_ORDER = ['planets_moons', 'dwarf_asteroids', 'comets', 'spacecraft'];
const PLANET_ORDER = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
const DWARF_ORDER = ['Pluto', 'Ceres', 'Eris', 'Haumea', 'Makemake'];
const CORE_PLANET_IDS = new Set([
  'planet-mercury',
  'planet-venus',
  'planet-earth',
  'planet-mars',
  'planet-jupiter',
  'planet-saturn',
  'planet-uranus',
  'planet-neptune',
]);

function inferGroupFromEntityId(entityId) {
  const id = String(entityId || '').trim();
  if (id.startsWith('planet-') || id.startsWith('moon-')) return 'planets_moons';
  if (id.startsWith('dwarf-') || id.startsWith('asteroid-')) return 'dwarf_asteroids';
  if (id.startsWith('comet-')) return 'comets';
  if (id.startsWith('sc-')) return 'spacecraft';
  return 'planets_moons';
}

function resolveParentEntityId(catalogEntry, orbit, itemRow) {
  const fromOrbit = String(orbit?.parentId || itemRow?.parentId || '').trim();
  if (fromOrbit) return fromOrbit;
  const lp = String(
    catalogEntry?.linkedPlanetName || orbit?.parentPlanetName || itemRow?.parentPlanetName || '',
  ).trim();
  if (lp) return `planet-${lp.toLowerCase()}`;
  return '';
}

function compareNames(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'en', { sensitivity: 'base' });
}

function sortEditorItemsHierarchical(items, catalog) {
  const catMap = new Map((catalog || []).map((c) => [String(c?.id || '').trim(), c]));
  const nodes = items.map((item) => {
    const cat = catMap.get(item.entityId);
    const group = String(cat?.group || inferGroupFromEntityId(item.entityId));
    return {
      item,
      entityId: item.entityId,
      name: String(item.nameVi || cat?.name || item.entityId).trim(),
      group,
      parentId: resolveParentEntityId(cat, null, item),
    };
  });

  const byGroup = new Map();
  for (const g of GROUP_ORDER) byGroup.set(g, []);
  for (const n of nodes) {
    const list = byGroup.get(n.group) || [];
    list.push(n);
    byGroup.set(n.group, list);
  }

  const ordered = [];

  const pushPlanetTree = (list) => {
    const planets = list.filter((n) => n.entityId.startsWith('planet-'));
    const others = list.filter((n) => !n.entityId.startsWith('planet-'));
    planets.sort((a, b) => {
      const ka = PLANET_ORDER.indexOf(a.name);
      const kb = PLANET_ORDER.indexOf(b.name);
      const ai = ka >= 0 ? ka : 99;
      const bi = kb >= 0 ? kb : 99;
      if (ai !== bi) return ai - bi;
      return compareNames(a.name, b.name);
    });
    const kidsByParent = new Map();
    for (const n of others) {
      const pid = n.parentId || '';
      const bucket = kidsByParent.get(pid) || [];
      bucket.push(n);
      kidsByParent.set(pid, bucket);
    }
    for (const [, kids] of kidsByParent) kids.sort((a, b) => compareNames(a.name, b.name));
    for (const p of planets) {
      ordered.push(p);
      for (const c of kidsByParent.get(p.entityId) || []) ordered.push(c);
    }
    for (const o of others) {
      if (ordered.some((x) => x.entityId === o.entityId)) continue;
      ordered.push(o);
    }
  };

  const pushDwarfTree = (list) => {
    const dwarfs = list.filter((n) => n.entityId.startsWith('dwarf-'));
    const rest = list.filter((n) => !n.entityId.startsWith('dwarf-'));
    dwarfs.sort((a, b) => {
      const ka = DWARF_ORDER.indexOf(a.name);
      const kb = DWARF_ORDER.indexOf(b.name);
      const ai = ka >= 0 ? ka : 50;
      const bi = kb >= 0 ? kb : 50;
      if (ai !== bi) return ai - bi;
      return compareNames(a.name, b.name);
    });
    const kidsByParent = new Map();
    for (const n of rest) {
      const pid = n.parentId || '';
      const bucket = kidsByParent.get(pid) || [];
      bucket.push(n);
      kidsByParent.set(pid, bucket);
    }
    for (const [, kids] of kidsByParent) kids.sort((a, b) => compareNames(a.name, b.name));
    for (const d of dwarfs) {
      ordered.push(d);
      for (const c of kidsByParent.get(d.entityId) || []) ordered.push(c);
    }
    for (const o of rest) {
      if (ordered.some((x) => x.entityId === o.entityId)) continue;
      ordered.push(o);
    }
  };

  for (const group of GROUP_ORDER) {
    const list = byGroup.get(group) || [];
    if (!list.length) continue;
    if (group === 'planets_moons') pushPlanetTree(list);
    else if (group === 'dwarf_asteroids') pushDwarfTree(list);
    else {
      list.sort((a, b) => compareNames(a.name, b.name));
      for (const n of list) ordered.push(n);
    }
  }

  return ordered.map((n) => n.item);
}

function buildEditorItemsFromBundle(doc) {
  const catalog = Array.isArray(doc?.catalog) ? doc.catalog : [];
  const orbitMap = new Map(
    (Array.isArray(doc?.orbits) ? doc.orbits : []).map((o) => [String(o?.id || '').trim(), o]),
  );
  return catalog
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
    .filter(Boolean);
}

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

function normalizeMediaUrlField(raw) {
  const t = String(raw || '').trim();
  if (!t || t.includes('..')) return '';
  if (t.startsWith('/files/') && t.length < 500) return t;
  if (
    (t.startsWith('/textures/') ||
      t.startsWith('/models/') ||
      t.startsWith('/images/') ||
      t.startsWith('/course-media/')) &&
    t.length < 500
  ) {
    return t;
  }
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
    const items = sortEditorItemsHierarchical(buildEditorItemsFromBundle(doc), catalog);
    res.json({ success: true, data: { items, catalog } });
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
    const freshCatalog = Array.isArray(freshDoc?.catalog) ? freshDoc.catalog : [];
    const items = sortEditorItemsHierarchical(buildEditorItemsFromBundle(freshDoc), freshCatalog);
    res.json({ success: true, data: { items, invalidEntityIds: invalid.filter(Boolean) } });
  } catch (err) {
    console.error('PUT showcase-entities/editor error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.post('/editor', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const entityId = normalizeEntityId(req.body?.entityId);
    const name = String(req.body?.name || '').trim().slice(0, 200);
    const group = String(req.body?.group || '').trim();
    const parentId = String(req.body?.parentId || '').trim().slice(0, 120);
    let linkedPlanetName = String(req.body?.linkedPlanetName || '').trim().slice(0, 80);

    if (!entityId || !/^[a-z0-9][a-z0-9-]*$/.test(entityId)) {
      return res.status(400).json({
        success: false,
        error: 'entityId phải là slug chữ thường (vd: moon-triton, sc-new-mission)',
      });
    }
    if (!name) return res.status(400).json({ success: false, error: 'name bắt buộc' });
    if (!ENTITY_GROUPS.has(group)) {
      return res.status(400).json({ success: false, error: 'group không hợp lệ' });
    }

    const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const catalog = Array.isArray(doc?.catalog) ? [...doc.catalog] : [];
    const orbits = Array.isArray(doc?.orbits) ? [...doc.orbits] : [];
    if (catalog.length === 0) {
      return res.status(400).json({ success: false, error: 'Catalog bundle chưa có dữ liệu' });
    }
    if (catalog.some((c) => String(c?.id || '').trim() === entityId)) {
      return res.status(409).json({ success: false, error: 'entityId đã tồn tại' });
    }

    if (parentId && parentId.startsWith('planet-')) {
      const planetName = parentId.replace(/^planet-/, '');
      linkedPlanetName =
        linkedPlanetName ||
        planetName.charAt(0).toUpperCase() + planetName.slice(1).toLowerCase();
    }

    const catalogEntry = { id: entityId, name, group, published: true };
    if (linkedPlanetName) catalogEntry.linkedPlanetName = linkedPlanetName;
    catalog.push(catalogEntry);

    const needsOrbit =
      entityId.startsWith('moon-') ||
      entityId.startsWith('sc-') ||
      Boolean(parentId || linkedPlanetName);
    if (needsOrbit && !orbits.some((o) => String(o?.id || '').trim() === entityId)) {
      orbits.push({
        id: entityId,
        name,
        parentId: parentId || (linkedPlanetName ? `planet-${linkedPlanetName.toLowerCase()}` : ''),
        parentPlanetName: linkedPlanetName || '',
        distance: 1.6,
        period: 6,
        size: 0.06,
        color: '#94a3b8',
        orbitColor: '#64748b',
      });
    }

    await ShowcaseCatalogBundle.updateOne(
      { slug: 'main' },
      { $set: { catalog, orbits } },
      { upsert: true },
    );

    const freshDoc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const freshCatalog = Array.isArray(freshDoc?.catalog) ? freshDoc.catalog : [];
    const items = sortEditorItemsHierarchical(buildEditorItemsFromBundle(freshDoc), freshCatalog);
    res.status(201).json({ success: true, data: { items, entityId } });
  } catch (err) {
    console.error('POST showcase-entities/editor error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.delete('/editor/:entityId', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const entityId = normalizeEntityId(req.params.entityId);
    if (!entityId) {
      return res.status(400).json({ success: false, error: 'entityId không hợp lệ' });
    }
    if (CORE_PLANET_IDS.has(entityId)) {
      return res.status(403).json({
        success: false,
        error: 'Không xóa 8 hành tinh lõi của hệ Mặt Trời',
      });
    }

    const cascade = String(req.query.cascade || '').trim() === '1';
    const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const catalog = Array.isArray(doc?.catalog) ? [...doc.catalog] : [];
    const orbits = Array.isArray(doc?.orbits) ? [...doc.orbits] : [];
    const orbitMap = new Map(orbits.map((o) => [String(o?.id || '').trim(), o]));

    const childIds = catalog
      .map((c) => {
        const id = String(c?.id || '').trim();
        const orbit = orbitMap.get(id);
        const row = normalizeCatalogContent(c);
        const parent = resolveParentEntityId(c, orbit, row);
        return parent === entityId ? id : '';
      })
      .filter(Boolean);

    if (childIds.length > 0 && !cascade) {
      return res.status(409).json({
        success: false,
        error: `Entity có ${childIds.length} mục con. Thêm ?cascade=1 để xóa cả con.`,
        childIds,
      });
    }

    const removeIds = new Set([entityId, ...childIds]);
    const nextCatalog = catalog.filter((c) => !removeIds.has(String(c?.id || '').trim()));
    const nextOrbits = orbits.filter((o) => !removeIds.has(String(o?.id || '').trim()));

    if (nextCatalog.length === catalog.length) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy entity' });
    }

    await ShowcaseCatalogBundle.updateOne(
      { slug: 'main' },
      { $set: { catalog: nextCatalog, orbits: nextOrbits } },
      { upsert: true },
    );
    await PlanetNarrative.deleteMany({ entityId: { $in: Array.from(removeIds) } }).catch(() => {});

    const freshDoc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const freshCatalog = Array.isArray(freshDoc?.catalog) ? freshDoc.catalog : [];
    const items = sortEditorItemsHierarchical(buildEditorItemsFromBundle(freshDoc), freshCatalog);
    res.json({
      success: true,
      data: { items, removedIds: Array.from(removeIds) },
    });
  } catch (err) {
    console.error('DELETE showcase-entities/editor/:entityId error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
