/**
 * Truncate conversation history before LLM — tránh silent context overflow.
 */
const MAX_HISTORY_TOKENS = Math.max(
  2000,
  parseInt(process.env.AGENT_MAX_HISTORY_TOKENS || '12000', 10) || 12000,
);
const MAX_HISTORY_MESSAGES = Math.max(
  4,
  parseInt(process.env.AGENT_MAX_HISTORY_MESSAGES || '40', 10) || 40,
);

function estimateTokens(text) {
  return Math.ceil(String(text || '').length / 4);
}

function messageContentText(m) {
  const c = m?.content;
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) {
    return c
      .filter((p) => p && p.type === 'text')
      .map((p) => p.text || '')
      .join(' ');
  }
  return '';
}

function messageTokens(m) {
  let n = estimateTokens(messageContentText(m));
  if (Array.isArray(m?.tool_calls)) {
    n += estimateTokens(JSON.stringify(m.tool_calls));
  }
  if (m?.role === 'tool') {
    n += 32;
  }
  return n + 8;
}

/**
 * @param {Array<{ role: string, content?: unknown, tool_calls?: unknown[] }>} messages
 */
function trimMessagesForBudget(messages) {
  const list = Array.isArray(messages) ? messages : [];
  if (!list.length) {
    return { messages: [], estimatedHistoryTokens: 0, droppedCount: 0 };
  }

  const kept = [];
  let tokens = 0;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const m = list[i];
    const t = messageTokens(m);
    if (kept.length >= MAX_HISTORY_MESSAGES || tokens + t > MAX_HISTORY_TOKENS) {
      break;
    }
    kept.unshift(m);
    tokens += t;
  }

  return {
    messages: kept,
    estimatedHistoryTokens: tokens,
    droppedCount: list.length - kept.length,
  };
}

function buildContextBudgetMeta(trimResult) {
  return {
    max_history_tokens: MAX_HISTORY_TOKENS,
    max_history_messages: MAX_HISTORY_MESSAGES,
    estimated_history_tokens: trimResult.estimatedHistoryTokens,
    history_dropped: trimResult.droppedCount,
  };
}

module.exports = {
  trimMessagesForBudget,
  buildContextBudgetMeta,
  estimateTokens,
  MAX_HISTORY_TOKENS,
  MAX_HISTORY_MESSAGES,
};
