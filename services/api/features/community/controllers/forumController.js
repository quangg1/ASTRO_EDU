const { asyncController, ok, created } = require('../../../shared/http');
const { toViewer } = require('../http/viewer');
const forumService = require('../services/forumService');

module.exports = asyncController({
  async list(_req, res) {
    return ok(res, { data: await forumService.listPublicForums() });
  },

  async detail(req, res) {
    const data = await forumService.getForum({
      slug: req.params.slug,
      viewer: toViewer(req),
    });
    return ok(res, { data });
  },

  async listPosts(req, res) {
    const result = await forumService.listForumPosts({
      slug: req.params.slug,
      viewer: toViewer(req),
      query: req.valid.query,
    });
    return ok(res, result);
  },

  async createPost(req, res) {
    const { post, gemReward } = await forumService.createForumPost({
      slug: req.params.slug,
      viewer: toViewer(req),
      input: req.valid.body,
    });
    return created(res, { data: post, gemReward });
  },
});
