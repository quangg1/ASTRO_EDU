/**
 * Resolve cohort activity schedules in batch (avoid N+1).
 */
const { cohortScheduleRepository } = require('../repositories/cohortScheduleRepository');

function effectiveSchedule(lesson, scheduleByLessonSlug) {
  const override = scheduleByLessonSlug?.[lesson.slug];
  const qs = lesson.quizSettings || {};
  return {
    openAt: override?.openAt ?? qs.defaultOpenAt ?? null,
    dueAt: override?.dueAt ?? null,
    closeAt: override?.closeAt ?? qs.defaultCloseAt ?? null,
  };
}

function computeAccess(schedule, now = new Date()) {
  const t = now.getTime();
  const openAt = schedule.openAt ? new Date(schedule.openAt).getTime() : null;
  const closeAt = schedule.closeAt ? new Date(schedule.closeAt).getTime() : null;
  if (openAt != null && t < openAt) return 'locked';
  if (closeAt != null && t > closeAt) return 'closed';
  return 'open';
}

function scheduleMapFromRows(rows) {
  return Object.fromEntries(rows.map((s) => [s.lessonSlug, s]));
}

async function loadScheduleMap(cohortId) {
  return scheduleMapFromRows(await cohortScheduleRepository.listForCohort(cohortId));
}

function buildSyllabusLessons(course, scheduleByLessonSlug, now = new Date()) {
  const lessons = [...(course.lessons || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return lessons.map((lesson) => {
    const schedule = effectiveSchedule(lesson, scheduleByLessonSlug);
    return {
      title: lesson.title,
      slug: lesson.slug,
      type: lesson.type || 'text',
      order: lesson.order ?? 0,
      moduleId: lesson.moduleId || null,
      description:
        typeof lesson.description === 'string' && lesson.description.length > 400
          ? `${lesson.description.slice(0, 400)}…`
          : lesson.description || '',
      quizQuestionCount: Array.isArray(lesson.quizQuestions) ? lesson.quizQuestions.length : 0,
      meetingUrl: lesson.meetingUrl || null,
      schedule: {
        openAt: schedule.openAt,
        dueAt: schedule.dueAt,
        closeAt: schedule.closeAt,
      },
      access: computeAccess(schedule, now),
    };
  });
}

function rowsToClientSchedule(row) {
  if (!row) return { openAt: null, dueAt: null, closeAt: null };
  return {
    openAt: row.openAt || null,
    dueAt: row.dueAt || null,
    closeAt: row.closeAt || null,
  };
}

module.exports = {
  effectiveSchedule,
  computeAccess,
  scheduleMapFromRows,
  rowsToClientSchedule,
  loadScheduleMap,
  buildSyllabusLessons,
};
