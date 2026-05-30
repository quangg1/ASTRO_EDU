/**
 * Cohort delivery: map content chapters (moduleId) → calendar week.
 * Lesson.week on Course is legacy; prefer cohort.moduleWeekMap.
 */

function normalizeModuleWeekMap(raw) {
  if (!raw) return {};
  if (raw instanceof Map) {
    return Object.fromEntries(
      [...raw.entries()]
        .map(([k, v]) => [String(k), Math.max(1, Math.floor(Number(v)) || 1)])
        .filter(([k]) => k),
    );
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const out = {};
    for (const [k, v] of Object.entries(raw)) {
      const id = String(k || '').trim();
      if (!id) continue;
      out[id] = Math.max(1, Math.floor(Number(v)) || 1);
    }
    return out;
  }
  return {};
}

function resolveLessonDeliveryWeek(lesson, moduleWeekMap) {
  const map = normalizeModuleWeekMap(moduleWeekMap);
  const moduleId = lesson.moduleId ? String(lesson.moduleId) : '';
  if (moduleId && map[moduleId] != null) {
    return map[moduleId];
  }
  if (lesson.week != null && Number(lesson.week) > 0) {
    return Math.floor(Number(lesson.week));
  }
  return 0;
}

function moduleWeekMapFromCourseModules(modules, existingMap = {}) {
  const map = { ...normalizeModuleWeekMap(existingMap) };
  const sorted = [...(modules || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  sorted.forEach((mod, idx) => {
    const id = String(mod._id || mod.id || '').trim();
    if (!id) return;
    if (map[id] == null) {
      map[id] = idx + 1;
    }
  });
  return map;
}

module.exports = {
  normalizeModuleWeekMap,
  resolveLessonDeliveryWeek,
  moduleWeekMapFromCourseModules,
};
