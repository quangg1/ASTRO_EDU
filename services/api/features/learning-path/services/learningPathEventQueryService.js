/**
 * API đọc/ghi sự kiện LP công khai cho feature khác (rewards, Explore passport,
 * agent analytics, saved items) — không import `LearningPathEvent` trực tiếp.
 */
const {
  learningPathEventRepository,
} = require('../repositories/learningPathRepository');

async function findLessonOpenTimestamp(userId, lessonId, sessionId, beforeTs) {
  if (!lessonId || !sessionId) return null;
  const row = await learningPathEventRepository.findOne(
    {
      userId,
      lessonId,
      sessionId,
      eventName: 'lp_lesson_opened',
      timestamp: { $lt: beforeTs },
    },
    { projection: 'timestamp', sort: { timestamp: -1 } },
  );
  return row?.timestamp || null;
}

/**
 * @param {string} userId
 * @param {string[]} eventNames
 * @param {{ projection?: string, sort?: object }} [opts]
 */
function listEventsForUserByNames(userId, eventNames, opts = {}) {
  const names = (eventNames || []).map(String).filter(Boolean);
  if (!userId || !names.length) return Promise.resolve([]);
  return learningPathEventRepository.findMany(
    { userId: String(userId).trim(), eventName: { $in: names } },
    {
      projection: opts.projection || 'eventName metadata timestamp',
      sort: opts.sort || { timestamp: 1 },
    },
  );
}

/**
 * Heatmap bài có dwell cao trong khoảng thời gian (admin agent analytics).
 */
async function aggregateHighDwellLessons(startDate, { minTotalSec = 480, limit = 15 } = {}) {
  return learningPathEventRepository.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        eventName: 'lp_lesson_dwell',
        lessonId: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$lessonId',
        users: { $addToSet: '$userId' },
        totalSec: { $sum: { $ifNull: ['$activeSec', '$durationSec', 0] } },
        events: { $sum: 1 },
      },
    },
    { $match: { totalSec: { $gte: minTotalSec } } },
    { $sort: { totalSec: -1 } },
    { $limit: limit },
  ]);
}

/**
 * Ghi sự kiện favorite/unfavorite từ saved-items (fire-and-forget phía caller).
 */
async function recordLessonFavoriteEvent({
  userId,
  saved,
  sessionId,
  eventId,
  timestamp,
  moduleId,
  nodeId,
  lessonId,
  depth,
  metadata,
}) {
  return learningPathEventRepository.create({
    eventId,
    schemaVersion: 1,
    userId,
    sessionId,
    eventName: saved ? 'lp_lesson_favorited' : 'lp_lesson_unfavorited',
    timestamp: timestamp || new Date(),
    moduleId: moduleId || null,
    nodeId: nodeId || null,
    lessonId: lessonId || null,
    depth: depth || null,
    client: 'web',
    metadata: metadata && typeof metadata === 'object' ? metadata : {},
  });
}

module.exports = {
  findLessonOpenTimestamp,
  listEventsForUserByNames,
  aggregateHighDwellLessons,
  recordLessonFavoriteEvent,
};
