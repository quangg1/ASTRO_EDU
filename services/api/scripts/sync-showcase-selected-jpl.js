require('dotenv').config();

const mongoose = require('mongoose');
const ShowcaseCatalogBundle = require('../features/courses/models/ShowcaseCatalogBundle');
const connectDB = require('../config/db');

const HORIZONS_BASE = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const AU_TO_SIM_UNITS = 26;

/**
 * Chỉ sync đúng tập entity mà user đã chốt theo texture list.
 * orbitAround cho moon đặt theo parent body (vd Moon -> 500@399, Charon -> 500@999).
 */
const TARGETS = {
  'planet-venus': { horizonsId: '299', orbitAround: '500@10', parentId: '' },
  'planet-earth': { horizonsId: '399', orbitAround: '500@10', parentId: '' },
  'planet-mars': { horizonsId: '499', orbitAround: '500@10', parentId: '' },
  'planet-jupiter': { horizonsId: '599', orbitAround: '500@10', parentId: '' },
  'planet-saturn': { horizonsId: '699', orbitAround: '500@10', parentId: '' },
  'planet-neptune': { horizonsId: '899', orbitAround: '500@10', parentId: '' },
  'dwarf-pluto': { horizonsId: '999', orbitAround: '500@10', parentId: '' },

  'moon-luna': { horizonsId: '301', orbitAround: '500@399', parentId: 'planet-earth' },
  'moon-phobos': { horizonsId: '401', orbitAround: '500@499', parentId: 'planet-mars' },
  'moon-deimos': { horizonsId: '402', orbitAround: '500@499', parentId: 'planet-mars' },
  'moon-io': { horizonsId: '501', orbitAround: '500@599', parentId: 'planet-jupiter' },
  'moon-europa': { horizonsId: '502', orbitAround: '500@599', parentId: 'planet-jupiter' },
  'moon-ganymede': { horizonsId: '503', orbitAround: '500@599', parentId: 'planet-jupiter' },
  'moon-callisto': { horizonsId: '504', orbitAround: '500@599', parentId: 'planet-jupiter' },
  'moon-mimas': { horizonsId: '601', orbitAround: '500@699', parentId: 'planet-saturn' },
  'moon-enceladus': { horizonsId: '602', orbitAround: '500@699', parentId: 'planet-saturn' },
  'moon-tethys': { horizonsId: '603', orbitAround: '500@699', parentId: 'planet-saturn' },
  'moon-dione': { horizonsId: '604', orbitAround: '500@699', parentId: 'planet-saturn' },
  'moon-rhea': { horizonsId: '605', orbitAround: '500@699', parentId: 'planet-saturn' },
  'moon-titan': { horizonsId: '606', orbitAround: '500@699', parentId: 'planet-saturn' },
  'moon-iapetus': { horizonsId: '608', orbitAround: '500@699', parentId: 'planet-saturn' },
  'moon-miranda': { horizonsId: '705', orbitAround: '500@799', parentId: 'planet-uranus' },
  'moon-ariel': { horizonsId: '701', orbitAround: '500@799', parentId: 'planet-uranus' },
  'moon-umbriel': { horizonsId: '702', orbitAround: '500@799', parentId: 'planet-uranus' },
  'moon-titania': { horizonsId: '703', orbitAround: '500@799', parentId: 'planet-uranus' },
  'moon-oberon': { horizonsId: '704', orbitAround: '500@799', parentId: 'planet-uranus' },
  'moon-triton': { horizonsId: '801', orbitAround: '500@899', parentId: 'planet-neptune' },
  'moon-charon': { horizonsId: '901', orbitAround: '500@999', parentId: 'dwarf-pluto' },
};

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
  return {
    eccentricity: eccentricity ?? 0,
    inclinationDeg: inclinationDeg ?? 0,
    ascendingNodeDeg: ascendingNodeDeg ?? 0,
    meanAnomalyDeg: meanAnomalyDeg ?? 0,
    semiMajorAxisAu: semiMajorAxisAu ?? 0,
    periodDays: periodDays ?? 0,
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
  const lines = m[1].split('\n').map((x) => x.trim()).filter(Boolean);
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
  return { xAu: x, yAu: y, zAu: z, vxAuPerDay: vx ?? 0, vyAuPerDay: vy ?? 0, vzAuPerDay: vz ?? 0 };
}

function parsePhysicalData(result) {
  const out = {};
  const read = (re) => {
    const m = result.match(re);
    if (!m) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  };
  const radiusKm = read(/Vol\.\s*Mean\s*Radius\s*\(km\)\s*=\s*([+\-]?\d+(?:\.\d+)?)/i);
  if (radiusKm != null) out.radiusKm = radiusKm;
  const massVal = read(/Mass\s*x10\^(23|24)\s*\(kg\)\s*=\s*([+\-]?\d+(?:\.\d+)?)/i);
  if (massVal != null) {
    const mm = result.match(/Mass\s*x10\^(23|24)\s*\(kg\)\s*=\s*([+\-]?\d+(?:\.\d+)?)/i);
    if (mm) out.massKg = Number(mm[2]) * (10 ** Number(mm[1]));
  }
  const rot = read(/Sid\.\s*rot\.\s*rate\s*\(rad\/s\)\s*=\s*([+\-]?\d+(?:\.\d+)?(?:[Ee][+\-]?\d+)?)/i);
  if (rot != null) out.rotRateRadS = rot;
  return out;
}

