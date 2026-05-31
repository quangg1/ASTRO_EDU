const LearningPathEvent = require('../models/LearningPathEvent');
const { normalizeLearningPathEvent } = require('../lib/normalizeLearningPathEvent');
const { processLearnerSignalsForEvents } = require('./learnerSignalProcessor');

/**
 * Idempotent ingest — upsert on eventId; chỉ event mới trigger rewards/signals.
 * @returns {Promise<{ normalized: object[], inserted: object[], rejections: object[] }>}
 */
async function ingestLearningPathEvents(rawEvents, userId) {
  const normalized = [];
  const rejections = [];

  rawEvents.forEach((event, index) => {
    const item = normalizeLearningPathEvent(event, userId);
    if (!item) {
      rejections.push({ index, reason: 'invalid_event_shape' });
      return;
    }
    normalized.push(item);
  });

  if (normalized.length === 0) {
    return { normalized: [], inserted: [], rejections };
  }

  const ops = normalized.map((ev) => ({
    updateOne: {
      filter: { eventId: ev.eventId },
      update: { $setOnInsert: ev },
      upsert: true,
    },
  }));

  const bulkResult = await LearningPathEvent.bulkWrite(ops, { ordered: false });
  const upsertedIndices = new Set(
    Object.keys(bulkResult.upsertedIds || {}).map((k) => Number(k)),
  );

  const inserted = normalized.filter((_, idx) => upsertedIndices.has(idx));

  if (inserted.length > 0) {
    await processLearnerSignalsForEvents(inserted);
  }

  return { normalized, inserted, rejections };
}

module.exports = { ingestLearningPathEvents };
