const { randomUUID } = require('crypto');
const {
  stepResolveGuestSession,
  stepEntitlement,
  stepInitQuota,
  stepBuildContext,
  authorizeToolCalls,
  stepPersistSession,
  buildFallbackResponse,
  chunkTextForStream,
  logAgentMetrics,
  toolsForTier,
  mapContextForAi,
  callAiChat,
  callAiChatStream,
  loadCourseForTools,
} = require('./pipelineSteps');
const { trimMessagesForBudget, buildContextBudgetMeta } = require('./contextBudget');
const { runReactAgentTurn } = require('./reactLoop');
const { extractLessonSearchQuery } = require('./lessonSearchIntent');
const { isToolAllowedForTier } = require('../lib/toolSchema');

const ASSISTANT_LEAK_RE = /<\/?\s*assistant\s*>|<\|[^|>]{1,40}\|>/gi;
const MAX_USER_MESSAGE_CHARS = Math.max(
  500,
  parseInt(process.env.AGENT_MAX_USER_MESSAGE_CHARS || '6000', 10) || 6000,
);

function sanitizeAssistantContent(text) {
  return String(text || '')
    .replace(ASSISTANT_LEAK_RE, '')
    .trim();
}
const { getCachedContext } = require('./contextCache');
const { assertAgentNotQuizLocked } = require('../lib/agentQuizLock');
const { AppError } = require('../../../shared/errors');
const { resolveAgentFastPath } = require('./agentFastPath');
const { cacheAgentResponse } = require('./agentResponseCache');

const STREAM_WORDS_PER_CHUNK = 3;
const STREAM_CHUNK_DELAY_MS = 18;

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

function flushSse(res) {
  if (typeof res.flush === 'function') res.flush();
}

async function writeTokenStream(res, text) {
  for (const chunk of chunkTextForStream(text, STREAM_WORDS_PER_CHUNK)) {
    writeSse(res, 'token', { content: chunk });
    flushSse(res);
    if (STREAM_CHUNK_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, STREAM_CHUNK_DELAY_MS));
    }
  }
}

function logTurnMetrics(base, extra) {
  logAgentMetrics({ ...base, ...extra });
}

async function deliverFastPathTurn({
  req,
  res,
  stream,
  t0,
  sessionMeta,
  sessionId,
  sessionContext,
  userMessage,
  fast,
  effectiveTier,
}) {
  const content = sanitizeAssistantContent(fast.content);
  const cacheMeta = {
    source: fast.source,
    cacheEntryId: fast.cacheEntryId || null,
    kind: fast.kind || null,
  };

  await stepPersistSession(req.userId, sessionId, sessionMeta, null, {
    sessionContext,
    userContent: userMessage,
    assistantContent: content,
    hasImage: false,
  });

  logTurnMetrics(
    {
      sessionId,
      tier: effectiveTier,
      fast_path: fast.source,
      fast_path_kind: fast.kind || null,
      cache_entry_id: fast.cacheEntryId || null,
      t_total_ms: Date.now() - t0,
      t_first_token_ms: Date.now() - t0,
      llm_skipped: true,
    },
    {},
  );

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    writeSse(res, 'session', sessionMeta);
    writeSse(res, 'status', { phase: 'streaming' });
    flushSse(res);
    await writeTokenStream(res, content);
    writeSse(res, 'cache_meta', cacheMeta);
    writeSse(res, 'done', {
      ok: true,
      quotaRemaining: sessionMeta.quotaRemaining,
      quotaTurnUsed: sessionMeta.quotaTurnUsed,
      fast_path: fast.source,
    });
    flushSse(res);
    return res.end();
  }

  return res.json({
    success: true,
    session: sessionMeta,
    message: { role: 'assistant', content },
    tool_calls: [],
    tool_results: [],
    cache_meta: cacheMeta,
  });
}

