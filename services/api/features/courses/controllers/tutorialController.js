const { asyncController, ok, created } = require('../../../shared/http');
const tutorials = require('../services/tutorialService');

module.exports = asyncController({
  async listCategories(_req, res) {
    return ok(res, { data: await tutorials.listCategories() });
  },

  async listTracks(_req, res) {
    return ok(res, { data: await tutorials.listTracks() });
  },

  async list(req, res) {
    return ok(res, { data: await tutorials.listPublished(req.valid.query) });
  },

  async detail(req, res) {
    return ok(res, { data: await tutorials.getPublished(req.params.slug) });
  },

  async trackProgress(req, res) {
    const data = await tutorials.getTrackProgress({
      slug: req.params.slug,
      userId: req.userId,
    });
    return ok(res, { data });
  },

  async markCompleted(req, res) {
    const data = await tutorials.markCompleted({ slug: req.params.slug, userId: req.userId });
    return ok(res, { data });
  },

  async editorList(req, res) {
    const data = await tutorials.listForEditor({
      userId: req.userId,
      userRole: req.userRole,
    });
    return ok(res, { data });
  },

  async editorDetail(req, res) {
    const data = await tutorials.getForEditor({
      slug: req.params.slug,
      userId: req.userId,
      userRole: req.userRole,
    });
    return ok(res, { data });
  },

  async create(req, res) {
    const data = await tutorials.createTutorial({
      input: req.valid.body,
      userId: req.userId,
      userRole: req.userRole,
    });
    return created(res, { data });
  },

  async update(req, res) {
    const data = await tutorials.updateTutorial({
      slug: req.params.slug,
      input: req.valid.body,
      userId: req.userId,
      userRole: req.userRole,
    });
    return ok(res, { data });
  },

  async remove(req, res) {
    await tutorials.deleteTutorial(req.params.slug);
    return ok(res);
  },
});
