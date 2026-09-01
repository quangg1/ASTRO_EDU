const { asyncController, ok } = require('../../../shared/http');
const { broadcastAdminNotification } = require('../adminBroadcastService');
const { getAdminSystemStatus, triggerAdminNewsCrawl } = require('../services/adminSystemService');
const { listAdminAuditLog } = require('../services/adminAuditService');
const { getModerationQueue } = require('../../community/services/moderationService');

module.exports = asyncController({
  async broadcastNotification(req, res) {
    const data = await broadcastAdminNotification(req.valid.body);
    return ok(res, { data });
  },

  async systemStatus(_req, res) {
    return ok(res, { data: await getAdminSystemStatus() });
  },

  async runNewsCrawl(req, res) {
    const data = await triggerAdminNewsCrawl({
      actorUserId: req.userId,
      reason: req.valid.body.reason,
    });
    return ok(res, { data });
  },

  async auditLog(req, res) {
    return ok(res, { data: await listAdminAuditLog(req.valid.query) });
  },

  async moderationQueue(req, res) {
    return ok(res, { data: await getModerationQueue(req.valid.query) });
  },
});
