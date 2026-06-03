const { startOfDay } = require('date-fns');
const { fromZonedTime, toZonedTime } = require('date-fns-tz');
const { format } = require('date-fns');

const DEFAULT_TZ = 'Asia/Ho_Chi_Minh';

/** Calendar day in Vietnam (YYYY-MM-DD) for daily Explore quiz / gem caps. */
function calendarDayKeyVi(date = new Date(), timeZone = DEFAULT_TZ) {
  return format(toZonedTime(date, timeZone), 'yyyy-MM-dd');
}

/** UTC instant of 00:00:00 on the current calendar day in Vietnam. */
function startOfCalendarDayVi(date = new Date(), timeZone = DEFAULT_TZ) {
  const zoned = toZonedTime(date, timeZone);
  const sod = startOfDay(zoned);
  return fromZonedTime(sod, timeZone);
}

module.exports = {
  DEFAULT_TZ,
  calendarDayKeyVi,
  startOfCalendarDayVi,
};
