const { AppError } = require('../../../shared/errors');
const { notificationRepository } = require('../repositories/notificationRepository');
const { notificationToClientDto } = require('../lib/notificationDto');

async function listInbox(userId, { limit, unreadOnly }) {
  const rows = await notificationRepository.listInbox(userId, { limit, unreadOnly });
  return rows.map(notificationToClientDto);
}

async function countUnread(userId) {
  return { count: await notificationRepository.countUnread(userId) };
}

async function markRead(userId, notificationId) {
  const row = await notificationRepository.markRead({
    notificationId,
    userId,
    readAt: new Date(),
  });
  if (!row) throw AppError.notFound('Không tìm thấy');
}

async function markAllRead(userId) {
  await notificationRepository.markAllRead(userId, new Date());
}

module.exports = { listInbox, countUnread, markRead, markAllRead };
