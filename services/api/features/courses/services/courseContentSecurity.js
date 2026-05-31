/**
 * Course content delivery security — redact quiz secrets for learners and enforce
 * catalog vs cohort delivery context (single context when enrolled in a cohort).
 */
const Cohort = require('../models/Cohort');
const CohortEnrollment = require('../models/CohortEnrollment');
const Enrollment = require('../models/Enrollment');
const { canEditCourse } = require('../../../shared/jwtAuth');
const { computeAccess, effectiveSchedule, loadScheduleMap } = require('./scheduleResolver');
const {
  SENSITIVE_QUIZ_FIELDS,
  sanitizeQuizQuestionForDelivery,
  redactQuizQuestions,
  redactLessonForLearnerDelivery,
  redactLessonsForLearnerDelivery,
} = require('./courseContentRedact');

function viewerMaySeeQuizSecrets(req, course) {
  if (!req?.userId) return false;
  if (req.userRole === 'admin') return true;
  if (req.userRole === 'teacher' && canEditCourse(course, { id: req.userId, role: req.userRole })) {
    return true;
  }
  return false;
}

async function findCourseCohortEnrollments({ userId, courseId }) {
  if (!userId || !courseId) return [];
  const cohorts = await Cohort.find({ courseId }).select('_id').lean();
  if (!cohorts.length) return [];
  const cohortIds = cohorts.map((c) => c._id);
  return CohortEnrollment.find({ userId, cohortId: { $in: cohortIds } })
    .sort({ joinedAt: -1 })
    .lean();
}

/**
 * @returns {{ mode: 'editor' } | { mode: 'catalog' } | { mode: 'cohort', cohortId: string, cohortIds: string[] }}
 */
async function resolveDeliveryContext({ userId, courseId, userRole, course }) {
  if (course && userId && userRole === 'admin') {
    return { mode: 'editor' };
  }
  if (course && userId && userRole === 'teacher' && canEditCourse(course, { id: userId, role: userRole })) {
    return { mode: 'editor' };
  }
  const enrollments = await findCourseCohortEnrollments({ userId, courseId });
  if (!enrollments.length) {
    return { mode: 'catalog' };
  }
  const cohortIds = enrollments.map((e) => String(e.cohortId));
  return {
    mode: 'cohort',
    cohortId: cohortIds[0],
    cohortIds,
  };
}

function isCourseEditor(userId, userRole, course) {
  if (!userId) return false;
  if (userRole === 'admin') return true;
  return userRole === 'teacher' && canEditCourse(course, { id: userId, role: userRole });
}

/** GV/admin sở hữu khóa — tự ghi danh để vào học/thử ngay (kể cả nháp, trả phí). */
async function ensureStaffEnrollment(course, { userId, userRole }) {
  if (!userId || !course?._id || !isCourseEditor(userId, userRole, course)) {
    return null;
  }
  const existing = await Enrollment.findOne({ userId, courseId: course._id }).lean();
  if (existing) return existing;

  const progress = (course.lessons || []).map((l) => ({
    lessonSlug: l.slug,
    completed: false,
    completedAt: null,
  }));

  try {
    const created = await Enrollment.create({
      userId,
      courseId: course._id,
      progress,
    });
    return created.toObject();
  } catch (err) {
    if (err?.code === 11000) {
      return Enrollment.findOne({ userId, courseId: course._id }).lean();
    }
    throw err;
  }
}

async function assertCatalogAccess({ course, userId }) {
  if (course.catalogEnabled === false) {
    const err = new Error('Khóa học chỉ mở qua lớp theo kỳ, không tự học catalog');
    err.status = 403;
    err.code = 'catalog_disabled';
    throw err;
  }
  const enrollment = await Enrollment.findOne({ userId, courseId: course._id }).lean();
  if (!enrollment) {
    const err = new Error('Chưa đăng ký khóa học này');
    err.status = 403;
    err.code = 'not_enrolled';
    throw err;
  }
  return enrollment;
}

async function assertCohortScheduleWindow({ lesson, cohortId, CohortActivitySchedule }) {
  const map = await loadScheduleMap(CohortActivitySchedule, cohortId);
  const schedule = effectiveSchedule(lesson, map);
  const access = computeAccess(schedule);
  if (access === 'locked') {
    const err = new Error('Bài kiểm tra chưa mở');
    err.status = 403;
    err.code = 'quiz_locked';
    throw err;
  }
  if (access === 'closed') {
    const err = new Error('Bài kiểm tra đã đóng');
    err.status = 403;
    err.code = 'quiz_closed';
    throw err;
  }
}

