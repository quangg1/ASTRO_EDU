/** Chuyển dữ liệu thô từ Horizons thành hình dạng quỹ đạo mà cảnh 3D dùng. */

/** 1 AU ≈ 26 đơn vị trong cảnh — đủ để hệ Mặt Trời vừa khung nhìn. */
const AU_TO_SIM_UNITS = 26;

/** Quỹ đạo gần-parabol làm vỡ phép dựng hình, nên chặn độ lệch tâm. */
const MAX_ECCENTRICITY = 0.98;

/** Chu kỳ thật (ngày) nén lại thành giây trong cảnh cho dễ quan sát. */
const VISUAL_PERIOD_MIN = 5;
const VISUAL_PERIOD_MAX = 240;
const VISUAL_PERIOD_DIVISOR = 8;

function pickFirstNonEmpty(...values) {
  for (const value of values) {
    const text = String(value ?? '').trim();
    if (text) return text;
  }
  return '';
}

/**
 * Cùng một thông tin tồn tại dưới nhiều tên (`horizonsId`/`horizonsCommand`,
 * `orbitAround`/`horizonsCenter`) ở orbit, catalog và payload sửa tay. Hàm này
 * quyết định thứ tự ưu tiên một lần.
 */
function mergeEntityForJplSync(entity, catalogRow, overrides = {}) {
  const merged = { ...(entity || {}) };

  merged.horizonsId = pickFirstNonEmpty(
    overrides.horizonsId,
    overrides.horizonsCommand,
    merged.horizonsId,
    merged.horizonsCommand,
    catalogRow?.horizonsId,
  );
  merged.horizonsCommand = pickFirstNonEmpty(
    overrides.horizonsCommand,
    overrides.horizonsId,
    merged.horizonsCommand,
    merged.horizonsId,
    catalogRow?.horizonsId,
  );
  merged.orbitAround = pickFirstNonEmpty(
    overrides.orbitAround,
    overrides.horizonsCenter,
    merged.orbitAround,
    merged.horizonsCenter,
    catalogRow?.orbitAround,
  );
  merged.horizonsCenter = merged.orbitAround;
  merged.parentId = pickFirstNonEmpty(overrides.parentId, merged.parentId, catalogRow?.parentId);
  merged.parentPlanetName = pickFirstNonEmpty(
    overrides.parentPlanetName,
    merged.parentPlanetName,
    catalogRow?.parentPlanetName,
    catalogRow?.linkedPlanetName,
  );

  return merged;
}

const numberOr = (value, fallback) => (Number.isFinite(value) ? value : fallback);

function applyJplToEntity(entity, jpl) {
  const elements = jpl.elements || {};
  const eccentricity = Number.isFinite(elements.eccentricity)
    ? Math.max(0, Math.min(MAX_ECCENTRICITY, elements.eccentricity))
    : 0;
  const inclinationDeg = numberOr(elements.inclinationDeg, entity.inclinationDeg || 0);
  const ascendingNodeDeg = numberOr(elements.ascendingNodeDeg, entity.ascendingNodeDeg || 0);
  const meanAnomalyDeg = numberOr(elements.meanAnomalyDeg, entity.phaseDeg || 0);

  const periodDays =
    Number.isFinite(elements.periodDays) && elements.periodDays > 0 ? elements.periodDays : null;

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
    orbitEccentricity: eccentricity,
    inclinationDeg,
    ascendingNodeDeg,
    phaseDeg: meanAnomalyDeg,
    period: periodDays
      ? Math.max(
          VISUAL_PERIOD_MIN,
          Math.min(VISUAL_PERIOD_MAX, periodDays / VISUAL_PERIOD_DIVISOR),
        )
      : entity.period,
    periodDays,
    semiMajorAxisAu: elements.semiMajorAxisAu ?? null,
    orbitalElements: {
      a: elements.semiMajorAxisAu ?? 0,
      e: eccentricity,
      i: inclinationDeg,
      om: ascendingNodeDeg,
      w: 0,
      m: meanAnomalyDeg,
      periodDays: periodDays || 0,
    },
  };
}

module.exports = { AU_TO_SIM_UNITS, mergeEntityForJplSync, applyJplToEntity };
