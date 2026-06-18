/**
 * Gán sự kiện lên lịch theo khoảng [startAt, endAt], không chỉ ngày peak.
 * Dùng múi giờ quan sát (VN +420) để khớp lưới tháng trên client.
 */

function calendarDayKey(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysInCalendarMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function localCalendarDayStart(year, month, day, tzOffsetMinutes) {
  const noonUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
  const shifted = new Date(noonUtc + tzOffsetMinutes * 60 * 1000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - tzOffsetMinutes * 60 * 1000);
}

function eventOverlapsLocalDay(eventStart, eventEnd, year, month, day, tzOffsetMinutes) {
  const dayStart = localCalendarDayStart(year, month, day, tzOffsetMinutes);
  const dayEnd = new Date(dayStart.getTime() + 86400000 - 1);
  return eventStart.getTime() <= dayEnd.getTime() && eventEnd.getTime() >= dayStart.getTime();
}

function eventOverlapsMonth(eventStart, eventEnd, year, month, tzOffsetMinutes) {
  const days = daysInCalendarMonth(year, month);
  for (let day = 1; day <= days; day += 1) {
    if (eventOverlapsLocalDay(eventStart, eventEnd, year, month, day, tzOffsetMinutes)) {
      return true;
    }
  }
  return false;
}

/** Các ô ngày (YYYY-MM-DD) trong tháng mà sự kiện còn hiệu lực. */
function dayKeysForEventInMonth(eventStart, eventEnd, year, month, tzOffsetMinutes) {
  const keys = [];
  const days = daysInCalendarMonth(year, month);
  for (let day = 1; day <= days; day += 1) {
    if (eventOverlapsLocalDay(eventStart, eventEnd, year, month, day, tzOffsetMinutes)) {
      keys.push(calendarDayKey(year, month, day));
    }
  }
  return keys;
}

module.exports = {
  calendarDayKey,
  daysInCalendarMonth,
  eventOverlapsLocalDay,
  eventOverlapsMonth,
  dayKeysForEventInMonth,
};
