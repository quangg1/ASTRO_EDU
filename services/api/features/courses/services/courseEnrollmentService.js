const { courseRepository, enrollmentRepository } = require('../repositories');
const { AppError } = require('../../../shared/errors');
const { isCourseEditor } = require('./courseContentSecurity');
const { notifyFreeEnrollment } = require('../../notifications/services/notificationService');

/**
 * Self-paced (catalog) enrolment.
 *
 * Returns a discriminated result rather than throwing for the paywall, so the
 * transport layer can keep the flat `requiresPayment` body the checkout screen
 * expects.
 */
async function enrollInCatalogCourse({ userId, userRole, slug }) {
  const course = await courseRepository.findBySlug(slug);
  if (!course) throw AppError.notFound('Không tìm thấy khóa học');

  const isStaff = isCourseEditor(userId, userRole, course);
  if (!course.published && !isStaff) throw AppError.notFound('Không tìm thấy khóa học');

  if (course.catalogEnabled === false && !isStaff) {
    throw new AppError(
      403,
      'catalog_disabled',
      'Khóa học chỉ mở qua lớp theo kỳ — chọn lớp trên trang khóa học.',
    );
  }

  if (course.isPaid && (course.price ?? 0) > 0 && !isStaff) {
    return { status: 'payment_required', course };
  }

  const existing = await enrollmentRepository.findForUserAndCourse(userId, course._id);
  if (existing) return { status: 'already_enrolled', course, enrollment: existing };

  const enrollment = await enrollmentRepository.ensureForCourse(userId, course);
  void notifyFreeEnrollment({
    userId,
    courseTitle: course.title,
    courseSlug: course.slug,
  });

  return { status: 'enrolled', course, enrollment };
}

/** Marks a lesson complete or incomplete for an enrolled learner. */
async function setLessonProgress({ userId, slug, lessonSlug, completed }) {
  const course = await courseRepository.findPublishedBySlug(slug);
  if (!course) throw AppError.notFound('Không tìm thấy khóa học');

  const enrollment = await enrollmentRepository.findDocForUserAndCourse(userId, course._id);
  if (!enrollment) throw AppError.notFound('Chưa đăng ký khóa học này');

  const progress = enrollment.progress || [];
  let entry = progress.find((row) => row.lessonSlug === lessonSlug);
  if (!entry) {
    entry = { lessonSlug, completed: false, completedAt: null };
    progress.push(entry);
  }

  entry.completed = completed;
  entry.completedAt = completed ? new Date() : null;
  enrollment.progress = progress;
  await enrollment.save();

  return enrollment.progress;
}

module.exports = { enrollInCatalogCourse, setLessonProgress };
