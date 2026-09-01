const { BaseRepository } = require('../../../shared/db/BaseRepository');
const Notification = require('../models/Notification');

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  listInbox(userId, { limit, unreadOnly }) {
    const filter = unreadOnly ? { userId, readAt: null } : { userId };
    return this.findMany(filter, { sort: { createdAt: -1 }, limit });
  }

  countUnread(userId) {
    return this.count({ userId, readAt: null });
  }

  /** Lọc kèm userId để không ai đánh dấu đã đọc thông báo của người khác. */
  markRead({ notificationId, userId, readAt }) {
    return this.updateOne({ _id: notificationId, userId }, { readAt }, { runValidators: false });
  }

  markAllRead(userId, readAt) {
    return this.updateMany({ userId, readAt: null }, { readAt });
  }
}

module.exports = { notificationRepository: new NotificationRepository() };
