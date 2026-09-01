const { asyncController, ok } = require('../../../shared/http');
const showcase = require('../services/showcaseUnlockService');

module.exports = asyncController({
  async catalog(req, res) {
    return ok(res, { data: await showcase.getCatalogForUser(req.userId) });
  },

  async unlocks(req, res) {
    return ok(res, { data: await showcase.listUnlockKeys(req.userId) });
  },

  async unlock(req, res) {
    return ok(res, { data: await showcase.unlock(req.userId, req.valid.body) });
  },
});
