const Cohort = require('../../courses/models/Cohort');
const CohortEnrollment = require('../../courses/models/CohortEnrollment');
const Course = require('../../courses/models/Course');
const { canEditCourse } = require('../../../shared/jwtAuth');

async function assertCohortForumAccess(forum, userId, userRole) {
  if (!forum?.cohortId) return;
  if (!userId) {
    const err = new Error('Đăng nhập để xem thảo luận lớp');
    err.status = 401;
    throw err;
  }
  const cohort = await Cohort.findById(forum.cohortId).lean();
  if (!cohort) {
    const err = new Error('Không tìm thấy lớp');
    err.status = 404;
    throw err;
  }
  const course = await Course.findById(cohort.courseId).lean();
  const isStaff =
    ['teacher', 'admin'].includes(userRole) &&
    course &&
    (userRole === 'admin' || canEditCourse(course, { id: userId, role: userRole }));
  if (isStaff) return;
  const en = await CohortEnrollment.findOne({ cohortId: cohort._id, userId }).lean();
  if (!en) {
    const err = new Error('Chỉ thành viên lớp mới xem được diễn đàn này');
    err.status = 403;
    throw err;
  }
}

module.exports = { assertCohortForumAccess };
