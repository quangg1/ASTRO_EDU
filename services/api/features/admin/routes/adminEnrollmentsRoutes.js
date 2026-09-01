const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireAdminScope } = require('../../../shared/adminScopes');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/adminSchemas');
const enrollments = require('../controllers/adminEnrollmentController');

const router = express.Router();

// Cấp/thu quyền học là thao tác trên tài khoản người dùng nên dùng scope `users`.
const manageEnrollments = [authMiddleware, requireAdminScope('users')];

router.post(
  '/catalog/grant',
  ...manageEnrollments,
  validate({ body: schema.catalogEnrollment.grant }),
  enrollments.grantCatalog,
);

router.post(
  '/catalog/revoke',
  ...manageEnrollments,
  validate({ body: schema.catalogEnrollment.revoke }),
  enrollments.revokeCatalog,
);

router.post(
  '/cohort/grant',
  ...manageEnrollments,
  validate({ body: schema.cohortEnrollment.grant }),
  enrollments.grantCohort,
);

router.post(
  '/cohort/revoke',
  ...manageEnrollments,
  validate({ body: schema.cohortEnrollment.revoke }),
  enrollments.revokeCohort,
);

module.exports = router;
