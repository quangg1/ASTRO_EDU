const express = require('express');
const { authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const learningLinks = require('../controllers/exploreLearningLinksController');

const router = express.Router();

/** Studio: entity nào chưa nối với concept/bài học. */
router.get('/coverage', authMiddleware, requireRole('teacher', 'admin'), learningLinks.coverage);

/** Public: bài học → entity 3D (để trang bài học mở đúng cảnh 3D). Phải đứng trước `/:entityId`. */
router.get('/by-lesson', learningLinks.lessonIndex);

/** Public: concept + bài học của một entity 3D (Explore panel, agent). */
router.get('/:entityId', learningLinks.entityLinks);

module.exports = router;
