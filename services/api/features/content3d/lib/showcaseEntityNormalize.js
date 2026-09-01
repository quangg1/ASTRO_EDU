const {
  normalizeColorHex,
  normalizeEntityId,
  normalizeMediaUrlField,
  trimTo,
  finitePositive,
  finiteOr,
} = require('./showcaseFieldNormalize');
const { normalizePanelConfig } = require('./showcasePanelNormalize');

/**
 * Một thực thể showcase sống ở hai nơi trong bundle: `catalog` (nội dung hiển
 * thị) và `orbits` (tham số quỹ đạo). Module này chuẩn hóa từng nguồn và gộp
 * chúng thành một hàng phẳng cho editor.
 */

const ENTITY_GROUPS = new Set(['planets_moons', 'dwarf_asteroids', 'comets', 'spacecraft']);

const ORBITAL_ELEMENT_KEYS = ['a', 'e', 'i', 'om', 'w', 'm'];

function normalizeOrbitalElements(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const elements = Object.fromEntries(
    ORBITAL_ELEMENT_KEYS.map((key) => [key, finiteOr(source[key])]),
  );
  // Chu kỳ âm là vô nghĩa và làm hỏng phép nội suy quỹ đạo ở client.
  elements.periodDays = Math.max(0, finiteOr(source.periodDays));
  return elements;
}

/** `textureUrl` là tên cũ của `diffuseMapUrl`; giữ cả hai để client cũ không vỡ. */
function resolveDiffuseMap(raw) {
  return (
    normalizeMediaUrlField(raw?.diffuseMapUrl) || normalizeMediaUrlField(raw?.textureUrl)
  );
}

function normalizeMediaFields(raw) {
  const diffuseMapUrl = resolveDiffuseMap(raw);
  return {
    textureUrl: diffuseMapUrl,
    diffuseMapUrl,
    normalMapUrl: normalizeMediaUrlField(raw?.normalMapUrl),
    specularMapUrl: normalizeMediaUrlField(raw?.specularMapUrl),
    cloudMapUrl: normalizeMediaUrlField(raw?.cloudMapUrl),
    modelUrl: normalizeMediaUrlField(raw?.modelUrl),
  };
}

/** Payload editor gửi lên khi lưu một thực thể. */
function normalizeEntityInput(raw) {
  const entityId = normalizeEntityId(raw?.entityId);
  if (!entityId) return null;

  return {
    entityId,
    nameVi: String(raw?.nameVi || '').trim(),
    museumBlurbVi: String(raw?.museumBlurbVi || '').trim(),
    ...normalizeMediaFields(raw),
    horizonsId: trimTo(raw?.horizonsId, 80),
    orbitAround: trimTo(raw?.orbitAround, 80),
    parentId: trimTo(raw?.parentId, 120),
    parentPlanetName: trimTo(raw?.parentPlanetName, 80),
    radiusKm: finitePositive(raw?.radiusKm),
    orbitColor: normalizeColorHex(raw?.orbitColor),
    orbitalElements: normalizeOrbitalElements(raw?.orbitalElements),
    horizonsCommand: trimTo(raw?.horizonsCommand, 80),
    horizonsCenter: trimTo(raw?.horizonsCenter, 80),
    published: raw?.published !== false,
    panelConfig: normalizePanelConfig(raw?.panelConfig),
  };
}

/** Một dòng `catalog` đã lưu trong DB. */
function normalizeCatalogContent(raw) {
  const entityId = normalizeEntityId(raw?.id);
  if (!entityId) return null;

  return {
    entityId,
    nameVi: String(raw?.nameVi || '').trim(),
    museumBlurbVi: String(raw?.museumBlurbVi || '').trim(),
    ...normalizeMediaFields(raw),
    horizonsId: String(raw?.horizonsId || '').trim(),
    orbitAround: String(raw?.orbitAround || '').trim(),
    parentId: String(raw?.parentId || '').trim(),
    parentPlanetName: trimTo(raw?.parentPlanetName || raw?.linkedPlanetName, 80),
    radiusKm: finitePositive(raw?.radiusKm),
    orbitColor: normalizeColorHex(raw?.orbitColor),
    orbitalElements:
      raw?.orbitalElements && typeof raw.orbitalElements === 'object'
        ? normalizeOrbitalElements(raw.orbitalElements)
        : null,
    horizonsCommand: String(raw?.horizonsCommand || '').trim(),
    horizonsCenter: String(raw?.horizonsCenter || '').trim(),
    published: raw?.published !== false,
    panelConfig: normalizePanelConfig(raw?.panelConfig),
  };
}

/** Quỹ đạo là nguồn đúng cho tham số vật lý; catalog chỉ là dự phòng. */
function mergeCatalogWithOrbit(row, orbit) {
  return {
    ...row,
    horizonsCommand: String(orbit?.horizonsCommand || '').trim(),
    horizonsCenter: String(orbit?.horizonsCenter || '').trim(),
    horizonsId: String(orbit?.horizonsId || row.horizonsId || '').trim(),
    orbitAround: String(orbit?.orbitAround || row.orbitAround || '').trim(),
    parentId: String(orbit?.parentId || row.parentId || '').trim(),
    parentPlanetName: String(orbit?.parentPlanetName || row.parentPlanetName || '').trim(),
    radiusKm: finitePositive(orbit?.radiusKm, Number(row.radiusKm || 0)),
    orbitColor: normalizeColorHex(orbit?.orbitColor, normalizeColorHex(row.orbitColor)),
    orbitalElements:
      orbit?.orbitalElements && typeof orbit.orbitalElements === 'object'
        ? orbit.orbitalElements
        : row.orbitalElements || null,
  };
}

function buildEntityRows({ catalog, orbits }) {
  const orbitById = new Map(
    orbits.map((orbit) => [String(orbit?.id || '').trim(), orbit]),
  );
  return catalog
    .map((entry) => {
      const row = normalizeCatalogContent(entry);
      return row ? mergeCatalogWithOrbit(row, orbitById.get(row.entityId)) : null;
    })
    .filter(Boolean);
}

module.exports = {
  ENTITY_GROUPS,
  normalizeEntityInput,
  normalizeCatalogContent,
  mergeCatalogWithOrbit,
  buildEntityRows,
};
