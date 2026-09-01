const express = require('express');
const { optionalAuth } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const { courseEventsLimiter } = require('../../../shared/security/rateLimiters');
const schema = require('../schemas/deliverySchemas');
const courseEvents = require('../controllers/courseEventController');

const router = express.Router({ mergeParams: true });

router.post(
  '/:slug/events/batch',
  courseEventsLimiter,
  optionalAuth,
  validate({ body: schema.eventBatchBody }),
  courseEvents.recordBatch,
);

module.exports = router;
