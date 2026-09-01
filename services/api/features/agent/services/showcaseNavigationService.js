const path = require('path');
const fs = require('fs');
const { getCatalogBundle } = require('../../content3d/services/showcaseContentService');

const SOLAR_PLANETS = [
  'Mercury',
  'Venus',
  'Earth',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
];

/** alias (normalized) → canonical English planet name */
const PLANET_ALIASES = {
  mercury: 'Mercury',
  saothuy: 'Mercury',
  'sao thuy': 'Mercury',
  venus: 'Venus',
  saokim: 'Venus',
  'sao kim': 'Venus',
  'kim tinh': 'Venus',
  earth: 'Earth',
  traidat: 'Earth',
  'trai dat': 'Earth',
  mars: 'Mars',
  saohoa: 'Mars',
  'sao hoa': 'Mars',
  jupiter: 'Jupiter',
  saomoc: 'Jupiter',
  'sao moc': 'Jupiter',
  saturn: 'Saturn',
  saotho: 'Saturn',
  'sao tho': 'Saturn',
  uranus: 'Uranus',
  saothienvuong: 'Uranus',
  'sao thien vuong': 'Uranus',
  neptune: 'Neptune',
  saohaivuong: 'Neptune',
  'sao hai vuong': 'Neptune',
};

const GROUP_LABEL_VI = {
  planets_moons: 'hành tinh / vệ tinh',
  dwarf_asteroids: 'hành tinh lùn / tiểu hành tinh',
  comets: 'sao chổi',
  spacecraft: 'tàu vũ trụ',
};

let catalogCache = null;
let catalogCacheAt = 0;
const CACHE_MS = 5 * 60 * 1000;

