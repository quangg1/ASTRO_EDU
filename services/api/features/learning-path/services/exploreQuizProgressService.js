/**
 * Explore contextual quiz lưu trạng thái gần đây trên UserProgress (cùng feature
 * learning-path). content3d gọi qua đây thay vì import model trực tiếp.
 */
const { calendarDayKeyVi } = require('../../../shared/calendarDayKey');
const { userProgressRepository } = require('../repositories/learningPathRepository');

const RECENT_KEEP = 4;

async function getExploreContextualQuizCompletedToday(userId, entityId) {
  if (!userId || !entityId) return false;
  const today = calendarDayKeyVi();
  const doc = await userProgressRepository.findForUser(userId, {
    projection: 'exploreContextualQuizDayByEntity',
  });
  const map = doc?.exploreContextualQuizDayByEntity;
  if (!map || typeof map !== 'object') return false;
  return String(map[entityId] || '').trim() === today;
}

async function markExploreContextualQuizDayCompleted(userId, entityId) {
  if (!userId || !entityId) return;
  const today = calendarDayKeyVi();
  const doc = await userProgressRepository.findForUser(userId, {
    projection: 'exploreContextualQuizDayByEntity',
  });
  const map =
    doc?.exploreContextualQuizDayByEntity && typeof doc.exploreContextualQuizDayByEntity === 'object'
      ? { ...doc.exploreContextualQuizDayByEntity }
      : {};
  map[entityId] = today;
  await userProgressRepository.saveForUser(userId, { exploreContextualQuizDayByEntity: map });
}

async function getRecentQuestionIds(userId, entityId) {
  if (!userId) return [];
  const today = calendarDayKeyVi();
  const doc = await userProgressRepository.findForUser(userId, {
    projection: 'exploreQuizRecentByEntity exploreQuizRecentDayByEntity',
  });
  const dayMap = doc?.exploreQuizRecentDayByEntity;
  if (!dayMap || typeof dayMap !== 'object' || String(dayMap[entityId] || '').trim() !== today) {
    return [];
  }
  const map = doc?.exploreQuizRecentByEntity;
  if (!map || typeof map !== 'object') return [];
  const rows = map[entityId];
  return Array.isArray(rows) ? rows.map((x) => String(x || '').trim()).filter(Boolean) : [];
}

async function recordRecentQuestionIds(userId, entityId, questionIds) {
  if (!userId || !entityId || !questionIds?.length) return;
  const today = calendarDayKeyVi();
  const doc = await userProgressRepository.findForUser(userId, {
    projection: 'exploreQuizRecentByEntity exploreQuizRecentDayByEntity',
  });
  const map =
    doc?.exploreQuizRecentByEntity && typeof doc.exploreQuizRecentByEntity === 'object'
      ? { ...doc.exploreQuizRecentByEntity }
      : {};
  const dayMap =
    doc?.exploreQuizRecentDayByEntity && typeof doc.exploreQuizRecentDayByEntity === 'object'
      ? { ...doc.exploreQuizRecentDayByEntity }
      : {};
  const prevDay = String(dayMap[entityId] || '').trim();
  const prev = prevDay === today && Array.isArray(map[entityId]) ? map[entityId] : [];
  const next = [...questionIds, ...prev.filter((id) => !questionIds.includes(id))].slice(
    0,
    RECENT_KEEP,
  );
  map[entityId] = next;
  dayMap[entityId] = today;
  await userProgressRepository.saveForUser(userId, {
    exploreQuizRecentByEntity: map,
    exploreQuizRecentDayByEntity: dayMap,
  });
}

module.exports = {
  getExploreContextualQuizCompletedToday,
  markExploreContextualQuizDayCompleted,
  getRecentQuestionIds,
  recordRecentQuestionIds,
};
