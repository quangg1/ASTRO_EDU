const ENV = require('../../../shared/envNames');

function required(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${name}`);
  }
  return value;
}

function optional(name) {
  const value = process.env[name];
  return value && String(value).trim() ? value : '';
}

function validateApiEnv() {
  const port = Number(required(ENV.PORT));
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Biến ${ENV.PORT} phải là số cổng hợp lệ`);
  }

  return {
    port,
    mongodbUri: required(ENV.MONGODB_URI),
    clientUrl: required(ENV.CLIENT_URL).replace(/\/$/, ''),
    jwtSecret: required(ENV.JWT_SECRET),
    internalApiSecret: required(ENV.INTERNAL_API_SECRET),
    apiPublicUrl: optional(ENV.API_PUBLIC_URL).replace(/\/$/, ''),
    vnpayTmnCode: optional(ENV.VNPAY_TMN_CODE),
    vnpayHashSecret: optional(ENV.VNPAY_HASH_SECRET),
    vnpayHost: optional(ENV.VNPAY_HOST),
    vnpayTestMode: optional(ENV.VNPAY_TEST_MODE) !== 'false',
  };
}

module.exports = { validateApiEnv, ENV };
