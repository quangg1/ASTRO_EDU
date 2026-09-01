/**
 * Courses không sở hữu Forum — ủy quyền tạo/đọc diễn đàn lớp cho community.
 */
const {
  cohortForumSlug,
  ensureCohortForum,
} = require('../../community/services/forumBootstrapService');

module.exports = { cohortForumSlug, ensureCohortForum };
