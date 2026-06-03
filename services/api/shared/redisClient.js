/**
 * Optional Redis — REDIS_URL set → distributed rate limits / locks; else null.
 */
let client = null;
let connectAttempted = false;

async function getRedisClient() {
  const url = (process.env.REDIS_URL || '').trim();
  if (!url) return null;
  if (client) return client;
  if (connectAttempted) return null;
  connectAttempted = true;
  try {
    const { createClient } = require('redis');
    const c = createClient({ url });
    c.on('error', (err) => {
      console.warn('[redis]', err?.message || err);
    });
    await c.connect();
    client = c;
    console.info('[redis] connected');
    return client;
  } catch (err) {
    console.warn('[redis] unavailable, using in-memory fallbacks:', err?.message || err);
    return null;
  }
}

module.exports = { getRedisClient };
