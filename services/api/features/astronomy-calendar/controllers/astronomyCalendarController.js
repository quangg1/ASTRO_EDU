const { asyncController, ok } = require('../../../shared/http');
const {
  getTonight,
  getUpcoming,
  getSkyWeather,
} = require('../services/astronomyCalendarService');
const { getMonthCalendar, getFeatured } = require('../services/astronomyEventService');
const { setEventReminder, checkInEvent } = require('../services/engagementService');

/** Lịch xem được khi chưa đăng nhập; có phiên thì kèm trạng thái tương tác. */
const viewerId = (req) => req.userId || req.user?.id || null;

module.exports = asyncController({
  async tonight(req, res) {
    return ok(res, { data: await getTonight(req.query, viewerId(req)) });
  },

  async upcoming(req, res) {
    return ok(res, { data: await getUpcoming(req.query, viewerId(req)) });
  },

  async month(req, res) {
    const { year, month } = req.valid.query;
    const data = await getMonthCalendar({ year, month, query: req.query, userId: viewerId(req) });
    return ok(res, { data });
  },

  async featured(req, res) {
    return ok(res, { data: await getFeatured({ query: req.query, userId: viewerId(req) }) });
  },

  async remind(req, res) {
    return ok(res, { data: await setEventReminder(req.userId, req.valid.params.eventId) });
  },

  async checkIn(req, res) {
    const data = await checkInEvent(req.userId, req.valid.params.eventId, {
      photoUrl: req.valid.body.photoUrl,
    });
    return ok(res, { data });
  },

  async weather(req, res) {
    return ok(res, { data: await getSkyWeather(req.query) });
  },
});
