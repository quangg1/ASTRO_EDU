const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeModuleWeekMap,
  resolveLessonDeliveryWeek,
  moduleWeekMapFromCourseModules,
} = require('../features/courses/services/moduleDeliveryWeek');

test('resolveLessonDeliveryWeek prefers cohort map over legacy lesson.week', () => {
  const map = { mod1: 3 };
  assert.equal(resolveLessonDeliveryWeek({ moduleId: 'mod1', week: 1 }, map), 3);
  assert.equal(resolveLessonDeliveryWeek({ moduleId: 'mod2', week: 2 }, map), 2);
  assert.equal(resolveLessonDeliveryWeek({ moduleId: null, week: 5 }, map), 5);
});

test('moduleWeekMapFromCourseModules defaults sequential weeks', () => {
  const map = moduleWeekMapFromCourseModules([
    { _id: 'a', order: 1 },
    { _id: 'b', order: 0 },
  ]);
  assert.equal(map.b, 1);
  assert.equal(map.a, 2);
});

test('normalizeModuleWeekMap accepts plain object', () => {
  assert.deepEqual(normalizeModuleWeekMap({ x: '2', y: 0 }), { x: 2, y: 1 });
});
