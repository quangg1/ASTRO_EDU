const { asyncController, ok } = require('../../../shared/http');
const jpl = require('../services/showcaseOrbitJplService');

module.exports = asyncController({
  async listFromJpl(req, res) {
    const { when, includeParents } = req.valid.query;
    return ok(res, { data: await jpl.fetchAllOrbits({ when, includeParents }) });
  },

  async syncEntity(req, res) {
    const { entityId, when, ...overrides } = req.valid.body;
    return ok(res, { data: await jpl.syncEntity({ entityId, when, overrides }) });
  },
});
