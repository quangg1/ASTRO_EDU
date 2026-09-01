const { asyncController, ok } = require('../../../../shared/http');
const fossils = require('../services/fossilService');
const phyla = require('../services/phylumService');

module.exports = asyncController({
  async byTime(req, res) {
    const { maxMa, minMa, limit, locale } = req.valid.query;
    return ok(res, await fossils.listByTimeRange({ maxMa, minMa, limit, locale }));
  },

  async search(req, res) {
    const { q, limit, locale, maxMa, minMa } = req.valid.query;
    return ok(res, await fossils.search({ query: q, limit, locale, maxMa, minMa }));
  },

  async stats(_req, res) {
    return ok(res, { data: await fossils.getStats() });
  },

  async forStage(req, res) {
    const { limit, locale } = req.valid.query;
    return ok(
      res,
      await fossils.listForStage({ stageId: req.valid.params.stageId, limit, locale }),
    );
  },

  async phylumMetadata(req, res) {
    return ok(res, { data: await phyla.getMetadataByPhylum(req.valid.query.locale) });
  },
});
