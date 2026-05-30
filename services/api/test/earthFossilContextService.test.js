const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getFossilTimeRangeForStageTime,
  shouldBuildEarthFossilContext,
  parseStageTimeMa,
} = require('../features/agent/services/earthFossilContextService');

test('getFossilTimeRangeForStageTime uses quaternary buffer below 1 Ma', () => {
  const range = getFossilTimeRangeForStageTime(0.5);
  assert.equal(range?.maxMa, 0.5 + 2.6);
  assert.equal(range?.minMa, 0);
});

test('getFossilTimeRangeForStageTime uses phanerozoic buffer', () => {
  const range = getFossilTimeRangeForStageTime(100);
  assert.equal(range?.maxMa, 150);
  assert.equal(range?.minMa, 50);
});

test('getFossilTimeRangeForStageTime rejects pre-fossil deep time', () => {
  assert.equal(getFossilTimeRangeForStageTime(700), null);
});

test('shouldBuildEarthFossilContext requires explore earth with stage', () => {
  assert.equal(
    shouldBuildEarthFossilContext({ surface: 'explore', planet: 'earth', stageTimeMa: 250 }),
    true,
  );
  assert.equal(
    shouldBuildEarthFossilContext({ surface: 'explore', planet: 'mars', stageTimeMa: 250 }),
    false,
  );
  assert.equal(
    shouldBuildEarthFossilContext({ surface: 'learning_path', planet: 'earth', stageTimeMa: 250 }),
    false,
  );
});

test('parseStageTimeMa accepts numeric strings', () => {
  assert.equal(parseStageTimeMa('66'), 66);
  assert.equal(parseStageTimeMa('bad'), null);
});
