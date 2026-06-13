/**
 * Sinh sự kiện lịch thiên văn — computed (astronomy-engine) + catalog (IAU meteors).
 */

const path = require('path');
const {
  Body,
  Equator,
  Horizon,
  Observer,
  SearchMoonQuarter,
  NextMoonQuarter,
  SearchLunarEclipse,
  NextLunarEclipse,
  SearchLocalSolarEclipse,
  NextLocalSolarEclipse,
  MakeTime,
} = require('astronomy-engine');

const meteorCatalog = require('../data/meteorShowers.json');

const MOON_PHASE_VI = ['Trăng non', 'Trăng khuyết đầu', 'Trăng tròn', 'Trăng khuyết cuối'];

const LUNAR_ECLIPSE_VI = {
  penumbral: 'Nguyệt thực bán nguyệt',
  partial: 'Nguyệt thực một phần',
  total: 'Nguyệt thực toàn phần',
};

const SOLAR_ECLIPSE_VI = {
  partial: 'Nhật thực một phần',
  annular: 'Nhật thực hình nhẫn',
  total: 'Nhật thực toàn phần',
};

const EVENING_PLANETS = [
  { body: Body.Venus, exploreTarget: 'planet-venus', nameVi: 'Sao Kim' },
  { body: Body.Mars, exploreTarget: 'planet-mars', nameVi: 'Sao Hỏa' },
  { body: Body.Jupiter, exploreTarget: 'planet-jupiter', nameVi: 'Sao Mộc' },
  { body: Body.Saturn, exploreTarget: 'planet-saturn', nameVi: 'Sao Thổ' },
  { body: Body.Mercury, exploreTarget: 'planet-mercury', nameVi: 'Sao Thủy' },
];

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function localCalendarDayStart(date, tzOffsetMinutes) {
  const shifted = new Date(date.getTime() + tzOffsetMinutes * 60 * 1000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - tzOffsetMinutes * 60 * 1000);
}

function localTimeOnDay(dayStartUtc, hourLocal, minuteLocal, tzOffsetMinutes) {
  const localMidnightUtc = dayStartUtc.getTime();
  const offsetMs = tzOffsetMinutes * 60 * 1000;
  const localMs = localMidnightUtc + offsetMs;
  const targetLocal = new Date(localMs);
  targetLocal.setUTCHours(hourLocal, minuteLocal, 0, 0);
  return new Date(targetLocal.getTime() - offsetMs);
}

function generateMoonPhaseEvents(start, end) {
  const events = [];
  let mq = SearchMoonQuarter(start);
  const guard = 200;
  let n = 0;
  while (mq.time.date <= end && n < guard) {
    const peak = mq.time.date;
    if (peak >= start) {
      const titleVi = MOON_PHASE_VI[mq.quarter] || 'Pha trăng';
      const isNewMoon = mq.quarter === 0;
      const isFullMoon = mq.quarter === 2;
      events.push({
        id: `moon-q${mq.quarter}-${peak.toISOString().slice(0, 10)}`,
        type: 'moon_phase',
        source: 'computed:astronomy-engine',
        titleVi,
        summaryVi: isNewMoon
          ? `${titleVi} — Mặt Trăng gần như không quan sát được; xem giải thích trên La bàn hoặc bài pha trăng.`
          : isFullMoon
            ? `${titleVi} — Mở La bàn để xem Mặt Trăng tròn theo giờ và pha.`
            : `${titleVi} — Xem pha trăng trên La bàn Sky (Mặt Trời / Mặt Trăng theo thời gian).`,
        startAt: peak,
        endAt: peak,
        peakAt: peak,
        exploreView: isNewMoon ? null : 'sky',
        exploreTarget: isNewMoon ? null : 'planet-moon',
        lessonHref: isNewMoon
          ? '/tutorial/sky-motion/moon-phases/sky-motion__moon-phases__beginner__0'
          : null,
        priority: isFullMoon ? 8 : isNewMoon ? 4 : 5,
      });
    }
    mq = NextMoonQuarter(mq);
    n += 1;
  }
  return events;
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 3600000);
}

function generateLunarEclipseEvents(start, end) {
  const events = [];
  let le = SearchLunarEclipse(start);
  const guard = 40;
  let n = 0;
  while (n < guard) {
    const peak = le?.peak?.date;
    if (!peak || peak > end) break;
    if (peak >= start) {
      const kindKey = String(le.kind || '').toLowerCase();
      const titleVi = LUNAR_ECLIPSE_VI[kindKey] || 'Nguyệt thực';
      events.push({
        id: `lunar-eclipse-${peak.toISOString().slice(0, 10)}`,
        type: 'lunar_eclipse',
        source: 'computed:astronomy-engine',
        titleVi,
        summaryVi: `${titleVi} — có thể quan sát từ Việt Nam nếu trời trong và Mặt Trăng trên chân trời.`,
        startAt: addHours(peak, -3),
        endAt: addHours(peak, 3),
        peakAt: peak,
        exploreView: 'solar',
        exploreTarget: 'planet-moon',
        priority: kindKey === 'total' ? 10 : 7,
      });
    }
    le = NextLunarEclipse(le.peak);
    n += 1;
  }
  return events;
}

