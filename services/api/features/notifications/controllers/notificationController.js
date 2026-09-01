const { asyncController, ok } = require('../../../shared/http');
const inbox = require('../services/notificationInboxService');

module.exports = asyncController({
  async list(req, res) {
    const { limit, unreadOnly } = req.valid.query;
    return ok(res, { data: await inbox.listInbox(req.userId, { limit, unreadOnly }) });
  },

  async unreadCount(req, res) {
    return ok(res, { data: await inbox.countUnread(req.userId) });
  },

  async markRead(req, res) {
    await inbox.markRead(req.userId, req.valid.params.id);
    return ok(res);
  },

  async markAllRead(req, res) {
    await inbox.markAllRead(req.userId);
    return ok(res);
  },
});
