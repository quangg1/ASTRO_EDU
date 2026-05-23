const { validateApiEnv } = require('./env');

let cached;

function getRuntimeEnv() {
  if (!cached) cached = validateApiEnv();
  return cached;
}

module.exports = { getRuntimeEnv };
