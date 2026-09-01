const { asyncController, ok } = require('../../../shared/http');
const concepts = require('../services/conceptService');

module.exports = asyncController({
  async listPublished(_req, res) {
    return ok(res, { data: { concepts: await concepts.listPublishedConcepts() } });
  },

  async listForEditor(_req, res) {
    return ok(res, { data: { concepts: await concepts.listAllConcepts() } });
  },

  async replace(req, res) {
    return ok(res, { data: { concepts: await concepts.replaceConcepts(req.body?.concepts) } });
  },

  async taxonomy(_req, res) {
    return ok(res, { data: { taxonomy: await concepts.getTaxonomy() } });
  },

  async replaceTaxonomy(req, res) {
    return ok(res, { data: { taxonomy: await concepts.replaceTaxonomy(req.body?.taxonomy) } });
  },
});
