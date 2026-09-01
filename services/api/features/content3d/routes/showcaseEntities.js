const express = require('express');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/showcaseSchemas');
const entities = require('../controllers/showcaseEntityController');

const router = express.Router();

const staff = [authMiddleware, requireRole('teacher', 'admin')];

router.get('/', entities.listPublished);
router.get('/editor', ...staff, entities.listForEditor);
router.put('/editor', ...staff, validate({ body: schema.entityRowsBody }), entities.save);
router.post('/editor', ...staff, validate({ body: schema.createEntityBody }), entities.create);

router.delete(
  '/editor/:entityId',
  ...staff,
  validate({ params: schema.entityIdParams, query: schema.deleteEntityQuery }),
  entities.remove,
);

module.exports = router;
