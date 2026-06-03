const test = require('node:test');
const assert = require('node:assert/strict');
const { calendarDayKeyVi, startOfCalendarDayVi } = require('../shared/calendarDayKey');

test('calendarDayKeyVi uses Asia/Ho_Chi_Minh day boundary', () => {
  const lateUtc = new Date('2026-06-01T20:00:00.000Z');
  assert.equal(calendarDayKeyVi(lateUtc), '2026-06-02');
});

test('startOfCalendarDayVi is before same-day afternoon VN', () => {
  const afternoon = new Date('2026-06-02T08:00:00.000Z');
  const start = startOfCalendarDayVi(afternoon);
  assert.ok(start < afternoon);
  assert.equal(calendarDayKeyVi(start), calendarDayKeyVi(afternoon));
});
