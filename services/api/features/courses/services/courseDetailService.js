const { enrollmentRepository } = require('../repositories');
const { courseRequiresPayment } = require('../lib/coursePricing');
const { resolveCourseTeacherPublic } = require('../../auth/services/teacherProfileService');
const {
  viewerMaySeeQuizSecrets,
  redactLessonsForLearnerDelivery,
  resolveDeliveryContext,
  ensureStaffEnrollment,
} = require('./courseContentSecurity');
const { applyCohortScheduleToLessons } = require('./cohortLessonAccess');
const presenter = require('../presenters/coursePresenter');

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);

/**
 * Resolves the viewer's enrolment, auto-creating the implicit staff enrolment
 * that lets a teacher preview their own course.
 */
async function resolveViewerEnrollment({ course, userId, userRole }) {
  if (!userId) return null;
  const staffEnrollment = await ensureStaffEnrollment(course, { userId, userRole });
  if (staffEnrollment) return staffEnrollment;
  return enrollmentRepository.findForUserAndCourse(userId, course._id);
}

async function resolveDeliveryMode({ course, userId, userRole, isEditorView }) {
  if (isEditorView) return { mode: 'editor' };
  if (!userId) return { mode: 'catalog' };
  return resolveDeliveryContext({ userId, courseId: course._id, userRole, course });
}

/**
 * Decides how much of each lesson the viewer may see:
 * outline-only < paywalled < learner delivery < full editor view.
 */
async function resolveVisibleLessons({
  course,
  lessons,
  outlineOnly,
  locksContent,
  isEditorView,
  deliveryContext,
}) {
  if (outlineOnly) return lessons.map(presenter.lessonOutline);
  if (locksContent) return lessons.map(presenter.paywalledLesson);
  if (isEditorView) return lessons;

  const delivered = redactLessonsForLearnerDelivery(lessons);
  if (deliveryContext?.mode === 'cohort' && deliveryContext.cohortId) {
    return applyCohortScheduleToLessons(course, deliveryContext.cohortId, delivered);
  }
  return delivered;
}

async function buildCourseDetail({ course, userId, userRole, req, outlineOnly = false }) {
  const isEditorView = viewerMaySeeQuizSecrets(req, course);
  const enrollment = await resolveViewerEnrollment({ course, userId, userRole });
  const deliveryContext = await resolveDeliveryMode({ course, userId, userRole, isEditorView });

  const locksContent =
    !outlineOnly && courseRequiresPayment(course) && !enrollment && !isEditorView;

  const lessons = await resolveVisibleLessons({
    course,
    lessons: [...(course.lessons || [])].sort(byOrder),
    outlineOnly,
    locksContent,
    isEditorView,
    deliveryContext,
  });

  const teacher = course.teacherId
    ? await resolveCourseTeacherPublic(course.teacherId, { requirePublished: true })
    : null;

  return presenter.courseDetail({
    course,
    modules: [...(course.modules || [])].sort(byOrder),
    lessons,
    enrollment,
    teacher,
    outlineOnly,
    locksContent,
    staffAccess: isEditorView,
    deliveryContext,
  });
}

module.exports = { buildCourseDetail };
