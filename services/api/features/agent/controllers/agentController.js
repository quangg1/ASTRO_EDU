const { asyncController, ok } = require('../../../shared/http');
const { AppError } = require('../../../shared/errors');
const { runMessagePipeline } = require('../services/messagePipeline');
const { buildLearnerSnapshot, buildAgentContext } = require('../services/contextBuilder');
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

function bodyString(body, key) {
  const value = body?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

module.exports = asyncController({
  async message(req, res) {
    await runMessagePipeline(req, res);
  },

  async snapshot(req, res) {
    const snapshot = await buildLearnerSnapshot(req.userId);
    return ok(res, { snapshot });
  },

  async prefetchContext(req, res) {
    const sessionContext = req.body?.session_context || req.body?.sessionContext || {};
    assertAgentNotQuizLocked(sessionContext);
    const built = await buildAgentContext(
      req.userId,
      sessionContext,
      req.body?.learner_snapshot || req.body?.learnerSnapshot,
      req.userRole,
    );
    setCachedContext(req.userId, sessionContext, built);
    return ok(res, { warmed: true });
  },

  async coachNudge(req, res) {
    if (req.query.quizLock === 'recall' || req.query.recallQuizActive === '1') {
      return ok(res, { allowed: false, reason: 'quiz_locked' });
    }
    const lessonId =
      typeof req.query.lessonId === 'string' ? req.query.lessonId.trim() : undefined;
    const sessionId =
      typeof req.query.sessionId === 'string' ? req.query.sessionId.trim() : undefined;
    const result = await evaluateCoachNudge(req.userId, { lessonId, sessionId });
    return ok(res, result);
  },

  async dismissCoach(req, res) {
    await dismissCoach(req.userId);
    return ok(res, {});
  },

  async startConceptQuiz(req, res) {
    const conceptId = bodyString(req.body, 'conceptId');
    const lessonId = bodyString(req.body, 'lessonId');
    if (!conceptId) throw AppError.badRequest('conceptId required');

    const { tier } = await resolveAgentTier({
      userId: req.userId,
      userRole: req.userRole,
    });
    const meter = await createAgentQuotaMeter(tier, req.userId, null);
    await meter.consume(QUOTA_COST.concept_quiz, 'concept_quiz_explore');
    const data = await generateConceptQuizForAgent(
      req.userId,
      tier,
      { conceptId, lessonId: lessonId || undefined },
      null,
    );
    return ok(res, { data });
  },

  async submitConceptQuiz(req, res) {
    const quizSessionId = bodyString(req.body, 'quizSessionId');
    const answers = req.body?.answers && typeof req.body.answers === 'object' ? req.body.answers : {};
    if (!quizSessionId) throw AppError.badRequest('quizSessionId required');
    const data = await submitConceptQuizSession(req.userId, quizSessionId, answers);
    return ok(res, { data });
  },

  async quizOutcome(req, res) {
    const { lessonId, passed, misconceptionTag } = req.body || {};
    if (!lessonId) throw AppError.badRequest('lessonId required');
    await recordQuizOutcome(req.userId, {
      lessonId: String(lessonId),
      passed: Boolean(passed),
      misconceptionTag:
        typeof misconceptionTag === 'string' ? misconceptionTag.trim() : undefined,
    });
    return ok(res, {});
  },

  async spacedReview(req, res) {
    const limit = Number(req.query.limit) || 5;
    const data = await getSpacedReviewDue(req.userId, { limit });
    return ok(res, data);
  },

  async completeSpacedReview(req, res) {
    const lessonId = bodyString(req.body, 'lessonId');
    if (!lessonId) throw AppError.badRequest('lessonId required');
    await recordSpacedReview(req.userId, lessonId);
    return ok(res, {});
  },

  async depthPreference(req, res) {
    const depth = bodyString(req.body, 'depth');
    if (!depth) throw AppError.badRequest('depth required');
    await recordDepthPreference(req.userId, depth);
    return ok(res, {});
  },

  async sessionSummary(req, res) {
    const { sessionId, lessonId, lessonTitle, messageCount } = req.body || {};
    if (!sessionId) throw AppError.badRequest('sessionId required');
    const out = await saveSessionSummary(req.userId, {
      sessionId: String(sessionId),
      lessonId: lessonId ? String(lessonId) : undefined,
      lessonTitle: lessonTitle ? String(lessonTitle) : undefined,
      messageCount: Number(messageCount) || 0,
    });
    return ok(res, out);
  },

  async listSessions(req, res) {
    const limit = Number(req.query.limit) || 20;
    const sessions = await listAgentSessions(req.userId, { limit });
    return ok(res, { sessions });
  },

  async getSession(req, res) {
    const sessionId =
      typeof req.params.sessionId === 'string' ? req.params.sessionId.trim() : '';
    if (!sessionId) throw AppError.badRequest('sessionId required');
    const session = await getAgentSessionHistory(req.userId, sessionId);
    if (!session) throw AppError.notFound('Session not found');
    return ok(res, { session });
  },

  async executeTool(req, res) {
    const { toolName, arguments: args, session_context: sessionContext } = req.body || {};
    if (!toolName || typeof toolName !== 'string') {
      throw AppError.badRequest('toolName required');
    }
    assertAgentNotQuizLocked(sessionContext || null);

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
    return res.json({ success: result.ok, ...result });
  },

  async feedback(req, res) {
    const data = await recordMessageFeedback(req.userId, req.body || {});
    return ok(res, { data });
  },
});
