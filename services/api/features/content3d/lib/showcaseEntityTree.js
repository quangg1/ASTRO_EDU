/**
 * Sắp xếp thực thể cho editor theo cây thiên văn thay vì bảng chữ cái:
 * hành tinh theo thứ tự từ Mặt Trời ra ngoài, mặt trăng/tàu nằm ngay dưới
 * thiên thể mẹ.
 */

const GROUP_ORDER = ['planets_moons', 'dwarf_asteroids', 'comets', 'spacecraft'];

const PLANET_ORDER = [
  'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune',
];
const DWARF_ORDER = ['Pluto', 'Ceres', 'Eris', 'Haumea', 'Makemake'];

const ID_PREFIX_GROUPS = [
  ['planet-', 'planets_moons'],
  ['moon-', 'planets_moons'],
  ['dwarf-', 'dwarf_asteroids'],
  ['asteroid-', 'dwarf_asteroids'],
  ['comet-', 'comets'],
  ['sc-', 'spacecraft'],
];

function inferGroupFromEntityId(entityId) {
  const id = String(entityId || '').trim();
  const match = ID_PREFIX_GROUPS.find(([prefix]) => id.startsWith(prefix));
  return match ? match[1] : 'planets_moons';
}

/** Cha có thể khai bằng id trực tiếp, hoặc suy ra từ tên hành tinh liên kết. */
function resolveParentEntityId(catalogEntry, orbit, row) {
  const explicit = String(orbit?.parentId || row?.parentId || '').trim();
  if (explicit) return explicit;

  const planetName = String(
    catalogEntry?.linkedPlanetName || orbit?.parentPlanetName || row?.parentPlanetName || '',
  ).trim();
  return planetName ? `planet-${planetName.toLowerCase()}` : '';
}

function compareNames(a, b) {
  return String(a || '').localeCompare(String(b || ''), 'en', { sensitivity: 'base' });
}

/** Xếp theo danh sách chuẩn trước, phần còn lại theo tên. */
function byCanonicalOrder(order, fallbackRank) {
  return (a, b) => {
    const rankA = order.indexOf(a.name) >= 0 ? order.indexOf(a.name) : fallbackRank;
    const rankB = order.indexOf(b.name) >= 0 ? order.indexOf(b.name) : fallbackRank;
    return rankA !== rankB ? rankA - rankB : compareNames(a.name, b.name);
  };
}

function groupChildrenByParent(nodes) {
  const byParent = new Map();
  for (const node of nodes) {
    const bucket = byParent.get(node.parentId || '') || [];
    bucket.push(node);
    byParent.set(node.parentId || '', bucket);
  }
  for (const children of byParent.values()) children.sort((a, b) => compareNames(a.name, b.name));
  return byParent;
}

/** Thiên thể chính trước, con của nó ngay sau; mục mồ côi xếp cuối nhóm. */
function flattenParentsWithChildren(nodes, { parentPrefix, order, fallbackRank }) {
  const parents = nodes.filter((node) => node.entityId.startsWith(parentPrefix));
  const others = nodes.filter((node) => !node.entityId.startsWith(parentPrefix));
  parents.sort(byCanonicalOrder(order, fallbackRank));

  const childrenByParent = groupChildrenByParent(others);
  const result = [];
  const placed = new Set();

  for (const parent of parents) {
    result.push(parent);
    placed.add(parent.entityId);
    for (const child of childrenByParent.get(parent.entityId) || []) {
      result.push(child);
      placed.add(child.entityId);
    }
  }
  for (const node of others) {
    if (!placed.has(node.entityId)) result.push(node);
  }
  return result;
}

const GROUP_LAYOUT = {
  planets_moons: { parentPrefix: 'planet-', order: PLANET_ORDER, fallbackRank: 99 },
  dwarf_asteroids: { parentPrefix: 'dwarf-', order: DWARF_ORDER, fallbackRank: 50 },
};

function sortEntitiesHierarchically(items, catalog) {
  const catalogById = new Map(
    (catalog || []).map((entry) => [String(entry?.id || '').trim(), entry]),
  );

  const nodes = items.map((item) => {
    const entry = catalogById.get(item.entityId);
    return {
      item,
      entityId: item.entityId,
      name: String(item.nameVi || entry?.name || item.entityId).trim(),
      group: String(entry?.group || inferGroupFromEntityId(item.entityId)),
      parentId: resolveParentEntityId(entry, null, item),
    };
  });

  const ordered = [];
  for (const group of GROUP_ORDER) {
    const inGroup = nodes.filter((node) => node.group === group);
    if (!inGroup.length) continue;

    const layout = GROUP_LAYOUT[group];
    if (layout) ordered.push(...flattenParentsWithChildren(inGroup, layout));
    else ordered.push(...inGroup.sort((a, b) => compareNames(a.name, b.name)));
  }

  return ordered.map((node) => node.item);
}

module.exports = {
  GROUP_ORDER,
  inferGroupFromEntityId,
  resolveParentEntityId,
  sortEntitiesHierarchically,
};
