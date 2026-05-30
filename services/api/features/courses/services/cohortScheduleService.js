const CohortActivitySchedule = require('../models/CohortActivitySchedule');
const { localDatetimeToUtcDate } = require('./scheduleTz');
const { resolveLessonDeliveryWeek } = require('./moduleDeliveryWeek');

const MS_DAY = 24 * 60 * 60 * 1000;

function addDaysUtc(date, days) {
  return new Date(date.getTime() + days * MS_DAY);
}

/**
 * Sinh openAt (và tuỳ chọn due/close) theo tuần giao bài (moduleWeekMap hoặc legacy lesson.week).
 */
function buildWeeklyScheduleItems(
  course,
  {
    week1OpenLocal,
    daysPerWeek = 7,
    timeZone = 'Asia/Ho_Chi_Minh',
    setDueAndClose = true,
    moduleWeekMap = null,
  },
) {
  const week1Open = localDatetimeToUtcDate(week1OpenLocal, timeZone);
  if (!week1Open) {
    const err = new Error('Ngày mở tuần 1 không hợp lệ');
    err.status = 400;
    throw err;
  }
  const spanDays = Math.max(1, Math.min(28, Math.floor(Number(daysPerWeek)) || 7));
  const lessons = [...(course.lessons || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const weekSet = new Set();
  const items = lessons.map((lesson) => {
    const w = Math.max(1, Math.floor(Number(lesson.week)) || 1);
    weekSet.add(w);
    const openAt = addDaysUtc(week1Open, (w - 1) * spanDays);
    const weekEnd = addDaysUtc(openAt, spanDays);
    const type = lesson.type || 'text';
    const item = {
      lessonSlug: lesson.slug,
      openAt,
      dueAt: null,
      closeAt: null,
    };
    if (setDueAndClose) {
      if (type === 'assignment') item.dueAt = weekEnd;
      if (type === 'quiz') item.closeAt = weekEnd;
    }
    return item;
  });

  return {
    items,
    week1Open,
    spanDays,
    weekCount: weekSet.size,
    lessonCount: items.length,
  };
}

async function upsertScheduleItems(cohortId, items) {
  for (const item of items) {
    const lessonSlug = String(item.lessonSlug || '').trim();
    if (!lessonSlug) continue;
    await CohortActivitySchedule.findOneAndUpdate(
      { cohortId, lessonSlug },
      {
        openAt: item.openAt ?? null,
        dueAt: item.dueAt ?? null,
        closeAt: item.closeAt ?? null,
      },
      { upsert: true, new: true },
    );
  }
  return items.length;
}

async function applyWeeklySchedule({ course, cohort, week1OpenLocal, daysPerWeek, setDueAndClose }) {
  const tz = cohort.timezone || 'Asia/Ho_Chi_Minh';
  const built = buildWeeklyScheduleItems(course, {
    week1OpenLocal,
    daysPerWeek,
    timeZone: tz,
    setDueAndClose: setDueAndClose !== false,
    moduleWeekMap: cohort.moduleWeekMap,
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
  const [source, target] = await Promise.all([
    Cohort.findOne({ _id: sourceCohortId, courseId }).lean(),
    Cohort.findOne({ _id: targetCohortId, courseId }).lean(),
  ]);
  if (!source || !target) {
    const err = new Error('Không tìm thấy lớp nguồn hoặc đích');
    err.status = 404;
    throw err;
  }
  if (String(sourceCohortId) === String(targetCohortId)) {
    const err = new Error('Không thể sao chép sang cùng một lớp');
    err.status = 400;
    throw err;
  }
  const rows = await CohortActivitySchedule.find({ cohortId: sourceCohortId }).lean();
  const items = rows.map((r) => ({
    lessonSlug: r.lessonSlug,
    openAt: r.openAt,
    dueAt: r.dueAt,
    closeAt: r.closeAt,
  }));
  const saved = await upsertScheduleItems(targetCohortId, items);
  return { copied: saved, sourceTitle: source.title, targetTitle: target.title };
}

module.exports = {
  buildWeeklyScheduleItems,
  applyWeeklySchedule,
  copySchedulesFromCohort,
};
