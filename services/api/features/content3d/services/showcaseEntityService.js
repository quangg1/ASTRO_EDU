const { AppError } = require('../../../shared/errors');
const { showcaseCatalogRepository } = require('../repositories/showcaseCatalogRepository');
const { planetNarrativeRepository } = require('../repositories/planetNarrativeRepository');
const {
  normalizeEntityInput,
  normalizeCatalogContent,
  buildEntityRows,
} = require('../lib/showcaseEntityNormalize');
const {
  resolveParentEntityId,
  sortEntitiesHierarchically,
} = require('../lib/showcaseEntityTree');

/** 8 hành tinh là xương sống của cảnh 3D — xóa là hỏng toàn bộ trải nghiệm. */
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

const ENTITY_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

const DEFAULT_ORBIT = {
  distance: 1.6,
  period: 6,
  size: 0.06,
  color: '#94a3b8',
  orbitColor: '#64748b',
};

async function listPublishedEntities() {
  const { catalog, orbits } = await showcaseCatalogRepository.loadBundleParts();
  const items = buildEntityRows({ catalog, orbits })
    .filter((row) => row.published)
    .map((row) => ({ ...row, published: true }));
  return { items };
}

async function listEntitiesForEditor() {
  const { catalog, orbits } = await showcaseCatalogRepository.loadBundleParts();
  return {
    items: sortEntitiesHierarchically(buildEntityRows({ catalog, orbits }), catalog),
    catalog,
  };
}

/** Đọc lại sau khi ghi để editor luôn thấy đúng thứ tự cây đã sắp xếp. */
async function reloadEditorItems() {
  const { items } = await listEntitiesForEditor();
  return items;
}

async function loadWritableBundle() {
  const { catalog, orbits } = await showcaseCatalogRepository.loadBundleParts();
  if (catalog.length === 0) throw AppError.badRequest('Catalog bundle chưa có dữ liệu');
  return { catalog: [...catalog], orbits: [...orbits] };
}

function applyEntityToCatalog(entry, input) {
  return {
    ...entry,
    id: input.entityId,
    nameVi: input.nameVi,
    museumBlurbVi: input.museumBlurbVi,
    textureUrl: input.textureUrl,
    diffuseMapUrl: input.diffuseMapUrl,
    normalMapUrl: input.normalMapUrl,
    specularMapUrl: input.specularMapUrl,
    cloudMapUrl: input.cloudMapUrl,
    modelUrl: input.modelUrl,
    horizonsId: input.horizonsId,
    orbitAround: input.orbitAround,
    parentId: input.parentId,
    radiusKm: input.radiusKm,
    orbitColor: input.orbitColor || '',
    orbitalElements: input.orbitalElements,
    published: input.published,
    panelConfig: input.panelConfig,
  };
}

/** Horizons dùng cặp COMMAND/CENTER; editor lại nhập dưới tên id/orbitAround. */
function applyEntityToOrbit(orbit, input) {
  const command = input.horizonsId || input.horizonsCommand || '';
  const center = input.orbitAround || input.horizonsCenter || '';
  return {
    ...orbit,
    horizonsId: command || orbit.horizonsId || '',
    orbitAround: center || orbit.orbitAround || '',
    parentId: input.parentId || orbit.parentId || '',
    parentPlanetName: String(input.parentPlanetName ?? orbit.parentPlanetName ?? '')
      .trim()
      .slice(0, 80),
    radiusKm: input.radiusKm || orbit.radiusKm || 0,
    orbitColor: input.orbitColor || orbit.orbitColor || '',
    orbitalElements: input.orbitalElements || orbit.orbitalElements || null,
    horizonsCommand: command,
    horizonsCenter: center,
  };
}

/**
 * Lưu hàng loạt từ bảng editor. Hàng hỏng hoặc trỏ tới entity không tồn tại
 * được báo lại theo id thay vì làm hỏng cả lượt lưu.
 */
async function saveEntities(rows) {
  const { catalog, orbits } = await loadWritableBundle();
  const catalogIndex = new Map(catalog.map((entry, i) => [String(entry?.id || '').trim(), i]));
  const orbitIndex = new Map(orbits.map((orbit, i) => [String(orbit?.id || '').trim(), i]));

  const seen = new Set();
  const invalidEntityIds = [];

  for (const row of rows) {
    const input = normalizeEntityInput(row);
    if (!input) {
      invalidEntityIds.push(String(row?.entityId || ''));
      continue;
    }
    if (seen.has(input.entityId)) continue;
    seen.add(input.entityId);

    const index = catalogIndex.get(input.entityId);
    if (index == null) {
      invalidEntityIds.push(input.entityId);
      continue;
    }

    catalog[index] = applyEntityToCatalog(catalog[index] || {}, input);

    const orbitIdx = orbitIndex.get(input.entityId);
    if (orbitIdx != null) orbits[orbitIdx] = applyEntityToOrbit(orbits[orbitIdx] || {}, input);
  }

  await showcaseCatalogRepository.saveBundleParts({ catalog, orbits });

  return {
    items: await reloadEditorItems(),
    invalidEntityIds: invalidEntityIds.filter(Boolean),
  };
}

