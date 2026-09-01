const { cohortRepository, cohortScheduleRepository } = require('../repositories');
const { localDatetimeToUtcDate, scheduleItemToUtcFields } = require('./scheduleTz');
const { scheduleMapFromRows } = require('./scheduleResolver');
const { collectLessonVisibilityIssues, hasScheduledOpen } = require('./lessonVisibility');
const {
  normalizeModuleWeekMap,
  resolveLessonDeliveryWeek,
  moduleWeekMapFromCourseModules,
} = require('./moduleDeliveryWeek');
const { AppError } = require('../../../shared/errors');

const MS_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_DAYS_PER_WEEK = 7;
const MAX_DAYS_PER_WEEK = 28;
const EMPTY_SCHEDULE = { openAt: null, dueAt: null, closeAt: null };

function addDaysUtc(date, days) {
  return new Date(date.getTime() + days * MS_DAY);
}

function byOrder(a, b) {
  return (a.order ?? 0) - (b.order ?? 0);
}

function cohortTimezone(cohort) {
  return cohort.timezone || DEFAULT_TIMEZONE;
}

/** Cohort override map, falling back to the week numbers declared on the course. */
function resolveModuleWeekMap(cohort, modules) {
  const fromCohort = normalizeModuleWeekMap(cohort.moduleWeekMap);
  return Object.keys(fromCohort).length ? fromCohort : moduleWeekMapFromCourseModules(modules);
}

/**
 * Generates openAt (and optionally due/close) per lesson from the week-1 open
 * date, spacing each delivery week by `daysPerWeek`.
 */
function buildWeeklyScheduleItems(
  course,
  {
    week1OpenLocal,
    daysPerWeek = DEFAULT_DAYS_PER_WEEK,
    timeZone = DEFAULT_TIMEZONE,
    setDueAndClose = true,
  },
) {
  const week1Open = localDatetimeToUtcDate(week1OpenLocal, timeZone);
  if (!week1Open) throw AppError.badRequest('Ngày mở tuần 1 không hợp lệ');

  const spanDays = Math.max(
    1,
    Math.min(MAX_DAYS_PER_WEEK, Math.floor(Number(daysPerWeek)) || DEFAULT_DAYS_PER_WEEK),
  );
  const lessons = [...(course.lessons || [])].sort(byOrder);
  const weeks = new Set();

  const items = lessons.map((lesson) => {
    const week = Math.max(1, Math.floor(Number(lesson.week)) || 1);
    weeks.add(week);
    const openAt = addDaysUtc(week1Open, (week - 1) * spanDays);
    const weekEnd = addDaysUtc(openAt, spanDays);
    const type = lesson.type || 'text';
    return {
      lessonSlug: lesson.slug,
      openAt,
      dueAt: setDueAndClose && type === 'assignment' ? weekEnd : null,
      closeAt: setDueAndClose && type === 'quiz' ? weekEnd : null,
    };
  });

  return { items, week1Open, spanDays, weekCount: weeks.size, lessonCount: items.length };
}

async function upsertScheduleItems(cohortId, items) {
  const entries = items
    .map((item) => ({
      lessonSlug: String(item.lessonSlug || '').trim(),
      openAt: item.openAt ?? null,
      dueAt: item.dueAt ?? null,
      closeAt: item.closeAt ?? null,
    }))
    .filter((entry) => entry.lessonSlug);

  await cohortScheduleRepository.bulkUpsertLessonSchedules(cohortId, entries);
  return entries.length;
}

async function applyWeeklySchedule({ course, cohort, week1OpenLocal, daysPerWeek, setDueAndClose }) {
  const built = buildWeeklyScheduleItems(course, {
    week1OpenLocal,
    daysPerWeek,
    timeZone: cohortTimezone(cohort),
    setDueAndClose: setDueAndClose !== false,
  });
  const saved = await upsertScheduleItems(cohort._id, built.items);
  return {
    saved,
    weekCount: built.weekCount,
    lessonCount: built.lessonCount,
    spanDays: built.spanDays,
    week1Open: built.week1Open,
  };
}

