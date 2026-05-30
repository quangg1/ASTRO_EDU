const test = require('node:test');
const assert = require('node:assert/strict');
const {
  inferPlanetFocusFromMessage,
  resolveShowcaseTarget,
} = require('../features/agent/services/showcaseNavigationService');
const path = require('path');
const fs = require('fs');

function loadFixtureCatalog() {
  const filePath = path.join(__dirname, '../../../client/src/data/showcaseCatalogBundle.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8')).catalog;
}

test('inferPlanetFocusFromMessage detects mars in Vietnamese navigate phrase', () => {
  assert.equal(inferPlanetFocusFromMessage('di chuyển tới mars'), 'Mars');
  assert.equal(inferPlanetFocusFromMessage('di chuyen toi sao hoa'), 'Mars');
});

test('go_to_explore rewrite path resolves mars entity', () => {
  const catalog = loadFixtureCatalog();
  const inferred = inferPlanetFocusFromMessage('di chuyển tới mars');
  const hit = resolveShowcaseTarget({ planet_name: inferred }, catalog);
  assert.equal(hit?.entityId, 'planet-mars');
});
