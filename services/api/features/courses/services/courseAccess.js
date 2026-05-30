const Course = require('../models/Course');
const { canEditCourse } = require('../../../shared/jwtAuth');

/**
 * Khóa published cho học viên; GV/admin sở hữu khóa vẫn xem được khi soạn (Studio).
 */
async function findCourseForLearnerOrEditor(slug, req) {
  const course = await Course.findOne({ slug }).lean();
  if (!course) return null;
  if (course.published) return course;
  if (!req?.userId) return null;
  if (req.userRole === 'admin') return course;
  if (req.userRole === 'teacher' && canEditCourse(course, { id: req.userId, role: req.userRole })) {
    return course;
  }
  return null;
}

module.exports = {
  findCourseForLearnerOrEditor,
};
