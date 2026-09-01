const { asyncController, ok } = require('../../../shared/http');
const courseEvents = require('../services/courseEventService');

module.exports = asyncController({
  async recordBatch(req, res) {
    const data = await courseEvents.recordBatch({
      slug: req.params.slug,
      userId: req.userId || null,
      events: req.valid.body.events,
    });
    return ok(res, { data });
  },
});
