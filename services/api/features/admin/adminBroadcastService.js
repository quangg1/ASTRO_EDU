const { listActiveUserIds } = require('../auth/services/userDirectoryService');
const { createAdminBroadcastNotifications } = require('../notifications/services/notificationService');

const VALID_ROLES = ['student', 'teacher', 'moderator', 'admin'];

/**
 * @param {{ titleVi: string, bodyVi?: string, href?: string|null, roles?: string[]|null }}
 */
async function broadcastAdminNotification({ titleVi, bodyVi, href, roles }) {
  const roleList = Array.isArray(roles)
    ? roles.map((r) => String(r).trim()).filter((r) => VALID_ROLES.includes(r))
    : [];

  const userIds = await listActiveUserIds({ roles: roleList.length ? roleList : undefined });
  if (!userIds.length) {
    return { recipientCount: 0 };
  }

  return createAdminBroadcastNotifications({
    userIds,
    titleVi,
    bodyVi,
    href,
    metadata: { roles: roleList.length ? roleList : ['all'] },
  });
}

module.exports = { broadcastAdminNotification, VALID_ROLES };
