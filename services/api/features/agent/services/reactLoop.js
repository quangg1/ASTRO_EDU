const { QUOTA_COST } = require('./agentQuota');

const MAX_REACT_STEPS = Math.min(
  5,
  Math.max(1, parseInt(process.env.AGENT_REACT_MAX_STEPS || '3', 10) || 3),
);

async function chargeLlmQuota(quotaMeter) {
  if (!quotaMeter) return true;
  const charged = await quotaMeter.tryConsume(QUOTA_COST.llm_call, 'llm_call');
  return Boolean(charged);
}

/**
 * Append assistant + tool messages for next LLM turn (OpenAI-compatible).
 */
function appendToolTurn(workingMessages, assistantContent, toolCalls, toolResults) {
  const next = [...workingMessages];
  const calls = Array.isArray(toolCalls) ? toolCalls : [];
  if (calls.length) {
    next.push({
      role: 'assistant',
      content: assistantContent || '',
      tool_calls: calls.map((c) => ({
        id: c.id || `call_${Date.now()}`,
        type: 'function',
        function: {
          name: c.name,
          arguments:
            typeof c.arguments === 'string' ? c.arguments : JSON.stringify(c.arguments || {}),
        },
      })),
    });
    for (const tr of toolResults || []) {
      const payload = {
        ok: tr.ok,
        code: tr.code,
        suggestion: tr.suggestion,
        clientAction: tr.clientAction,
        data: tr.data,
      };
      next.push({
        role: 'tool',
        tool_call_id: tr.id || calls.find((c) => c.name === tr.name)?.id,
        content: JSON.stringify(payload).slice(0, 8000),
      });
    }
  }
  return next;
}

function sumUsage(a, b) {
  return {
    prompt_tokens: (a?.prompt_tokens || 0) + (b?.prompt_tokens || 0),
    completion_tokens: (a?.completion_tokens || 0) + (b?.completion_tokens || 0),
  };
}

/**
 * ReAct: Think → Act (tools) → Observe → repeat; stream only on final text turn.
 *
 * @param {object} params
 * @param {object} params.aiBodyBase — template for callAiChat (messages mutated per step)
 * @param {boolean} params.stream
 * @param {(delta: string) => void} [params.onToken]
 * @param {(phase: string) => void} [params.onStatus]
 * @param {Function} params.callAiChat
 * @param {Function} params.callAiChatStream
 * @param {Function} params.authorizeToolCalls
 * @param {object} params.toolCtx
 * @param {import('./agentQuota').AgentQuotaMeter|null} [params.quotaMeter]
 * @param {{ toolCalls: object[], toolResults: object[] }|null} [params.bootstrapToolTurn]
 */
