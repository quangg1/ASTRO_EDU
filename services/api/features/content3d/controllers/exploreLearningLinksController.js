const { asyncController, ok } = require('../../../shared/http');
const learningLinks = require('../services/entityLearningLinksService');

module.exports = asyncController({
  async entityLinks(req, res) {
    return ok(res, { data: await learningLinks.getEntityLearningLinks(req.params.entityId) });
  },

  async coverage(_req, res) {
    return ok(res, { data: await learningLinks.getLearningLinkCoverage() });
  },
});
