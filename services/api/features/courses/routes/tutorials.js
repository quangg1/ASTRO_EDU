const express = require('express');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/tutorialSchemas');
const tutorials = require('../controllers/tutorialController');

const router = express.Router();

const staff = [authMiddleware, requireRole('teacher', 'admin')];

// Đường dẫn cố định phải đứng trước `/:slug` để không bị nuốt.
router.get('/categories', tutorials.listCategories);
router.get('/tracks', tutorials.listTracks);
router.get('/', validate({ query: schema.listQuery }), tutorials.list);

router.get('/editor/all', ...staff, tutorials.editorList);
router.get('/editor/:slug', ...staff, tutorials.editorDetail);
router.post('/editor', ...staff, validate({ body: schema.createBody }), tutorials.create);
router.put('/editor/:slug', ...staff, validate({ body: schema.updateBody }), tutorials.update);
router.delete('/editor/:slug', ...staff, tutorials.remove);

router.get('/tracks/:slug/progress', authMiddleware, tutorials.trackProgress);
router.post('/:slug/progress/complete', authMiddleware, tutorials.markCompleted);
router.get('/:slug', tutorials.detail);

module.exports = router;
