/** Header dùng chung API → microservice (AI, embedding). */

const HEADER = 'x-internal-secret';

function internalServiceHeaders() {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret || !String(secret).trim()) return {};
  return { [HEADER]: String(secret).trim() };
}

module.exports = { HEADER, internalServiceHeaders };
