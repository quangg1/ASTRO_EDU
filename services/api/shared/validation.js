const { AppError } = require('./errors');

function requireString(value, field, label = field) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AppError(400, 'VALIDATION_ERROR', `${label} là bắt buộc`);
  }
  return value.trim();
}

function requirePositiveNumber(value, field, label = field) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', `${label} không hợp lệ`);
  }
  return num;
}

function requireEnum(value, allowed, field, label = field) {
  if (!allowed.includes(value)) {
    throw new AppError(400, 'VALIDATION_ERROR', `${label} không hợp lệ`, { allowed });
  }
  return value;
}

module.exports = { requireString, requirePositiveNumber, requireEnum };
