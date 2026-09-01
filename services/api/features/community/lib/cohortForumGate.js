const { assertCohortAccessById } = require('../../courses/services/cohortAccess');

/**
 * Forum gắn với một lớp học chỉ dành cho thành viên lớp và giảng viên phụ trách.
 * Luật thuộc về feature courses — ở đây chỉ hỏi.
 */
async function assertCohortForumAccess(forum, userId, userRole) {
  if (!forum?.cohortId) return;
  await assertCohortAccessById({
    cohortId: forum.cohortId,
    userId,
    userRole,
    unauthorizedMessage: 'Đăng nhập để xem thảo luận lớp',
    forbiddenMessage: 'Chỉ thành viên lớp mới xem được diễn đàn này',
  });
}

module.exports = { assertCohortForumAccess };