function normalizeKey(raw) {
  return String(raw || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function resolvePlanetCanonical(raw) {
  const key = normalizeKey(raw);
  if (!key) return null;
  if (PLANET_ALIASES[key]) return PLANET_ALIASES[key];
  for (const planet of SOLAR_PLANETS) {
    if (normalizeKey(planet) === key) return planet;
  }
  return null;
}

function loadCatalogFromFile() {
  const filePath = path.join(
    __dirname,
    '../../../../../client/src/data/showcaseCatalogBundle.json',
  );
  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(raw.catalog) ? raw.catalog : [];
  } catch {
    return [];
  }
}

async function loadShowcaseCatalog() {
  if (catalogCache && Date.now() - catalogCacheAt < CACHE_MS) return catalogCache;
  let catalog = [];
  try {
    const doc = await getCatalogBundle();
    if (Array.isArray(doc?.catalog) && doc.catalog.length) catalog = doc.catalog;
  } catch {
    /* Mongo optional in dev */
  }
  if (!catalog.length) catalog = loadCatalogFromFile();
  catalogCache = catalog.filter((row) => row && row.published !== false);
  catalogCacheAt = Date.now();
  return catalogCache;
}

function buildPlanetEntityIndex(catalog) {
  /** @type {Record<string, { planet: string, entityId: string|null, children: Array<{ entityId: string, name: string, group: string }> }>} */
  const byPlanet = {};
  for (const planet of SOLAR_PLANETS) {
    byPlanet[planet] = { planet, entityId: null, children: [] };
  }

  for (const item of catalog) {
    const id = String(item.id || '').trim();
    const name = String(item.name || '').trim();
    if (!id || !name) continue;

    if (id.startsWith('planet-') && item.group === 'planets_moons' && name === item.linkedPlanetName) {
      if (byPlanet[name]) byPlanet[name].entityId = id;
      continue;
    }

    const parent = item.linkedPlanetName ? byPlanet[item.linkedPlanetName] : null;
    if (parent) {
      parent.children.push({ entityId: id, name, group: item.group || 'planets_moons' });
    }
  }

  return byPlanet;
}

/**
 * @param {Record<string, unknown>|null|undefined} sessionContext
 */
async function buildShowcaseAgentContext(sessionContext) {
  if (sessionContext?.surface !== 'explore') return null;
  const catalog = await loadShowcaseCatalog();
  if (!catalog.length) return null;

  const byPlanet = buildPlanetEntityIndex(catalog);
  const planets = SOLAR_PLANETS.map((planet) => {
    const row = byPlanet[planet];
    return {
      planet,
      entityId: row?.entityId || `planet-${planet.toLowerCase()}`,
      moonsAndOrbiters: (row?.children || []).slice(0, 16).map((c) => ({
        entityId: c.entityId,
        name: c.name,
        group: c.group,
      })),
    };
  });

  const otherGroups = {};
  for (const item of catalog) {
    if (item.group === 'planets_moons' && item.linkedPlanetName) continue;
    if (item.group === 'planets_moons' && String(item.id || '').startsWith('planet-')) continue;
    const group = item.group || 'other';
    if (!otherGroups[group]) otherGroups[group] = [];
    if (otherGroups[group].length >= 12) continue;
    otherGroups[group].push({
      entityId: item.id,
      name: item.name,
      group,
      linkedPlanetName: item.linkedPlanetName || null,
    });
  }

  const activeEntityId =
    (typeof sessionContext.entityId === 'string' && sessionContext.entityId.trim()) || null;
  const activeItem = activeEntityId ? catalog.find((c) => c.id === activeEntityId) : null;

  return {
    activeEntityId,
    activeEntityName: activeItem?.name || null,
    activeLinkedPlanet: activeItem?.linkedPlanetName || null,
    planets,
    otherGroups,
    navigationHintVi:
      'Để di chuyển camera/scene: gọi focus_showcase_entity với planet_name (vd. Venus) hoặc entity_name (vd. Europa) hoặc entity_id. Timeline Trái Đất dùng go_to_explore(stage_time_ma).',
  };
}

/**
 * @param {Record<string, unknown>} args
 * @param {Array<{ id: string, name: string, group?: string, linkedPlanetName?: string }>} catalog
 */
function resolveShowcaseTarget(args, catalog) {
  const entityIdRaw = args?.entity_id ?? args?.entityId;
  if (typeof entityIdRaw === 'string' && entityIdRaw.trim()) {
    const id = entityIdRaw.trim();
    const hit = catalog.find((c) => c.id === id);
    if (hit) {
      return {
        entityId: hit.id,
        name: hit.name,
        planet: hit.linkedPlanetName || resolvePlanetCanonical(hit.name),
      };
    }
  }

  const planetRaw = args?.planet_name ?? args?.planetName ?? args?.planet;
  if (typeof planetRaw === 'string' && planetRaw.trim()) {
    const canonical = resolvePlanetCanonical(planetRaw);
    if (canonical) {
      const planetId = `planet-${canonical.toLowerCase()}`;
      const hit =
        catalog.find((c) => c.id === planetId) ||
        catalog.find(
          (c) =>
            c.group === 'planets_moons' &&
            c.linkedPlanetName === canonical &&
            normalizeKey(c.name) === normalizeKey(canonical),
        );
      if (hit) {
        return { entityId: hit.id, name: hit.name, planet: canonical };
      }
      return { entityId: planetId, name: canonical, planet: canonical };
    }
  }

  const nameRaw = args?.entity_name ?? args?.entityName ?? args?.name;
  if (typeof nameRaw === 'string' && nameRaw.trim()) {
    const key = normalizeKey(nameRaw);
    const exact = catalog.filter((c) => normalizeKey(c.name) === key);
    if (exact.length === 1) {
      return {
        entityId: exact[0].id,
        name: exact[0].name,
        planet: exact[0].linkedPlanetName || resolvePlanetCanonical(exact[0].name),
      };
    }
    const partial = catalog.filter(
      (c) => normalizeKey(c.name).includes(key) || normalizeKey(c.id).includes(key.replace(/ /g, '-')),
    );
    if (partial.length === 1) {
      return {
        entityId: partial[0].id,
        name: partial[0].name,
        planet: partial[0].linkedPlanetName || resolvePlanetCanonical(partial[0].name),
      };
    }
  }

  return null;
}

/**
 * Liệt kê entity theo hành tinh (dùng trả lời hoặc gợi ý tool).
 * @param {string} planetRaw
 */
async function listEntitiesForPlanet(planetRaw) {
  const canonical = resolvePlanetCanonical(planetRaw);
  if (!canonical) return null;
  const catalog = await loadShowcaseCatalog();
  const byPlanet = buildPlanetEntityIndex(catalog);
  const row = byPlanet[canonical];
  if (!row) return null;
  return {
    planet: canonical,
    planetEntityId: row.entityId || `planet-${canonical.toLowerCase()}`,
    entities: [
      { entityId: row.entityId || `planet-${canonical.toLowerCase()}`, name: canonical, kind: 'planet' },
      ...(row.children || []).map((c) => ({
        entityId: c.entityId,
        name: c.name,
        kind: GROUP_LABEL_VI[c.group] || c.group,
      })),
    ],
  };
}

function inferPlanetFocusFromMessage(text) {
  const key = normalizeKey(text);
  if (!key) return null;
  const entries = Object.entries(PLANET_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, planet] of entries) {
    if (planet === 'Earth') continue;
    if (key.includes(alias)) return planet;
  }
  for (const planet of SOLAR_PLANETS) {
    if (planet === 'Earth') continue;
    if (key.includes(normalizeKey(planet))) return planet;
  }
  return null;
}

module.exports = {
  buildShowcaseAgentContext,
  resolveShowcaseTarget,
  resolvePlanetCanonical,
  inferPlanetFocusFromMessage,
  listEntitiesForPlanet,
  loadShowcaseCatalog,
  normalizeKey,
  buildPlanetEntityIndex,
};
