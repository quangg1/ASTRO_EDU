const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireAdminScope } = require('../../../shared/adminScopes');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/adminSchemas');
const analytics = require('../controllers/adminAnalyticsController');

const router = express.Router();

// Every analytics endpoint is read-only and gated on the same scope.
router.use(authMiddleware, requireAdminScope('analytics'));

const withRange = (defaultRange) => validate({ query: schema.rangeQuery(defaultRange) });

router.get('/overview', withRange(), analytics.overview);
router.get('/funnel', withRange(), analytics.funnel);
router.get('/retention', withRange(), analytics.retention);
router.get('/cohort', withRange('90d'), analytics.signupCohorts);
router.get('/agent', withRange(), analytics.agent);
router.get('/explore', withRange(), analytics.explore);
router.get('/unified-learner', withRange(), analytics.unifiedLearner);
router.get(
  '/learning-path',
  validate({ query: schema.learningPathAnalyticsQuery }),
  analytics.learningPath,
);

module.exports = router;
