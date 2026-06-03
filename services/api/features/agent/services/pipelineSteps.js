const { randomUUID } = require('crypto');
const { AppError } = require('../../../shared/errors');
const { resolveAgentTier } = require('./entitlementResolver');
const { initAgentQuotaForMessage, toolQuotaCost } = require('./agentQuota');
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

async function stepInitQuota(tier, userId, guestSessionId) {
  return initAgentQuotaForMessage(tier, userId, guestSessionId);
}

async function stepBuildContext(userId, sessionContext, learnerSnapshot, userRole) {
  return buildAgentContext(userId, sessionContext, learnerSnapshot, userRole);
}

async function authorizeToolCalls(toolCalls, ctx) {
  const tool_results = [];
  for (const call of toolCalls || []) {
    const name = call?.name;
    const args = call?.arguments || {};
    const toolCost = toolQuotaCost(name);
    if (toolCost > 0 && ctx.quotaMeter) {
      const charged = await ctx.quotaMeter.tryConsume(toolCost, name);
      if (!charged) {
        tool_results.push({
          id: call?.id,
          name,
          ok: false,
          code: 'AGENT_QUOTA_EXCEEDED',
          suggestion:
            'Đã hết quota trợ lý trong giờ này. Thử lại sau hoặc gửi câu hỏi ngắn hơn (ít tìm kiếm/quiz hơn).',
        });
        continue;
      }
    }
    const result = await executeAuthorizedTool({
      tier: ctx.tier,
      toolName: name,
      args,
      userId: ctx.userId,
      courseId: ctx.courseId,
      courseSlug: ctx.courseSlug,
      courseLessons: ctx.courseLessons,
      userMessage: ctx.userMessage,
      lessonId: ctx.lessonId,
      heavyOpsThisTurn: ctx.heavyOpsThisTurn,
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
};
