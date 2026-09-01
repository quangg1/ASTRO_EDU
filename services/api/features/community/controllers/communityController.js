const { asyncController, ok } = require('../../../shared/http');
const search = require('../services/communitySearchService');
const news = require('../services/newsService');

module.exports = asyncController({
  async search(req, res) {
    const { q, scope, forumSlug, tag, category, sort, page, limit } = req.valid.query;
    const result = await search.searchCommunityPosts({
      q,
      scope,
      forumSlug,
      tag,
      category,
      sort,
      page,
      limit,
      viewerRole: req.userRole,
      viewerDoc: req.userDoc,
    });
    return ok(res, result);
  },

  async popularTags(req, res) {
    return ok(res, { data: await search.listPopularTags({ limit: req.valid.query.limit }) });
  },

  async postsByTag(req, res) {
    const result = await search.listPostsByTag({
      tag: req.valid.params.tag,
      ...req.valid.query,
    });
    return ok(res, result);
  },

  async newsCategories(_req, res) {
    return ok(res, { data: await news.listNewsCategories() });
  },

  async listNews(req, res) {
    return ok(res, await news.listNews({ query: req.valid.query }));
  },
});
