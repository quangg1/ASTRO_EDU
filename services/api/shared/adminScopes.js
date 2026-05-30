const ADMIN_SCOPE_IDS = [
  'users',
  'teachers',
  'orders',
  'courses',
  'moderation',
  'gem',
  'promo',
  'broadcast',
  'analytics',
  'system',
  'audit',
];

function normalizeAdminScopes(raw) {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((s) => String(s || '').trim()).filter((s) => s === '*' || ADMIN_SCOPE_IDS.includes(s)))];
}

function isFullAdmin(userOrScopes) {
  const scopes = Array.isArray(userOrScopes)
    ? userOrScopes
    : userOrScopes?.adminScopes || [];
  if (!scopes.length) return true;
  return scopes.includes('*');
}

function hasAdminScope(userOrScopes, scope) {
  if (!scope) return true;
  const scopes = Array.isArray(userOrScopes)
    ? userOrScopes
    : userOrScopes?.adminScopes || [];
  if (isFullAdmin(scopes)) return true;
  return scopes.includes(scope);
}

function requireAdminScope(...scopes) {
  return (req, res, next) => {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Không có quyền truy cập' });
    }
    if (scopes.length === 0) return next();
    const userScopes = req.userDoc?.adminScopes || [];
    if (isFullAdmin(userScopes)) return next();
    if (scopes.some((s) => userScopes.includes(s))) return next();
    return res.status(403).json({
      success: false,
      code: 'ADMIN_SCOPE_FORBIDDEN',
      error: 'Không có quyền trong phạm vi quản trị này',
    });
  };
}

function requireFullAdmin() {
  return (req, res, next) => {
    if (req.userRole !== 'admin') {
      return res.status(403).json({ success: false, error: 'Không có quyền truy cập' });
    }
    if (!isFullAdmin(req.userDoc?.adminScopes || [])) {
      return res.status(403).json({
        success: false,
        code: 'FULL_ADMIN_REQUIRED',
        error: 'Chỉ admin toàn quyền mới thực hiện được thao tác này',
      });
    }
    next();
  };
}

module.exports = {
  ADMIN_SCOPE_IDS,
  normalizeAdminScopes,
  isFullAdmin,
  hasAdminScope,
  requireAdminScope,
  requireFullAdmin,
};
