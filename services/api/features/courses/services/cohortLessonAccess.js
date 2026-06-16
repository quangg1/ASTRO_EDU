const CohortActivitySchedule = require('../models/CohortActivitySchedule');
const { redactLessonForLearnerDelivery } = require('./courseContentRedact');
const { loadScheduleMap, effectiveSchedule, computeAccess } = require('./scheduleResolver');

const LEARNING_TYPES = new Set(['text', 'visualization', 'live_session']);

function redactBodyForScheduleLock(lesson, access) {
  const base = redactLessonForLearnerDelivery(lesson);
  if (access === 'open') {
    return { ...base, cohortAccess: 'open' };
  }
  return {
    ...base,
    cohortAccess: access,
    content: '',
    sections: [],
    videoUrl: null,
    galleryImages: [],
    learningGoals: [],
    resourceLinks: [],
    coverImage: null,
  };
}

async function applyCohortScheduleToLessons(course, cohortId, lessons) {
  const map = await loadScheduleMap(CohortActivitySchedule, cohortId);
  const now = new Date();
  return (lessons || []).map((lesson) => {
    if (!LEARNING_TYPES.has(lesson.type || 'text')) {
      return redactLessonForLearnerDelivery(lesson);
    }
    const schedule = effectiveSchedule(
      (course.lessons || []).find((l) => l.slug === lesson.slug) || lesson,
      map,
    );
    const access = computeAccess(schedule, now);
    return redactBodyForScheduleLock(lesson, access);
  });
}

module.exports = {
  LEARNING_TYPES,
  applyCohortScheduleToLessons,
  redactBodyForScheduleLock,
};
