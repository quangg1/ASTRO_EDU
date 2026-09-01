const express = require('express');
const { authMiddleware, requireRole } = require('../../../../shared/jwtAuth');
const { validate } = require('../../../../shared/http');
const schema = require('../schemas/earthHistorySchemas');
const stages = require('../controllers/earthHistoryController');

const router = express.Router();

router.put(
  '/bulk',
  authMiddleware,
  requireRole('teacher', 'admin'),
  validate({ body: schema.bulkStagesBody }),
  stages.replaceStages,
);

module.exports = router;
