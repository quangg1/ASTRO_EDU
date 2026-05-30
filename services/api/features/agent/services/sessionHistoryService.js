const AgentSession = require('../models/AgentSession');

const MAX_MESSAGES_PER_SESSION = 200;
const DEFAULT_LIST_LIMIT = 20;
const TITLE_MAX_LEN = 72;
const PREVIEW_MAX_LEN = 120;

function truncateText(text, maxLen) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return '';
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 1)}…`;
}

function buildSessionTitle(firstUserMessage) {
  return truncateText(firstUserMessage, TITLE_MAX_LEN) || 'Cuộc trò chuyện mới';
}

function contextLabelFromSession(doc) {
  const ctx = doc?.lastContext || {};
  if (typeof ctx.lessonTitle === 'string' && ctx.lessonTitle.trim()) {
    return ctx.lessonTitle.trim();
  }
  const surface = ctx.surface || ctx.sessionSurface;
  if (surface === 'explore') return 'Khám phá';
  if (surface === 'course') return 'Khóa học';
  if (surface === 'learning_path') return 'Lộ trình học';
  if (surface === 'dashboard') return 'Dashboard';
  if (surface === 'studio') return 'Studio';
  return 'Tổng quan';
}

function formatSessionListItem(doc) {
  const messages = Array.isArray(doc.messages) ? doc.messages : [];
  const lastMsg = messages.length ? messages[messages.length - 1] : null;
  const preview = lastMsg?.content
    ? truncateText(lastMsg.content, PREVIEW_MAX_LEN)
    : doc.summary || '';

  return {
    sessionId: doc.sessionId,
    title: doc.title || buildSessionTitle(messages.find((m) => m.role === 'user')?.content),
    preview,
    contextLabel: contextLabelFromSession(doc),
    messageCount: doc.messageCount || Math.ceil(messages.length / 2) || 0,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * @param {string} userId
 * @param {string} sessionId
 * @param {{
 *   tier?: string,
 *   agentContext?: object,
 *   sessionContext?: object,
 *   userContent: string,
 *   assistantContent: string,
 *   hasImage?: boolean,
 * }} turn
 */
async function persistChatTurn(userId, sessionId, turn) {
  if (!userId || !sessionId) return { ok: false };
  const userContent = truncateText(turn.userContent, 8000);
  const assistantContent = truncateText(turn.assistantContent, 16000);
  if (!userContent || !assistantContent) return { ok: false };

  const now = new Date();
  const lastContext = {
    ...(turn.agentContext || {}),
    ...(turn.sessionContext
      ? {
          surface: turn.sessionContext.surface,
          lessonId: turn.sessionContext.lessonId,
          lessonTitle: turn.sessionContext.lessonTitle,
          pathname: turn.sessionContext.pathname,
          planet: turn.sessionContext.planet,
          courseSlug: turn.sessionContext.courseSlug,
        }
      : {}),
  };

  const existing = await AgentSession.findOne({ userId, sessionId }).select('title messages').lean();
  const title =
    existing?.title ||
    buildSessionTitle(userContent);

  const newMessages = [
    {
      role: 'user',
      content: userContent,
      hasImage: Boolean(turn.hasImage),
      createdAt: now,
    },
    {
      role: 'assistant',
      content: assistantContent,
      hasImage: false,
      createdAt: now,
    },
  ];

  await AgentSession.findOneAndUpdate(
    { userId, sessionId },
    {
      $set: {
        tier: turn.tier || 'lp_free',
        lastContext,
        title,
      },
      $inc: { messageCount: 1 },
      $push: {
        messages: {
          $each: newMessages,
          $slice: -MAX_MESSAGES_PER_SESSION,
        },
      },
    },
    { upsert: true, new: true },
  ).catch(() => {});

  return { ok: true };
}

async function listAgentSessions(userId, { limit = DEFAULT_LIST_LIMIT } = {}) {
  if (!userId) return [];
  const cap = Math.min(Math.max(Number(limit) || DEFAULT_LIST_LIMIT, 1), 50);
  const rows = await AgentSession.find({ userId, messageCount: { $gt: 0 } })
    .sort({ updatedAt: -1 })
    .limit(cap)
    .select('sessionId title summary messageCount lastContext messages createdAt updatedAt')
    .lean();
  return rows.map(formatSessionListItem);
}

async function getAgentSessionHistory(userId, sessionId) {
  if (!userId || !sessionId) return null;
  const doc = await AgentSession.findOne({ userId, sessionId })
    .select('sessionId title messages messageCount lastContext createdAt updatedAt')
    .lean();
  if (!doc || !Array.isArray(doc.messages) || doc.messages.length === 0) return null;
  return {
    sessionId: doc.sessionId,
    title: doc.title || buildSessionTitle(doc.messages.find((m) => m.role === 'user')?.content),
    contextLabel: contextLabelFromSession(doc),
    messageCount: doc.messageCount || Math.ceil(doc.messages.length / 2),
    messages: doc.messages.map((m) => ({
      role: m.role,
      content: m.content,
      hasImage: Boolean(m.hasImage),
      createdAt: m.createdAt,
    })),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

module.exports = {
  truncateText,
  buildSessionTitle,
  formatSessionListItem,
  persistChatTurn,
  listAgentSessions,
  getAgentSessionHistory,
  MAX_MESSAGES_PER_SESSION,
};
