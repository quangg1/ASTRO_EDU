const { userProgressRepository } = require('../repositories/learningPathRepository');
const { uniqueIds } = require('../lib/learningPathNormalize');
const { filterRecallGatedMasteredIds } = require('./recallQuizService');

function toProgressView(doc) {
  return {
    completedLessonIds: uniqueIds(doc?.learningPathCompletedLessonIds),
    masteredLessonIds: uniqueIds(doc?.learningPathMasteredLessonIds),
    visited3DLessonIds: uniqueIds(doc?.learningPathVisited3DLessonIds),
    lastLessonId: String(doc?.learningPathLastLessonId || '').trim() || null,
  };
}

async function getProgress(userId) {
  return toProgressView(await userProgressRepository.findForUser(userId));
}

/**
 * PUT là hợp nhất chứ không thay thế: trường vắng mặt giữ nguyên giá trị cũ,
 * còn `visited3DLessonIds` chỉ cộng thêm vì đó là dấu vết đã xem, không thu hồi.
 */
async function saveProgress(userId, body) {
  const existing = await userProgressRepository.findForUser(userId);

  const completedLessonIds =
    body.completedLessonIds !== undefined
      ? uniqueIds(body.completedLessonIds)
      : uniqueIds(existing?.learningPathCompletedLessonIds);

  const requestedMastered =
    body.masteredLessonIds !== undefined
      ? uniqueIds(body.masteredLessonIds)
      : uniqueIds(existing?.learningPathMasteredLessonIds);
  const masteredLessonIds = await filterRecallGatedMasteredIds(userId, requestedMastered);

  // Bài "đang học dở" phải nằm trong danh sách đã hoàn thành, nếu không thì bỏ.
  const candidateLast =
    body.lastLessonId !== undefined
      ? String(body.lastLessonId || '').trim()
      : String(existing?.learningPathLastLessonId || '').trim();
  const lastLessonId = completedLessonIds.includes(candidateLast) ? candidateLast : '';

  let visited3DLessonIds = uniqueIds(existing?.learningPathVisited3DLessonIds);
  if (Array.isArray(body.visited3DLessonIds)) {
    visited3DLessonIds = uniqueIds([...visited3DLessonIds, ...uniqueIds(body.visited3DLessonIds)]);
  }

  const doc = await userProgressRepository.saveForUser(userId, {
    learningPathCompletedLessonIds: completedLessonIds,
    learningPathMasteredLessonIds: masteredLessonIds,
    learningPathLastLessonId: lastLessonId,
    learningPathVisited3DLessonIds: visited3DLessonIds,
  });

  return toProgressView(doc);
}

async function getSolarJourneyProgress(userId) {
  const doc = await userProgressRepository.findForUser(userId);
  return { completedMilestoneIds: uniqueIds(doc?.solarJourneyCompletedMilestoneIds) };
}

async function saveSolarJourneyProgress(userId, completedMilestoneIds) {
  const doc = await userProgressRepository.saveForUser(userId, {
    solarJourneyCompletedMilestoneIds: uniqueIds(completedMilestoneIds),
  });
  return { completedMilestoneIds: uniqueIds(doc?.solarJourneyCompletedMilestoneIds) };
}

module.exports = {
  getProgress,
  saveProgress,
  getSolarJourneyProgress,
  saveSolarJourneyProgress,
};
