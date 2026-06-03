const express = require('express');
const { authMiddleware, optionalAuth } = require('../../../shared/jwtAuth');
const { agentLimiter } = require('../../../shared/security/rateLimiters');
const { runMessagePipeline } = require('../services/messagePipeline');
const { buildLearnerSnapshot } = require('../services/contextBuilder');
const { setCachedContext } = require('../services/contextCache');
const { executeAuthorizedTool, loadCourseForTools } = require('../services/toolAuthorizers/executeTool');
const { resolveAgentTier } = require('../services/entitlementResolver');
const {
  evaluateCoachNudge,
  dismissCoach,
  recordQuizOutcome,
} = require('../services/coachPolicyService');
const { saveSessionSummary } = require('../services/sessionSummaryService');
const {
  listAgentSessions,
  getAgentSessionHistory,
} = require('../services/sessionHistoryService');
const { getSpacedReviewDue, recordSpacedReview } = require('../services/spacedReviewService');
const { recordDepthPreference } = require('../services/depthAdaptationService');
const { assertAgentNotQuizLocked } = require('../lib/agentQuizLock');
const { recordMessageFeedback } = require('../services/feedbackService');
const {
  submitConceptQuizSession,
  generateConceptQuizForAgent,
} = require('../services/conceptQuizService');
const { createAgentQuotaMeter, QUOTA_COST } = require('../services/agentQuota');
const { AppError } = require('../../../shared/errors');

const router = express.Router();

router.post('/message', agentLimiter, optionalAuth, async (req, res, next) => {
  try {
    await runMessagePipeline(req, res);
  } catch (err) {
    next(err);
  }
});

router.get('/snapshot', authMiddleware, async (req, res, next) => {
  try {
    const snapshot = await buildLearnerSnapshot(req.userId);
    res.json({ success: true, snapshot });
  } catch (err) {
    next(err);
  }
});

router.post('/context/prefetch', authMiddleware, async (req, res, next) => {
  try {
    const sessionContext = req.body?.session_context || req.body?.sessionContext || {};
    try {
      assertAgentNotQuizLocked(sessionContext);
    } catch (e) {
      if (e instanceof AppError) {
        return res.status(e.status).json({ success: false, code: e.code, error: e.message });
      }
      throw e;
    }
    const { buildAgentContext } = require('../services/contextBuilder');
    const built = await buildAgentContext(
      req.userId,
      sessionContext,
      req.body?.learner_snapshot || req.body?.learnerSnapshot,
      req.userRole,
    );
    setCachedContext(req.userId, sessionContext, built);
    res.json({ success: true, warmed: true });
  } catch (err) {
    next(err);
  }
});

router.get('/coach-nudge', authMiddleware, async (req, res, next) => {
  try {
    if (req.query.quizLock === 'recall' || req.query.recallQuizActive === '1') {
      return res.json({ success: true, allowed: false, reason: 'quiz_locked' });
    }
    const lessonId =
      typeof req.query.lessonId === 'string' ? req.query.lessonId.trim() : undefined;
    const sessionId =
      typeof req.query.sessionId === 'string' ? req.query.sessionId.trim() : undefined;
    const result = await evaluateCoachNudge(req.userId, { lessonId, sessionId });
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/coach/dismiss', authMiddleware, async (req, res, next) => {
  try {
    await dismissCoach(req.userId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/concept-quiz/start', authMiddleware, async (req, res, next) => {
  try {
    const conceptId =
      typeof req.body?.conceptId === 'string' ? req.body.conceptId.trim() : '';
    const lessonId =
      typeof req.body?.lessonId === 'string' ? req.body.lessonId.trim() : '';
    if (!conceptId) {
      return res.status(400).json({ success: false, error: 'conceptId required' });
    }
    const tier = await resolveAgentTier(req.userId, req.userRole);
    const meter = await createAgentQuotaMeter(tier, req.userId, null);
    await meter.consume(QUOTA_COST.concept_quiz, 'concept_quiz_explore');
    const data = await generateConceptQuizForAgent(
      req.userId,
      tier,
      { conceptId, lessonId: lessonId || undefined },
      null,
    );
    res.json({ success: true, data });
  } catch (err) {
    if (err.status === 400 || err.status === 429 || err.status === 502) {
      return res.status(err.status).json({
        success: false,
        code: err.code,
        error: err.message,
      });
    }
    next(err);
  }
});

router.post('/concept-quiz/submit', authMiddleware, async (req, res, next) => {
  try {
    const quizSessionId =
      typeof req.body?.quizSessionId === 'string' ? req.body.quizSessionId.trim() : '';
    const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    if (!quizSessionId) {
      return res.status(400).json({ success: false, error: 'quizSessionId required' });
    }
    const data = await submitConceptQuizSession(req.userId, quizSessionId, answers);
    res.json({ success: true, data });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ success: false, code: err.code, error: err.message });
    }
    next(err);
  }
});

