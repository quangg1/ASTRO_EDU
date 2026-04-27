require('dotenv').config();

const mongoose = require('mongoose');
const ShowcaseCatalogBundle = require('../features/courses/models/ShowcaseCatalogBundle');
const connectDB = require('../config/db');

const HORIZONS_BASE = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const AU_TO_SIM_UNITS = 26;

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
  const massX10e24 = read(/Mass\s*x10\^(?:23|24)\s*\(kg\)\s*=\s*([+\-]?\d+(?:\.\d+)?)/i);
  const siderealRotRate = read(/Sid\.\s*rot\.\s*rate\s*\(rad\/s\)\s*=\s*([+\-]?\d+(?:\.\d+)?(?:[Ee][+\-]?\d+)?)/i)
    ?? read(/Sidereal\s*rot\.\s*rate\s*=\s*([+\-]?\d+(?:\.\d+)?)/i);
  const out = {};
  if (radiusKm != null) out.radiusKm = radiusKm;
  if (massX10e24 != null) {
    // Horizons may print x10^23 or x10^24; infer exponent from matched text.
    const m = result.match(/Mass\s*x10\^(23|24)\s*\(kg\)/i);
    const exp = m ? Number(m[1]) : 24;
    out.massKg = massX10e24 * (10 ** exp);
  }
  if (siderealRotRate != null) out.rotRateRadS = siderealRotRate;
  return out;
}

function buildHorizonsUrl(command, center, whenIso) {
  const startDate = new Date(whenIso || Date.now());
  if (!Number.isFinite(startDate.getTime())) return null;
  const stopDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 19);
  const q = new URLSearchParams({
    format: 'json',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: 'VECTORS',
    VEC_TABLE: '2',
    CENTER: center || '500@10',
    COMMAND: command,
    START_TIME: fmt(startDate),
    STOP_TIME: fmt(stopDate),
    STEP_SIZE: '1d',
    REF_SYSTEM: 'ICRF',
    REF_PLANE: 'ECLIPTIC',
    OUT_UNITS: 'AU-D',
    CSV_FORMAT: 'NO',
    OBJ_DATA: 'YES',
  });
  return `${HORIZONS_BASE}?${q.toString()}`;
}

async function fetchJpl(entity, whenIso) {
  const command = String(entity?.horizonsId || entity?.horizonsCommand || '').trim();
  if (!command) return null;
  const center = String(entity?.orbitAround || entity?.horizonsCenter || '500@10').trim();
  const url = buildHorizonsUrl(command, center, whenIso);
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  const result = data?.result || '';
  const vectors = parseHorizonsVectors(result);
  if (!vectors) return null;
  const elements = parseHorizonsElements(result);
  const physical = parsePhysicalData(result);
  return { vectors, elements, physical };
}

function applyJplToOrbitEntity(entity, jpl) {
  const e = Number.isFinite(jpl.elements?.eccentricity)
    ? Math.max(0, Math.min(0.98, jpl.elements.eccentricity))
    : Number(entity.orbitEccentricity || 0);
  const i = Number.isFinite(jpl.elements?.inclinationDeg) ? jpl.elements.inclinationDeg : Number(entity.inclinationDeg || 0);
  const node = Number.isFinite(jpl.elements?.ascendingNodeDeg) ? jpl.elements.ascendingNodeDeg : Number(entity.ascendingNodeDeg || 0);
  const ma = Number.isFinite(jpl.elements?.meanAnomalyDeg) ? jpl.elements.meanAnomalyDeg : Number(entity.phaseDeg || 0);
  const periodDays = Number.isFinite(jpl.elements?.periodDays) ? jpl.elements.periodDays : Number(entity.periodDays || 0);
  return {
    ...entity,
    radiusKm: Number(jpl.physical?.radiusKm || entity.radiusKm || 0) || 0,
    massKg: Number(jpl.physical?.massKg || entity.massKg || 0) || 0,
    rotRateRadS: Number(jpl.physical?.rotRateRadS || entity.rotRateRadS || 0) || 0,
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
    periodDays,
    semiMajorAxisAu: Number(jpl.elements?.semiMajorAxisAu || entity.semiMajorAxisAu || 0) || 0,
    orbitalElements: {
      a: Number(jpl.elements?.semiMajorAxisAu || 0) || 0,
      e,
      i,
      om: node,
      w: Number(entity.orbitalElements?.w || 0) || 0,
      m: ma,
      periodDays: periodDays || 0,
    },
    orbitSource: 'jpl-horizons',
  };
}

async function run() {
  await connectDB();
  const doc = await ShowcaseCatalogBundle.findOne({ slug: 'main' }).lean();
  if (!doc) throw new Error('Bundle main not found');
  const orbits = Array.isArray(doc.orbits) ? [...doc.orbits] : [];
  const catalog = Array.isArray(doc.catalog) ? [...doc.catalog] : [];
  if (!orbits.length) throw new Error('Bundle has no orbits');

  const byId = new Map(orbits.map((o, i) => [String(o?.id || '').trim(), i]));
  const ensureCenter = (o) => {
    const parentId = String(o?.parentId || '').trim();
    if (o.orbitAround) return o;
    const parent = parentId ? orbits[byId.get(parentId)] : null;
    const ph = String(parent?.horizonsId || '').trim();
    return { ...o, orbitAround: ph ? `500@${ph}` : '500@10' };
  };

  let ok = 0;
  let fail = 0;
  for (let i = 0; i < orbits.length; i++) {
    const seeded = ensureCenter(orbits[i] || {});
    const hid = String(seeded.horizonsId || seeded.horizonsCommand || '').trim();
    if (!hid) continue; // skip entities not shown as JPL bodies (e.g. spacecraft)
    try {
      const jpl = await fetchJpl(seeded);
      if (!jpl) {
        fail += 1;
        continue;
      }
      const next = applyJplToOrbitEntity(seeded, jpl);
      orbits[i] = next;
      const cIdx = catalog.findIndex((c) => String(c?.id || '').trim() === String(next.id || '').trim());
      if (cIdx >= 0) {
        catalog[cIdx] = {
          ...catalog[cIdx],
          horizonsId: String(next.horizonsId || ''),
          orbitAround: String(next.orbitAround || ''),
          parentId: String(next.parentId || ''),
          radiusKm: Number(next.radiusKm || 0) || 0,
          orbitalElements: next.orbitalElements || null,
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
  console.log(`[sync-showcase-jpl-orbits] synced=${ok} failed=${fail} total=${orbits.length}`);
}

run()
  .catch((err) => {
    console.error('[sync-showcase-jpl-orbits] failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close().catch(() => {});
  });
