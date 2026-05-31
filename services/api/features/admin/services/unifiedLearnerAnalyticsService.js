const LearningPathEvent = require('../../learning-path/models/LearningPathEvent');
const CourseLearningEvent = require('../../courses/models/CourseLearningEvent');

/**
 * Read-model aggregate — LP + Course, không merge collection.
 */
async function getUnifiedLearnerAnalytics(startDate) {
  const tsMatch = { timestamp: { $gte: startDate } };

  const [lpStats, courseStats, lpUsers, courseUsers] = await Promise.all([
    LearningPathEvent.aggregate([
      { $match: tsMatch },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          users: { $addToSet: '$userId' },
          sessions: { $addToSet: '$sessionId' },
        },
      },
    ]),
    CourseLearningEvent.aggregate([
      { $match: tsMatch },
      {
        $group: {
          _id: null,
          totalEvents: { $sum: 1 },
          users: { $addToSet: '$userId' },
          sessions: { $addToSet: '$sessionId' },
        },
      },
    ]),
    LearningPathEvent.distinct('userId', { ...tsMatch, userId: { $nin: [null, ''] } }),
    CourseLearningEvent.distinct('userId', { ...tsMatch, userId: { $nin: [null, ''] } }),
  ]);

  const lpRow = lpStats[0] || {};
  const courseRow = courseStats[0] || {};
  const lpUserSet = new Set((lpUsers || []).map(String));
  const courseUserSet = new Set((courseUsers || []).map(String));
  const unionUsers = new Set([...lpUserSet, ...courseUserSet]);
  let bothModules = 0;
  for (const u of lpUserSet) {
    if (courseUserSet.has(u)) bothModules += 1;
  }

  const dailyLp = await LearningPathEvent.aggregate([
    { $match: tsMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const dailyCourse = await CourseLearningEvent.aggregate([
    { $match: tsMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    learningPath: {
      totalEvents: lpRow.totalEvents || 0,
      uniqueUsers: lpUserSet.size,
      uniqueSessions: (lpRow.sessions || []).length,
    },
    course: {
      totalEvents: courseRow.totalEvents || 0,
      uniqueUsers: courseUserSet.size,
      uniqueSessions: (courseRow.sessions || []).length,
    },
    crossModule: {
      uniqueUsersAny: unionUsers.size,
      usersBothLpAndCourse: bothModules,
      pctBoth: unionUsers.size ? Math.round((bothModules / unionUsers.size) * 1000) / 10 : 0,
    },
    daily: {
      learningPath: dailyLp.map((r) => ({ date: r._id, events: r.count })),
      course: dailyCourse.map((r) => ({ date: r._id, events: r.count })),
    },
  };
}

module.exports = { getUnifiedLearnerAnalytics };
