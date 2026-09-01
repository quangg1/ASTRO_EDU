const { asyncController, ok } = require('../../../shared/http');
const narrative = require('../services/planetNarrativeService');

module.exports = asyncController({
  async editorDetail(req, res) {
    return ok(res, await narrative.getForEditor(req.valid.params.entityId));
  },

  async detail(req, res) {
    return ok(res, await narrative.getPublished(req.valid.params.entityId));
  },

  async save(req, res) {
    return ok(res, await narrative.save(req.valid.body));
  },
});
