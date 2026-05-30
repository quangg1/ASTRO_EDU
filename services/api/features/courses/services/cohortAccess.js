const CohortEnrollment = require('../models/CohortEnrollment');
const { canEditCourse } = require('../../../shared/jwtAuth');

async function assertCohortMemberOrStaff({ cohort, course, userId, userRole }) {
  const isStaff =
    ['teacher', 'admin'].includes(userRole) &&
    (userRole === 'admin' || canEditCourse(course, { id: userId, role: userRole }));
  if (isStaff) return { isStaff: true, enrollment: null };
  const enrollment = await CohortEnrollment.findOne({ cohortId: cohort._id, userId }).lean();
  if (!enrollment) {
    const err = new Error('Chưa tham gia lớp');
    err.status = 403;
    throw err;
  }
  return { isStaff: false, enrollment };
}

module.exports = { assertCohortMemberOrStaff };
