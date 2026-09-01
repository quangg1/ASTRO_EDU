const { asyncController, ok } = require('../../../shared/http');
const { listAdminCourses, setAdminCoursePublished } = require('../services/adminCourseService');

module.exports = asyncController({
  async list(req, res) {
    return ok(res, { data: await listAdminCourses(req.valid.query) });
  },

  async setPublished(req, res) {
    const data = await setAdminCoursePublished({
      actorUserId: req.userId,
      courseId: req.valid.params.id,
      published: req.valid.body.published,
      reason: req.valid.body.reason,
    });
    return ok(res, { data });
  },
});
