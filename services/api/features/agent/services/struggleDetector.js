const LearnerSignal = require('../../learning-path/models/LearnerSignal');
const LearningPathEvent = require('../../learning-path/models/LearningPathEvent');
const LearnerAgentProfile = require('../models/LearnerAgentProfile');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * @param {string} userId
 * @param {{ lessonId?: string|null }} opts
 */
async function detectWeakLessonsFromSignals(userId, opts = {}) {
  const since7d = new Date(Date.now() - 7 * DAY_MS);
  const signals = await LearnerSignal.find({
    userId,
    lastSeenAt: { $gte: since7d },
    signalType: { $in: ['dwell_struggle', 'frequent_revisit', 'quiz_fail_streak'] },
  })
    .lean();

  if (!signals.length) return null;

  const byLesson = new Map();
  for (const sig of signals) {
    const lessonId = String(sig.lessonId || '').trim();
    if (!lessonId) continue;
    const e = byLesson.get(lessonId) || { lessonId, signals: [], score: 0 };
    e.signals.push(sig.signalType);
    e.score += Number(sig.score) || 1;
    if (sig.signalType === 'dwell_struggle') e.dwellSec = sig.metadata?.dwellSec;
    if (sig.signalType === 'frequent_revisit') e.revisitCount = sig.metadata?.revisitCount;
    if (sig.signalType === 'quiz_fail_streak') e.quizFailCount = sig.metadata?.quizFailCount;
    byLesson.set(lessonId, e);
  }

  let weak = [...byLesson.values()].filter((w) => w.score > 0);
  weak.sort((a, b) => b.score - a.score);

  if (opts.lessonId) {
    const focus = String(opts.lessonId).trim();
    const hit = weak.find((w) => w.lessonId === focus);
    if (hit) weak = [hit, ...weak.filter((w) => w.lessonId !== focus)];
  }

  return weak.slice(0, 8);
}

async function detectWeakLessonsFromRawEvents(userId, opts = {}) {
  const since7d = new Date(Date.now() - 7 * DAY_MS);
  const profile = await LearnerAgentProfile.findOne({ userId }).lean();
  const quizMap = profile?.coach?.quizFailStreakByLesson || {};

  const [dwellAgg, revisitAgg] = await Promise.all([
    LearningPathEvent.aggregate([
      {
        $match: {
          userId,
          eventName: 'lp_lesson_dwell',
          timestamp: { $gte: since7d },
          lessonId: { $ne: null },
        },
      },
      {
        $group: {
          _id: '$lessonId',
          totalActiveSec: { $sum: { $ifNull: ['$activeSec', '$durationSec', 0] } },
        },
      },
    ]),
    LearningPathEvent.aggregate([
      {
        $match: {
          userId,
          eventName: 'lp_lesson_opened',
          timestamp: { $gte: since7d },
          lessonId: { $ne: null },
        },
      },
      { $group: { _id: '$lessonId', revisitCount: { $sum: 1 } } },
    ]),
  ]);

  const byLesson = new Map();

  const ensure = (lessonId) => {
    const id = String(lessonId || '').trim();
    if (!id) return null;
    if (!byLesson.has(id)) {
      byLesson.set(id, { lessonId: id, signals: [], score: 0 });
    }
    return byLesson.get(id);
  };

  for (const row of dwellAgg) {
    const sec = Number(row.totalActiveSec) || 0;
    if (sec >= 480) {
      const e = ensure(row._id);
      if (e) {
        e.signals.push('high_dwell');
        e.dwellSec = sec;
        e.score += 2;
      }
    }
  }

  for (const row of revisitAgg) {
    const count = Number(row.revisitCount) || 0;
    if (count >= 3) {
      const e = ensure(row._id);
      if (e) {
        e.signals.push('frequent_revisit');
        e.revisitCount = count;
        e.score += 2;
      }
    }
  }

  for (const [lessonId, fails] of Object.entries(quizMap)) {
    const n = Number(fails) || 0;
    if (n >= 2) {
      const e = ensure(lessonId);
      if (e) {
        e.signals.push('quiz_fail_streak');
        e.quizFailCount = n;
        e.score += 3;
      }
    }
  }

  let weak = [...byLesson.values()].filter((w) => w.score > 0);
  weak.sort((a, b) => b.score - a.score);

  if (opts.lessonId) {
    const focus = String(opts.lessonId).trim();
    const hit = weak.find((w) => w.lessonId === focus);
    if (hit) weak = [hit, ...weak.filter((w) => w.lessonId !== focus)];
  }

  return weak.slice(0, 8);
}

async function detectWeakLessons(userId, opts = {}) {
  if (!userId) return [];
  const fromSignals = await detectWeakLessonsFromSignals(userId, opts);
  if (fromSignals && fromSignals.length) return fromSignals;
  return detectWeakLessonsFromRawEvents(userId, opts);
}

module.exports = { detectWeakLessons };
