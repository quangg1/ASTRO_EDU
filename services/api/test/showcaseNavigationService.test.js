const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');
const {
  resolvePlanetCanonical,
  resolveShowcaseTarget,
  normalizeKey,
  buildPlanetEntityIndex,
} = require('../features/agent/services/showcaseNavigationService');

function loadFixtureCatalog() {
  const filePath = path.join(
    __dirname,
    '../../../client/src/data/showcaseCatalogBundle.json',
  );
  const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return raw.catalog;
}

test('resolvePlanetCanonical maps Vietnamese and English', () => {
  assert.equal(resolvePlanetCanonical('Sao Kim'), 'Venus');
  assert.equal(resolvePlanetCanonical('venus'), 'Venus');
  assert.equal(resolvePlanetCanonical('Trái Đất'), 'Earth');
});

test('resolveShowcaseTarget finds planet by name', () => {
  const catalog = loadFixtureCatalog();
  const hit = resolveShowcaseTarget({ planet_name: 'Venus' }, catalog);
  assert.equal(hit?.entityId, 'planet-venus');
  assert.equal(hit?.name, 'Venus');
});

test('resolveShowcaseTarget finds moon by entity name', () => {
  const catalog = loadFixtureCatalog();
  const hit = resolveShowcaseTarget({ entity_name: 'Europa' }, catalog);
  assert.equal(hit?.entityId, 'moon-europa');
});

test('buildPlanetEntityIndex groups moons under parent planet', () => {
  const catalog = loadFixtureCatalog();
  const byPlanet = buildPlanetEntityIndex(catalog);
  assert.equal(byPlanet.Jupiter.entityId, 'planet-jupiter');
  assert.ok(byPlanet.Jupiter.children.some((c) => c.entityId === 'moon-europa'));
});

test('normalizeKey strips accents', () => {
  assert.equal(normalizeKey('Sao Hỏa'), 'sao hoa');
});
