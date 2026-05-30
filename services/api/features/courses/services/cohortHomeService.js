const Enrollment = require('../models/Enrollment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const QuizAttempt = require('../models/QuizAttempt');
const CohortAnnouncement = require('../models/CohortAnnouncement');
const CohortActivitySchedule = require('../models/CohortActivitySchedule');
const { loadScheduleMap, buildSyllabusLessons } = require('./scheduleResolver');

function pickUpcoming(lessons, now = new Date(), limit = 5) {
  const t = now.getTime();
  const rows = [];
  for (const lesson of lessons) {
    const openAt = lesson.schedule?.openAt ? new Date(lesson.schedule.openAt).getTime() : null;
    const dueAt = lesson.schedule?.dueAt ? new Date(lesson.schedule.dueAt).getTime() : null;
    if (openAt != null && openAt > t) {
      rows.push({ kind: 'opens', at: openAt, lesson });
      continue;
    }
    if (dueAt != null && dueAt >= t && lesson.access === 'open') {
      rows.push({ kind: 'due', at: dueAt, lesson });
    }
  }
  rows.sort((a, b) => a.at - b.at);
  return rows.slice(0, limit).map((r) => ({
    kind: r.kind,
    at: new Date(r.at).toISOString(),
    lessonSlug: r.lesson.slug,
    lessonTitle: r.lesson.title,
    lessonType: r.lesson.type,
    access: r.lesson.access,
  }));
}

function buildProgressSummary(lessons, enrollmentProgress, submissions, quizAttempts) {
  const totalLessons = lessons.length;
  const completedFromEnrollment = (enrollmentProgress || []).filter((p) => p.completed).length;
  const submittedCount = submissions.filter((s) => s.status === 'submitted' || s.status === 'graded').length;
  const gradedCount = submissions.filter((s) => s.status === 'graded').length;
  const pendingAssignments = submissions.filter((s) => s.status === 'submitted').length;
  const quizScores = quizAttempts
    .map((a) => (typeof a.score === 'number' ? a.score : null))
    .filter((s) => s != null);
  const avgQuizScore =
    quizScores.length > 0 ? Math.round(quizScores.reduce((a, b) => a + b, 0) / quizScores.length) : null;

  const completedLessons = Math.max(completedFromEnrollment, 0);
  const pct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    completedLessons,
    totalLessons,
    percent: pct,
    pendingAssignments,
    gradedAssignments: gradedCount,
    submittedAssignments: submittedCount,
    avgQuizScore,
    quizAttemptCount: quizAttempts.length,
  };
}

async function buildCohortHome({ course, cohort, userId }) {
  const scheduleMap = await loadScheduleMap(CohortActivitySchedule, cohort._id);
  const lessons = buildSyllabusLessons(course, scheduleMap);
  const modules = [...(course.modules || [])]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((m) => ({
      _id: m._id,
      title: m.title,
      slug: m.slug,
      icon: m.icon || '',
      order: m.order ?? 0,
      materials: (m.materials || []).map((mat) => ({
        id: mat.id,
        label: mat.label || '',
        kind: mat.kind || 'pdf',
        url: mat.url,
      })),
    }));

  const [announcements, enrollment, submissions, quizAttempts] = await Promise.all([
    CohortAnnouncement.find({ cohortId: cohort._id })
      .sort({ pinned: -1, createdAt: -1 })
      .limit(20)
      .lean(),
    Enrollment.findOne({ userId, courseId: course._id }).lean(),
    AssignmentSubmission.find({ cohortId: cohort._id, userId, courseId: course._id }).lean(),
    QuizAttempt.find({
      cohortId: cohort._id,
      userId,
      courseId: course._id,
      status: { $in: ['submitted', 'timed_out'] },
    })
      .sort({ submittedAt: -1 })
      .limit(50)
      .lean(),
  ]);

  const progress = buildProgressSummary(
    lessons,
    enrollment?.progress,
    submissions,
    quizAttempts,
  );
  const upcoming = pickUpcoming(lessons);

  const completedLessonSlugs = (enrollment?.progress || [])
    .filter((p) => p.completed)
    .map((p) => p.lessonSlug);

  return {
    cohort: {
      id: cohort._id,
      title: cohort.title,
      slug: cohort.slug,
      timezone: cohort.timezone,
      startAt: cohort.startAt,
      endAt: cohort.endAt,
    },
    course: { slug: course.slug, title: course.title },
    announcements: announcements.map((a) => ({
      id: a._id,
      title: a.title,
      body: a.body,
      pinned: a.pinned,
      authorId: a.authorId,
      createdAt: a.createdAt,
    })),
    upcoming,
    progress,
    completedLessonSlugs,
    modules,
    lessons,
  };
}

module.exports = { buildCohortHome, pickUpcoming, buildProgressSummary };
