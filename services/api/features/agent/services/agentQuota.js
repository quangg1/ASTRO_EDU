const { AppError } = require('../../../shared/errors');
const { getRedisClient } = require('../../../shared/redisClient');

/** Ngân sách đơn vị quota / giờ (không còn = số tin nhắn). */
const TIER_HOURLY_BUDGET = {
  guest: 6,
  lp_free: 40,
  course_trial: 40,
  course_enrolled: 60,
  teacher: 120,
  trial_expired: 40,
};

/** Guest: tổng đơn vị demo (lifetime), không reset theo giờ. */
const GUEST_DEMO_BUDGET = 6;

/** Chi phí theo loại thao tác trong một lượt HTTP /message. */
const QUOTA_COST = {
  user_message: 1,
  llm_call: 1,
  rag_search: 2,
  concept_quiz: 6,
};

const TOOL_QUOTA_COST = {
  search_learning_content: QUOTA_COST.rag_search,
  generate_concept_quiz: QUOTA_COST.concept_quiz,
};

/** @type {Map<string, { used: number, resetAt: number | null }>} */
const memoryBuckets = new Map();

function quotaExceeded(max, used) {
  return new AppError(
    429,
    'AGENT_QUOTA_EXCEEDED',
    `Đã hết quota trợ lý trong kỳ này (đã dùng ${used}/${max} đơn vị). Mỗi tin nhắn, lần gọi AI, tìm kiếm nội dung và quiz concept đều trừ quota.`,
  );
}

function memoryKey(kind, id) {
  return `${kind}:${id}`;
}

function memoryIncr(kind, id, cost, max, ttlSec) {
  const key = memoryKey(kind, id);
  const now = Date.now();
  let entry = memoryBuckets.get(key);
  if (!entry || (entry.resetAt != null && entry.resetAt <= now)) {
    entry = { used: 0, resetAt: ttlSec ? now + ttlSec * 1000 : null };
    memoryBuckets.set(key, entry);
  }
  const next = entry.used + cost;
  if (next > max) {
    throw quotaExceeded(max, entry.used);
  }
  entry.used = next;
  return { remaining: max - next, used: next, backend: 'memory' };
}

async function redisIncrUnits(rk, cost, max, ttlSec) {
  const redis = await getRedisClient();
  if (!redis) return null;
  const newVal = await redis.incrBy(rk, cost);
  if (newVal === cost && ttlSec) {
    await redis.expire(rk, ttlSec);
  }
  if (newVal > max) {
    await redis.incrBy(rk, -cost);
    throw quotaExceeded(max, newVal - cost);
  }
  return { remaining: max - newVal, used: newVal, backend: 'redis' };
}

async function incrUnits(kind, id, cost, max, ttlSec) {
  if (cost <= 0) {
    const used = 0;
    return { remaining: max - used, used, backend: 'none' };
  }
  const rk =
    kind === 'guest' ? `agent:guest:units:${id}` : `agent:units:hour:${id}`;
  const redisResult = await redisIncrUnits(rk, cost, max, ttlSec);
  if (redisResult) return redisResult;
  return memoryIncr(kind, id, cost, max, ttlSec);
}

class AgentQuotaMeter {
  /**
   * @param {{ kind: 'guest'|'hour', id: string, max: number, ttlSec: number|null }} spec
   */
  constructor(spec) {
    this.kind = spec.kind;
    this.id = spec.id;
    this.max = spec.max;
    this.ttlSec = spec.ttlSec;
    this.lastRemaining = spec.max;
    this.turnConsumed = 0;
  }

  /**
   * @param {number} cost
   * @param {string} [op]
   */
  async consume(cost, op) {
    const result = await incrUnits(this.kind, this.id, cost, this.max, this.ttlSec);
    this.lastRemaining = result.remaining;
    this.turnConsumed += cost;
    return { ...result, op };
  }

  /**
   * @param {number} cost
   * @param {string} [op]
   */
  async tryConsume(cost, op) {
    try {
      return await this.consume(cost, op);
    } catch (e) {
      if (e instanceof AppError && e.code === 'AGENT_QUOTA_EXCEEDED') {
        return null;
      }
      throw e;
    }
  }

  getRemaining() {
    return this.lastRemaining;
  }

  getTurnConsumed() {
    return this.turnConsumed;
  }
}

/**
 * @param {string} tier
 * @param {string|null} userId
 * @param {string|null} guestSessionId
 */
async function createAgentQuotaMeter(tier, userId, guestSessionId) {
  if (tier === 'guest') {
    if (!guestSessionId) {
      throw new AppError(400, 'GUEST_SESSION_REQUIRED', 'Thiếu phiên demo.');
    }
    return new AgentQuotaMeter({
      kind: 'guest',
      id: guestSessionId,
      max: GUEST_DEMO_BUDGET,
      ttlSec: null,
    });
  }
  if (!userId) {
    throw new AppError(401, 'AUTH_REQUIRED', 'Đăng nhập để dùng agent.');
  }
  const effectiveTier = tier === 'trial_expired' ? 'lp_free' : tier;
  const max = TIER_HOURLY_BUDGET[effectiveTier] ?? TIER_HOURLY_BUDGET.lp_free;
  return new AgentQuotaMeter({
    kind: 'hour',
    id: `${effectiveTier}:${userId}`,
    max,
    ttlSec: 3600,
  });
}

/**
 * Khởi tạo meter và trừ chi phí tin nhắn đầu vào.
 */
async function initAgentQuotaForMessage(tier, userId, guestSessionId) {
  const meter = await createAgentQuotaMeter(tier, userId, guestSessionId);
  await meter.consume(QUOTA_COST.user_message, 'user_message');
  return meter;
}

function toolQuotaCost(toolName) {
  return TOOL_QUOTA_COST[toolName] || 0;
}

module.exports = {
  AgentQuotaMeter,
  createAgentQuotaMeter,
  initAgentQuotaForMessage,
  incrUnits,
  QUOTA_COST,
  TOOL_QUOTA_COST,
  toolQuotaCost,
  TIER_HOURLY_BUDGET,
  GUEST_DEMO_BUDGET,
};
