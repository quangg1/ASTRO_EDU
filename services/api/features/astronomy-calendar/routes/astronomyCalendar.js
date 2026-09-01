/**
 * Lịch thiên văn công khai.
 *
 *   GET  /tonight, /upcoming, /month, /featured, /weather
 *   POST /events/:eventId/remind, /events/:eventId/check-in  (cần đăng nhập)
 */
const express = require('express');
const { authMiddleware, optionalAuth } = require('../../../shared/jwtAuth');
const { validate } = require('../../../shared/http');
const schema = require('../schemas/astronomySchemas');
const calendar = require('../controllers/astronomyCalendarController');

const router = express.Router();

router.get('/tonight', optionalAuth, calendar.tonight);
router.get('/upcoming', optionalAuth, calendar.upcoming);
router.get('/month', optionalAuth, validate({ query: schema.monthQuery }), calendar.month);
router.get('/featured', optionalAuth, calendar.featured);
router.get('/weather', calendar.weather);

router.post(
  '/events/:eventId/remind',
  authMiddleware,
  validate({ params: schema.eventIdParams }),
  calendar.remind,
);

router.post(
  '/events/:eventId/check-in',
  authMiddleware,
  validate({ params: schema.eventIdParams, body: schema.checkInBody }),
  calendar.checkIn,
);

module.exports = router;
