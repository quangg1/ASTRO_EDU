const { randomUUID } = require('crypto');
const { AppError } = require('../../../shared/errors');
const { resolveAgentTier } = require('./entitlementResolver');
const { checkHourlyLimit, checkGuestDemoLimit } = require('./rateLimit');
const { buildAgentContext } = require('./contextBuilder');
const { callAiChat, callAiChatStream, mapContextForAi } = require('./aiClient');
const { toolsForTier } = require('../lib/toolSchema');
const { executeAuthorizedTool, loadCourseForTools } = require('./toolAuthorizers/executeTool');
const AgentSession = require('../models/AgentSession');
const { persistChatTurn } = require('./sessionHistoryService');
const { logAgentMetrics } = require('./agentMetrics');

async function stepResolveGuestSession(req) {
  const guestHeader = req.headers['x-agent-guest-session'];
  if (typeof guestHeader === 'string' && guestHeader.trim()) {
    return guestHeader.trim();
  }
  if (!req.userId) return randomUUID();
  return null;
}

async function stepEntitlement(req, sessionContext) {
  return resolveAgentTier({
    userId: req.userId,
    userRole: req.userRole,
    sessionContext,
  });
}

function stepRateLimit(tier, userId, guestSessionId) {
  if (tier === 'guest') {
    if (!guestSessionId) {
      throw new AppError(400, 'GUEST_SESSION_REQUIRED', 'Thiếu phiên demo.');
    }
    return checkGuestDemoLimit(guestSessionId);
  }
  if (userId) {
    return checkHourlyLimit(tier === 'trial_expired' ? 'lp_free' : tier, userId);
  }
  throw new AppError(401, 'AUTH_REQUIRED', 'Đăng nhập để dùng agent.');
}

async function stepBuildContext(userId, sessionContext, learnerSnapshot, userRole) {
  return buildAgentContext(userId, sessionContext, learnerSnapshot, userRole);
}

async function authorizeToolCalls(toolCalls, ctx) {
  const tool_results = [];
  for (const call of toolCalls || []) {
    const name = call?.name;
    const args = call?.arguments || {};
    const result = await executeAuthorizedTool({
      tier: ctx.tier,
      toolName: name,
      args,
      userId: ctx.userId,
      courseId: ctx.courseId,
      courseSlug: ctx.courseSlug,
      courseLessons: ctx.courseLessons,
      userMessage: ctx.userMessage,
    });
    tool_results.push({ id: call?.id, name, ...result });
  }
  return { tool_results };
}

async function stepPersistSession(userId, sessionId, sessionMeta, agentContext, turnPayload) {
  if (!userId) return;
  if (turnPayload?.userContent && turnPayload?.assistantContent) {
    await persistChatTurn(userId, sessionId, {
      tier: sessionMeta.tier,
      agentContext,
      sessionContext: turnPayload.sessionContext,
      userContent: turnPayload.userContent,
      assistantContent: turnPayload.assistantContent,
      hasImage: Boolean(turnPayload.hasImage),
    });
    return;
  }
  await AgentSession.findOneAndUpdate(
    { sessionId, userId },
    {
      $set: { tier: sessionMeta.tier, lastContext: agentContext },
      $inc: { messageCount: 1 },
    },
    { upsert: true, new: true },
  ).catch(() => {});
}

function buildFallbackResponse(sessionContext) {
  const lessonTitle = sessionContext?.lessonTitle;
  const chips = [];
  if (lessonTitle) chips.push({ label: 'Ôn lại bài này', action: 'stay' });
  chips.push({ label: 'Bài tiếp theo', action: 'next_lesson' });
  chips.push({ label: 'Mở Khám phá', action: 'explore' });
  if (sessionContext?.recallQuizAvailable) {
    chips.push({ label: 'Mở quiz ôn', action: 'recall_quiz' });
  }
  return {
    message: {
      role: 'assistant',
      content:
        'Trợ lý AI tạm thời không khả dụng. Bạn vẫn có thể tiếp tục học — thử các gợi ý bên dưới.',
    },
    tool_calls: [],
    tool_results: [],
    fallback: true,
    chips,
  };
}

function* chunkTextForStream(text, wordsPerChunk = 12) {
  const words = String(text || '').split(/(\s+)/);
  let buf = '';
  let count = 0;
  for (const w of words) {
    buf += w;
    if (w.trim()) count += 1;
    if (count >= wordsPerChunk) {
      yield buf;
      buf = '';
      count = 0;
    }
  }
  if (buf) yield buf;
}

module.exports = {
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
  callAiChatStream,
  loadCourseForTools,
};
