const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeSceneContext, sceneEntityIds } = require('../shared/schemas/sceneContextSchema');

test('scene context keeps primary first, drops duplicates and empty input', () => {
  assert.equal(normalizeSceneContext(null), undefined);
  assert.equal(normalizeSceneContext({ primaryEntityId: ' ', entityIds: [''] }), undefined);
  assert.deepEqual(
    normalizeSceneContext({ primaryEntityId: ' planet-mars ', entityIds: ['planet-mars', 'moon-phobos', 'moon-phobos'] }),
    { primaryEntityId: 'planet-mars', entityIds: ['moon-phobos'] },
  );
  assert.deepEqual(sceneEntityIds({ primaryEntityId: 'planet-mars', entityIds: ['moon-phobos'] }), [
    'planet-mars',
    'moon-phobos',
  ]);
});

test('history focus needs a primary entity and a numeric beat', () => {
  assert.equal(normalizeSceneContext({ historyFocus: { beatId: 3 } }), undefined);
  assert.deepEqual(
    normalizeSceneContext({ primaryEntityId: 'planet-earth', historyFocus: { beatId: '3', labelVi: 'Kỷ Băng hà' } }),
    { primaryEntityId: 'planet-earth', historyFocus: { beatId: 3, labelVi: 'Kỷ Băng hà' } },
  );
});
