const { verifyToken } = require('@galaxies/auth-shared');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ success: false, error: 'Thiếu token' });
  }
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Token không hợp lệ hoặc đã hết hạn' });
  }
  req.userId = payload.sub;
  req.user = payload;
  req.userRole = payload.role || 'student';
  next();
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.sub;
      req.user = payload;
      req.userRole = payload.role || 'student';
    }
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ success: false, error: 'Không có quyền truy cập' });
    }
    next();
  };
}

module.exports = { authMiddleware, optionalAuth, requireRole };
