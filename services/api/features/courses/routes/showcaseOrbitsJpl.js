const express = require('express');
const ShowcaseCatalogBundle = require('../models/ShowcaseCatalogBundle');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');

const router = express.Router();
const HORIZONS_BASE = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const CACHE_MS = 6 * 60 * 60 * 1000;
const cache = new Map();
const AU_TO_SIM_UNITS = 26; // tune visual scale for existing showcase scene

function parseElementValue(result, key) {
  const re = new RegExp(`\\b${key}\\s*=\\s*([+-]?\\d+(?:\\.\\d+)?(?:[Ee][+-]?\\d+)?)`);
  const m = result.match(re);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function parseHorizonsElements(result) {
  if (!result || typeof result !== 'string') return null;
  if (!result.includes('$$SOE') || !result.includes('$$EOE')) return null;
  const eccentricity = parseElementValue(result, 'EC');
  const inclinationDeg = parseElementValue(result, 'IN');
  const ascendingNodeDeg = parseElementValue(result, 'OM');
  const meanAnomalyDeg = parseElementValue(result, 'MA');
  const semiMajorAxisAu = parseElementValue(result, 'A');
  const periodDays = parseElementValue(result, 'PR');
  if (semiMajorAxisAu == null || periodDays == null) return null;
  return {
    eccentricity: eccentricity ?? 0,
    inclinationDeg: inclinationDeg ?? 0,
    ascendingNodeDeg: ascendingNodeDeg ?? 0,
    meanAnomalyDeg: meanAnomalyDeg ?? 0,
    semiMajorAxisAu,
    periodDays,
  };
}

function parseVectorLineNumber(line, key) {
  const re = new RegExp(`\\b${key}\\s*=\\s*([+-]?\\d+(?:\\.\\d+)?(?:[Ee][+-]?\\d+)?)`);
  const m = line.match(re);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function parseHorizonsVectors(result) {
  if (!result || typeof result !== 'string') return null;
  const m = result.match(/\$\$SOE([\s\S]*?)\$\$EOE/);
  if (!m) return null;
  const body = m[1];
  const lines = body
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  let x = null; let y = null; let z = null; let vx = null; let vy = null; let vz = null;
  for (const line of lines) {
    x ??= parseVectorLineNumber(line, 'X');
    y ??= parseVectorLineNumber(line, 'Y');
    z ??= parseVectorLineNumber(line, 'Z');
    vx ??= parseVectorLineNumber(line, 'VX');
    vy ??= parseVectorLineNumber(line, 'VY');
    vz ??= parseVectorLineNumber(line, 'VZ');
  }
  if (x == null || y == null || z == null) return null;
  return {
    xAu: x,
    yAu: y,
    zAu: z,
    vxAuPerDay: vx ?? 0,
    vyAuPerDay: vy ?? 0,
    vzAuPerDay: vz ?? 0,
  };
}

function parsePhysicalData(result) {
  if (!result || typeof result !== 'string') return {};
  const read = (re) => {
    const m = result.match(re);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };
  const radiusKm = read(/Vol\.\s*Mean\s*Radius\s*\(km\)\s*=\s*([+\-]?\d+(?:\.\d+)?)/i);
  const massX10e24 = read(/Mass\s*x10\^24\s*\(kg\)\s*=\s*([+\-]?\d+(?:\.\d+)?)/i);
  const siderealRotRate = read(/Sidereal\s*rot\.\s*rate\s*=\s*([+\-]?\d+(?:\.\d+)?)/i);
  const out = {};
  if (radiusKm != null) out.radiusKm = radiusKm;
  if (massX10e24 != null) out.massKg = massX10e24 * 1e24;
  if (siderealRotRate != null) out.rotRateRadS = siderealRotRate * 1e-5;
  return out;
}

function buildHorizonsUrl(command, center, whenIso, mode, objData) {
  const startDate = new Date(whenIso || Date.now());
  if (!Number.isFinite(startDate.getTime())) return null;
  const stopDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 19);
  const q = new URLSearchParams({
    format: 'json',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: mode,
    CENTER: center || '500@10',
    COMMAND: command,
    START_TIME: fmt(startDate),
    STOP_TIME: fmt(stopDate),
    STEP_SIZE: '1d',
    REF_SYSTEM: 'ICRF',
    REF_PLANE: 'ECLIPTIC',
    OUT_UNITS: 'AU-D',
    CSV_FORMAT: 'NO',
    OBJ_DATA: objData || 'NO',
  });
  if (mode === 'VECTORS') q.set('VEC_TABLE', '2');
  if (mode === 'ELEMENTS') {
    q.set('REF_SYSTEM', 'ICRF');
    q.set('TP_TYPE', 'ABSOLUTE');
  }
  return `${HORIZONS_BASE}?${q.toString()}`;
}

async function fetchEntityOrbitFromJpl(entity, whenIso) {
  const command = String(entity?.horizonsId || entity?.horizonsCommand || '').trim();
  if (!command) return null;
  const center = String(entity?.horizonsCenter || entity?.orbitAround || '500@10').trim();
  const cacheKey = `${entity.id}|${command}|${center}|${String(whenIso || '').slice(0, 10)}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const vecUrl = buildHorizonsUrl(command, center, whenIso, 'VECTORS', 'YES');
  const elemUrl = buildHorizonsUrl(command, center, whenIso, 'ELEMENTS', 'NO');
  if (!vecUrl || !elemUrl) return null;
  const [vecRes, elemRes] = await Promise.all([fetch(vecUrl), fetch(elemUrl)]);
  if (!vecRes.ok || !elemRes.ok) return null;
  const vecData = await vecRes.json().catch(() => null);
  const elemData = await elemRes.json().catch(() => null);
  const vecResult = vecData?.result || '';
  const elemResult = elemData?.result || '';
  const vectors = parseHorizonsVectors(vecResult);
  if (!vectors) return null;
  const elements = parseHorizonsElements(elemResult);
  const physical = parsePhysicalData(vecResult);
  const parsed = { vectors, elements, physical };
  cache.set(cacheKey, { value: parsed, expiresAt: Date.now() + CACHE_MS });
  return parsed;
}

function applyJplToEntity(entity, jpl) {
  const e = Number.isFinite(jpl.elements?.eccentricity)
    ? Math.max(0, Math.min(0.98, jpl.elements.eccentricity))
    : 0;
  const i = Number.isFinite(jpl.elements?.inclinationDeg) ? jpl.elements.inclinationDeg : entity.inclinationDeg || 0;
  const node = Number.isFinite(jpl.elements?.ascendingNodeDeg)
    ? jpl.elements.ascendingNodeDeg
    : entity.ascendingNodeDeg || 0;
  const ma = Number.isFinite(jpl.elements?.meanAnomalyDeg) ? jpl.elements.meanAnomalyDeg : entity.phaseDeg || 0;
  const periodDays =
    Number.isFinite(jpl.elements?.periodDays) && jpl.elements.periodDays > 0 ? jpl.elements.periodDays : null;

  // Preserve visual readability while using JPL orbital shape/orientation/phase.
  const visualPeriod = periodDays ? Math.max(5, Math.min(240, periodDays / 8)) : entity.period;

  return {
    id: entity.id,
    source: 'jpl-horizons',
    horizonsId: String(entity?.horizonsId || '').trim(),
    orbitAround: String(entity?.orbitAround || '').trim(),
    parentId: String(entity?.parentId || '').trim(),
    radiusKm: Number(jpl.physical?.radiusKm || entity?.radiusKm || 0) || 0,
    massKg: Number(jpl.physical?.massKg || 0) || 0,
    rotRateRadS: Number(jpl.physical?.rotRateRadS || 0) || 0,
    vectorAu: {
      x: jpl.vectors.xAu,
      y: jpl.vectors.yAu,
      z: jpl.vectors.zAu,
      vx: jpl.vectors.vxAuPerDay,
      vy: jpl.vectors.vyAuPerDay,
      vz: jpl.vectors.vzAuPerDay,
    },
    vectorSim: {
      x: jpl.vectors.xAu * AU_TO_SIM_UNITS,
      y: jpl.vectors.yAu * AU_TO_SIM_UNITS,
      z: jpl.vectors.zAu * AU_TO_SIM_UNITS,
    },
    orbitEccentricity: e,
    inclinationDeg: i,
    ascendingNodeDeg: node,
    phaseDeg: ma,
    period: visualPeriod,
    periodDays,
    semiMajorAxisAu: jpl.elements?.semiMajorAxisAu ?? null,
    orbitalElements: {
      a: jpl.elements?.semiMajorAxisAu ?? 0,
      e,
      i,
      om: node,
      w: 0,
      m: ma,
      periodDays: periodDays || 0,
    },
  };
}

router.get('/jpl', async (req, res) => {
  try {
    const when = String(req.query.when || '').trim();
    // Default: fetch JPL for moons/satellites too (they have parentPlanetName / parentId).
    // Pass includeParents=0 only to limit to top-level heliocentric bodies.
    const includeParents = req.query.includeParents !== '0';
    const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const orbits = Array.isArray(doc?.orbits) ? doc.orbits : [];
    if (orbits.length === 0) return res.json({ success: true, data: { items: [] } });

    const byId = new Map(orbits.map((o) => [String(o?.id || '').trim(), o]));
    const enrichCenter = (o) => {
      const parentId = String(o?.parentId || '').trim();
      const parent = parentId ? byId.get(parentId) : null;
      const parentHorizons = String(parent?.horizonsId || '').trim();
      const orbitAround = String(o?.orbitAround || '').trim();
      return {
        ...o,
        orbitAround: orbitAround || (parentHorizons ? `500@${parentHorizons}` : '500@10'),
      };
    };
    const targets = orbits
      .map(enrichCenter)
      .filter((o) => includeParents || (!o.parentPlanetName && !o.parentShowcaseEntityId));
    const out = [];
    let failCount = 0;
    await Promise.all(
      targets.map(async (entity) => {
        try {
          const jpl = await fetchEntityOrbitFromJpl(entity, when);
          if (!jpl) {
            failCount += 1;
            return;
          }
          out.push(applyJplToEntity(entity, jpl));
        } catch {
          // Ignore per-entity failures to keep response useful.
          failCount += 1;
        }
      }),
    );
    out.sort((a, b) => String(a.id).localeCompare(String(b.id)));
    res.json({ success: true, data: { items: out, failed: failCount } });
  } catch (err) {
    console.error('GET showcase-orbits/jpl error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

router.post('/sync-entity', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const entityId = String(req.body?.entityId || '').trim();
    if (!entityId) {
      return res.status(400).json({ success: false, error: 'Thiếu entityId' });
    }
    const when = String(req.body?.when || '').trim();
    const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
    const orbits = Array.isArray(doc?.orbits) ? [...doc.orbits] : [];
    const catalog = Array.isArray(doc?.catalog) ? [...doc.catalog] : [];
    const byId = new Map(orbits.map((o, i) => [String(o?.id || '').trim(), i]));
    let idx = byId.get(entityId);
    if (idx == null) {
      const cIdx = catalog.findIndex((c) => String(c?.id || '').trim() === entityId);
      if (cIdx == null || cIdx < 0) {
        return res.status(404).json({ success: false, error: 'Không tìm thấy entity trong catalog/orbits' });
      }
      const c = catalog[cIdx] || {};
      const seeded = {
        id: entityId,
        name: String(c.name || entityId),
        color: '#9ca3af',
        orbitColor: '#64748b',
        size: 0.05,
        distance: 24,
        period: 40,
        horizonsId: String(c.horizonsId || '').trim(),
        orbitAround: String(c.orbitAround || '').trim(),
        parentId: String(c.parentId || '').trim(),
        radiusKm: Number(c.radiusKm || 0) || 0,
        orbitalElements: c.orbitalElements && typeof c.orbitalElements === 'object' ? c.orbitalElements : null,
      };
      orbits.push(seeded);
      idx = orbits.length - 1;
      byId.set(entityId, idx);
    }
    const entity = { ...(orbits[idx] || {}) };
    const parentId = String(entity.parentId || '').trim();
    if (!entity.orbitAround && parentId) {
      const pIdx = byId.get(parentId);
      const parent = pIdx != null ? orbits[pIdx] : null;
      const ph = String(parent?.horizonsId || '').trim();
      if (ph) entity.orbitAround = `500@${ph}`;
    }
    const parsed = await fetchEntityOrbitFromJpl(entity, when);
    if (!parsed) {
      return res.status(400).json({ success: false, error: 'Không lấy được dữ liệu từ JPL. Kiểm tra horizonsId/orbitAround' });
    }
    const applied = applyJplToEntity(entity, parsed);
    const nextOrbit = {
      ...orbits[idx],
      horizonsId: applied.horizonsId || orbits[idx].horizonsId || '',
      orbitAround: applied.orbitAround || orbits[idx].orbitAround || '',
      parentId: applied.parentId || orbits[idx].parentId || '',
      radiusKm: applied.radiusKm || orbits[idx].radiusKm || 0,
      massKg: applied.massKg || 0,
      rotRateRadS: applied.rotRateRadS || 0,
      vectorAu: applied.vectorAu || null,
      vectorSim: applied.vectorSim || null,
      orbitalElements: applied.orbitalElements || null,
      periodDays: applied.periodDays || orbits[idx].periodDays || 0,
      phaseDeg: applied.phaseDeg,
      inclinationDeg: applied.inclinationDeg,
      ascendingNodeDeg: applied.ascendingNodeDeg,
      orbitEccentricity: applied.orbitEccentricity,
      semiMajorAxisAu: applied.semiMajorAxisAu || null,
      orbitSource: 'jpl-horizons',
    };
    orbits[idx] = nextOrbit;
    const cIdx = catalog.findIndex((c) => String(c?.id || '').trim() === entityId);
    if (cIdx >= 0) {
      catalog[cIdx] = {
        ...catalog[cIdx],
        horizonsId: nextOrbit.horizonsId || '',
        orbitAround: nextOrbit.orbitAround || '',
        parentId: nextOrbit.parentId || '',
        radiusKm: nextOrbit.radiusKm || 0,
        orbitalElements: nextOrbit.orbitalElements || null,
      };
    }
    await ShowcaseCatalogBundle.updateOne(
      { slug: 'main' },
      { $set: { orbits, catalog } },
      { upsert: true },
    );
    return res.json({ success: true, data: { item: applied } });
  } catch (err) {
    console.error('POST showcase-orbits/sync-entity error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