function buildHorizonsUrl(command, center, mode, objData) {
  const start = new Date();
  const stop = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 19);
  const q = new URLSearchParams({
    format: 'json',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: mode,
    CENTER: center,
    COMMAND: command,
    START_TIME: fmt(start),
    STOP_TIME: fmt(stop),
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

async function fetchJpl(command, center) {
  const vecUrl = buildHorizonsUrl(command, center, 'VECTORS', 'YES');
  const elemUrl = buildHorizonsUrl(command, center, 'ELEMENTS', 'NO');
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
  return { vectors, elements, physical };
}

async function run() {
  await connectDB();
  const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
  if (!doc) throw new Error('Bundle main not found');

  const orbits = Array.isArray(doc.orbits) ? [...doc.orbits] : [];
  const catalog = Array.isArray(doc.catalog) ? [...doc.catalog] : [];
  const orbitById = new Map(orbits.map((o, i) => [String(o?.id || '').trim(), i]));
  const catalogById = new Map(catalog.map((c, i) => [String(c?.id || '').trim(), i]));

  let ok = 0;
  let fail = 0;

  for (const [entityId, rel] of Object.entries(TARGETS)) {
    let oIdx = orbitById.get(entityId);
    if (oIdx == null) {
      const cIdx0 = catalogById.get(entityId);
      const c0 = cIdx0 != null ? catalog[cIdx0] : null;
      const seeded = {
        id: entityId,
        name: String(c0?.name || entityId),
        color: '#9ca3af',
        orbitColor: '#64748b',
        size: 0.05,
        distance: 24,
        period: 40,
      };
      orbits.push(seeded);
      oIdx = orbits.length - 1;
      orbitById.set(entityId, oIdx);
    }

    const base = orbits[oIdx] || {};
    const command = rel.horizonsId;
    const center = rel.orbitAround;
    try {
      const jpl = await fetchJpl(command, center);
      if (!jpl) {
        fail += 1;
        continue;
      }
      const e = Number.isFinite(jpl.elements.eccentricity) ? jpl.elements.eccentricity : Number(base.orbitEccentricity || 0);
      const i = Number.isFinite(jpl.elements.inclinationDeg) ? jpl.elements.inclinationDeg : Number(base.inclinationDeg || 0);
      const node = Number.isFinite(jpl.elements.ascendingNodeDeg) ? jpl.elements.ascendingNodeDeg : Number(base.ascendingNodeDeg || 0);
      const ma = Number.isFinite(jpl.elements.meanAnomalyDeg) ? jpl.elements.meanAnomalyDeg : Number(base.phaseDeg || 0);
      const pd = Number.isFinite(jpl.elements.periodDays) ? jpl.elements.periodDays : Number(base.periodDays || 0);

      const updated = {
        ...base,
        id: entityId,
        horizonsId: command,
        parentId: rel.parentId,
        orbitAround: center,
        horizonsCommand: command,
        horizonsCenter: center,
        radiusKm: Number(jpl.physical.radiusKm || base.radiusKm || 0) || 0,
        massKg: Number(jpl.physical.massKg || base.massKg || 0) || 0,
        rotRateRadS: Number(jpl.physical.rotRateRadS || base.rotRateRadS || 0) || 0,
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
        periodDays: pd,
        semiMajorAxisAu: Number(jpl.elements.semiMajorAxisAu || 0) || 0,
        orbitalElements: {
          a: Number(jpl.elements.semiMajorAxisAu || 0) || 0,
          e,
          i,
          om: node,
          w: Number(base.orbitalElements?.w || 0) || 0,
          m: ma,
          periodDays: pd || 0,
        },
        orbitSource: 'jpl-horizons',
      };
      orbits[oIdx] = updated;

      const cIdx = catalogById.get(entityId);
      if (cIdx != null) {
        catalog[cIdx] = {
          ...catalog[cIdx],
          horizonsId: updated.horizonsId,
          parentId: updated.parentId,
          orbitAround: updated.orbitAround,
          horizonsCommand: updated.horizonsCommand,
          horizonsCenter: updated.horizonsCenter,
          radiusKm: updated.radiusKm,
          orbitalElements: updated.orbitalElements,
        };
      }
      ok += 1;
    } catch {
      fail += 1;
    }
  }

  await ShowcaseCatalogBundle.updateOne(
    { slug: 'main' },
    { $set: { orbits, catalog } },
    { upsert: true },
  );
  console.log(`[sync-showcase-selected-jpl] synced=${ok} failed=${fail} target=${Object.keys(TARGETS).length}`);
}

run()
  .catch((err) => {
    console.error('[sync-showcase-selected-jpl] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
