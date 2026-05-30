const CourseLearningEvent = require('../models/CourseLearningEvent');

const MS_14_DAYS = 14 * 24 * 60 * 60 * 1000;

async function buildCohortBehaviorSummary({ course, cohort, userIds, userById }) {
  if (!userIds.length) {
    return { lessonEngagement: [], studentActivity: [], windowDays: 14 };
  }
  const since = new Date(Date.now() - MS_14_DAYS);
  const events = await CourseLearningEvent.find({
    courseId: course._id,
    userId: { $in: userIds },
    timestamp: { $gte: since },
  })
    .select('userId lessonSlug eventName durationSec timestamp')
    .lean();

  const byLesson = {};
  const byUser = {};
  for (const ev of events) {
    if (!byLesson[ev.lessonSlug]) {
      byLesson[ev.lessonSlug] = { opens: 0, dwellSec: 0, completions: 0 };
    }
    const L = byLesson[ev.lessonSlug];
    if (ev.eventName === 'course_lesson_opened') L.opens += 1;
    if (ev.eventName === 'course_lesson_dwell' && ev.durationSec) L.dwellSec += ev.durationSec;
    if (ev.eventName === 'course_lesson_completed') L.completions += 1;

    if (!ev.userId) continue;
    if (!byUser[ev.userId]) {
      byUser[ev.userId] = { eventCount: 0, dwellSec: 0, lastAt: null, lessonsOpened: new Set() };
    }
    const U = byUser[ev.userId];
    U.eventCount += 1;
    if (ev.eventName === 'course_lesson_dwell' && ev.durationSec) U.dwellSec += ev.durationSec;
    if (ev.eventName === 'course_lesson_opened') U.lessonsOpened.add(ev.lessonSlug);
    const t = new Date(ev.timestamp).getTime();
    if (!U.lastAt || t > U.lastAt) U.lastAt = t;
  }

  const lessonEngagement = Object.entries(byLesson)
    .map(([lessonSlug, stats]) => ({
      lessonSlug,
      opens: stats.opens,
      completions: stats.completions,
      avgDwellSec: stats.opens > 0 ? Math.round(stats.dwellSec / stats.opens) : 0,
    }))
    .sort((a, b) => b.opens - a.opens);

  const studentActivity = userIds.map((userId) => {
    const u = userById[userId];
    const row = byUser[userId];
    return {
      userId,
      displayName: u?.displayName || u?.email || userId.slice(0, 8),
      eventCount: row?.eventCount || 0,
      lessonsOpened: row ? row.lessonsOpened.size : 0,
      dwellMinutes: row ? Math.round(row.dwellSec / 60) : 0,
      lastBehaviorAt: row?.lastAt ? new Date(row.lastAt).toISOString() : null,
    };
  });
  studentActivity.sort((a, b) => b.eventCount - a.eventCount);

  return { lessonEngagement, studentActivity, windowDays: 14 };
}

module.exports = { buildCohortBehaviorSummary };