/**
 * Quiz / exam routes: enforce cohort-only delivery when user has any cohort enrollment on this course.
 */
async function assertQuizDeliveryAccess({
  course,
  lesson,
  cohortId,
  userId,
  userRole,
  CohortActivitySchedule,
}) {
  if (isCourseEditor(userId, userRole, course)) {
    if (cohortId) {
      await assertCohortScheduleWindow({ lesson, cohortId, CohortActivitySchedule });
    }
    return { mode: 'editor' };
  }

  const enrollments = await findCourseCohortEnrollments({ userId, courseId: course._id });
  const routeCohort = cohortId ? String(cohortId) : null;

  if (enrollments.length > 0) {
    const allowed = new Set(enrollments.map((e) => String(e.cohortId)));
    if (!routeCohort) {
      const err = new Error(
        'Bạn đang tham gia lớp học. Vui lòng làm bài kiểm tra qua giao diện lớp.',
      );
      err.status = 403;
      err.code = 'cohort_context_required';
      throw err;
    }
    if (!allowed.has(routeCohort)) {
      const err = new Error('Bạn không thuộc lớp học này');
      err.status = 403;
      err.code = 'wrong_cohort';
      throw err;
    }
    await assertCohortScheduleWindow({ lesson, cohortId: routeCohort, CohortActivitySchedule });
    return { mode: 'cohort', cohortId: routeCohort };
  }

  if (routeCohort) {
    const en = await CohortEnrollment.findOne({ cohortId: routeCohort, userId }).lean();
    if (!en) {
      const err = new Error('Bạn chưa tham gia lớp học này');
      err.status = 403;
      err.code = 'not_in_cohort';
      throw err;
    }
    await assertCohortScheduleWindow({ lesson, cohortId: routeCohort, CohortActivitySchedule });
    return { mode: 'cohort', cohortId: routeCohort };
  }

  await assertCatalogAccess({ course, userId });
  return { mode: 'catalog' };
}

/**
 * Assignment routes: same cohort context rules (schedule enforced separately where applicable).
 */
async function assertAssignmentDeliveryAccess({ course, cohortId, userId, userRole }) {
  if (isCourseEditor(userId, userRole, course)) {
    return { mode: 'editor' };
  }

  const enrollments = await findCourseCohortEnrollments({ userId, courseId: course._id });
  const routeCohort = cohortId ? String(cohortId) : null;

  if (enrollments.length > 0) {
    const allowed = new Set(enrollments.map((e) => String(e.cohortId)));
    if (!routeCohort) {
      const err = new Error(
        'Bạn đang tham gia lớp học. Vui lòng nộp bài tập qua giao diện lớp.',
      );
      err.status = 403;
      err.code = 'cohort_context_required';
      throw err;
    }
    if (!allowed.has(routeCohort)) {
      const err = new Error('Bạn không thuộc lớp học này');
      err.status = 403;
      err.code = 'wrong_cohort';
      throw err;
    }
    return { mode: 'cohort', cohortId: routeCohort };
  }

  if (routeCohort) {
    const cohort = await Cohort.findOne({ _id: routeCohort, courseId: course._id });
    if (!cohort) {
      const err = new Error('Không tìm thấy lớp');
      err.status = 404;
      throw err;
    }
    const en = await CohortEnrollment.findOne({ cohortId: routeCohort, userId }).lean();
    if (!en) {
      const err = new Error('Chưa tham gia lớp');
      err.status = 403;
      err.code = 'not_in_cohort';
      throw err;
    }
    return { mode: 'cohort', cohortId: routeCohort };
  }

  await assertCatalogAccess({ course, userId });
  return { mode: 'catalog' };
}

module.exports = {
  SENSITIVE_QUIZ_FIELDS,
  viewerMaySeeQuizSecrets,
  sanitizeQuizQuestionForDelivery,
  redactQuizQuestions,
  redactLessonForLearnerDelivery,
  redactLessonsForLearnerDelivery,
  findCourseCohortEnrollments,
  resolveDeliveryContext,
  isCourseEditor,
  ensureStaffEnrollment,
  assertQuizDeliveryAccess,
  assertAssignmentDeliveryAccess,
  assertCatalogAccess,
};
