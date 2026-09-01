const { asyncController, ok } = require('../../../shared/http');
const skyTargets = require('../services/skyTargetService');

module.exports = asyncController({
  /** Endpoint công khai trả thẳng payload seed, không bọc envelope. */
  async publicCatalog(_req, res) {
    return res.json(await skyTargets.getPublicCatalog());
  },

  async editorCatalog(_req, res) {
    return ok(res, { data: await skyTargets.getEditorCatalog() });
  },

  async save(req, res) {
    return ok(res, { data: await skyTargets.saveEditorItems(req.valid.body.items) });
  },
});
