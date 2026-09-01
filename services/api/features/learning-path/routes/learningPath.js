const express = require('express');
const { authMiddleware, optionalAuth, requireRole } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/learningPathSchemas');
const learningPath = require('../controllers/learningPathController');

const router = express.Router();

const editorOnly = [authMiddleware, requireRole('teacher', 'admin')];

router.get('/', optionalAuth, learningPath.detail);

router.get('/editor', editorOnly, learningPath.editorDetail);
router.put('/editor', editorOnly, validate({ body: schema.savePathBody }), learningPath.save);
router.post(
  '/editor/generate-quiz',
  editorOnly,
  validate({ body: schema.generateQuizBody }),
  learningPath.generateQuiz,
);

router.get(
  '/lessons/:lessonId/recall-quiz',
  authMiddleware,
  validate({ params: schema.lessonIdParams }),
  learningPath.recallQuiz,
);
router.post(
  '/lessons/:lessonId/recall-quiz/submit',
  authMiddleware,
  validate({ params: schema.lessonIdParams, body: schema.submitRecallQuizBody }),
  learningPath.submitRecallQuiz,
);

router.get('/progress', authMiddleware, learningPath.progress);
router.put(
  '/progress',
  authMiddleware,
  validate({ body: schema.saveProgressBody }),
  learningPath.saveProgress,
);

router.get('/solar-journey/progress', authMiddleware, learningPath.solarJourneyProgress);
router.put(
  '/solar-journey/progress',
  authMiddleware,
  validate({ body: schema.saveSolarProgressBody }),
  learningPath.saveSolarJourneyProgress,
);

router.post(
  '/attribute-session',
  authMiddleware,
  validate({ body: schema.attributeSessionBody }),
  learningPath.attributeSession,
);

router.post(
  '/events/batch',
  optionalAuth,
  validate({ body: schema.eventBatchBody }),
  learningPath.recordEventBatch,
);

module.exports = router;
