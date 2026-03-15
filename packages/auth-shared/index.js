const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'galaxies-auth-secret-change-in-production';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

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
