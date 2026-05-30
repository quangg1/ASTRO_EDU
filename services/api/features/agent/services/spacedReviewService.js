const UserProgress = require('../../learning-path/models/UserProgress');
const LearnerAgentProfile = require('../models/LearnerAgentProfile');
const { getLearningPathLessonIndex } = require('./toolAuthorizers/lpCurriculum');

/** Khoảng ôn (ngày) theo số lần đã ôn — heuristic SM-2 lite. */
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];

function daysSince(date) {
  if (!date) return Infinity;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / (24 * 60 * 60 * 1000);
}

/**
 * @param {string} userId
 * @param {{ limit?: number }} opts
 */
async function getSpacedReviewDue(userId, opts = {}) {
  const limit = Math.min(8, Math.max(1, Number(opts.limit) || 5));
  if (!userId) return { dueLessons: [], totalDue: 0 };

  const [progress, profile, { byId }] = await Promise.all([
    UserProgress.findOne({ userId })
      .select('learningPathMasteredLessonIds learningPathLastLessonId')
      .lean(),
    LearnerAgentProfile.findOne({ userId }).select('spacedReview').lean(),
    getLearningPathLessonIndex(),
  ]);

  const mastered = Array.isArray(progress?.learningPathMasteredLessonIds)
    ? progress.learningPathMasteredLessonIds.map(String).filter(Boolean)
    : [];
  if (!mastered.length) return { dueLessons: [], totalDue: 0 };

  const reviewMap = profile?.spacedReview?.lastReviewByLesson || {};
  const due = [];

  for (const lessonId of mastered) {
    const meta = byId.get(lessonId);
    if (!meta) continue;
    const entry = reviewMap[lessonId] || {};
    const reviewCount = Number(entry.reviewCount) || 0;
    const intervalIdx = Math.min(reviewCount, REVIEW_INTERVALS_DAYS.length - 1);
    const requiredDays = REVIEW_INTERVALS_DAYS[intervalIdx];
    const elapsed = daysSince(entry.lastReviewAt || entry.masteredAt);
    if (elapsed < requiredDays) continue;

    due.push({
      lessonId,
      title: meta.titleVi || lessonId,
      moduleId: meta.moduleId,
      nodeId: meta.nodeId,
      priority: elapsed / Math.max(1, requiredDays),
      dueReason:
        reviewCount === 0
          ? 'first_review'
          : elapsed >= requiredDays * 1.5
            ? 'overdue'
            : 'scheduled',
      daysSinceReview: Math.floor(elapsed),
    });
  }

  due.sort((a, b) => b.priority - a.priority);
  const dueLessons = due.slice(0, limit).map(({ priority, ...rest }) => rest);

  return { dueLessons, totalDue: due.length };
}

async function recordSpacedReview(userId, lessonId) {
  if (!userId || !lessonId) return;
  const id = String(lessonId).trim();
  await LearnerAgentProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        [`spacedReview.lastReviewByLesson.${id}.lastReviewAt`]: new Date(),
      },
      $inc: { [`spacedReview.lastReviewByLesson.${id}.reviewCount`]: 1 },
    },
    { upsert: true },
  );
}

async function markLessonMasteredForSpaced(userId, lessonId) {
  if (!userId || !lessonId) return;
  const id = String(lessonId).trim();
  await LearnerAgentProfile.findOneAndUpdate(
    { userId },
    {
      $setOnInsert: { userId },
      $set: {
        [`spacedReview.lastReviewByLesson.${id}.masteredAt`]: new Date(),
      },
    },
    { upsert: true },
  );
}

module.exports = { getSpacedReviewDue, recordSpacedReview, markLessonMasteredForSpaced };