router.post('/quiz-outcome', authMiddleware, async (req, res, next) => {
  try {
    const { lessonId, passed, misconceptionTag } = req.body || {};
    if (!lessonId) {
      return res.status(400).json({ success: false, error: 'lessonId required' });
    }
    await recordQuizOutcome(req.userId, {
      lessonId: String(lessonId),
      passed: Boolean(passed),
      misconceptionTag:
        typeof misconceptionTag === 'string' ? misconceptionTag.trim() : undefined,
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get('/spaced-review', authMiddleware, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 5;
    const data = await getSpacedReviewDue(req.userId, { limit });
    res.json({ success: true, ...data });
  } catch (err) {
    next(err);
  }
});

router.post('/spaced-review/complete', authMiddleware, async (req, res, next) => {
  try {
    const lessonId = typeof req.body?.lessonId === 'string' ? req.body.lessonId.trim() : '';
    if (!lessonId) {
      return res.status(400).json({ success: false, error: 'lessonId required' });
    }
    await recordSpacedReview(req.userId, lessonId);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/depth-preference', authMiddleware, async (req, res, next) => {
  try {
    const depth = typeof req.body?.depth === 'string' ? req.body.depth.trim() : '';
    if (!depth) {
      return res.status(400).json({ success: false, error: 'depth required' });
    }
    await recordDepthPreference(req.userId, depth);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/session-summary', authMiddleware, async (req, res, next) => {
  try {
    const { sessionId, lessonId, lessonTitle, messageCount } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId required' });
    }
    const out = await saveSessionSummary(req.userId, {
      sessionId: String(sessionId),
      lessonId: lessonId ? String(lessonId) : undefined,
      lessonTitle: lessonTitle ? String(lessonTitle) : undefined,
      messageCount: Number(messageCount) || 0,
    });
    res.json({ success: true, ...out });
  } catch (err) {
    next(err);
  }
});

router.get('/sessions', authMiddleware, async (req, res, next) => {
  try {
    const limit = Number(req.query.limit) || 20;
    const sessions = await listAgentSessions(req.userId, { limit });
    res.json({ success: true, sessions });
  } catch (err) {
    next(err);
  }
});

router.get('/sessions/:sessionId', authMiddleware, async (req, res, next) => {
  try {
    const sessionId =
      typeof req.params.sessionId === 'string' ? req.params.sessionId.trim() : '';
    if (!sessionId) {
      return res.status(400).json({ success: false, error: 'sessionId required' });
    }
    const session = await getAgentSessionHistory(req.userId, sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, session });
  } catch (err) {
    next(err);
  }
});

router.post('/tools/execute', authMiddleware, async (req, res, next) => {
  try {
    const { toolName, arguments: args, session_context: sessionContext } = req.body || {};
    if (!toolName || typeof toolName !== 'string') {
      return res.status(400).json({ success: false, error: 'toolName required' });
    }
    try {
      assertAgentNotQuizLocked(sessionContext || null);
    } catch (e) {
      if (e instanceof AppError) {
        return res.status(e.status).json({ success: false, code: e.code, error: e.message });
      }
      throw e;
    }
    const { tier, courseSlug, courseId } = await resolveAgentTier({
      userId: req.userId,
      userRole: req.userRole,
      sessionContext: sessionContext || null,
    });
    const effectiveTier = tier === 'trial_expired' ? 'lp_free' : tier;
    const coursePayload = await loadCourseForTools(
      courseSlug ||
        (typeof sessionContext?.courseSlug === 'string' ? sessionContext.courseSlug : null),
    );
    const result = await executeAuthorizedTool({
      tier: effectiveTier,
      toolName,
      args: args || {},
      userId: req.userId,
      courseId: courseId || coursePayload?.courseId,
      courseSlug: courseSlug || coursePayload?.courseSlug,
      courseLessons: coursePayload?.lessons,
    });
    res.json({ success: result.ok, ...result });
  } catch (err) {
    next(err);
  }
});

router.post('/feedback', authMiddleware, async (req, res, next) => {
  try {
    const data = await recordMessageFeedback(req.userId, req.body || {});
    res.json({ success: true, data });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next(err);
  }
});

module.exports = router;
