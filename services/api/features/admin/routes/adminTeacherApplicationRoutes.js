const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireAdminScope } = require('../../../shared/adminScopes');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/adminSchemas');
const applications = require('../controllers/adminTeacherApplicationController');

const router = express.Router();

router.use(authMiddleware, requireAdminScope('teachers'));

router.get('/', validate({ query: schema.teacherApplicationsQuery }), applications.list);

router.post(
  '/:id/cv-reviewed',
  validate({ params: schema.applicationIdParams }),
  applications.markCvReviewed,
);

router.patch(
  '/:id',
  validate({ params: schema.applicationIdParams, body: schema.reviewApplicationBody }),
  applications.review,
);

module.exports = router;
