const { randomUUID } = require('crypto');
const {
  stepResolveGuestSession,
  stepEntitlement,
  stepRateLimit,
  stepBuildContext,
  authorizeToolCalls,
  stepPersistSession,
  buildFallbackResponse,
  chunkTextForStream,
  logAgentMetrics,
  toolsForTier,
  mapContextForAi,
  callAiChat,
  loadCourseForTools,
} = require('./pipelineSteps');
const { getCachedContext } = require('./contextCache');
const { assertAgentNotQuizLocked } = require('../lib/agentQuizLock');
const { AppError } = require('../../../shared/errors');

function wantsStream(req) {
  const q = req.query?.stream;
  if (q === '0' || q === 'false') return false;
  const accept = req.headers.accept || '';
  if (accept.includes('application/json') && !accept.includes('text/event-stream')) return false;
  return true;
}

function writeSse(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * Phase 0 orchestrator — Node Option B (§3.7).
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */
async function runMessagePipeline(req, res) {
  const t0 = Date.now();
  const stream = wantsStream(req);
  const body = req.body || {};
  const messages = Array.isArray(body.messages) ? body.messages : [];
  const sessionContext = body.session_context || body.sessionContext || null;
  const learnerSnapshot = body.learner_snapshot || body.learnerSnapshot || null;
  let sessionId = body.sessionId || body.session_id || null;

  try {
    assertAgentNotQuizLocked(sessionContext);
  } catch (lockErr) {
    if (lockErr instanceof AppError) {
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        writeSse(res, 'error', { error: lockErr.message, code: lockErr.code });
        return res.end();
      }
      return res.status(lockErr.status).json({
        success: false,
        code: lockErr.code,
        error: lockErr.message,
      });
    }
    throw lockErr;
  }

  const guestSessionId = await stepResolveGuestSession(req);
  const { tier, courseSlug, courseId } = await stepEntitlement(req, sessionContext);
  const effectiveTier = tier === 'trial_expired' ? 'lp_free' : tier;
  const quota = stepRateLimit(tier, req.userId, guestSessionId);

  if (!sessionId) sessionId = randomUUID();

  const prefetchHit = Boolean(
    req.userId && getCachedContext(req.userId, sessionContext || {}),
  );
  const agentContext = await stepBuildContext(
    req.userId,
    sessionContext,
    learnerSnapshot,
    req.userRole,
  );
  const coursePayload = await loadCourseForTools(
    courseSlug || (typeof sessionContext?.courseSlug === 'string' ? sessionContext.courseSlug : null),
  );

  const aiMapping = mapContextForAi(effectiveTier, agentContext, sessionContext, coursePayload);
  const allowedTools = toolsForTier(effectiveTier);

  const ragLessonId =
    sessionContext?.lessonId ||
    agentContext?.currentLesson?.lessonId ||
    agentContext?.lessonId ||
    null;

  const aiBody = {
    messages,
    context: aiMapping.context,
    course: aiMapping.course,
    learning_path: aiMapping.learning_path,
    agent_state: aiMapping.agent_state,
    allowed_tools: allowedTools,
    rag_timeout_ms: 3000,
    rag_lesson_id: ragLessonId,
    image_base64: body.image_base64,
    image_media_type: body.image_media_type,
  };

  const tBeforeAi = Date.now();
  const aiResult = await callAiChat(aiBody);
  const tAfterAi = Date.now();

  const sessionMeta = {
    sessionId,
    tier: effectiveTier,
    trialExpired: tier === 'trial_expired',
    quotaRemaining: quota.remaining,
    allowedTools,
    guestSessionId: tier === 'guest' ? guestSessionId : undefined,
  };

  if (aiResult.error) {
    const fallback = buildFallbackResponse(sessionContext);
    logAgentMetrics({
      sessionId,
      tier: effectiveTier,
      t_prefetch_hit: prefetchHit,
      t_total_ms: Date.now() - t0,
      fallback: true,
      error: aiResult.error,
    });
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      writeSse(res, 'session', sessionMeta);
      for (const chunk of chunkTextForStream(fallback.message.content, 8)) {
        writeSse(res, 'token', { content: chunk });
      }
      writeSse(res, 'fallback', { chips: fallback.chips });
      writeSse(res, 'done', { ok: true, fallback: true });
      return res.end();
    }
    return res.json({ success: true, session: sessionMeta, ...fallback });
  }

  const rawToolCalls = Array.isArray(aiResult.tool_calls) ? aiResult.tool_calls : [];
  const lastUser = [...messages].reverse().find((m) => m && m.role === 'user');
  const userMessage =
    typeof lastUser?.content === 'string'
      ? lastUser.content
      : Array.isArray(lastUser?.content)
        ? lastUser.content
            .filter((p) => p && p.type === 'text')
            .map((p) => p.text || '')
            .join(' ')
        : '';
  const { tool_results } = await authorizeToolCalls(rawToolCalls, {
    tier: effectiveTier,
    userId: req.userId,
    userMessage,
    courseId: courseId || coursePayload?.courseId,
    courseSlug: courseSlug || coursePayload?.courseSlug,
    courseLessons: coursePayload?.lessons,
  });

  const content = aiResult.message?.content ?? '';
  const tFirstToken = Date.now();

  await stepPersistSession(req.userId, sessionId, sessionMeta, agentContext, {
    sessionContext,
    userContent: userMessage,
    assistantContent: content,
    hasImage: Boolean(body.image_base64),
  });

  logAgentMetrics({
    sessionId,
    tier: effectiveTier,
    t_prefetch_hit: prefetchHit,
    t_rag_ms: aiResult.rag_ms ?? null,
    t_ai_ms: tAfterAi - tBeforeAi,
    t_first_token_ms: tFirstToken - t0,
    t_total_ms: Date.now() - t0,
    tool_count: rawToolCalls.length,
  });

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    writeSse(res, 'session', sessionMeta);
    let first = true;
    for (const chunk of chunkTextForStream(content, 10)) {
      if (first) {
        logAgentMetrics({
          sessionId,
          tier: effectiveTier,
          t_first_token_ms: Date.now() - t0,
          stream: true,
        });
        first = false;
      }
      writeSse(res, 'token', { content: chunk });
    }
    if (rawToolCalls.length) writeSse(res, 'tool_calls', { tool_calls: rawToolCalls });
    if (tool_results.length) writeSse(res, 'tool_results', { tool_results });
    writeSse(res, 'done', { ok: true });
    return res.end();
  }

  return res.json({
    success: true,
    session: sessionMeta,
    message: { role: 'assistant', content },
    tool_calls: rawToolCalls,
    tool_results,
  });
}

module.exports = { runMessagePipeline };
