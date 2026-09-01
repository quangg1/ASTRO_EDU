const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireAdminScope } = require('../../../shared/adminScopes');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/adminSchemas');
const courses = require('../controllers/adminCourseController');

const router = express.Router();

const manageCourses = [authMiddleware, requireAdminScope('courses')];

router.get('/', ...manageCourses, validate({ query: schema.listCoursesQuery }), courses.list);

router.patch(
  '/:id/published',
  ...manageCourses,
  validate({ params: schema.courseIdParams, body: schema.coursePublishedBody }),
  courses.setPublished,
);

module.exports = router;
