const { courseRepository } = require('../repositories/courseRepository');
const { normalizeSceneContext } = require('../../../shared/schemas/sceneContextSchema');

/**
 * Bài học Khóa học đã khai báo cảnh 3D (sceneContext), dạng phẳng cho cầu nối
 * Edu ↔ 3D bên content3d. Chỉ khóa đã xuất bản; nội dung bài không đi kèm.
 *
 * @returns {Promise<Array<{ courseSlug: string, courseTitle: string, lessonSlug: string, title: string, sceneContext: object }>>}
 */
async function listPublishedSceneLessons() {
  const courses = await courseRepository.listPublishedWithSceneLessons();
  const rows = [];
  for (const course of courses || []) {
    for (const lesson of course.lessons || []) {
      const sceneContext = normalizeSceneContext(lesson?.sceneContext);
      if (!sceneContext || !lesson?.slug) continue;
      rows.push({
        courseSlug: String(course.slug),
        courseTitle: String(course.title || ''),
        lessonSlug: String(lesson.slug),
        title: String(lesson.title || ''),
        sceneContext,
      });
    }
  }
  return rows;
}

module.exports = { listPublishedSceneLessons };
