const commerce = require('../repositories/adminCommerceReportingRepository');
const { AppError } = require('../../../shared/errors');
const { placeStudentInCohort } = require('../../courses/services/cohortEnrollmentService');
const { recordAdminAction } = require('../lib/recordAdminAction');
const { notifyEnrollmentRevoked } = require('../../notifications/services/notificationService');

function assertRevokeReason(reason) {
  const text = String(reason || '').trim();
  if (text.length < 10) {
    throw new AppError(
      400,
      'REASON_REQUIRED',
      'Vui lòng nhập lý do thu hồi (tối thiểu 10 ký tự) — hệ thống sẽ gửi thông báo cho người dùng.',
    );
  }
  return text;
}

async function grantCatalogEnrollment({ actorUserId, userId, courseId, reason }) {
  const course = await commerce.findCourseByIdLean(courseId);
  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy khóa học');
  }

  let enrollment = await commerce.findCatalogEnrollment(userId, course._id);
  if (enrollment) {
    if (enrollment.status !== 'active') {
      enrollment.status = 'active';
      enrollment.trialExpiresAt = null;
      await enrollment.save();
    }
    return { enrollment, created: false, courseSlug: course.slug };
  }

  const progress = (course.lessons || []).map((lesson) => ({
    lessonSlug: lesson.slug,
    completed: false,
    completedAt: null,
  }));

  enrollment = await commerce.createCatalogEnrollment({
    userId: String(userId),
    courseId: course._id,
    status: 'active',
    progress,
  });

  await recordAdminAction({
    actorUserId,
    action: 'enrollment_grant_catalog',
    targetType: 'enrollment',
    targetId: String(enrollment._id),
    reason,
    payload: { userId: String(userId), courseId: String(course._id), courseSlug: course.slug },
  });

  return { enrollment, created: true, courseSlug: course.slug };
}

async function revokeCatalogEnrollment({ actorUserId, userId, courseId, reason }) {
  const reasonText = assertRevokeReason(reason);
  const course = await commerce.findCourseByIdLean(courseId);
  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy khóa học');
  }

  const res = await commerce.deleteCatalogEnrollment(userId, courseId);
  if (!res.deletedCount) {
    throw new AppError(404, 'ENROLLMENT_NOT_FOUND', 'Không tìm thấy ghi danh catalog');
  }

  await notifyEnrollmentRevoked({
    userId: String(userId),
    kind: 'catalog',
    courseTitle: course.title || course.slug,
    courseSlug: course.slug,
    reason: reasonText,
  });

  await recordAdminAction({
    actorUserId,
    action: 'enrollment_revoke_catalog',
    targetType: 'enrollment',
    targetId: `${userId}:${courseId}`,
    reason: reasonText,
    payload: { userId: String(userId), courseId: String(courseId), courseSlug: course.slug },
  });

  return { revoked: true, notificationSent: true };
}

async function grantCohortEnrollment({ actorUserId, userId, cohortId, reason }) {
  const cohort = await commerce.findCohortByIdLean(cohortId);
  if (!cohort) {
    throw new AppError(404, 'COHORT_NOT_FOUND', 'Không tìm thấy lớp');
  }
  const course = await commerce.findCourseByIdLean(cohort.courseId);
  if (!course) {
    throw new AppError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy khóa học của lớp');
  }

  const existing = await commerce.findCohortEnrollmentLean(userId, cohortId);
  if (existing) {
    return { cohortEnrollment: existing, created: false, courseSlug: course.slug };
  }

  await placeStudentInCohort({
    userId: String(userId),
    course,
    cohort,
  });

  const cohortEnrollment = await commerce.findCohortEnrollmentLean(userId, cohortId);

  await recordAdminAction({
    actorUserId,
    action: 'enrollment_grant_cohort',
    targetType: 'cohort_enrollment',
    targetId: cohortEnrollment ? String(cohortEnrollment._id) : String(cohortId),
    reason,
    payload: {
      userId: String(userId),
      cohortId: String(cohortId),
      courseSlug: course.slug,
    },
  });

  return { cohortEnrollment, created: true, courseSlug: course.slug };
}

async function revokeCohortEnrollment({ actorUserId, userId, cohortId, reason }) {
  const reasonText = assertRevokeReason(reason);
  const cohort = await commerce.findCohortByIdLean(cohortId);
  if (!cohort) {
    throw new AppError(404, 'COHORT_NOT_FOUND', 'Không tìm thấy lớp');
  }
  const course = await commerce.findCourseByIdLean(cohort.courseId);

  const res = await commerce.deleteCohortEnrollment(userId, cohortId);
  if (!res.deletedCount) {
    throw new AppError(404, 'COHORT_ENROLLMENT_NOT_FOUND', 'Không tìm thấy ghi danh lớp');
  }

  await notifyEnrollmentRevoked({
    userId: String(userId),
    kind: 'cohort',
    courseTitle: course?.title || course?.slug || '',
    courseSlug: course?.slug || '',
    cohortTitle: cohort.title || cohort.slug || 'Lớp học',
    reason: reasonText,
  });

  await recordAdminAction({
    actorUserId,
    action: 'enrollment_revoke_cohort',
    targetType: 'cohort_enrollment',
    targetId: `${userId}:${cohortId}`,
    reason: reasonText,
    payload: {
      userId: String(userId),
      cohortId: String(cohortId),
      courseSlug: course?.slug || '',
      cohortTitle: cohort.title || cohort.slug || '',
    },
  });

  return { revoked: true, notificationSent: true };
}

module.exports = {
  grantCatalogEnrollment,
  revokeCatalogEnrollment,
  grantCohortEnrollment,
  revokeCohortEnrollment,
};
