const express = require('express');
const { authMiddleware, optionalAuth } = require('../../../shared/jwtAuth');
const { agentLimiter } = require('../../../shared/security/rateLimiters');
const agent = require('../controllers/agentController');

const router = express.Router();

router.post('/message', agentLimiter, optionalAuth, agent.message);
router.get('/snapshot', authMiddleware, agent.snapshot);
router.post('/context/prefetch', authMiddleware, agent.prefetchContext);
router.get('/coach-nudge', authMiddleware, agent.coachNudge);
router.post('/coach/dismiss', authMiddleware, agent.dismissCoach);
router.post('/concept-quiz/start', authMiddleware, agent.startConceptQuiz);
router.post('/concept-quiz/submit', authMiddleware, agent.submitConceptQuiz);
router.post('/quiz-outcome', authMiddleware, agent.quizOutcome);
router.get('/spaced-review', authMiddleware, agent.spacedReview);
router.post('/spaced-review/complete', authMiddleware, agent.completeSpacedReview);
router.post('/depth-preference', authMiddleware, agent.depthPreference);
router.post('/session-summary', authMiddleware, agent.sessionSummary);
router.get('/sessions', authMiddleware, agent.listSessions);
router.get('/sessions/:sessionId', authMiddleware, agent.getSession);
router.post('/tools/execute', authMiddleware, agent.executeTool);
router.post('/feedback', authMiddleware, agent.feedback);

module.exports = router;
