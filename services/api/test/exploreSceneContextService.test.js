const test = require('node:test');
const assert = require('node:assert/strict');
const { buildExploreSceneContext } = require('../features/agent/services/exploreSceneContextService');

test('buildExploreSceneContext assembles beat, site, iconic, sky', () => {
  const ctx = buildExploreSceneContext({
    surface: 'explore',
    narrativeBeatId: 12,
    narrativeBeatName: 'Carboniferous',
    narrativeBeatTimeMa: 320,
    narrativeBeatAgeLabel: '320 triệu năm trước',
    selectedSite: {
      siteId: 'pin-1',
      nameVi: 'Rừng than',
      kind: 'forest',
      blurbVi: 'Rừng nhiệt đới rộng lớn.',
    },
    iconicOrganisms: [
      { nameVi: 'Chuồn chuồn khổng lồ', name: 'Meganeura', description: 'Côn trùng bay lớn', hasModel3d: true },
    ],
    skyContext: {
      pinnedTargetId: 'constellation-orion',
      pinnedTargetLabel: 'Orion',
      pinnedTargetKind: 'constellation',
      sceneHighlightId: null,
      sceneHighlightLabel: null,
      observerLatDeg: 10.8,
      observerLonDeg: 106.66,
      observerTimeIso: '2026-01-15T14:30:00.000Z',
      observerLocationLabel: '10.8°N, 106.7°E',
      lightPollution: 'suburban',
      museumBlurbVi: 'Chòm sao mùa đông.',
    },
  });

  assert.ok(ctx?.narrativeBeat);
  assert.equal(ctx.narrativeBeat.name, 'Carboniferous');
  assert.equal(ctx.selectedSite.nameVi, 'Rừng than');
  assert.equal(ctx.iconicOrganisms.length, 1);
  assert.equal(ctx.sky.pinnedTargetLabel, 'Orion');
});

test('buildExploreSceneContext returns null outside explore', () => {
  assert.equal(buildExploreSceneContext({ surface: 'course' }), null);
});
