const express = require('express');
const { authMiddleware } = require('../../../shared/jwtAuth');
const { requireAdminScope } = require('../../../shared/adminScopes');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/adminSchemas');
const operations = require('../controllers/adminOperationsController');

const router = express.Router();

router.post(
  '/notifications/broadcast',
  authMiddleware,
  requireAdminScope('broadcast'),
  validate({ body: schema.broadcastBody }),
  operations.broadcastNotification,
);

router.get('/system/status', authMiddleware, requireAdminScope('system'), operations.systemStatus);

router.post(
  '/system/news-crawl',
  authMiddleware,
  requireAdminScope('system'),
  validate({ body: schema.reasonBody }),
  operations.runNewsCrawl,
);

router.get(
  '/audit-log',
  authMiddleware,
  requireAdminScope('audit'),
  validate({ query: schema.auditLogQuery }),
  operations.auditLog,
);

router.get(
  '/moderation/queue',
  authMiddleware,
  requireAdminScope('moderation'),
  validate({ query: schema.moderationQueueQuery }),
  operations.moderationQueue,
);

module.exports = router;
