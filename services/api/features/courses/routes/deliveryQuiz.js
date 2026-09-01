const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/deliverySchemas');
const quiz = require('../controllers/quizDeliveryController');

const router = express.Router({ mergeParams: true });
const examRouter = express.Router({ mergeParams: true });

const withContext = validate({ params: schema.deliveryParams });

examRouter.get('/session', authMiddleware, withContext, quiz.session);
examRouter.get('/attempts/active', authMiddleware, withContext, quiz.activeAttempt);
examRouter.post('/attempts', authMiddleware, withContext, quiz.startAttempt);

examRouter.patch(
  '/attempts/:attemptId/checkpoint',
  authMiddleware,
  validate({ params: schema.attemptParams, body: schema.checkpointBody }),
  quiz.checkpoint,
);

examRouter.post(
  '/attempts/:attemptId/submit',
  authMiddleware,
  validate({ params: schema.attemptParams, body: schema.submitAttemptBody }),
  quiz.submit,
);

examRouter.post(
  '/attempts/:attemptId/confirm-question',
  authMiddleware,
  validate({ params: schema.attemptParams, body: schema.confirmQuestionBody }),
  quiz.confirmQuestion,
);

// Cùng một bộ endpoint phục vụ cả học lẻ lẫn học theo lớp.
router.use('/:slug/exam/:lessonSlug', examRouter);
router.use('/:slug/cohort/:cohortId/exam/:lessonSlug', examRouter);

module.exports = router;
