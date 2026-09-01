const { canEditCourse } = require('../../../shared/jwtAuth');
const { AppError } = require('../../../shared/errors');
const { cohortEnrollmentRepository, cohortRepository, courseRepository } = require('../repositories');

/**
 * Cohort content is visible to its members and to the staff who own the course.
 * Returns the resolved context so callers can branch on `isStaff` without
 * re-querying the membership.
 */
async function assertCohortMemberOrStaff({
  cohort,
  course,
  userId,
  userRole,
  forbiddenMessage = 'Chưa tham gia lớp',
}) {
  const isStaff =
    ['teacher', 'admin'].includes(userRole) &&
    Boolean(course) &&
    canEditCourse(course, { id: userId, role: userRole });
  if (isStaff) return { isStaff: true, enrollment: null };

  const enrollment = await cohortEnrollmentRepository.findMembership(cohort._id, userId);
  if (!enrollment) throw AppError.forbidden(forbiddenMessage);
  return { isStaff: false, enrollment };
}

/**
 * Same rule, but starting from a bare cohort id — the entry point other
 * features use (e.g. community gating a cohort forum) so they never have to
 * load courses data themselves.
 */
async function assertCohortAccessById({
  cohortId,
  userId,
  userRole,
  unauthorizedMessage = 'Đăng nhập để xem nội dung lớp',
  forbiddenMessage,
}) {
  if (!userId) throw AppError.unauthorized(unauthorizedMessage);

  const cohort = await cohortRepository.findById(cohortId);
  if (!cohort) throw AppError.notFound('Không tìm thấy lớp');

  const course = await courseRepository.findById(cohort.courseId);
  return assertCohortMemberOrStaff({ cohort, course, userId, userRole, forbiddenMessage });
}

module.exports = { assertCohortMemberOrStaff, assertCohortAccessById };
