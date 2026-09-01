const { asyncController, ok } = require('../../../shared/http');
const catalog = require('../services/showcaseCatalogService');

module.exports = asyncController({
  async detail(_req, res) {
    return ok(res, { data: await catalog.getBundle() });
  },

  async replace(req, res) {
    return ok(res, { data: await catalog.replaceBundle(req.valid.body) });
  },
});