function generateLocalSolarEclipseEvents(start, end, lat, lon) {
  const events = [];
  const observer = new Observer(lat, lon, 0);
  let se = SearchLocalSolarEclipse(start, observer);
  const guard = 40;
  let n = 0;
  while (n < guard) {
    const peak = se?.peak?.time?.date;
    if (!peak || peak > end) break;
    if (peak >= start) {
      const kindKey = String(se.kind || '').toLowerCase();
      const titleVi = SOLAR_ECLIPSE_VI[kindKey] || 'Nhật thực';
      events.push({
        id: `solar-eclipse-local-${peak.toISOString().slice(0, 10)}`,
        type: 'solar_eclipse',
        source: 'computed:astronomy-engine',
        titleVi: `${titleVi} (tại vị trí bạn)`,
        summaryVi: `${titleVi} có thể quan sát được tại tọa độ ${lat.toFixed(1)}°N — cần kính lọc / không nhìn trực tiếp.`,
        startAt: se.partial_begin?.time?.date ?? peak,
        endAt: se.partial_end?.time?.date ?? peak,
        peakAt: peak,
        exploreView: 'solar',
        exploreTarget: 'planet-sun',
        priority: kindKey === 'total' ? 10 : 8,
      });
    }
    se = NextLocalSolarEclipse(se.peak.time, observer);
    n += 1;
  }
  return events;
}

function generateMeteorShowerEvents(start, end) {
  const events = [];
  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();

  for (let year = startYear; year <= endYear; year += 1) {
    for (const row of meteorCatalog) {
      const peak = new Date(Date.UTC(year, row.peakMonth - 1, row.peakDay, 12, 0, 0));
      const halfWindow = Math.max(1, Number(row.windowDays) || 3);
      const windowStart = addDays(peak, -halfWindow);
      const windowEnd = addDays(peak, halfWindow);
      if (windowEnd < start || windowStart > end) continue;

      events.push({
        id: `${row.slug}-${year}`,
        type: 'meteor_shower',
        source: 'catalog:iau-meteors',
        titleVi: row.titleVi,
        summaryVi: row.summaryVi || '',
        startAt: windowStart,
        endAt: windowEnd,
        peakAt: peak,
        exploreView: 'sky',
        exploreTarget: row.skyTargetId || null,
        priority: row.priority ?? 6,
      });
    }
  }
  return events;
}

function planetVisibleEvening(observer, at) {
  const o = new Observer(observer.lat, observer.lon, 0);
  const time = MakeTime(at);
  const sunEq = Equator(Body.Sun, time, o, true, true);
  const sunHor = Horizon(time, o, sunEq.ra, sunEq.dec, 'normal');
  if (sunHor.altitude > -6) return null;

  const results = [];
  for (const p of EVENING_PLANETS) {
    const eq = Equator(p.body, time, o, true, true);
    const hor = Horizon(time, o, eq.ra, eq.dec, 'normal');
    if (hor.altitude >= 12) {
      results.push({
        ...p,
        altDeg: Math.round(hor.altitude * 10) / 10,
        azDeg: Math.round(hor.azimuth),
      });
    }
  }
  return results;
}

function generateTonightPlanetHighlights(now, observer) {
  const dayStart = localCalendarDayStart(now, observer.tzOffsetMinutes);
  const sampleTimes = [
    localTimeOnDay(dayStart, 19, 0, observer.tzOffsetMinutes),
    localTimeOnDay(dayStart, 20, 30, observer.tzOffsetMinutes),
    localTimeOnDay(dayStart, 21, 30, observer.tzOffsetMinutes),
  ];

  const seen = new Set();
  const events = [];

  for (const at of sampleTimes) {
    const visible = planetVisibleEvening(observer, at);
    if (!visible) continue;
    for (const p of visible) {
      if (seen.has(p.exploreTarget)) continue;
      seen.add(p.exploreTarget);
      const endOfNight = localTimeOnDay(dayStart, 23, 59, observer.tzOffsetMinutes);
      events.push({
        id: `tonight-${p.exploreTarget}-${dayStart.toISOString().slice(0, 10)}`,
        type: 'planet_highlight',
        source: 'computed:astronomy-engine',
        titleVi: `${p.nameVi} tối nay`,
        summaryVi: `${p.nameVi} cao khoảng ${p.altDeg}° (hướng azimuth ${p.azDeg}°) — thử mở mô phỏng 3D.`,
        startAt: at,
        endAt: endOfNight,
        peakAt: at,
        exploreView: 'solar',
        exploreTarget: p.exploreTarget,
        priority: 9,
      });
    }
  }
  return events;
}

/**
 * @param {{ start: Date, end: Date, observer: { lat: number, lon: number, tzOffsetMinutes: number }, includeTonightPlanets?: boolean, now?: Date }} opts
 */
function generateCalendarEvents(opts) {
  const { start, end, observer } = opts;
  const now = opts.now instanceof Date ? opts.now : new Date();

  const segments = [
    ...generateMoonPhaseEvents(start, end),
    ...generateLunarEclipseEvents(start, end),
    ...generateLocalSolarEclipseEvents(start, end, observer.lat, observer.lon),
    ...generateMeteorShowerEvents(start, end),
  ];

  if (opts.includeTonightPlanets !== false) {
    segments.push(...generateTonightPlanetHighlights(now, observer));
  }

  return segments.sort((a, b) => {
    const pa = a.peakAt || a.startAt;
    const pb = b.peakAt || b.startAt;
    return pa - pb || (b.priority ?? 0) - (a.priority ?? 0);
  });
}

module.exports = {
  generateCalendarEvents,
  generateTonightPlanetHighlights,
  planetVisibleEvening,
  meteorCatalogPath: path.join(__dirname, '../data/meteorShowers.json'),
};
