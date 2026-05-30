const AgentSession = require('../models/AgentSession');
const LearnerAgentProfile = require('../models/LearnerAgentProfile');
const LearningPathEvent = require('../../learning-path/models/LearningPathEvent');
const { getLearningPathLessonIndex } = require('./toolAuthorizers/lpCurriculum');

const RANGE_TO_DAYS = { '7d': 7, '30d': 30, '90d': 90 };

function parseRangeDays(range) {
  return RANGE_TO_DAYS[range] || 30;
}

/**
 * @param {{ range?: string }} opts
 */
async function getAgentAdminAnalytics(opts = {}) {
  const days = parseRangeDays(opts.range || '30d');
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [
    sessionAgg,
    dailyMessages,
    struggleDwell,
    struggleQuiz,
    profileCount,
    { byId },
  ] = await Promise.all([
    AgentSession.aggregate([
      { $match: { updatedAt: { $gte: startDate }, messageCount: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          sessions: { $sum: 1 },
          users: { $addToSet: '$userId' },
          messages: { $sum: '$messageCount' },
        },
      },
    ]),
    AgentSession.aggregate([
      { $match: { updatedAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } },
          sessions: { $sum: 1 },
          messages: { $sum: '$messageCount' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    LearningPathEvent.aggregate([
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
      { $match: { totalSec: { $gte: 480 } } },
      { $sort: { totalSec: -1 } },
      { $limit: 15 },
    ]),
    LearnerAgentProfile.aggregate([
      { $project: { userId: 1, quizMap: '$coach.quizFailStreakByLesson' } },
      { $match: { quizMap: { $exists: true, $ne: {} } } },
    ]),
    LearnerAgentProfile.countDocuments({}),
    getLearningPathLessonIndex(),
  ]);

  const row = sessionAgg[0] || {};
  const uniqueUsers = Array.isArray(row.users) ? row.users.filter(Boolean).length : 0;

  const quizFailByLesson = new Map();
  for (const p of struggleQuiz) {
    const map = p.quizMap || {};
    for (const [lessonId, fails] of Object.entries(map)) {
      const n = Number(fails) || 0;
      if (n < 2) continue;
      quizFailByLesson.set(
        lessonId,
        (quizFailByLesson.get(lessonId) || 0) + 1,
      );
    }
  }

  const struggleHeatmap = struggleDwell.map((r) => {
    const lessonId = String(r._id || '');
    const meta = byId.get(lessonId);
    return {
      lessonId,
      lessonTitle: meta?.titleVi || lessonId,
      moduleId: meta?.moduleId || null,
      signal: 'high_dwell',
      uniqueUsers: Array.isArray(r.users) ? r.users.length : 0,
      totalDwellSec: Math.round(r.totalSec || 0),
      quizFailProfiles: quizFailByLesson.get(lessonId) || 0,
    };
  });

  for (const [lessonId, count] of quizFailByLesson.entries()) {
    if (struggleHeatmap.some((h) => h.lessonId === lessonId)) continue;
    const meta = byId.get(lessonId);
    struggleHeatmap.push({
      lessonId,
      lessonTitle: meta?.titleVi || lessonId,
      moduleId: meta?.moduleId || null,
      signal: 'quiz_fail_streak',
      uniqueUsers: 0,
      totalDwellSec: 0,
      quizFailProfiles: count,
    });
  }

  struggleHeatmap.sort(
    (a, b) =>
      b.quizFailProfiles - a.quizFailProfiles ||
      b.totalDwellSec - a.totalDwellSec,
  );

  return {
    range: opts.range || '30d',
    summary: {
      agentSessions: row.sessions || 0,
      agentUsers: uniqueUsers,
      agentMessages: row.messages || 0,
      learnerProfiles: profileCount,
    },
    daily: dailyMessages.map((d) => ({
      date: d._id,
      sessions: d.sessions || 0,
      messages: d.messages || 0,
    })),
    struggleHeatmap: struggleHeatmap.slice(0, 20),
  };
}

module.exports = { getAgentAdminAnalytics };
