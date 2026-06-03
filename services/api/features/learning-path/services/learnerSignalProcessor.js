const LearnerSignal = require('../models/LearnerSignal');

/**
 * Derive normalized learner signals from newly inserted raw events.
 * Cosmo / learning-state engine đọc layer này thay vì phụ thuộc schema raw.
 */
async function processLearnerSignalsForEvents(events) {
  if (!Array.isArray(events) || events.length === 0) return;

  const ops = [];

  for (const ev of events) {
    const userId = String(ev.userId || '').trim();
    if (!userId) continue;

    if (ev.eventName === 'lp_lesson_dwell') {
      const sec = Number(ev.activeSec ?? ev.durationSec ?? 0);
      const lessonId = String(ev.lessonId || '').trim();
      if (lessonId && sec >= 480) {
        ops.push({
          updateOne: {
            filter: { userId, signalType: 'dwell_struggle', lessonId },
            update: {
              $set: {
                score: 2,
                sourceEventId: ev.eventId,
                lastSeenAt: ev.timestamp || new Date(),
                metadata: { dwellSec: sec },
              },
            },
            upsert: true,
          },
        });
      }
    }

    if (ev.eventName === 'scene_entity_focus_duration') {
      const sec = Number(ev.durationSec ?? 0);
      const entityId = String(ev.metadata?.entityId || '').trim();
      if (entityId && sec >= 3) {
        ops.push({
          updateOne: {
            filter: { userId, signalType: 'explore_focus_engaged', entityId },
            update: {
              $set: {
                score: 1,
                sourceEventId: ev.eventId,
                lastSeenAt: ev.timestamp || new Date(),
                metadata: { durationSec: sec, entityId },
              },
            },
            upsert: true,
          },
        });
      }
    }
  }

  if (ops.length > 0) {
    await LearnerSignal.bulkWrite(ops, { ordered: false });
  }
}

module.exports = { processLearnerSignalsForEvents };
