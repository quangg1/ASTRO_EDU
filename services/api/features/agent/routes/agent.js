const express = require('express');
const { authMiddleware, optionalAuth } = require('../../../shared/jwtAuth');
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
const { getSpacedReviewDue, recordSpacedReview } = require('../services/spacedReviewService');
const { recordDepthPreference } = require('../services/depthAdaptationService');

const router = express.Router();

router.post('/message', optionalAuth, async (req, res, next) => {
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
    const { buildAgentContext } = require('../services/contextBuilder');
    const built = await buildAgentContext(
      req.userId,
      sessionContext,
      req.body?.learner_snapshot || req.body?.learnerSnapshot,
    );
    setCachedContext(req.userId, sessionContext, built);
    res.json({ success: true, warmed: true });
  } catch (err) {
    next(err);
  }
});

router.get('/coach-nudge', authMiddleware, async (req, res, next) => {
  try {
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

router.post('/tools/execute', authMiddleware, async (req, res, next) => {
  try {
    const { toolName, arguments: args, session_context: sessionContext } = req.body || {};
    if (!toolName || typeof toolName !== 'string') {
      return res.status(400).json({ success: false, error: 'toolName required' });
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

module.exports = router;
