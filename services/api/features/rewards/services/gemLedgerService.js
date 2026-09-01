/**
 * API công khai để các feature khác *hỏi* về lịch sử thưởng gem mà không cần
 * biết `GemTransaction` tồn tại.
 *
 * Chỉ đọc — muốn cộng gem thì dùng `applyGemEarn` trong `rewardEngine`.
 */
const gemTransactionRepository = require('../repositories/gemTransactionRepository');
const { utcDayBounds } = require('./rewardEngine');

/** Metadata lồng nhau được phẳng hóa thành `metadata.<key>` cho truy vấn Mongo. */
function withMetadata(filter, metadata) {
  if (!metadata) return filter;
  const out = { ...filter };
  for (const [key, value] of Object.entries(metadata)) {
    out[`metadata.${key}`] = String(value);
  }
  return out;
}

/** Đã từng thưởng `reason` cho đúng thực thể này chưa (chống thưởng trùng). */
function hasEarnedFor({ userId, reason, entityId, metadata }) {
  return gemTransactionRepository.exists(
    withMetadata({ userId, reason, entityId: String(entityId) }, metadata),
  );
}

/** Đã từng nhận `reason` này chưa, bất kể thực thể (phần thưởng một lần duy nhất). */
function hasEarnedReason({ userId, reason }) {
  return gemTransactionRepository.exists({ userId, reason });
}

/** Đã nhận `reason` trong ngày UTC hôm nay chưa (giới hạn theo ngày). */
function hasEarnedToday({ userId, reason, now = new Date() }) {
  return gemTransactionRepository.existsInRange({ userId, reason }, utcDayBounds(now));
}

/** Đếm số lần nhận `reason` trong `days` ngày gần nhất (giới hạn theo tuần). */
function countEarnedWithinDays({ userId, reason, days }) {
  const since = new Date(Date.now() - days * 86400_000);
  return gemTransactionRepository.countSince({ userId, reason }, since);
}

module.exports = { hasEarnedFor, hasEarnedReason, hasEarnedToday, countEarnedWithinDays };
