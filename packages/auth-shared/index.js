const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!SECRET || !String(SECRET).trim()) {
  throw new Error('Thiếu biến môi trường bắt buộc: JWT_SECRET');
}

function verifyToken(token) {
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

function issueToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
}

module.exports = { verifyToken, issueToken, SECRET, EXPIRES_IN };
