/* eslint-disable no-restricted-imports -- agent cross-feature read model for cohort/studio snapshots */
/**
 * Agent context read model.
 *
 * Cohort deadlines + studio assist need several courses collections together
 * (enrollments, schedule, submissions, announcements). Rather than scatter
 * those foreign model imports across enrichment helpers, they live here as a
 * documented, read-oriented boundary. Prefer owning-feature services when a
 * single-context API already exists.
 */
const CohortEnrollment = require('../../courses/models/CohortEnrollment');
const Cohort = require('../../courses/models/Cohort');
const Course = require('../../courses/models/Course');
const CohortAnnouncement = require('../../courses/models/CohortAnnouncement');
const AssignmentSubmission = require('../../courses/models/AssignmentSubmission');
const {
  loadScheduleMap,
  effectiveSchedule,
  computeAccess,
} = require('../../courses/services/scheduleResolver');

const DEADLINE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;
const ANNOUNCEMENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const STUDIO_RESERVED = new Set(['showcase-entities', 'learning-path', 'concepts']);

/**
 * @param {string|null} userId
 * @param {Record<string, unknown>|null} sessionContext
 */
async function buildCohortContext(userId, sessionContext) {
  if (!userId) return null;

  const enrollments = await CohortEnrollment.find({ userId }).lean();
  if (!enrollments.length) return null;

  const cohortIds = enrollments.map((e) => e.cohortId);
  const cohorts = await Cohort.find({ _id: { $in: cohortIds }, status: { $ne: 'closed' } }).lean();
  if (!cohorts.length) return null;

  const courseSlugHint =
    typeof sessionContext?.courseSlug === 'string' ? sessionContext.courseSlug.trim() : '';

  let primary = cohorts[0];
  if (courseSlugHint) {
    const courseDoc = await Course.findOne({ slug: courseSlugHint }).select('_id').lean();
    if (courseDoc) {
      const match = cohorts.find((c) => String(c.courseId) === String(courseDoc._id));
      if (match) primary = match;
    }
  }

  const course = await Course.findById(primary.courseId).select('slug title lessons').lean();
  if (!course) return null;

  const scheduleByLessonSlug = await loadScheduleMap(primary._id);
  const now = new Date();
  const nowMs = now.getTime();

  const subs = await AssignmentSubmission.find({
    userId,
    courseId: course._id,
    cohortId: primary._id,
  }).lean();
  const subByLesson = Object.fromEntries(subs.map((s) => [s.lessonSlug, s]));

  const upcomingDeadlines = [];
  let pendingAssignments = 0;

  for (const lesson of course.lessons || []) {
    const type = lesson.type || 'text';
    const schedule = effectiveSchedule(lesson, scheduleByLessonSlug);
    const dueAt = schedule.dueAt ? new Date(schedule.dueAt) : null;
    const access = computeAccess(schedule, now);

    if (type === 'assignment') {
      const sub = subByLesson[lesson.slug];
      const done = sub && ['submitted', 'graded'].includes(sub.status);
      if (!done && access === 'open') pendingAssignments += 1;
      if (
        dueAt &&
        dueAt.getTime() >= nowMs &&
        dueAt.getTime() <= nowMs + DEADLINE_WINDOW_MS
      ) {
        upcomingDeadlines.push({
          lessonSlug: lesson.slug,
          title: lesson.title,
          type,
          dueAt: dueAt.toISOString(),
          access,
          pending: !done,
        });
      }
    } else if (type === 'quiz' && dueAt) {
      if (
        dueAt.getTime() >= nowMs &&
        dueAt.getTime() <= nowMs + DEADLINE_WINDOW_MS &&
        access === 'open'
      ) {
        upcomingDeadlines.push({
          lessonSlug: lesson.slug,
          title: lesson.title,
          type,
          dueAt: dueAt.toISOString(),
          access,
          pending: false,
        });
      }
    }
  }

  upcomingDeadlines.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

  const announcementSince = new Date(nowMs - ANNOUNCEMENT_WINDOW_MS);
  const recentAnnouncements = await CohortAnnouncement.countDocuments({
    cohortId: primary._id,
    createdAt: { $gte: announcementSince },
  });

  return {
    cohortId: String(primary._id),
    cohortTitle: primary.title,
    courseSlug: course.slug,
    courseTitle: course.title,
    pendingAssignments,
    recentAnnouncements,
    upcomingDeadlines: upcomingDeadlines.slice(0, 6),
  };
}

/**
 * @param {Record<string, unknown>|null} sessionContext
 * @param {string|undefined} userRole
 */
async function buildStudioAssistContext(sessionContext, userRole) {
  if (sessionContext?.surface !== 'studio' || userRole !== 'teacher') return null;

  const pathname = String(sessionContext?.pathname || '');
  const m = pathname.match(/^\/studio\/([^/]+)/);
  const slugFromPath = m && !STUDIO_RESERVED.has(m[1]) ? m[1] : null;
  const courseSlug =
    slugFromPath ||
    (typeof sessionContext?.courseSlug === 'string' ? sessionContext.courseSlug.trim() : '');

  if (!courseSlug) {
    return {
      mode: 'studio_general',
      hints: [
        'Trợ lý studio: gợi ý cấu trúc khóa, cohort, concept anchors — không tự publish/sửa dữ liệu.',
      ],
    };
  }

  const course = await Course.findOne({ slug: courseSlug }).select('title slug lessons').lean();
  if (!course) {
    return {
      mode: 'studio_course',
      courseSlug,
      hints: ['Không tìm thấy khóa theo slug — kiểm tra URL studio.'],
    };
  }

  const lessons = course.lessons || [];
  const lessonTypes = { text: 0, quiz: 0, assignment: 0, live_session: 0, visualization: 0 };
  for (const l of lessons) {
    const t = l.type || 'text';
    lessonTypes[t] = (lessonTypes[t] || 0) + 1;
  }

  const lessonSlugMatch = pathname.match(/\/lessons\/([^/]+)/);
  let currentLesson = null;
  if (lessonSlugMatch) {
    const found = lessons.find((l) => l.slug === lessonSlugMatch[1]);
    if (found) {
      const anchors = found.conceptAnchors || found.conceptIds || [];
      currentLesson = {
        slug: found.slug,
        title: found.title,
        type: found.type || 'text',
        hasDescription: Boolean(String(found.description || '').trim()),
        conceptAnchorCount: Array.isArray(anchors) ? anchors.length : 0,
      };
    }
  }

  const hints = [
    'Hỗ trợ giáo viên: nhắc concept anchors, lịch cohort, quiz/assignment — không thay nội dung thay user.',
  ];
  if (currentLesson && currentLesson.conceptAnchorCount === 0) {
    hints.push('Bài đang mở chưa có concept anchor — gợi ý gắn ít nhất 1 concept.');
  }
  if (lessonTypes.assignment === 0 && lessons.length > 3) {
    hints.push('Khóa chưa có bài assignment — có thể gợi ý thêm nếu cohort cần nộp bài.');
  }

  return {
    mode: 'studio_course',
    courseSlug: course.slug,
    courseTitle: course.title,
    lessonCount: lessons.length,
    lessonTypes,
    currentLesson,
    pathname,
    hints,
  };
}

module.exports = {
  buildCohortContext,
  buildStudioAssistContext,
};