async function copySchedulesFromCohort({ courseId, sourceCohortId, targetCohortId }) {
  if (String(sourceCohortId) === String(targetCohortId)) {
    throw AppError.badRequest('Không thể sao chép sang cùng một lớp');
  }

  const [source, target] = await Promise.all([
    cohortRepository.findInCourse(sourceCohortId, courseId),
    cohortRepository.findInCourse(targetCohortId, courseId),
  ]);
  if (!source || !target) throw AppError.notFound('Không tìm thấy lớp nguồn hoặc đích');

  const rows = await cohortScheduleRepository.listForCohort(sourceCohortId);
  const copied = await upsertScheduleItems(targetCohortId, rows);
  return { copied, sourceTitle: source.title, targetTitle: target.title };
}

/** Everything the schedule editor screen renders: lessons, modules, warnings. */
async function buildScheduleBoard({ course, cohort }) {
  const rows = await cohortScheduleRepository.listForCohort(cohort._id);
  const scheduleByLesson = scheduleMapFromRows(rows);
  const coursePublished = Boolean(course.published);
  const modules = [...(course.modules || [])].sort(byOrder);
  const moduleWeekMap = resolveModuleWeekMap(cohort, modules);
  const moduleById = new Map(modules.filter((m) => m._id).map((m) => [String(m._id), m]));

  const lessons = [...(course.lessons || [])].sort(byOrder).map((lesson) => {
    const schedule = scheduleByLesson[lesson.slug] || EMPTY_SCHEDULE;
    const visibilityIssues = collectLessonVisibilityIssues(lesson, coursePublished);
    const deliveryWeek = resolveLessonDeliveryWeek(lesson, moduleWeekMap) || null;
    const moduleId = lesson.moduleId ? String(lesson.moduleId) : null;

    return {
      slug: lesson.slug,
      title: lesson.title,
      type: lesson.type || 'text',
      videoUrl: lesson.videoUrl || null,
      week: deliveryWeek,
      deliveryWeek,
      order: lesson.order ?? 0,
      moduleId,
      moduleTitle: moduleId ? moduleById.get(moduleId)?.title || null : null,
      schedule,
      visibilityIssues,
      scheduleWarning: resolveScheduleWarning(schedule, visibilityIssues),
    };
  });

  return {
    cohort: {
      id: cohort._id,
      title: cohort.title,
      timezone: cohort.timezone,
      inviteCode: cohort.inviteCode,
      status: cohort.status,
    },
    coursePublished,
    catalogEnabled: course.catalogEnabled !== false,
    modules: modules.map((module) => {
      const id = String(module._id || '');
      return {
        id,
        title: module.title,
        order: module.order ?? 0,
        deliveryWeek: id && moduleWeekMap[id] != null ? moduleWeekMap[id] : null,
      };
    }),
    moduleWeekMap,
    lessons,
  };
}

/** A lesson scheduled to open that learners still could not see is worth flagging. */
function resolveScheduleWarning(schedule, visibilityIssues) {
  if (!hasScheduledOpen(schedule) || visibilityIssues.length === 0) return null;
  return visibilityIssues.includes('course_draft') ? 'course_draft' : visibilityIssues[0];
}

/** Teacher-authored per-lesson overrides, entered in the cohort's timezone. */
async function saveScheduleOverrides({ cohort, schedules }) {
  const timeZone = cohortTimezone(cohort);
  const entries = schedules
    .filter((item) => item.lessonSlug)
    .map((item) => ({ lessonSlug: item.lessonSlug, ...scheduleItemToUtcFields(item, timeZone) }));

  await cohortScheduleRepository.bulkUpsertLessonSchedules(cohort._id, entries);
  return { saved: entries.length };
}

module.exports = {
  buildWeeklyScheduleItems,
  applyWeeklySchedule,
  copySchedulesFromCohort,
  buildScheduleBoard,
  saveScheduleOverrides,
};
