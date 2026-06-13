const {

  buildCalendarFromDb,

  ensurePublishedSeed,

} = require('./astronomyEventService');



function parseDays(raw, fallback = 90) {

  const n = Number(raw);

  if (!Number.isFinite(n)) return fallback;

  return Math.max(7, Math.min(365, Math.floor(n)));

}



async function getTonight(query, userId = null) {

  await ensurePublishedSeed();

  return buildCalendarFromDb({ query, tonightOnly: true, userId });

}



async function getUpcoming(query, userId = null) {

  await ensurePublishedSeed();

  const days = parseDays(query.days, 90);

  return buildCalendarFromDb({ query, days, userId });

}



module.exports = {

  getTonight,

  getUpcoming,

  ensurePublishedSeed,

};

