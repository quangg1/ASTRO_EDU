const { asyncController, ok } = require('../../../../shared/http');
const earthHistory = require('../services/earthHistoryService');

const withCount = (data) => ({ count: data.length, data });

module.exports = asyncController({
  async list(_req, res) {
    return ok(res, withCount(await earthHistory.listStages()));
  },

  async detail(req, res) {
    return ok(res, { data: await earthHistory.getStage(req.valid.params.id) });
  },

  async listByEon(req, res) {
    return ok(res, withCount(await earthHistory.listByEon(req.valid.params.eon)));
  },

  async listByTimeRange(req, res) {
    const { start, end } = req.valid.query;
    return ok(res, withCount(await earthHistory.listByTimeRange(start, end)));
  },

  async listExtinctions(_req, res) {
    return ok(res, withCount(await earthHistory.listExtinctionEvents()));
  },

  async summary(_req, res) {
    return ok(res, withCount(await earthHistory.listSummary()));
  },

  async stats(_req, res) {
    return ok(res, { data: await earthHistory.getStats() });
  },

  async replaceStages(req, res) {
    return ok(res, withCount(await earthHistory.replaceStages(req.valid.body.stages)));
  },
});
