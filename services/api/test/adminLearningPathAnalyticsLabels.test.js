const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveLessonDisplay,
  resolveConceptTitle,
  humanizeSlug,
} = require('../features/admin/services/adminLearningPathAnalyticsLabels');

test('humanizeSlug converts snake_case', () => {
  assert.equal(humanizeSlug('solar_eclipse'), 'Solar Eclipse');
});

test('resolveLessonDisplay falls back to module and node titles from composite id', () => {
  const lookup = {
    lessonMap: new Map(),
    moduleMap: new Map([
      ['solar-system', { moduleTitle: 'Hệ Mặt Trời', moduleOrder: 2 }],
    ]),
    nodeMap: new Map([
      ['solar-system', { nodeTitle: 'Tổng quan hệ Mặt Trời' }],
    ]),
    conceptMap: new Map(),
  };
  const row = resolveLessonDisplay(
    'solar-system__solar-system__ch--mi-sy9eln__beginner__7yhwuuy0sd',
    'solar-system',
    'solar-system',
    lookup,
  );
  assert.equal(row.lessonTitle, 'Tổng quan hệ Mặt Trời · Cơ bản');
  assert.match(row.locationLabel, /Hệ Mặt Trời/);
});

test('resolveConceptTitle uses lookup map', () => {
  const lookup = {
    conceptMap: new Map([['solar_eclipse', 'Nhật thực']]),
  };
  assert.equal(resolveConceptTitle('solar_eclipse', lookup), 'Nhật thực');
});
