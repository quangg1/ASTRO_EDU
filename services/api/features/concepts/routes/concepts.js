const express = require('express');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const concepts = require('../controllers/conceptController');

const router = express.Router();

const editorOnly = [authMiddleware, requireRole('teacher', 'admin')];

router.get('/', concepts.listPublished);
router.get('/taxonomy', concepts.taxonomy);

router.get('/editor', editorOnly, concepts.listForEditor);
router.put('/editor', editorOnly, concepts.replace);
router.get('/taxonomy/editor', editorOnly, concepts.taxonomy);
router.put('/taxonomy/editor', editorOnly, concepts.replaceTaxonomy);

module.exports = router;
