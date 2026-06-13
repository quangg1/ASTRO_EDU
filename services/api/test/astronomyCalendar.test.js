const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { generateCalendarEvents } = require('../features/astronomy-calendar/lib/generateCalendarEvents');
const { inferEventKind, rawComputeToDocFields } = require('../features/astronomy-calendar/services/astronomyEventService');

describe('astronomy calendar generator', () => {
  it('produces moon phases and meteor showers in 90-day window', () => {
    const start = new Date('2026-06-01T00:00:00.000Z');
    const end = new Date('2026-08-30T00:00:00.000Z');
    const events = generateCalendarEvents({
      start,
      end,
      now: start,
      observer: { lat: 21.03, lon: 105.85, tzOffsetMinutes: 420 },
      includeTonightPlanets: false,
    });
    assert.ok(events.some((e) => e.type === 'moon_phase'));
    assert.ok(events.some((e) => e.type === 'meteor_shower' && e.id.includes('perseids')));
  });

  it('maps compute events to editorial fields', () => {
    const raw = {
      id: 'perseids-2026',
      type: 'meteor_shower',
      source: 'catalog:iau-meteors',
      titleVi: 'Mưa sao băng Perseids',
      summaryVi: 'Đỉnh tháng 8',
      startAt: new Date('2026-08-07T00:00:00.000Z'),
      endAt: new Date('2026-08-17T00:00:00.000Z'),
      peakAt: new Date('2026-08-12T12:00:00.000Z'),
      exploreView: 'sky',
      exploreTarget: 'perseus',
      priority: 9,
    };
    const fields = rawComputeToDocFields(raw, { status: 'published' });
    assert.equal(fields.eventKind, 'observable');
    assert.equal(fields.computeId, 'perseids-2026');
    assert.equal(fields.status, 'published');
  });

  it('classifies educational moon phases', () => {
    const newMoon = {
      type: 'moon_phase',
      exploreView: null,
      lessonHref: '/tutorial/foo',
    };
    assert.equal(inferEventKind(newMoon), 'educational');
  });

  it('moon phases link to sky or lesson by quarter', () => {
    const start = new Date('2026-06-01T00:00:00.000Z');
    const end = new Date('2026-08-30T00:00:00.000Z');
    const events = generateCalendarEvents({
      start,
      end,
      now: start,
      observer: { lat: 21.03, lon: 105.85, tzOffsetMinutes: 420 },
      includeTonightPlanets: false,
    });
    const phases = events.filter((e) => e.type === 'moon_phase');
    assert.ok(phases.some((e) => e.exploreView === 'sky' && e.exploreTarget === 'planet-moon'));
    const newMoon = phases.find((e) => e.titleVi === 'Trăng non');
    if (newMoon) {
      assert.equal(newMoon.exploreView, null);
      assert.ok(typeof newMoon.lessonHref === 'string');
    }
  });
});
