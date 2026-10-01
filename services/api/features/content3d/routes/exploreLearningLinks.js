const express = require('express');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const learningLinks = require('../controllers/exploreLearningLinksController');

const router = express.Router();

/** Studio: entity nào chưa nối với concept/bài học. */
router.get('/coverage', authMiddleware, requireRole('teacher', 'admin'), learningLinks.coverage);

/** Public: concept + bài học của một entity 3D (Explore panel, agent). */
router.get('/:entityId', learningLinks.entityLinks);

module.exports = router;
