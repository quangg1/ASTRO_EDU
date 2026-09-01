const { asyncController, ok } = require('../../../shared/http');
const {
  grantCatalogEnrollment,
  revokeCatalogEnrollment,
  grantCohortEnrollment,
  revokeCohortEnrollment,
} = require('../services/adminEnrollmentService');

/** Bốn endpoint chỉ khác nhau ở hàm nghiệp vụ, nên dựng chung từ một khuôn. */
const enrollmentAction = (action) => async (req, res) =>
  ok(res, { data: await action({ actorUserId: req.userId, ...req.valid.body }) });

module.exports = asyncController({
  grantCatalog: enrollmentAction(grantCatalogEnrollment),
  revokeCatalog: enrollmentAction(revokeCatalogEnrollment),
  grantCohort: enrollmentAction(grantCohortEnrollment),
  revokeCohort: enrollmentAction(revokeCohortEnrollment),
});
