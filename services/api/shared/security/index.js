const { applyPlatformSecurity } = require('./applyPlatformSecurity');
const { securityAuditMiddleware, recordSecurityEvent } = require('./securityAudit');
const { applyLearningPathLearnerPolicy, redactLearningPathModules } = require('./learnerContentPolicy');

module.exports = {
  applyPlatformSecurity,
  securityAuditMiddleware,
  recordSecurityEvent,
  applyLearningPathLearnerPolicy,
  redactLearningPathModules,
};
