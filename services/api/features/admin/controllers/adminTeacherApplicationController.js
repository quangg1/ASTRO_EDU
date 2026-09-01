const { asyncController, ok } = require('../../../shared/http');
const {
  listApplicationsForAdmin,
  reviewApplication,
  markCvReviewed,
} = require('../../auth/services/teacherApplicationService');

module.exports = asyncController({
  async list(req, res) {
    const data = await listApplicationsForAdmin({ status: req.valid.query.status });
    return ok(res, { data });
  },

  async markCvReviewed(req, res) {
    const application = await markCvReviewed({
      actorUserId: req.userId,
      applicationId: req.params.id,
    });
    return ok(res, { application });
  },

  async review(req, res) {
    const application = await reviewApplication({
      actorUserId: req.userId,
      applicationId: req.params.id,
      action: req.valid.body.action,
      note: req.valid.body.note,
    });
    return ok(res, { application });
  },
});
