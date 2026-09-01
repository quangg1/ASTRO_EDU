const { AppError } = require('../../../shared/errors');
const { showcaseCatalogRepository } = require('../repositories/showcaseCatalogRepository');
const {
  DEFAULT_CENTER,
  normalizeCommandKey,
  fetchEntityOrbit,
} = require('../lib/horizonsClient');
const { mergeEntityForJplSync, applyJplToEntity } = require('../lib/jplOrbitMapper');

const SEEDED_ORBIT_DEFAULTS = {
  color: '#9ca3af',
  orbitColor: '#64748b',
  size: 0.05,
  distance: 24,
  period: 40,
};

const idOf = (row) => String(row?.id || '').trim();

/**
 * Horizons cần một tâm quy chiếu. Nếu quỹ đạo không tự khai, suy ra từ mã
 * Horizons của thiên thể mẹ; cuối cùng mới rơi về tâm Mặt Trời.
 */
function withResolvedCenter(orbit, orbitById) {
  const parent = orbit?.parentId ? orbitById.get(String(orbit.parentId).trim()) : null;
  const parentHorizonsId = String(parent?.horizonsId || '').trim();
  const declared = String(orbit?.orbitAround || '').trim();

  return {
    ...orbit,
    orbitAround:
      declared || (parentHorizonsId ? `500@${parentHorizonsId}` : DEFAULT_CENTER),
  };
}

/**
 * Kéo quỹ đạo trực tiếp từ JPL cho toàn bộ thiên thể. Thiên thể lỗi chỉ được
 * đếm chứ không làm hỏng cả phản hồi — mạng tới NASA hay chập chờn.
 */
async function fetchAllOrbits({ when, includeParents }) {
  const { orbits } = await showcaseCatalogRepository.loadBundleParts();
  if (orbits.length === 0) return { items: [] };

  const orbitById = new Map(orbits.map((orbit) => [idOf(orbit), orbit]));
  const targets = orbits
    .map((orbit) => withResolvedCenter(orbit, orbitById))
    .filter((orbit) => includeParents || (!orbit.parentPlanetName && !orbit.parentShowcaseEntityId));

  const items = [];
  let failed = 0;

  await Promise.all(
    targets.map(async (entity) => {
      try {
        const jpl = await fetchEntityOrbit(entity, when);
        if (jpl) items.push(applyJplToEntity(entity, jpl));
        else failed += 1;
      } catch {
        failed += 1;
      }
    }),
  );

  items.sort((a, b) => String(a.id).localeCompare(String(b.id)));
  return { items, failed };
}

/** Thiên thể mới có thể chưa có bản ghi quỹ đạo — dựng tạm từ catalog. */
function seedOrbitFromCatalog(entityId, catalogRow) {
  return {
    id: entityId,
    name: String(catalogRow.name || entityId),
    ...SEEDED_ORBIT_DEFAULTS,
    horizonsId: String(catalogRow.horizonsId || '').trim(),
    orbitAround: String(catalogRow.orbitAround || '').trim(),
    parentId: String(catalogRow.parentId || '').trim(),
    radiusKm: Number(catalogRow.radiusKm || 0) || 0,
    orbitalElements:
      catalogRow.orbitalElements && typeof catalogRow.orbitalElements === 'object'
        ? catalogRow.orbitalElements
        : null,
  };
}

function missingDataMessage(command, center) {
  const key = normalizeCommandKey(command);
  const hint =
    key === '-1024' || key === 'ARTEMIS II'
      ? ' Artemis II chỉ có ephemeris trong cửa sổ mission (vd. 2026-04-08).'
      : '';
  return `Không lấy được dữ liệu từ JPL cho COMMAND=${command}, CENTER=${center || DEFAULT_CENTER}.${hint}`;
}

function orbitAfterSync(orbit, applied) {
  return {
    ...orbit,
    horizonsId: applied.horizonsId || orbit.horizonsId || '',
    orbitAround: applied.orbitAround || orbit.orbitAround || '',
    parentId: applied.parentId || orbit.parentId || '',
    radiusKm: applied.radiusKm || orbit.radiusKm || 0,
    massKg: applied.massKg || 0,
    rotRateRadS: applied.rotRateRadS || 0,
    vectorAu: applied.vectorAu || null,
    vectorSim: applied.vectorSim || null,
    orbitalElements: applied.orbitalElements || null,
    periodDays: applied.periodDays || orbit.periodDays || 0,
    phaseDeg: applied.phaseDeg,
    inclinationDeg: applied.inclinationDeg,
    ascendingNodeDeg: applied.ascendingNodeDeg,
    orbitEccentricity: applied.orbitEccentricity,
    semiMajorAxisAu: applied.semiMajorAxisAu || null,
    orbitSource: 'jpl-horizons',
  };
}

async function syncEntity({ entityId, when, overrides }) {
  const { catalog: savedCatalog, orbits: savedOrbits } =
    await showcaseCatalogRepository.loadBundleParts();
  const catalog = [...savedCatalog];
  const orbits = [...savedOrbits];

  const orbitIndexById = new Map(orbits.map((orbit, i) => [idOf(orbit), i]));
  const catalogIndex = catalog.findIndex((entry) => idOf(entry) === entityId);
  let orbitIndex = orbitIndexById.get(entityId);

  if (orbitIndex == null) {
    if (catalogIndex < 0) {
      throw AppError.notFound('Không tìm thấy entity trong catalog/orbits');
    }
    orbits.push(seedOrbitFromCatalog(entityId, catalog[catalogIndex] || {}));
    orbitIndex = orbits.length - 1;
    orbitIndexById.set(entityId, orbitIndex);
  }

  const entity = mergeEntityForJplSync(
    orbits[orbitIndex] || {},
    catalogIndex >= 0 ? catalog[catalogIndex] : null,
    overrides,
  );

  if (!entity.orbitAround && entity.parentId) {
    const parentIndex = orbitIndexById.get(String(entity.parentId).trim());
    const parentHorizonsId = String(orbits[parentIndex]?.horizonsId || '').trim();
    if (parentHorizonsId) entity.orbitAround = `500@${parentHorizonsId}`;
  }

  const command = String(entity.horizonsId || entity.horizonsCommand || '').trim();
  if (!command) {
    throw AppError.badRequest(
      'Thiếu Horizons ID. Nhập ID JPL (vd. -1024 cho Artemis II) rồi bấm Sync lại.',
    );
  }

  const parsed = await fetchEntityOrbit(entity, when);
  if (!parsed) throw AppError.badRequest(missingDataMessage(command, entity.orbitAround));

  const applied = applyJplToEntity(entity, parsed);
  if (parsed.whenUsed) applied.horizonsWhenUsed = parsed.whenUsed;

  const nextOrbit = orbitAfterSync(orbits[orbitIndex], applied);
  orbits[orbitIndex] = nextOrbit;

  // Catalog giữ bản sao các trường quỹ đạo để editor hiển thị mà không cần join.
  if (catalogIndex >= 0) {
    catalog[catalogIndex] = {
      ...catalog[catalogIndex],
      horizonsId: nextOrbit.horizonsId || '',
      orbitAround: nextOrbit.orbitAround || '',
      parentId: nextOrbit.parentId || '',
      radiusKm: nextOrbit.radiusKm || 0,
      orbitalElements: nextOrbit.orbitalElements || null,
    };
  }

  await showcaseCatalogRepository.saveBundleParts({ orbits, catalog });
  return { item: applied, whenUsed: parsed.whenUsed || when || null };
}

module.exports = { fetchAllOrbits, syncEntity };
