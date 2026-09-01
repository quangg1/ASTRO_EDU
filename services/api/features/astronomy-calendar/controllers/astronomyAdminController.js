const { asyncController, ok, created } = require('../../../shared/http');
const admin = require('../services/astronomyEventAdminService');

module.exports = asyncController({
  async listEvents(_req, res) {
    return ok(res, { data: await admin.listEvents() });
  },

  async createEvent(req, res) {
    return created(res, { data: await admin.createEvent(req.valid.body, req.userId) });
  },

  async updateEvent(req, res) {
    const data = await admin.updateEvent(req.valid.params.id, req.valid.body, req.userId);
    return ok(res, { data });
  },

  async publishEvent(req, res) {
    return ok(res, { data: await admin.publishEvent(req.valid.params.id, req.userId) });
  },

  async deleteEvent(req, res) {
    await admin.deleteEvent(req.valid.params.id);
    return ok(res);
  },

  async importSuggestions(req, res) {
    const data = await admin.importSuggestions({ ...req.valid.body, actorUserId: req.userId });
    return ok(res, { data });
  },

  async listTypeKits(_req, res) {
    return ok(res, { data: await admin.listEventTypeKits() });
  },

  async updateTypeKit(req, res) {
    const data = await admin.saveTypeKit(req.valid.params.type, req.body, req.userId);
    return ok(res, { data });
  },
});
