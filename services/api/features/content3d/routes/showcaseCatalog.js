const express = require('express');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/showcaseSchemas');
const catalog = require('../controllers/showcaseCatalogController');

const router = express.Router();

router.get('/', catalog.detail);

router.put(
  '/editor',
  authMiddleware,
  requireRole('teacher', 'admin'),
  validate({ body: schema.catalogBundleBody }),
  catalog.replace,
);

module.exports = router;
