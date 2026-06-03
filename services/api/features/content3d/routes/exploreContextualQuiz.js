const express = require('express');
const { optionalAuth, authMiddleware, requireRole } = require('../../../shared/jwtAuth');
const {
  deliverExploreContextualQuiz,
  generateExploreContextualQuizPool,
} = require('../services/exploreContextualQuizService');

const router = express.Router();

/** Public read — không bao giờ gọi AI tại đây */
router.get('/:entityId', optionalAuth, async (req, res) => {
  try {
    const entityId = String(req.params.entityId || '').trim();
    const result = await deliverExploreContextualQuiz(entityId, req.userId || null);
    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        code: result.code || 'EXPLORE_QUIZ_FAILED',
        error: result.error || 'Không lấy được quiz',
      });
    }
    res.json({
      success: true,
      data: {
        entityId,
        questions: result.questions,
        poolSize: result.poolSize,
        source: result.source,
        completedToday: Boolean(result.completedToday),
        calendarDay: result.calendarDay || null,
      },
    });
  } catch (err) {
    console.error('GET explore contextual quiz error:', err);
    res.status(500).json({ success: false, code: 'EXPLORE_QUIZ_GET_FAILED', error: 'Lỗi máy chủ' });
  }
});

/** Teacher/admin batch AI — rate limit gắn ở applyPlatformSecurity */
router.post('/editor/:entityId/generate', authMiddleware, requireRole('teacher', 'admin'), async (req, res) => {
  try {
    const entityId = String(req.params.entityId || '').trim();
    const force = Boolean(req.body?.force);
    const result = await generateExploreContextualQuizPool(entityId, { force });
    if (!result.ok) {
      return res.status(result.status || 422).json({
        success: false,
        code: result.code || 'EXPLORE_QUIZ_GENERATION_FAILED',
        error: result.error || 'Không sinh được pool',
        cooldownMs: result.cooldownMs,
      });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    console.error('POST explore contextual quiz generate error:', err);
    res.status(500).json({ success: false, code: 'EXPLORE_QUIZ_GENERATION_FAILED', error: 'Lỗi máy chủ' });
  }
});

module.exports = router;
