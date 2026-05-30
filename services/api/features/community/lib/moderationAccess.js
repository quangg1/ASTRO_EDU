const { hasAdminScope } = require('../../../shared/adminScopes');

/** Chỉ moderator — không gồm admin (admin dùng override riêng). */
function isModerator(role) {
  return role === 'moderator';
}

function isAdmin(role) {
  return role === 'admin';
}

function adminHasModerationScope(userDoc) {
  return userDoc?.role === 'admin' && hasAdminScope(userDoc, 'moderation');
}

/** Admin có phạm vi moderation hoặc moderator — dùng hub kiểm duyệt. */
function canAccessModTools(role, userDoc) {
  if (isModerator(role)) return true;
  return adminHasModerationScope(userDoc);
}

function canAccessModToolsOrAdminOverride(role, userDoc) {
  return canAccessModTools(role, userDoc);
}

/** Lọc nội dung ẩn khỏi người xem thường. */
function publicVisibilityFilter(viewerRole, userDoc) {
  if (isModerator(viewerRole)) return {};
  if (isAdmin(viewerRole) && !userDoc) return {};
  if (canAccessModToolsOrAdminOverride(viewerRole, userDoc)) return {};
  return { isHidden: { $ne: true } };
}

module.exports = {
  isModerator,
  isAdmin,
  canAccessModTools,
  canAccessModToolsOrAdminOverride,
  publicVisibilityFilter,
};
