const { emitAsync } = require('../../../services/eventBus');
const { ingestLearningPathEvents } = require('./learningPathEventIngest');
const { mergeRewardSegments } = require('./learningPathRewards');

/** Chỉ sự kiện mới (không trùng) mới sinh thưởng, và chỉ khi đã đăng nhập. */
async function collectRewards(userId, insertedEvents) {
  if (!userId || insertedEvents.length === 0) return null;

  const segments = [];
  for (const event of insertedEvents) {
    const results = await emitAsync('learning.event.processed', { userId, event });
    for (const result of results) {
      if (result && result.gemsEarned > 0) segments.push(result);
    }
  }

  return segments.length ? mergeRewardSegments(segments) : null;
}

async function recordEventBatch(userId, events) {
  const { normalized, inserted, rejections } = await ingestLearningPathEvents(events, userId);

  return {
    acceptedCount: normalized.length,
    insertedCount: inserted.length,
    duplicateCount: Math.max(0, normalized.length - inserted.length),
    rejectedCount: rejections.length,
    rejections,
    rewards: await collectRewards(userId, inserted),
  };
}

module.exports = { recordEventBatch };
