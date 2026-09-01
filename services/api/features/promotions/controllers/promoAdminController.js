const { asyncController, ok, created } = require('../../../shared/http');
const admin = require('../services/promoAdminService');

module.exports = asyncController({
  async list(_req, res) {
    return ok(res, { data: await admin.listPromos() });
  },

  async create(req, res) {
    return created(res, { data: await admin.createPromo(req.valid.body) });
  },

  async update(req, res) {
    return ok(res, { data: await admin.updatePromo(req.valid.params.id, req.valid.body) });
  },

  async remove(req, res) {
    await admin.deletePromo(req.valid.params.id);
    return ok(res);
  },
});
