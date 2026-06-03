const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  AgentQuotaMeter,
  QUOTA_COST,
  incrUnits,
  GUEST_DEMO_BUDGET,
} = require('../features/agent/services/agentQuota');

test('meter charges multiple units per turn', async () => {
  const id = `test-${Date.now()}-${Math.random()}`;
  const max = 10;
  const meter = new AgentQuotaMeter({ kind: 'hour', id, max, ttlSec: 3600 });

  await meter.consume(QUOTA_COST.user_message, 'user_message');
  await meter.consume(QUOTA_COST.rag_search, 'rag_search');
  await meter.consume(QUOTA_COST.llm_call, 'llm_call');
  await meter.consume(QUOTA_COST.llm_call, 'llm_call');

  assert.equal(meter.getTurnConsumed(), 5);
  assert.equal(meter.getRemaining(), 5);
});

test('incrUnits rejects when over budget', async () => {
  const id = `over-${Date.now()}`;
  const max = 3;
  await incrUnits('hour', id, 2, max, 3600);
  await assert.rejects(() => incrUnits('hour', id, 2, max, 3600), (e) => e.code === 'AGENT_QUOTA_EXCEEDED');
});

test('guest budget matches constant', () => {
  assert.equal(GUEST_DEMO_BUDGET, 6);
});
