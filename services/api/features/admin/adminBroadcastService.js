const User = require('../auth/models/User');
const Notification = require('../notifications/models/Notification');
const { pushNotificationRealtime } = require('../notifications/services/notificationService');

const VALID_ROLES = ['student', 'teacher', 'moderator', 'admin'];
const BATCH = 200;

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/**
 * @param {{ titleVi: string, bodyVi?: string, href?: string|null, roles?: string[]|null }}
 */
async function broadcastAdminNotification({ titleVi, bodyVi, href, roles }) {
  const filter = { accountStatus: 'active' };
  const roleList = Array.isArray(roles)
    ? roles.map((r) => String(r).trim()).filter((r) => VALID_ROLES.includes(r))
    : [];
  if (roleList.length) filter.role = { $in: roleList };

  const users = await User.find(filter).select('_id').lean();
  const userIds = users.map((u) => String(u._id));
  if (!userIds.length) {
    return { recipientCount: 0 };
  }

  const title = String(titleVi || '').trim() || 'Thông báo';
  const body = String(bodyVi || '').trim();
  const link = href ? String(href).trim() : null;

  let sent = 0;
  for (const batch of chunk(userIds, BATCH)) {
    const docs = await Notification.insertMany(
      batch.map((userId) => ({
        userId,
        type: 'admin_broadcast',
        titleVi: title,
        bodyVi: body,
        href: link,
        metadata: { roles: roleList.length ? roleList : ['all'] },
      })),
      { ordered: false },
    );
    sent += docs.length;
    for (const doc of docs) {
      pushNotificationRealtime(doc);
    }
  }

  return { recipientCount: sent };
}

module.exports = { broadcastAdminNotification, VALID_ROLES };