/** Mặt trăng/tàu vũ trụ chỉ có nghĩa khi bay quanh một thiên thể mẹ. */
function needsOrbit(entityId, parentId, linkedPlanetName) {
  return (
    entityId.startsWith('moon-') ||
    entityId.startsWith('sc-') ||
    Boolean(parentId || linkedPlanetName)
  );
}

async function createEntity({ entityId, name, group, parentId, linkedPlanetName }) {
  if (!ENTITY_ID_PATTERN.test(entityId)) {
    throw AppError.badRequest(
      'entityId phải là slug chữ thường (vd: moon-triton, sc-new-mission)',
    );
  }

  const { catalog, orbits } = await loadWritableBundle();
  if (catalog.some((entry) => String(entry?.id || '').trim() === entityId)) {
    throw AppError.conflict('entityId đã tồn tại');
  }

  // Con của một hành tinh thì suy ra tên hành tinh từ chính id của cha.
  let planetName = linkedPlanetName;
  if (!planetName && parentId.startsWith('planet-')) {
    const bare = parentId.replace(/^planet-/, '');
    planetName = bare.charAt(0).toUpperCase() + bare.slice(1).toLowerCase();
  }

  const entry = { id: entityId, name, group, published: true };
  if (planetName) entry.linkedPlanetName = planetName;
  catalog.push(entry);

  if (
    needsOrbit(entityId, parentId, planetName) &&
    !orbits.some((orbit) => String(orbit?.id || '').trim() === entityId)
  ) {
    orbits.push({
      id: entityId,
      name,
      parentId: parentId || (planetName ? `planet-${planetName.toLowerCase()}` : ''),
      parentPlanetName: planetName || '',
      ...DEFAULT_ORBIT,
    });
  }

  await showcaseCatalogRepository.saveBundleParts({ catalog, orbits });
  return { items: await reloadEditorItems(), entityId };
}

function findChildIds(entityId, catalog, orbits) {
  const orbitById = new Map(orbits.map((orbit) => [String(orbit?.id || '').trim(), orbit]));
  return catalog
    .map((entry) => {
      const id = String(entry?.id || '').trim();
      const parent = resolveParentEntityId(entry, orbitById.get(id), normalizeCatalogContent(entry));
      return parent === entityId ? id : '';
    })
    .filter(Boolean);
}

async function deleteEntity(entityId, { cascade = false } = {}) {
  if (CORE_PLANET_IDS.has(entityId)) {
    throw AppError.forbidden('Không xóa 8 hành tinh lõi của hệ Mặt Trời');
  }

  const { catalog, orbits } = await showcaseCatalogRepository.loadBundleParts();

  // Xóa cha mà bỏ lại con sẽ tạo mục mồ côi, nên phải xác nhận cascade trước.
  const childIds = findChildIds(entityId, catalog, orbits);
  if (childIds.length > 0 && !cascade) {
    return { status: 'has_children', childIds };
  }

  const removeIds = new Set([entityId, ...childIds]);
  const nextCatalog = catalog.filter((entry) => !removeIds.has(String(entry?.id || '').trim()));
  if (nextCatalog.length === catalog.length) throw AppError.notFound('Không tìm thấy entity');

  const nextOrbits = orbits.filter((orbit) => !removeIds.has(String(orbit?.id || '').trim()));
  await showcaseCatalogRepository.saveBundleParts({ catalog: nextCatalog, orbits: nextOrbits });

  // Lời dẫn mồ côi không còn nơi hiển thị; xóa nhưng không chặn nếu lỗi.
  await planetNarrativeRepository
    .deleteForEntityIds([...removeIds])
    .catch((err) => console.warn('[showcase] xóa planet narrative:', err.message));

  return { status: 'deleted', items: await reloadEditorItems(), removedIds: [...removeIds] };
}

module.exports = {
  CORE_PLANET_IDS,
  listPublishedEntities,
  listEntitiesForEditor,
  saveEntities,
  createEntity,
  deleteEntity,
};
