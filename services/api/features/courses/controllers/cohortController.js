const { asyncController, ok, created } = require('../../../shared/http');
const { AppError } = require('../../../shared/errors');
const directory = require('../services/cohortDirectoryService');
const { registerLearnerInCohort } = require('../services/cohortRegistrationService');
const { resendCohortEnrollmentEmail } = require('../services/cohortEnrollmentService');
const { assertCohortMemberOrStaff } = require('../services/cohortAccess');
const { buildCohortSyllabus } = require('../services/cohortSyllabusService');
const { buildCohortHome } = require('../services/cohortHomeService');
const { buildCohortAnalytics } = require('../services/cohortAnalyticsService');
const { ensureCohortForum } = require('../services/cohortForumService');
const presenter = require('../presenters/cohortPresenter');

/**
 * Cohort transport layer.
 *
 * Handlers assume `req.course` / `req.cohort` were loaded and authorized by
 * `http/courseContext` and that `req.valid` was produced by the Zod schemas, so
 * each one is limited to: call a service, shape the response.
 */
module.exports = asyncController({
  async listMine(req, res) {
    const data = await directory.listLearnerCohorts({ userId: req.userId, course: req.course });
    return ok(res, { data });
  },

  async listEnrollable(req, res) {
    const data = await directory.listEnrollableCohorts({ course: req.course });
    return ok(res, { data });
  },

  async listManaged(req, res) {
    const data = await directory.listManagedCohorts({ course: req.course });
    return ok(res, { data });
  },

  async create(req, res) {
    const cohort = await directory.createCohort({
      course: req.course,
      actor: { id: req.userId, role: req.userRole },
      input: req.valid.body,
    });
    return created(res, { data: cohort });
  },

  async update(req, res) {
    const cohort = await directory.updateCohort({
      course: req.course,
      cohort: req.cohort,
      input: req.valid.body,
    });
    return ok(res, { data: cohort });
  },

  async enroll(req, res) {
    const { cohortId } = req.valid.body;
    const result = await registerLearnerInCohort({
      userId: req.userId,
      course: req.course,
      cohortId,
    });

    if (result.status === 'payment_required') {
      return res
        .status(402)
        .json(presenter.paymentRequired({ course: req.course, cohortId, pricing: result.pricing }));
    }
    return created(res, { data: result.placement });
  },

  /** Invite codes were retired in favour of picking a cohort on the course page. */
  join(_req, _res) {
    throw new AppError(
      403,
      'invite_code_disabled',
      'Không dùng mã lớp. Chọn lớp trên trang khóa học và đăng ký (hoặc thanh toán nếu có phí).',
    );
  },

  async resendEnrollmentEmail(req, res) {
    const data = await resendCohortEnrollmentEmail({
      userId: req.userId,
      course: req.course,
      cohortId: req.params.cohortId,
    });
    return ok(res, { data });
  },

  async syllabus(req, res) {
    await assertCohortMemberOrStaff({
      cohort: req.cohort,
      course: req.course,
      userId: req.userId,
      userRole: req.userRole,
    });
    const data = await buildCohortSyllabus({ course: req.course, cohort: req.cohort });
    return ok(res, { data });
  },

  async home(req, res) {
    await assertCohortMemberOrStaff({
      cohort: req.cohort,
      course: req.course,
      userId: req.userId,
      userRole: req.userRole,
    });
    const data = await buildCohortHome({
      course: req.course,
      cohort: req.cohort,
      userId: req.userId,
    });
    return ok(res, { data });
  },

  async analytics(req, res) {
    const data = await buildCohortAnalytics({ course: req.course, cohort: req.cohort });
    return ok(res, { data });
  },

  async discussion(req, res) {
    await assertCohortMemberOrStaff({
      cohort: req.cohort,
      course: req.course,
      userId: req.userId,
      userRole: req.userRole,
    });
    const data = await ensureCohortForum({ cohort: req.cohort, course: req.course });
    return ok(res, { data });
  },
});
