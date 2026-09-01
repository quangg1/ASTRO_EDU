/**
 * Adapter cho JPL Horizons API (ssd.jpl.nasa.gov).
 *
 * Horizons trả về text người-đọc chứ không phải JSON có cấu trúc, nên toàn bộ
 * việc dựng URL và bóc số nằm gọn ở đây; phần còn lại của hệ thống chỉ thấy
 * object đã parse.
 */

const HORIZONS_BASE = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const DEFAULT_CENTER = '500@10';

/**
 * Tàu vũ trụ chỉ có ephemeris trong cửa sổ nhiệm vụ, hỏi ngày hôm nay sẽ
 * không ra gì — dùng ngày trong cửa sổ làm phương án dự phòng.
 */
const MISSION_WINDOW_FALLBACK = {
  '-1024': '2026-04-08',
  1024: '2026-04-08',
  'ARTEMIS II': '2026-04-08',
};

const cache = new Map();

function formatHorizonsDate(whenIso) {
  const date = whenIso
    ? new Date(`${String(whenIso).trim().slice(0, 10)}T12:00:00Z`)
    : new Date();
  if (!Number.isFinite(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function normalizeCommandKey(command) {
  return String(command || '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .toUpperCase();
}

/** Thử ngày yêu cầu, rồi hôm nay, rồi cửa sổ nhiệm vụ nếu có. */
function resolveWhenAttempts(command, whenIso) {
  const raw = String(command || '').trim();
  const candidates = [
    whenIso,
    new Date().toISOString().slice(0, 10),
    MISSION_WINDOW_FALLBACK[raw],
    MISSION_WINDOW_FALLBACK[normalizeCommandKey(raw)],
  ];
  return [...new Set(candidates.map((value) => String(value || '').trim()).filter(Boolean))];
}

function readNumber(text, key) {
  const match = text.match(
    new RegExp(`\\b${key}\\s*=\\s*([+-]?\\d+(?:\\.\\d+)?(?:[Ee][+-]?\\d+)?)`),
  );
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseElements(result) {
  if (!result || typeof result !== 'string') return null;
  if (!result.includes('$$SOE') || !result.includes('$$EOE')) return null;

  const semiMajorAxisAu = readNumber(result, 'A');
  const periodDays = readNumber(result, 'PR');
  if (semiMajorAxisAu == null || periodDays == null) return null;

  return {
    eccentricity: readNumber(result, 'EC') ?? 0,
    inclinationDeg: readNumber(result, 'IN') ?? 0,
    ascendingNodeDeg: readNumber(result, 'OM') ?? 0,
    meanAnomalyDeg: readNumber(result, 'MA') ?? 0,
    semiMajorAxisAu,
    periodDays,
  };
}

/** Vector trạng thái nằm giữa hai mốc `$$SOE`/`$$EOE`, trải trên nhiều dòng. */
function parseVectors(result) {
  if (!result || typeof result !== 'string') return null;
  const block = result.match(/\$\$SOE([\s\S]*?)\$\$EOE/);
  if (!block) return null;

  const lines = block[1].split('\n').map((line) => line.trim()).filter(Boolean);
  const values = { X: null, Y: null, Z: null, VX: null, VY: null, VZ: null };
  for (const line of lines) {
    for (const key of Object.keys(values)) {
      values[key] ??= readNumber(line, key);
    }
  }
  if (values.X == null || values.Y == null || values.Z == null) return null;

  return {
    xAu: values.X,
    yAu: values.Y,
    zAu: values.Z,
    vxAuPerDay: values.VX ?? 0,
    vyAuPerDay: values.VY ?? 0,
    vzAuPerDay: values.VZ ?? 0,
  };
}

/** Bán kính/khối lượng chỉ có trong phần header khi bật `OBJ_DATA`. */
function parsePhysical(result) {
  if (!result || typeof result !== 'string') return {};
  const read = (pattern) => {
    const match = result.match(pattern);
    const value = match ? Number(match[1]) : null;
    return Number.isFinite(value) ? value : null;
  };

  const radiusKm = read(/Vol\.\s*Mean\s*Radius\s*\(km\)\s*=\s*([+\-]?\d+(?:\.\d+)?)/i);
  const massX10e24 = read(/Mass\s*x10\^24\s*\(kg\)\s*=\s*([+\-]?\d+(?:\.\d+)?)/i);
  const siderealRotRate = read(/Sidereal\s*rot\.\s*rate\s*=\s*([+\-]?\d+(?:\.\d+)?)/i);

  const physical = {};
  if (radiusKm != null) physical.radiusKm = radiusKm;
  if (massX10e24 != null) physical.massKg = massX10e24 * 1e24;
  if (siderealRotRate != null) physical.rotRateRadS = siderealRotRate * 1e-5;
  return physical;
}

function buildUrl({ command, center, whenIso, mode, objData }) {
  const startStr = formatHorizonsDate(whenIso) || formatHorizonsDate(null);
  const startDate = new Date(`${startStr}T12:00:00Z`);
  if (!Number.isFinite(startDate.getTime())) return null;

  const query = new URLSearchParams({
    format: 'json',
    MAKE_EPHEM: 'YES',
    EPHEM_TYPE: mode,
    CENTER: center || DEFAULT_CENTER,
    COMMAND: command,
    START_TIME: startStr,
    STOP_TIME: formatHorizonsDate(
      new Date(startDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    ),
    STEP_SIZE: '1d',
    REF_SYSTEM: 'ICRF',
    REF_PLANE: 'ECLIPTIC',
    OUT_UNITS: 'AU-D',
    CSV_FORMAT: 'NO',
    OBJ_DATA: objData || 'NO',
  });
  if (mode === 'VECTORS') query.set('VEC_TABLE', '2');
  if (mode === 'ELEMENTS') query.set('TP_TYPE', 'ABSOLUTE');

  return `${HORIZONS_BASE}?${query.toString()}`;
}

async function fetchOnce({ entityId, command, center, whenIso }) {
  const cacheKey = `${entityId}|${command}|${center}|${String(whenIso || '').slice(0, 10)}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.value;

  const vectorsUrl = buildUrl({ command, center, whenIso, mode: 'VECTORS', objData: 'YES' });
  const elementsUrl = buildUrl({ command, center, whenIso, mode: 'ELEMENTS' });
  if (!vectorsUrl || !elementsUrl) return null;

  const [vectorsRes, elementsRes] = await Promise.all([fetch(vectorsUrl), fetch(elementsUrl)]);
  if (!vectorsRes.ok) return null;

  const vectorsText = (await vectorsRes.json().catch(() => null))?.result || '';
  const vectors = parseVectors(vectorsText);
  if (!vectors) return null;

  const elementsText = elementsRes.ok
    ? (await elementsRes.json().catch(() => null))?.result || ''
    : '';

  const parsed = {
    vectors,
    elements: parseElements(elementsText),
    physical: parsePhysical(vectorsText),
    whenUsed: String(whenIso || '').trim(),
  };
  cache.set(cacheKey, { value: parsed, expiresAt: Date.now() + CACHE_TTL_MS });
  return parsed;
}

/** @returns dữ liệu quỹ đạo đã parse, hoặc null nếu mọi mốc thời gian đều trượt. */
async function fetchEntityOrbit(entity, whenIso) {
  const command = String(entity?.horizonsId || entity?.horizonsCommand || '').trim();
  if (!command) return null;

  const center = String(entity?.horizonsCenter || entity?.orbitAround || DEFAULT_CENTER).trim();
  for (const when of resolveWhenAttempts(command, whenIso)) {
    const parsed = await fetchOnce({ entityId: entity.id, command, center, whenIso: when });
    if (parsed) return parsed;
  }
  return null;
}

module.exports = { DEFAULT_CENTER, normalizeCommandKey, fetchEntityOrbit };
