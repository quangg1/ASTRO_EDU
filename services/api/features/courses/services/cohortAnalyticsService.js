const { listDirectoryEntries } = require('../../auth/services/userDirectoryService');
const CohortEnrollment = require('../models/CohortEnrollment');
const Enrollment = require('../models/Enrollment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const QuizAttempt = require('../models/QuizAttempt');
const { loadScheduleMap, effectiveSchedule } = require('./scheduleResolver');
const { resolveLessonDeliveryWeek, normalizeModuleWeekMap, moduleWeekMapFromCourseModules } = require('./moduleDeliveryWeek');
const { buildCohortBehaviorSummary } = require('./cohortBehaviorAnalytics');

const MS_7_DAYS = 7 * 24 * 60 * 60 * 1000;
const MS_3_DAYS = 3 * 24 * 60 * 60 * 1000;

function maxDate(...dates) {
  let best = null;
  for (const d of dates) {
    if (!d) continue;
    const t = new Date(d).getTime();
    if (Number.isNaN(t)) continue;
    if (best == null || t > best) best = t;
  }
  return best != null ? new Date(best) : null;
}

function lessonProgressMap(enrollment) {
  const map = {};
  for (const p of enrollment?.progress || []) {
    if (p.lessonSlug) map[p.lessonSlug] = Boolean(p.completed);
  }
  return map;
}

function computeCurrentDeliveryWeek(lessons, scheduleMap, moduleWeekMap, now = Date.now()) {
  let current = 0;
  for (const lesson of lessons) {
    const week = resolveLessonDeliveryWeek(lesson, moduleWeekMap) || 0;
    const schedule = effectiveSchedule(lesson, scheduleMap);
    const openAt = schedule.openAt ? new Date(schedule.openAt).getTime() : null;
    if (openAt != null && openAt <= now && week > current) {
      current = week;
    }
  }
  if (current === 0) {
    const weeks = lessons.map((l) => resolveLessonDeliveryWeek(l, moduleWeekMap) || 0).filter((w) => w > 0);
    if (weeks.length) current = Math.min(...weeks);
  }
  return current;
}

function lessonCellStatus(lesson, scheduleMap, progressMap, now = Date.now()) {
  const schedule = effectiveSchedule(lesson, scheduleMap);
  const openAt = schedule.openAt ? new Date(schedule.openAt).getTime() : null;
  const completed = Boolean(progressMap[lesson.slug]);
  if (completed) return 'completed';
  if (openAt != null && openAt > now) return 'locked';
  if (openAt == null || openAt <= now) {
    if (!completed && openAt != null && now - openAt > MS_3_DAYS) return 'missed';
    return 'open';
  }
  return 'open';
}

function evaluateAtRisk({
  userId,
  lessons,
  scheduleMap,
  moduleWeekMap,
  currentWeek,
  progressMap,
  userSubs,
  userQuizzes,
  lastActiveAt,
  now,
}) {
  const reasons = [];
  const inactive = !lastActiveAt || now - lastActiveAt.getTime() > MS_7_DAYS;
  if (inactive) reasons.push('inactive');

  const scores = userQuizzes.map((q) => q.score).filter((s) => typeof s === 'number');
  const avgQuizScore =
    scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  if (avgQuizScore != null && avgQuizScore < 60) reasons.push('low_quiz');

  const behindWeek = lessons.some((lesson) => {
    const week = resolveLessonDeliveryWeek(lesson, moduleWeekMap) || 0;
    if (week === 0 || week > currentWeek) return false;
    const status = lessonCellStatus(lesson, scheduleMap, progressMap, now);
    return status === 'missed' || status === 'open';
  });
  if (behindWeek && currentWeek > 0) reasons.push('behind_week');

  const overdueAssignment = lessons.some((lesson) => {
    if (lesson.type !== 'assignment') return false;
    const schedule = effectiveSchedule(lesson, scheduleMap);
    const dueAt = schedule.dueAt ? new Date(schedule.dueAt).getTime() : null;
    if (!dueAt || dueAt > now) return false;
    const sub = userSubs.find((s) => s.lessonSlug === lesson.slug);
    return !sub || (sub.status !== 'graded' && sub.status !== 'submitted');
  });
  if (overdueAssignment) reasons.push('overdue_assignment');

  return { atRisk: reasons.length > 0, atRiskReasons: reasons, avgQuizScore };
}

async function buildCohortAnalytics({ course, cohort }) {
  const scheduleMap = await loadScheduleMap(cohort._id);
  const rawLessons = [...(course.lessons || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const modules = [...(course.modules || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  let moduleWeekMap = normalizeModuleWeekMap(cohort.moduleWeekMap);
  if (!Object.keys(moduleWeekMap).length) {
    moduleWeekMap = moduleWeekMapFromCourseModules(modules);
  }

  const lessonColumns = rawLessons.map((l) => ({
    slug: l.slug,
    title: l.title,
    type: l.type || 'text',
    order: l.order ?? 0,
    deliveryWeek: resolveLessonDeliveryWeek(l, moduleWeekMap) || null,
  }));
  const totalLessons = lessonColumns.length;
  const now = Date.now();
  const currentDeliveryWeek = computeCurrentDeliveryWeek(rawLessons, scheduleMap, moduleWeekMap, now);

  const enrollments = await CohortEnrollment.find({ cohortId: cohort._id, role: 'student' }).lean();
  const userIds = enrollments.map((e) => e.userId);
  if (userIds.length === 0) {
    return {
      summary: {
        studentCount: 0,
        avgCompletionPct: 0,
        avgQuizScore: null,
        pendingSubmissions: 0,
        atRiskCount: 0,
        currentDeliveryWeek,
      },
      lessonColumns,
      students: [],
      behavior: { lessonEngagement: [], studentActivity: [], windowDays: 14 },
    };
  }

  const [users, courseEnrollments, submissions, quizAttempts] = await Promise.all([
    listDirectoryEntries(userIds),
    Enrollment.find({ courseId: course._id, userId: { $in: userIds } }).lean(),
    AssignmentSubmission.find({ cohortId: cohort._id, courseId: course._id, userId: { $in: userIds } }).lean(),
    QuizAttempt.find({
      cohortId: cohort._id,
      courseId: course._id,
      userId: { $in: userIds },
      status: { $in: ['submitted', 'timed_out'] },
    }).lean(),
  ]);

  const userById = Object.fromEntries(users.map((u) => [u.id, u]));
  const enrollmentByUser = Object.fromEntries(courseEnrollments.map((e) => [e.userId, e]));
  const subsByUser = {};
  const quizByUser = {};
  for (const s of submissions) {
    if (!subsByUser[s.userId]) subsByUser[s.userId] = [];
    subsByUser[s.userId].push(s);
  }
  for (const q of quizAttempts) {
    if (!quizByUser[q.userId]) quizByUser[q.userId] = [];
    quizByUser[q.userId].push(q);
  }

  const rows = userIds.map((userId) => {
    const u = userById[userId];
    const en = enrollmentByUser[userId];
    const progressMap = lessonProgressMap(en);
    const completedLessons = Object.values(progressMap).filter(Boolean).length;
    const userSubs = subsByUser[userId] || [];
    const userQuizzes = quizByUser[userId] || [];
    const pendingAssignments = userSubs.filter((s) => s.status === 'submitted').length;

    const lastActiveAt = maxDate(
      en?.updatedAt,
      ...userSubs.map((s) => s.submittedAt || s.updatedAt),
      ...userQuizzes.map((q) => q.submittedAt || q.updatedAt),
    );

    const risk = evaluateAtRisk({
      userId,
      lessons: rawLessons,
      scheduleMap,
      moduleWeekMap,
      currentWeek: currentDeliveryWeek,
      progressMap,
      userSubs,
      userQuizzes,
      lastActiveAt,
      now,
    });

    const lessonStatus = Object.fromEntries(
      rawLessons.map((l) => [l.slug, lessonCellStatus(l, scheduleMap, progressMap, now)]),
    );

    return {
      userId,
      displayName: u?.displayName || u?.email || userId.slice(0, 8),
      email: u?.email || null,
      completedLessons,
      totalLessons,
      avgQuizScore: risk.avgQuizScore,
      pendingAssignments,
      lastActiveAt: lastActiveAt ? lastActiveAt.toISOString() : null,
      atRisk: risk.atRisk,
      atRiskReasons: risk.atRiskReasons,
      lessonStatus,
    };
  });

  const pendingSubmissions = submissions.filter((s) => s.status === 'submitted').length;
  const allScores = quizAttempts.map((q) => q.score).filter((s) => typeof s === 'number');
  const avgQuizScore =
    allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null;
  const avgCompletionPct =
    rows.length > 0
      ? Math.round(
          rows.reduce((sum, r) => sum + (r.totalLessons ? (r.completedLessons / r.totalLessons) * 100 : 0), 0) /
            rows.length,
        )
      : 0;

  rows.sort((a, b) => {
    if (a.atRisk !== b.atRisk) return a.atRisk ? -1 : 1;
    return (b.pendingAssignments || 0) - (a.pendingAssignments || 0);
  });

  const behavior = await buildCohortBehaviorSummary({
    course,
    cohort,
    userIds,
    userById,
  });

  return {
    summary: {
      studentCount: rows.length,
      avgCompletionPct,
      avgQuizScore,
      pendingSubmissions,
      atRiskCount: rows.filter((r) => r.atRisk).length,
      currentDeliveryWeek,
    },
    lessonColumns,
    students: rows,
    behavior,
  };
}

module.exports = { buildCohortAnalytics };
