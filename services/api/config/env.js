function required(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${name}`);
  }
  return value;
}

function optional(name, fallback) {
  const value = process.env[name];
  return value && String(value).trim() ? value : fallback;
}

function validateApiEnv() {
  return {
    port: Number(optional('PORT', '3002')),
    mongodbUri: required('MONGODB_URI'),
    clientUrl: required('CLIENT_URL'),
    jwtSecret: required('JWT_SECRET'),
    internalApiSecret: required('INTERNAL_API_SECRET'),
    vnpayHashSecret: optional('VNPAY_HASH_SECRET', ''),
    apiBaseUrl: optional('API_BASE_URL', ''),
  };
}

module.exports = { validateApiEnv };
