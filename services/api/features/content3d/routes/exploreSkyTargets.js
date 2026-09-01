const express = require('express');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/showcaseSchemas');
const skyTargets = require('../controllers/skyTargetController');

const router = express.Router();

const staff = [authMiddleware, requireRole('teacher', 'admin')];

router.get('/', skyTargets.publicCatalog);
router.get('/editor', ...staff, skyTargets.editorCatalog);
router.put('/editor', ...staff, validate({ body: schema.skyItemsBody }), skyTargets.save);

module.exports = router;
