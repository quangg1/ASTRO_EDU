const express = require('express');
const { authMiddleware, optionalAuth, requireRole } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/courseSchemas');
const courses = require('../controllers/courseController');
const editor = require('../controllers/courseEditorController');

const router = express.Router();

const staff = [authMiddleware, requireRole('teacher', 'admin')];
const withSlug = validate({ params: schema.courseSlugParams });

// Literal paths are declared before `/:slug` so they are not swallowed by it.
router.get('/', optionalAuth, validate({ query: schema.catalogQuery }), courses.listCatalog);
router.get('/my', authMiddleware, courses.listMine);
router.get('/editor/teachers', authMiddleware, requireRole('admin'), editor.listTeachers);
router.get('/editor/list', ...staff, editor.listCourses);
router.post('/', ...staff, validate({ body: schema.createCourseBody }), editor.create);

router.get(
  '/:slug',
  optionalAuth,
  validate({ params: schema.courseSlugParams, query: schema.courseDetailQuery }),
  courses.detail,
);

router.post('/:slug/enroll', authMiddleware, withSlug, courses.enroll);

router.patch(
  '/:slug/progress',
  authMiddleware,
  validate({ params: schema.courseSlugParams, body: schema.progressBody }),
  courses.updateProgress,
);

router.get('/:slug/editor', ...staff, withSlug, editor.detail);

router.put(
  '/:slug/editor',
  ...staff,
  validate({ params: schema.courseSlugParams, body: schema.editorCourseBody }),
  editor.save,
);

module.exports = router;
