/**

 * Astronomy calendar — editorial DB + engagement.

 *

 *   GET /tonight, /upcoming, /month, /featured

 *   POST /events/:eventId/remind, /events/:eventId/check-in (auth)

 *   GET /weather

 */



const express = require('express');

const { authMiddleware, optionalAuth } = require('../../../shared/jwtAuth');

const { getTonight, getUpcoming } = require('../services/astronomyCalendarService');

const { getMonthCalendar, getFeatured } = require('../services/astronomyEventService');

const { setEventReminder, checkInEvent } = require('../services/engagementService');

const { fetchSkyWeather } = require('../lib/fetchSkyWeather');

const { resolveObserverFromQuery } = require('../lib/vnObserverPresets');



const router = express.Router();



function userIdFromReq(req) {

  return req.userId || req.user?.id || null;

}



router.get('/tonight', optionalAuth, async (req, res) => {

  try {

    const data = await getTonight(req.query, userIdFromReq(req));

    res.json({ success: true, data });

  } catch (err) {

    console.error('GET /astronomy-calendar/tonight error:', err);

    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });

  }

});



router.get('/upcoming', optionalAuth, async (req, res) => {

  try {

    const data = await getUpcoming(req.query, userIdFromReq(req));

    res.json({ success: true, data });

  } catch (err) {

    console.error('GET /astronomy-calendar/upcoming error:', err);

    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });

  }

});



router.get('/month', optionalAuth, async (req, res) => {

  try {

    const now = new Date();

    const year = req.query.year ?? now.getFullYear();

    const month = req.query.month ?? now.getMonth() + 1;

    const data = await getMonthCalendar({

      year,

      month,

      query: req.query,

      userId: userIdFromReq(req),

    });

    res.json({ success: true, data });

  } catch (err) {

    console.error('GET /astronomy-calendar/month error:', err);

    const status = err.message === 'INVALID_MONTH' ? 400 : 500;

    res.status(status).json({ success: false, error: 'Tháng không hợp lệ' });

  }

});



router.get('/featured', optionalAuth, async (req, res) => {

  try {

    const data = await getFeatured({ query: req.query, userId: userIdFromReq(req) });

    res.json({ success: true, data });

  } catch (err) {

    console.error('GET /astronomy-calendar/featured error:', err);

    res.status(500).json({ success: false, error: 'Lỗi máy chủ' });

  }

});



router.post('/events/:eventId/remind', authMiddleware, async (req, res) => {

  try {

    const data = await setEventReminder(req.userId, req.params.eventId);

    res.json({ success: true, data });

  } catch (err) {

    const code = err.code || 'ERROR';

    const status =

      code === 'NOT_FOUND' ? 404 : code === 'NOT_OBSERVABLE' || code === 'TOO_LATE' ? 400 : 500;

    res.status(status).json({ success: false, code, error: err.message });

  }

});



router.post('/events/:eventId/check-in', authMiddleware, async (req, res) => {

  try {

    const photoUrl = typeof req.body?.photoUrl === 'string' ? req.body.photoUrl.trim() : '';
    const data = await checkInEvent(req.userId, req.params.eventId, {
      photoUrl: photoUrl || undefined,
    });

    res.json({ success: true, data });

  } catch (err) {

    const code = err.code || 'ERROR';

    const status =

      code === 'NOT_FOUND'

        ? 404

        : code === 'NOT_OBSERVABLE' || code === 'OUT_OF_WINDOW' || code === 'INVALID_PHOTO'

          ? 400

          : 500;

    res.status(status).json({ success: false, code, error: err.message });

  }

});



router.get('/weather', async (req, res) => {

  try {

    const obs = resolveObserverFromQuery(req.query);

    const data = await fetchSkyWeather({ lat: obs.lat, lon: obs.lon });

    res.json({

      success: true,

      data: {

        ...data,

        observer: {

          lat: obs.lat,

          lon: obs.lon,

          labelVi: obs.labelVi,

        },

      },

    });

  } catch (err) {

    console.error('GET /astronomy-calendar/weather error:', err);

    res.status(502).json({ success: false, error: 'Không lấy được thời tiết' });

  }

});



module.exports = router;

