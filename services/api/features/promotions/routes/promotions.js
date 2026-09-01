const express = require('express');
const { optionalAuth, authMiddleware } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/promoSchemas');
const promos = require('../controllers/promoController');

const router = express.Router();

router.get('/active', optionalAuth, validate({ query: schema.activeQuery }), promos.listActive);
router.get(
  '/course/:courseId/banner',
  optionalAuth,
  validate({ params: schema.courseIdParams }),
  promos.courseBanner,
);
router.post('/validate', authMiddleware, validate({ body: schema.validateBody }), promos.validate);

module.exports = router;
