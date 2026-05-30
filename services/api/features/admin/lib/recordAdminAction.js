const AdminActionLog = require('../models/AdminActionLog');

async function recordAdminAction({ actorUserId, action, targetType, targetId = null, reason, payload = {} }) {
  if (!actorUserId || !action || !targetType || !reason) return null;
  return AdminActionLog.create({
    actorUserId: String(actorUserId),
    action,
    targetType,
    targetId: targetId != null ? String(targetId) : null,
    reason: String(reason).trim().slice(0, 2000),
    payload,
  });
}

module.exports = { recordAdminAction };