/**
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

  const lastUser = [...messages].reverse().find((m) => m && m.role === 'user');
  const lastUserText =
    typeof lastUser?.content === 'string'
      ? lastUser.content
      : Array.isArray(lastUser?.content)
        ? lastUser.content
            .filter((p) => p && p.type === 'text')
            .map((p) => p.text || '')
            .join(' ')
        : '';
  if (lastUserText.length > MAX_USER_MESSAGE_CHARS) {
    const err = new AppError(
      400,
      'MESSAGE_TOO_LONG',
      `Tin nhắn quá dài (tối đa ${MAX_USER_MESSAGE_CHARS} ký tự). Chia nhỏ câu hỏi để trợ lý trả lời ổn định hơn.`,
    );
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      writeSse(res, 'error', { error: err.message, code: err.code });
      return res.end();
    }
    return res.status(err.status).json({ success: false, code: err.code, error: err.message });
  }

  const guestSessionId = await stepResolveGuestSession(req);
  const { tier, courseSlug, courseId } = await stepEntitlement(req, sessionContext);
  const effectiveTier = tier === 'trial_expired' ? 'lp_free' : tier;
  const quotaMeter = await stepInitQuota(tier, req.userId, guestSessionId);

  if (!sessionId) sessionId = randomUUID();

  const hasImage = Boolean(body.image_base64);

  if (!hasImage && lastUserText.trim()) {
    const fast = await resolveAgentFastPath({
      userMessage: lastUserText,
      sessionContext,
      hasImage,
    });
    if (fast?.content) {
      return deliverFastPathTurn({
        req,
        res,
        stream,
        t0,
        sessionMeta: {
          sessionId,
          tier: effectiveTier,
          trialExpired: tier === 'trial_expired',
          quotaRemaining: quotaMeter.getRemaining(),
          quotaTurnUsed: quotaMeter.getTurnConsumed(),
          allowedTools: toolsForTier(effectiveTier),
          guestSessionId: tier === 'guest' ? guestSessionId : undefined,
        },
        sessionId,
        sessionContext,
        userMessage: lastUserText,
        fast,
        effectiveTier,
      });
    }
  }

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

  const trimResult = trimMessagesForBudget(messages);
  const contextBudget = buildContextBudgetMeta(trimResult);

  const aiMapping = mapContextForAi(
    effectiveTier,
    agentContext,
    sessionContext,
    coursePayload,
    contextBudget,
    learnerSnapshot,
  );
  const allowedTools = toolsForTier(effectiveTier);

  const ragLessonId =
    sessionContext?.lessonId ||
    agentContext?.currentLesson?.lessonId ||
    agentContext?.lessonId ||
    null;

  const aiBodyBase = {
    messages: trimResult.messages,
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

  const sessionMeta = {
    sessionId,
    tier: effectiveTier,
    trialExpired: tier === 'trial_expired',
    quotaRemaining: quotaMeter.getRemaining(),
    quotaTurnUsed: quotaMeter.getTurnConsumed(),
    allowedTools,
    guestSessionId: tier === 'guest' ? guestSessionId : undefined,
  };

  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    writeSse(res, 'session', sessionMeta);
    writeSse(res, 'status', { phase: 'thinking' });
    flushSse(res);
  }

  const tBeforeAi = Date.now();
  let firstTokenAt = null;

  const trimmedLastUser = [...trimResult.messages].reverse().find((m) => m && m.role === 'user');
  const userMessage =
    typeof trimmedLastUser?.content === 'string'
      ? trimmedLastUser.content
      : Array.isArray(trimmedLastUser?.content)
        ? trimmedLastUser.content
            .filter((p) => p && p.type === 'text')
            .map((p) => p.text || '')
            .join(' ')
        : '';

  const toolCtx = {
    tier: effectiveTier,
    userId: req.userId,
    userMessage,
    lessonId: ragLessonId,
    heavyOpsThisTurn: new Set(),
    quotaMeter,
    courseId: courseId || coursePayload?.courseId,
    courseSlug: courseSlug || coursePayload?.courseSlug,
    courseLessons: coursePayload?.lessons,
  };

  let bootstrapToolTurn = null;
  const autoSearchQ = extractLessonSearchQuery(userMessage);
  if (
    autoSearchQ &&
    isToolAllowedForTier('search_learning_content', effectiveTier)
  ) {
    try {
      const autoCalls = [
        {
          id: `auto_search_${Date.now()}`,
          name: 'search_learning_content',
          arguments: { q: autoSearchQ },
        },
      ];
      const { tool_results: autoResults } = await authorizeToolCalls(autoCalls, toolCtx);
      if (autoResults?.[0]?.ok) {
        bootstrapToolTurn = { toolCalls: autoCalls, toolResults: autoResults };
      }
    } catch (e) {
      console.warn('[agent] auto search_learning_content failed:', e.message);
    }
  }

  const turn = await runReactAgentTurn({
    aiBodyBase,
    stream,
    callAiChat,
    callAiChatStream,
    authorizeToolCalls,
    toolCtx,
    quotaMeter,
    bootstrapToolTurn,
    onToken: (delta) => {
      if (!firstTokenAt) {
        firstTokenAt = Date.now();
        if (stream) {
          writeSse(res, 'status', { phase: 'streaming' });
          flushSse(res);
        }
      }
      if (stream) {
        writeSse(res, 'token', { content: delta });
        flushSse(res);
        if (res.socket) res.socket.setNoDelay(true);
      }
    },
    onStatus: (phase) => {
      if (stream) {
        writeSse(res, 'status', { phase });
        flushSse(res);
      }
    },
  });

  const tAfterAi = Date.now();
  const tFirstToken = firstTokenAt ?? tAfterAi;
  const tRagMs = turn.rag_ms ?? null;
  const tLlmTtftMs = firstTokenAt ? firstTokenAt - tBeforeAi : null;

  if (turn.error) {
    const fallback = buildFallbackResponse(sessionContext);
    logTurnMetrics(
      {
        sessionId,
        tier: effectiveTier,
        t_prefetch_hit: prefetchHit,
        t_total_ms: Date.now() - t0,
        fallback: true,
        error: turn.error,
      },
      { history_dropped: contextBudget.history_dropped },
    );
    if (stream) {
      await writeTokenStream(res, fallback.message.content);
      writeSse(res, 'fallback', { chips: fallback.chips });
      writeSse(res, 'done', { ok: true, fallback: true });
      flushSse(res);
      return res.end();
    }
    return res.json({ success: true, session: sessionMeta, ...fallback });
  }

  const content = sanitizeAssistantContent(turn.message?.content ?? '');
  const rawToolCalls = turn.tool_calls || [];
  const tool_results = turn.tool_results || [];

  await stepPersistSession(req.userId, sessionId, sessionMeta, agentContext, {
    sessionContext,
    userContent: userMessage,
    assistantContent: content,
    hasImage: Boolean(body.image_base64),
  });

  if (
    !body.image_base64 &&
    rawToolCalls.length === 0 &&
    content.length >= 40 &&
    content.length <= 4000
  ) {
    void cacheAgentResponse({
      query: userMessage,
      answer: content,
      surface: sessionContext?.surface || 'general',
    }).catch(() => {});
  }

  logTurnMetrics(
    {
      sessionId,
      tier: effectiveTier,
      t_prefetch_hit: prefetchHit,
      t_setup_ms: tBeforeAi - t0,
      t_rag_ms: tRagMs,
      t_llm_ttft_ms: tLlmTtftMs,
      t_ai_ms: tAfterAi - tBeforeAi,
      t_first_token_ms: tFirstToken - t0,
      t_total_ms: Date.now() - t0,
      tool_count: rawToolCalls.length,
      react_steps: turn.react_steps,
      tools_ok: turn.tools_ok,
      tools_fail: turn.tools_fail,
      prompt_tokens: turn.usage?.prompt_tokens ?? null,
      completion_tokens: turn.usage?.completion_tokens ?? null,
      history_tokens_est: contextBudget.estimated_history_tokens,
      history_dropped: contextBudget.history_dropped,
      stream_proxy: turn.streamedToClient,
      llm_provider: turn.llm_provider ?? null,
    },
    {},
  );

  sessionMeta.quotaRemaining = quotaMeter.getRemaining();
  sessionMeta.quotaTurnUsed = quotaMeter.getTurnConsumed();

  if (stream) {
    if (!turn.streamedToClient && content) {
      await writeTokenStream(res, content);
    }
    if (rawToolCalls.length) writeSse(res, 'tool_calls', { tool_calls: rawToolCalls });
    if (tool_results.length) writeSse(res, 'tool_results', { tool_results });
    writeSse(res, 'done', {
      ok: true,
      quotaRemaining: sessionMeta.quotaRemaining,
      quotaTurnUsed: sessionMeta.quotaTurnUsed,
    });
    flushSse(res);
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
