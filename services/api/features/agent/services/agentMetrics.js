/**
 * Phase 0 latency logs — align §12.2 (t_prefetch_hit, t_rag_ms, t_first_token_ms).
 */
function logAgentMetrics(payload) {
  const line = JSON.stringify({ type: 'agent_metrics', ts: Date.now(), ...payload });
  if (process.env.NODE_ENV === 'production') {
    console.log(line);
  } else {
    console.info(line);
  }
}

module.exports = { logAgentMetrics };
