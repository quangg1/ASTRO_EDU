/** Chỉ moderator — không gồm admin (admin dùng override riêng). */
function isModerator(role) {
  return role === 'moderator';
}

function isAdmin(role) {
  return role === 'admin';
}

function canAccessModTools(role) {
  return isModerator(role);
}

function canAccessModToolsOrAdminOverride(role) {
  return isModerator(role) || isAdmin(role);
}

/** Lọc nội dung ẩn khỏi người xem thường. */
function publicVisibilityFilter(viewerRole) {
  if (canAccessModToolsOrAdminOverride(viewerRole)) return {};
  return { isHidden: { $ne: true } };
}

module.exports = {
  isModerator,
  isAdmin,
  canAccessModTools,
  canAccessModToolsOrAdminOverride,
  publicVisibilityFilter,
};
