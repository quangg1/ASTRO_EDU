const { AppError } = require('../../../shared/errors');

const GUEST_DEMO_LIMIT = 2;
const TIER_HOURLY = {
  guest: 2,
  lp_free: 40,
  course_trial: 40,
  course_enrolled: 60,
  teacher: 120,
  trial_expired: 40,
};

/** @type {Map<string, { count: number, resetAt: number }>} */
const buckets = new Map();

function bucketKey(kind, id) {
  return `${kind}:${id}`;
}

function checkHourlyLimit(tier, userId) {
  const max = TIER_HOURLY[tier] ?? 40;
  const key = bucketKey('hour', `${tier}:${userId}`);
  const now = Date.now();
  let entry = buckets.get(key);
  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + 60 * 60 * 1000 };
    buckets.set(key, entry);
  }
  if (entry.count >= max) {
    throw new AppError(429, 'AGENT_RATE_LIMIT', 'Đã đạt giới hạn tin nhắn agent trong giờ này.');
  }
  entry.count += 1;
  return { remaining: max - entry.count };
}

function checkGuestDemoLimit(guestSessionId) {
  const key = bucketKey('guest', guestSessionId);
  const entry = buckets.get(key) || { count: 0 };
  if (entry.count >= GUEST_DEMO_LIMIT) {
    throw new AppError(429, 'GUEST_DEMO_LIMIT', 'Bạn đã dùng hết lượt demo. Đăng nhập để tiếp tục.');
  }
  entry.count += 1;
  buckets.set(key, entry);
  return { remaining: GUEST_DEMO_LIMIT - entry.count };
}

module.exports = { checkHourlyLimit, checkGuestDemoLimit, GUEST_DEMO_LIMIT };
