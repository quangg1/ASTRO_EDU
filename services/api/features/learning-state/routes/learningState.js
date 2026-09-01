const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/learningStateSchemas');
const learningState = require('../controllers/learningStateController');

const router = express.Router();

router.use(authMiddleware);

router.get('/snapshot', learningState.snapshot);
router.get('/concepts', validate({ query: schema.conceptIdsQuery }), learningState.conceptStates);
router.get('/weak-lessons', validate({ query: schema.weakLessonsQuery }), learningState.weakLessons);
router.get('/spaced-review', validate({ query: schema.spacedReviewQuery }), learningState.spacedReview);
router.get('/lesson/:lessonId', validate({ params: schema.lessonIdParams }), learningState.lessonState);
router.get('/concept/:conceptId', validate({ params: schema.conceptIdParams }), learningState.conceptState);

router.post('/events', validate({ body: schema.learningEventsBody }), learningState.recordEvents);

module.exports = router;
