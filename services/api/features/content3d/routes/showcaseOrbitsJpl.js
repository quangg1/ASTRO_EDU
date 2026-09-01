const express = require('express');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/showcaseSchemas');
const jpl = require('../controllers/showcaseOrbitJplController');

const router = express.Router();

router.get('/jpl', validate({ query: schema.jplQuery }), jpl.listFromJpl);

router.post(
  '/sync-entity',
  authMiddleware,
  requireRole('teacher', 'admin'),
  validate({ body: schema.syncEntityBody }),
  jpl.syncEntity,
);

module.exports = router;
