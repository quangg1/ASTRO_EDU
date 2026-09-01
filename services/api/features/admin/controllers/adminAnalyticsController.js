const { asyncController, ok } = require('../../../shared/http');
const platform = require('../services/analytics/platformAnalyticsService');
const { getLearningPathAnalytics } = require('../services/analytics/learningPathAnalyticsService');
const { getExploreAnalytics } = require('../services/exploreAnalyticsService');
const { getUnifiedLearnerAnalytics } = require('../services/unifiedLearnerAnalyticsService');
const { resolveRange } = require('../services/analytics/analyticsRange');

module.exports = asyncController({
  async overview(req, res) {
    return ok(res, await platform.getPlatformOverview(req.valid.query.range));
  },

  async funnel(req, res) {
    return ok(res, await platform.getAcquisitionFunnel(req.valid.query.range));
  },

  async retention(req, res) {
    return ok(res, await platform.getRetention(req.valid.query.range));
  },

  async signupCohorts(req, res) {
    return ok(res, await platform.getSignupCohorts(req.valid.query.range));
  },

  async learningPath(req, res) {
    const { range, moduleId, depth } = req.valid.query;
    return ok(res, await getLearningPathAnalytics({ range, moduleId, depth }));
  },

  async explore(req, res) {
    const { range, startDate } = resolveRange(req.valid.query.range);
    return ok(res, { range, ...(await getExploreAnalytics(startDate)) });
  },

  async unifiedLearner(req, res) {
    const { range, startDate } = resolveRange(req.valid.query.range);
    return ok(res, { range, ...(await getUnifiedLearnerAnalytics(startDate)) });
  },

  async agent(req, res) {
    // Required lazily: the agent feature pulls in a large dependency graph that
    // most admin requests never touch.
    const { getAgentAdminAnalytics } = require('../../agent/services/adminAgentAnalyticsService');
    return ok(res, await getAgentAdminAnalytics({ range: req.valid.query.range }));
  },
});
