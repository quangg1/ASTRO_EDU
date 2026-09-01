const { AppError } = require('../../../shared/errors');
const { buildCalendarFromDb, ensurePublishedSeed } = require('./astronomyEventService');
const { resolveObserverFromQuery } = require('../lib/vnObserverPresets');
const { fetchSkyWeather } = require('../lib/fetchSkyWeather');

/** Cửa sổ tra cứu bị kẹp lại: dưới 7 ngày thì rỗng, trên 365 ngày thì vô nghĩa. */
function parseDays(raw, fallback = 90) {
  const days = Number(raw);
  if (!Number.isFinite(days)) return fallback;
  return Math.max(7, Math.min(365, Math.floor(days)));
}

async function getTonight(query, userId = null) {
  await ensurePublishedSeed();
  return buildCalendarFromDb({ query, tonightOnly: true, userId });
}

async function getUpcoming(query, userId = null) {
  await ensurePublishedSeed();
  return buildCalendarFromDb({ query, days: parseDays(query.days, 90), userId });
}

/** Thời tiết đến từ dịch vụ ngoài nên hỏng của họ phải hiện thành 502, không phải 500. */
async function getSkyWeather(query) {
  const observer = resolveObserverFromQuery(query);
  try {
    const weather = await fetchSkyWeather({ lat: observer.lat, lon: observer.lon });
    return {
      ...weather,
      observer: { lat: observer.lat, lon: observer.lon, labelVi: observer.labelVi },
    };
  } catch (err) {
    throw new AppError(502, 'SKY_WEATHER_UNAVAILABLE', 'Không lấy được thời tiết', {
      cause: err.message,
    });
  }
}

module.exports = {
  getTonight,
  getUpcoming,
  getSkyWeather,
  ensurePublishedSeed,
};
