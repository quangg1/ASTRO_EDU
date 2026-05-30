const { fromZonedTime } = require('date-fns-tz');

/**
 * GV nhập datetime-local theo cohort.timezone → UTC Date cho Mongo.
 * @param {string | null | undefined} localStr — "2026-05-30T16:59"
 * @param {string} [timeZone]
 */
function localDatetimeToUtcDate(localStr, timeZone = 'Asia/Ho_Chi_Minh') {
  if (!localStr || !String(localStr).trim()) return null;
  const raw = String(localStr).trim();
  const normalized = raw.length === 16 ? `${raw}:00` : raw;
  const d = fromZonedTime(normalized, timeZone);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * @param {{ lessonSlug: string, openAt?: string, dueAt?: string, closeAt?: string, openAtLocal?: string, dueAtLocal?: string, closeAtLocal?: string }} item
 * @param {string} timeZone
 */
function scheduleItemToUtcFields(item, timeZone) {
  const pick = (isoField, localField) => {
    if (item[localField]) return localDatetimeToUtcDate(item[localField], timeZone);
    if (item[isoField]) {
      const d = new Date(item[isoField]);
      return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
  };
  return {
    openAt: pick('openAt', 'openAtLocal'),
    dueAt: pick('dueAt', 'dueAtLocal'),
    closeAt: pick('closeAt', 'closeAtLocal'),
  };
}

module.exports = {
  localDatetimeToUtcDate,
  scheduleItemToUtcFields,
};
