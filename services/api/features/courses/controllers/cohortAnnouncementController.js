const { asyncController, ok, created } = require('../../../shared/http');
const { assertCohortMemberOrStaff } = require('../services/cohortAccess');
const announcements = require('../services/cohortAnnouncementService');
const presenter = require('../presenters/cohortPresenter');

module.exports = asyncController({
  async list(req, res) {
    await assertCohortMemberOrStaff({
      cohort: req.cohort,
      course: req.course,
      userId: req.userId,
      userRole: req.userRole,
    });
    const rows = await announcements.listAnnouncements(req.cohort._id);
    return ok(res, { data: rows.map(presenter.announcement) });
  },

  async create(req, res) {
    const doc = await announcements.createAnnouncement({
      course: req.course,
      cohort: req.cohort,
      authorId: req.userId,
      input: req.valid.body,
    });
    return created(res, { data: presenter.announcement(doc) });
  },

  async update(req, res) {
    const doc = await announcements.updateAnnouncement({
      course: req.course,
      cohort: req.cohort,
      announcementId: req.params.announcementId,
      input: req.valid.body,
    });
    return ok(res, { data: presenter.announcement(doc) });
  },

  async remove(req, res) {
    await announcements.deleteAnnouncement({
      course: req.course,
      cohort: req.cohort,
      announcementId: req.params.announcementId,
    });
    // Client parses the JSON body, so this stays a 200 envelope rather than 204.
    return ok(res);
  },
});
