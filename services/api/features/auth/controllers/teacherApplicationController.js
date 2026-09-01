const { asyncController, ok, created } = require('../../../shared/http');
const {
  submitTeacherApplication,
  getMyApplicationStatus,
} = require('../services/teacherApplicationService');
const {
  getMyTeacherProfile,
  updateMyTeacherProfile,
} = require('../services/teacherProfileService');

module.exports = asyncController({
  async submit(req, res) {
    // userId đặt sau cùng để body không thể tự khai người nộp đơn.
    const application = await submitTeacherApplication({ ...req.body, userId: req.userId });
    return created(res, { application });
  },

  async myStatus(req, res) {
    return ok(res, await getMyApplicationStatus(req.userId));
  },

  async myProfile(req, res) {
    return ok(res, { profile: await getMyTeacherProfile(req.userId) });
  },

  async updateMyProfile(req, res) {
    return ok(res, { profile: await updateMyTeacherProfile(req.userId, req.body || {}) });
  },
});
