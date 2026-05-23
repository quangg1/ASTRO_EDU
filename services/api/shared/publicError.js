const { AppError } = require('./errors');

const INTERNAL_HINT =
  /NEXT_PUBLIC_|API_PROXY|EMBEDDING|AI_SERVICE|MEDIA_SERVICE|\.env|localhost|VNPAY_|MONGODB|JWT_|FIREBASE_SERVICE|chưa được cấu hình|MODULE_NOT_FOUND|process\.env/i;

/**
 * Message an toàn cho client JSON. AppError.message được coi là user-facing.
 * Lỗi hệ thống → fallback; chi tiết ghi log.
 */
function toClientMessage(err, fallback = 'Đã xảy ra lỗi. Vui lòng thử lại sau.') {
  if (err instanceof AppError) return err.message;
  const raw = err && typeof err.message === 'string' ? err.message.trim() : '';
  if (raw && !INTERNAL_HINT.test(raw)) return raw;
  return fallback;
}

function sanitizeClientText(text, fallback) {
  const t = String(text || '').trim();
  if (!t || INTERNAL_HINT.test(t)) return fallback;
  return t;
}

module.exports = { toClientMessage, sanitizeClientText };
