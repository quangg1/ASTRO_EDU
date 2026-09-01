const reporting = require('../repositories/reportingRepository');

/**
 * Read-model aggregate — LP + Course, không merge collection.
 */
async function getUnifiedLearnerAnalytics(startDate) {
  const [lpStats, courseStats, lpUsers, courseUsers] = await Promise.all([
    reporting.learningPathEventStats(startDate),
    reporting.courseLearningEventStats(startDate),
    reporting.distinctLearningPathUsers(startDate),
    reporting.distinctCourseLearningUsers(startDate),
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

  const [dailyLp, dailyCourse] = await Promise.all([
    reporting.dailyLearningPathEvents(startDate),
    reporting.dailyCourseLearningEvents(startDate),
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
