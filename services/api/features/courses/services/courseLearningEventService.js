/**
 * API ghi sự kiện học khóa (favorite, …) cho feature khác.
 */
const crypto = require('crypto');
const { courseEventRepository, courseRepository } = require('../repositories');

async function recordLessonFavoriteEvent({
  userId,
  saved,
  courseSlug,
  lessonSlug,
  title,
  subtitle,
}) {
  const slug = String(courseSlug || '').trim();
  const course = slug
    ? await courseRepository.findBySlug(slug, { projection: '_id slug' })
    : null;
  if (!course) return null;

  return courseEventRepository.create({
    userId,
    sessionId: `saved-${userId}-${Date.now()}`,
    courseId: course._id,
    courseSlug: course.slug,
    lessonSlug: String(lessonSlug || '').trim(),
    eventName: saved ? 'course_lesson_favorited' : 'course_lesson_unfavorited',
    timestamp: new Date(),
    client: 'web',
    metadata: { title: title || '', subtitle: subtitle || '' },
  });
}

async function findCourseIdBySlug(courseSlug) {
  const slug = String(courseSlug || '').trim();
  if (!slug) return null;
  const course = await courseRepository.findBySlug(slug, { projection: '_id' });
  return course?._id ? String(course._id) : null;
}

module.exports = {
  recordLessonFavoriteEvent,
  findCourseIdBySlug,
  // re-export for callers that already have crypto UUID needs
  newEventId: () => crypto.randomUUID(),
};