async function runReactAgentTurn({
  aiBodyBase,
  stream,
  onToken,
  onStatus,
  callAiChat,
  callAiChatStream,
  authorizeToolCalls,
  toolCtx,
  quotaMeter = null,
  bootstrapToolTurn = null,
}) {
  let workingMessages = [...(aiBodyBase.messages || [])];
  let totalUsage = { prompt_tokens: 0, completion_tokens: 0 };
  let reactSteps = 0;
  let allToolCalls = [];
  let allToolResults = [];
  let toolsOk = 0;
  let toolsFail = 0;
  let streamedToClient = false;
  let lastError = null;
  let finalMessage = { role: 'assistant', content: '' };
  let ragMs = null;
  let llmProvider = null;

  if (
    bootstrapToolTurn?.toolCalls?.length &&
    bootstrapToolTurn?.toolResults?.length
  ) {
    const btCalls = bootstrapToolTurn.toolCalls;
    const btResults = bootstrapToolTurn.toolResults;
    allToolCalls = btCalls.slice();
    allToolResults = btResults.slice();
    for (const tr of btResults) {
      if (tr.ok) toolsOk += 1;
      else toolsFail += 1;
    }
    reactSteps += 1;
    workingMessages = appendToolTurn(workingMessages, '', btCalls, btResults);
    onStatus?.('synthesizing');
    if (!(await chargeLlmQuota(quotaMeter))) {
      lastError = 'Đã hết quota trợ lý khi tổng hợp câu trả lời.';
      return {
        error: lastError,
        message: finalMessage,
        tool_calls: allToolCalls,
        tool_results: allToolResults,
        rag_ms: ragMs,
        llm_provider: llmProvider,
        usage: totalUsage,
        react_steps: reactSteps,
        tools_ok: toolsOk,
        tools_fail: toolsFail,
        streamedToClient,
      };
    }
    const synthBody = { ...aiBodyBase, messages: workingMessages, allowed_tools: [] };
    const synth = stream
      ? await callAiChatStream(synthBody, {
          onToken: (delta) => {
            streamedToClient = true;
            onToken?.(delta);
          },
        })
      : await callAiChat(synthBody);
    if (synth.error) {
      lastError = synth.error;
    } else {
      if (synth.usage) totalUsage = sumUsage(totalUsage, synth.usage);
      if (synth.rag_ms != null) ragMs = synth.rag_ms;
      if (synth.llm_provider) llmProvider = synth.llm_provider;
      finalMessage = synth.message || { role: 'assistant', content: '' };
    }
    return {
      error: lastError,
      message: finalMessage,
      tool_calls: allToolCalls,
      tool_results: allToolResults,
      rag_ms: ragMs,
      llm_provider: llmProvider,
      usage: totalUsage,
      react_steps: reactSteps,
      tools_ok: toolsOk,
      tools_fail: toolsFail,
      streamedToClient,
    };
  }

  for (let step = 0; step < MAX_REACT_STEPS; step += 1) {
    const aiBody = { ...aiBodyBase, messages: workingMessages };
    const hasToolsLeft = step < MAX_REACT_STEPS - 1;
    const preferStream = stream && !aiBodyBase.image_base64 && step === MAX_REACT_STEPS - 1;

    if (!(await chargeLlmQuota(quotaMeter))) {
      lastError = 'Đã hết quota trợ lý khi gọi AI.';
      break;
    }

    let aiResult;
    if (preferStream) {
      aiResult = await callAiChatStream(aiBody, {
        onToken: (delta) => {
          streamedToClient = true;
          onToken?.(delta);
        },
      });
    } else {
      onStatus?.('thinking');
      aiResult = await callAiChat(aiBody);
    }

    if (aiResult.error) {
      lastError = aiResult.error;
      break;
    }

    if (aiResult.rag_ms != null) ragMs = aiResult.rag_ms;
    if (aiResult.llm_provider) llmProvider = aiResult.llm_provider;
    if (aiResult.usage) totalUsage = sumUsage(totalUsage, aiResult.usage);

    const rawToolCalls = Array.isArray(aiResult.tool_calls) ? aiResult.tool_calls : [];
    const content = aiResult.message?.content ?? '';
    finalMessage = { role: 'assistant', content };

    if (rawToolCalls.length) {
      reactSteps += 1;
      onStatus?.('tools');
      const { tool_results } = await authorizeToolCalls(rawToolCalls, toolCtx);
      for (const tr of tool_results) {
        if (tr.ok) toolsOk += 1;
        else toolsFail += 1;
      }
      allToolCalls = allToolCalls.concat(rawToolCalls);
      allToolResults = allToolResults.concat(tool_results);
      workingMessages = appendToolTurn(workingMessages, content, rawToolCalls, tool_results);

      if (hasToolsLeft) {
        finalMessage = { role: 'assistant', content: content || '' };
        continue;
      }

      onStatus?.('synthesizing');
      if (!(await chargeLlmQuota(quotaMeter))) {
        lastError = 'Đã hết quota trợ lý khi tổng hợp câu trả lời.';
        break;
      }
      const synthBody = {
        ...aiBodyBase,
        messages: workingMessages,
        allowed_tools: [],
      };
      const synth = stream
        ? await callAiChatStream(synthBody, {
            onToken: (delta) => {
              streamedToClient = true;
              onToken?.(delta);
            },
          })
        : await callAiChat(synthBody);
      if (synth.error) {
        lastError = synth.error;
        break;
      }
      if (synth.usage) totalUsage = sumUsage(totalUsage, synth.usage);
      if (synth.rag_ms != null) ragMs = synth.rag_ms;
      finalMessage = synth.message || { role: 'assistant', content: '' };
      break;
    }

    break;
  }

  return {
    error: lastError,
    message: finalMessage,
    tool_calls: allToolCalls,
    tool_results: allToolResults,
    rag_ms: ragMs,
    llm_provider: llmProvider,
    usage: totalUsage,
    react_steps: reactSteps,
    tools_ok: toolsOk,
    tools_fail: toolsFail,
    streamedToClient,
  };
}

module.exports = { runReactAgentTurn, MAX_REACT_STEPS, appendToolTurn };
