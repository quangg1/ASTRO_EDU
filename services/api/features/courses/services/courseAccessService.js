/**
 * API công khai cho feature khác hỏi quyền/truy cập khóa học & lớp
 * mà không import models/repositories của courses.
 */
const {
  courseRepository,
  enrollmentRepository,
  cohortRepository,
  cohortEnrollmentRepository,
} = require('../repositories');

/** Đủ cho checkout/fulfillment + agent (slug, giá, bài học). */
const COURSE_ACCESS_FIELDS =
  'title slug price currency isPaid published cohortPrice cohortCurrency lessons.slug lessons.title';

const COHORT_SUMMARY_FIELDS = 'title slug status courseId price currency startAt endAt timezone';

function toCourseSummary(course) {
  if (!course) return null;
  return {
    _id: course._id,
    title: course.title,
    slug: course.slug,
    price: course.price,
    currency: course.currency,
    isPaid: course.isPaid,
    published: course.published,
    cohortPrice: course.cohortPrice,
    cohortCurrency: course.cohortCurrency,
    lessons: (course.lessons || []).map((l) => ({
      slug: l.slug,
      title: l.title,
    })),
  };
}

function toCohortSummary(cohort) {
  if (!cohort) return null;
  return {
    _id: cohort._id,
    title: cohort.title,
    slug: cohort.slug,
    status: cohort.status,
    courseId: cohort.courseId,
    price: cohort.price,
    currency: cohort.currency,
    startAt: cohort.startAt,
    endAt: cohort.endAt,
    timezone: cohort.timezone,
  };
}

async function getPublishedCourseById(id, { session } = {}) {
  const course = await courseRepository.findPublishedById(id, {
    projection: COURSE_ACCESS_FIELDS,
    session,
  });
  return toCourseSummary(course);
}

async function getCourseById(id, { session } = {}) {
  const course = await courseRepository.findById(id, {
    projection: COURSE_ACCESS_FIELDS,
    session,
  });
  return toCourseSummary(course);
}

async function getCourseBySlug(slug) {
  if (!slug) return null;
  const course = await courseRepository.findBySlug(slug, {
    projection: COURSE_ACCESS_FIELDS,
  });
  return toCourseSummary(course);
}

async function findCatalogEnrollment(userId, courseId, options = {}) {
  if (!userId || !courseId) return null;
  return enrollmentRepository.findForUserAndCourse(userId, courseId, options);
}

async function hasCatalogEnrollment(userId, courseId) {
  const enrollment = await findCatalogEnrollment(userId, courseId);
  return Boolean(enrollment);
}

/**
 * Tạo enrollment catalog nếu chưa có (fulfillment thanh toán).
 * `course` cần `_id` và `lessons[].slug`.
 */
async function ensureCatalogEnrollment(userId, course, { session } = {}) {
  return enrollmentRepository.ensureForCourse(userId, course, session ? { session } : {});
}

async function getCohortById(cohortId, { session } = {}) {
  const cohort = await cohortRepository.findById(cohortId, {
    projection: COHORT_SUMMARY_FIELDS,
    session,
  });
  return toCohortSummary(cohort);
}

/** Batch title lookup cho lịch sử đơn hàng. */
async function listCohortTitlesByIds(cohortIds) {
  const ids = [...new Set((cohortIds || []).map(String).filter(Boolean))];
  if (!ids.length) return [];
  return cohortRepository.findMany(
    { _id: { $in: ids } },
    { projection: 'title' },
  );
}

async function findCohortEnrollment(userId, cohortId) {
  if (!userId || !cohortId) return null;
  return cohortEnrollmentRepository.findMembership(cohortId, userId);
}

async function isInCohort(userId, cohortId) {
  return Boolean(await findCohortEnrollment(userId, cohortId));
}

module.exports = {
  getPublishedCourseById,
  getCourseById,
  getCourseBySlug,
  findCatalogEnrollment,
  hasCatalogEnrollment,
  ensureCatalogEnrollment,
  getCohortById,
  listCohortTitlesByIds,
  findCohortEnrollment,
  isInCohort,
};
