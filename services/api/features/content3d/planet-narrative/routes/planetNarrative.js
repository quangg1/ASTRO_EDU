const express = require('express');
const { authMiddleware, requireRole } = require('../../../../shared/jwtAuth');
const { validate } = require('../../../../shared/http');
const schema = require('../../schemas/planetNarrativeSchemas');
const narrative = require('../../controllers/planetNarrativeController');

const router = express.Router();

router.get(
  '/editor/:entityId',
  authMiddleware,
  requireRole('teacher', 'admin'),
  validate({ params: schema.entityIdParams }),
  narrative.editorDetail,
);

router.put(
  '/editor',
  authMiddleware,
  requireRole('teacher', 'admin'),
  validate({ body: schema.saveNarrativeBody }),
  narrative.save,
);

router.get('/:entityId', validate({ params: schema.entityIdParams }), narrative.detail);

module.exports = router;
