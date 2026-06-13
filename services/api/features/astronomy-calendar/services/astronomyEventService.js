const AstronomyEvent = require('../models/AstronomyEvent');
const { generateCalendarEvents } = require('../lib/generateCalendarEvents');
const { serializeCalendarEvent } = require('../lib/eventPresentation');
const { resolveObserverFromQuery, VN_OBSERVER_PRESETS } = require('../lib/vnObserverPresets');
const { GEM_EARN } = require('../../rewards/constants/gemEarn');
const { getCachedSeasonalMultiplier, scaleEarn } = require('../../rewards/services/gemRuntimeConfigService');
const { getTypeKitMap, resolveEventContent } = require('./typeKitService');

const URGENT_WINDOW_MS = 7 * 86400000;

function addDays(date, days) {
  return new Date(date.getTime() + days * 86400000);
}

function localDayStart(now, tzOffsetMinutes) {
  const shifted = new Date(now.getTime() + tzOffsetMinutes * 60 * 1000);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - tzOffsetMinutes * 60 * 1000);
}

function inferEventKind(raw) {
  if (raw.type === 'moon_phase' && raw.exploreView == null && raw.lessonHref) return 'educational';
  if (raw.type === 'moon_phase') return 'educational';
  return 'observable';
}

function rawComputeToDocFields(raw, overrides = {}) {
  const peakAt = raw.peakAt instanceof Date ? raw.peakAt : raw.peakAt ? new Date(raw.peakAt) : null;
  return {
    eventId: overrides.eventId || raw.id,
    computeId: raw.id,
    status: overrides.status || 'draft',
    eventKind: overrides.eventKind || inferEventKind(raw),
    type: raw.type,
    source: raw.source || 'computed:import',
    titleVi: raw.titleVi,
    summaryVi: raw.summaryVi || '',
    startAt: raw.startAt instanceof Date ? raw.startAt : new Date(raw.startAt),
    endAt: raw.endAt instanceof Date ? raw.endAt : new Date(raw.endAt),
    peakAt,
    exploreView: raw.exploreView || null,
    exploreTarget: raw.exploreTarget || null,
    lessonHref: raw.lessonHref || null,
    quizHref: overrides.quizHref || null,
    difficulty: overrides.difficulty || (raw.type === 'meteor_shower' ? 'beginner' : null),
    moonPhaseHint: overrides.moonPhaseHint || null,
    priority: raw.priority ?? 0,
    featured: overrides.featured ?? (raw.type === 'meteor_shower' || raw.priority >= 9),
    urgencyRank: overrides.urgencyRank ?? raw.priority ?? 0,
    ...overrides,
  };
}

function docToRawEvent(doc) {
  return {
    id: doc.eventId,
    type: doc.type,
    source: doc.source,
    titleVi: doc.titleVi,
    summaryVi: doc.summaryVi,
    subtitleVi: doc.subtitleVi,
    subtitleEn: doc.subtitleEn,
    descriptionVi: doc.descriptionVi,
    observationTipsVi: doc.observationTipsVi,
    visibilityLabelVi: doc.visibilityLabelVi,
    typeLabelVi: doc.typeLabelVi,
    startAt: doc.startAt,
    endAt: doc.endAt,
    peakAt: doc.peakAt,
    exploreView: doc.exploreView,
    exploreTarget: doc.exploreTarget,
    lessonHref: doc.lessonHref,
    eventKind: doc.eventKind,
    difficulty: doc.difficulty,
    moonPhaseHint: doc.moonPhaseHint,
    quizHref: doc.quizHref,
    priority: doc.priority,
    featured: doc.featured,
  };
}

function enrichSerializedEvent(base, doc, engagement, kitMap) {
  return {
    ...base,
    eventKind: doc.eventKind || 'observable',
    difficulty: doc.difficulty || null,
    moonPhaseHint: doc.moonPhaseHint || null,
    quizHref: doc.quizHref || null,
    featured: Boolean(doc.featured),
    content: resolveEventContent(doc, kitMap),
    engagement: engagement
      ? {
          reminded: Boolean(engagement.remindedAt),
          checkedIn: Boolean(engagement.checkedInAt),
          gemAwarded: Boolean(engagement.gemAwardedAt),
          gemAmount: engagement.gemAmount || 0,
          observationPhotoUrl: engagement.observationPhotoUrl || null,
          checkedInAt: engagement.checkedInAt ? new Date(engagement.checkedInAt).toISOString() : null,
        }
      : undefined,
  };
}

function serializeDoc(doc, { now, observer, engagement, kitMap }) {
  const base = serializeCalendarEvent(docToRawEvent(doc), { now, observer });
  return enrichSerializedEvent(base, doc, engagement, kitMap);
}

async function listPublishedDocs({ start, end, type, eventKind, limit = 500 }) {
  const q = { status: 'published', endAt: { $gte: start } };
  if (end) q.startAt = { $lte: end };
  if (type) q.type = type;
  if (eventKind) q.eventKind = eventKind;
  return AstronomyEvent.find(q).sort({ peakAt: 1, startAt: 1, priority: -1 }).limit(limit).lean();
}

async function buildCalendarFromDb({
  query,
  now = new Date(),
  days = 90,
  tonightOnly = false,
  userId = null,
  type = null,
  eventKind = null,
}) {
  const observer = resolveObserverFromQuery(query);
  const start = tonightOnly ? localDayStart(now, observer.tzOffsetMinutes) : now;
  const end = tonightOnly ? addDays(start, 1) : addDays(now, days);

  const docs = await listPublishedDocs({ start, end, type, eventKind });
  let filtered = docs;
  if (tonightOnly) {
    filtered = docs.filter((d) => d.endAt >= now && d.startAt <= addDays(start, 1));
  } else {
    filtered = docs.filter((d) => d.endAt >= now);
  }

  let engagementMap = {};
  if (userId && filtered.length) {
    const UserAstronomyEventEngagement = require('../models/UserAstronomyEventEngagement');
    const rows = await UserAstronomyEventEngagement.find({
      userId: String(userId),
      eventId: { $in: filtered.map((d) => d.eventId) },
    }).lean();
    engagementMap = Object.fromEntries(rows.map((r) => [r.eventId, r]));
  }

  const kitMap = await getTypeKitMap();

  const events = filtered.map((d) =>
    serializeDoc(d, { now, observer, engagement: engagementMap[d.eventId], kitMap }),
  );
  const live = events.filter((e) => e.isLive);
  const upcoming = events.filter((e) => !e.isLive);

  return {
    generatedAt: now.toISOString(),
    source: 'database',
    observer: {
      lat: observer.lat,
      lon: observer.lon,
      tzOffsetMinutes: observer.tzOffsetMinutes,
      presetId: observer.presetId,
      labelVi: observer.labelVi,
    },
    presets: Object.values(VN_OBSERVER_PRESETS).map((p) => ({
      id: p.id,
      labelVi: p.labelVi,
      lat: p.lat,
      lon: p.lon,
      tzOffsetMinutes: p.tzOffsetMinutes,
    })),
    live,
    upcoming,
    events,
  };
}

async function getMonthCalendar({ year, month, query, userId = null }) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) {
    throw new Error('INVALID_MONTH');
  }
  const observer = resolveObserverFromQuery(query);
  const monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  const now = new Date();

  const docs = await listPublishedDocs({ start: monthStart, end: monthEnd, limit: 200 });
  let engagementMap = {};
  if (userId && docs.length) {
    const UserAstronomyEventEngagement = require('../models/UserAstronomyEventEngagement');
    const rows = await UserAstronomyEventEngagement.find({
      userId: String(userId),
      eventId: { $in: docs.map((d) => d.eventId) },
    }).lean();
    engagementMap = Object.fromEntries(rows.map((r) => [r.eventId, r]));
  }

  const kitMap = await getTypeKitMap();

  const events = docs.map((d) =>
    serializeDoc(d, { now, observer, engagement: engagementMap[d.eventId], kitMap }),
  );

  const days = {};
  for (const ev of events) {
    const peak = ev.peakAt || ev.startAt;
    if (!peak) continue;
    const d = new Date(peak);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    if (!days[key]) days[key] = [];
    days[key].push(ev);
  }

  const moonPhases = events
    .filter((e) => e.type === 'moon_phase')
    .map((e) => ({
      date: (e.peakAt || e.startAt).slice(0, 10),
      titleVi: e.titleVi,
      eventId: e.id,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    year: y,
    month: m,
    observer: {
      lat: observer.lat,
      lon: observer.lon,
      presetId: observer.presetId,
      labelVi: observer.labelVi,
    },
    days,
    moonPhases,
    events,
  };
}

function eventPeakTime(event) {
  return new Date(event.peakAt || event.startAt);
}

function buildUrgencyTagVi(countdownMs) {
  if (countdownMs <= 0) return 'ĐANG DIỄN RA';
  const days = Math.ceil(countdownMs / 86400000);
  if (days <= 1) return 'SẮP TỚI · HÔM NAY';
  if (days <= 7) return `SẮP TỚI · ${days} NGÀY NỮA`;
  return `SẮP TỚI · ${days} NGÀY`;
}

async function defaultGemCheckInAmount() {
  const mult = await getCachedSeasonalMultiplier();
  return scaleEarn(GEM_EARN.astronomy_event_observed, mult);
}

function buildUrgencyPayload(event, now, gemCheckInAmount) {
  const target = eventPeakTime(event);
  const countdownMs = Math.max(0, target.getTime() - now.getTime());
  const days = Math.ceil(countdownMs / 86400000);
  const isObservable = (event.eventKind || 'observable') === 'observable';
  return {
    event,
    countdownMs,
    daysUntil: days,
    isWithinUrgentWindow: event.isLive || countdownMs <= URGENT_WINDOW_MS,
    urgencyTagVi: buildUrgencyTagVi(countdownMs),
    labelVi: event.summaryVi || event.titleVi,
    gemCheckInAmount: isObservable ? gemCheckInAmount : null,
  };
}

async function getFeatured({ query, userId = null }) {
  const now = new Date();
  const calendar = await buildCalendarFromDb({ query, now, days: 120, userId });
  const events = calendar.events;
  const gemCheckInAmount = await defaultGemCheckInAmount();

  const upcoming = events
    .filter((e) => eventPeakTime(e) > now || e.isLive)
    .sort((a, b) => eventPeakTime(a) - eventPeakTime(b));

  const nextEclipse = upcoming.find(
    (e) => e.type === 'lunar_eclipse' || e.type === 'solar_eclipse',
  );

  const primaryCandidate = upcoming.find((e) => {
    const ms = Math.max(0, eventPeakTime(e).getTime() - now.getTime());
    return e.isLive || ms <= URGENT_WINDOW_MS;
  });

  const primaryEvent = primaryCandidate || null;
  const urgency = primaryEvent ? buildUrgencyPayload(primaryEvent, now, gemCheckInAmount) : null;

  const secondaryCandidate = upcoming.find((e) => {
    if (primaryEvent && e.id === primaryEvent.id) return false;
    const ms = Math.max(0, eventPeakTime(e).getTime() - now.getTime());
    return ms > URGENT_WINDOW_MS;
  });

  const secondaryUrgency = secondaryCandidate
    ? buildUrgencyPayload(secondaryCandidate, now, gemCheckInAmount)
    : null;

  return {
    urgency,
    secondaryUrgency,
    nextEclipse: nextEclipse || null,
    featured: events.filter((e) => e.featured).slice(0, 5),
    observer: calendar.observer,
    gemCheckInAmount,
  };
}

async function importSuggestionsFromCompute({ days = 90, actorUserId = null, publish = false } = {}) {
  const observer = resolveObserverFromQuery({ preset: 'hanoi' });
  const now = new Date();
  const end = addDays(now, days);
  const rawEvents = generateCalendarEvents({
    start: now,
    end,
    observer,
    now,
    includeTonightPlanets: false,
  });

  let created = 0;
  let updated = 0;
  for (const raw of rawEvents) {
    const fields = rawComputeToDocFields(raw, {
      status: publish ? 'published' : 'draft',
      publishedBy: publish && actorUserId ? String(actorUserId) : null,
      publishedAt: publish ? now : null,
    });
    const existing = await AstronomyEvent.findOne({ computeId: raw.id });
    if (existing) {
      await AstronomyEvent.updateOne(
        { _id: existing._id },
        {
          $set: {
            titleVi: fields.titleVi,
            summaryVi: fields.summaryVi,
            startAt: fields.startAt,
            endAt: fields.endAt,
            peakAt: fields.peakAt,
            exploreView: fields.exploreView,
            exploreTarget: fields.exploreTarget,
            lessonHref: fields.lessonHref,
            priority: fields.priority,
            eventKind: fields.eventKind,
          },
        },
      );
      updated += 1;
    } else {
      await AstronomyEvent.create({
        ...fields,
        authoredBy: actorUserId ? String(actorUserId) : null,
      });
      created += 1;
    }
  }
  return { created, updated, total: rawEvents.length };
}

async function ensurePublishedSeed() {
  const { ensureTypeKitsSeed } = require('./typeKitService');
  await ensureTypeKitsSeed();
  const count = await AstronomyEvent.countDocuments({ status: 'published' });
  if (count > 0) return { seeded: false, count };
  const result = await importSuggestionsFromCompute({ days: 365, publish: true });
  return { seeded: true, ...result };
}

function eventToAdminDto(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(d._id),
    eventId: d.eventId,
    computeId: d.computeId,
    status: d.status,
    eventKind: d.eventKind,
    type: d.type,
    source: d.source,
    titleVi: d.titleVi,
    summaryVi: d.summaryVi,
    subtitleVi: d.subtitleVi || '',
    subtitleEn: d.subtitleEn || '',
    descriptionVi: d.descriptionVi || '',
    observationTipsVi: d.observationTipsVi || '',
    visibilityLabelVi: d.visibilityLabelVi || '',
    typeLabelVi: d.typeLabelVi || '',
    startAt: d.startAt?.toISOString?.() || d.startAt,
    endAt: d.endAt?.toISOString?.() || d.endAt,
    peakAt: d.peakAt?.toISOString?.() || d.peakAt,
    exploreView: d.exploreView,
    exploreTarget: d.exploreTarget,
    lessonHref: d.lessonHref,
    quizHref: d.quizHref,
    difficulty: d.difficulty,
    moonPhaseHint: d.moonPhaseHint,
    priority: d.priority,
    featured: d.featured,
    urgencyRank: d.urgencyRank,
    gemRewardOverride: d.gemRewardOverride,
    authoredBy: d.authoredBy,
    publishedBy: d.publishedBy,
    publishedAt: d.publishedAt?.toISOString?.() || d.publishedAt,
    reviewNote: d.reviewNote,
    createdAt: d.createdAt?.toISOString?.() || d.createdAt,
    updatedAt: d.updatedAt?.toISOString?.() || d.updatedAt,
  };
}

async function findEventByPublicId(eventId) {
  return AstronomyEvent.findOne({ eventId: String(eventId), status: 'published' }).lean();
}

module.exports = {
  addDays,
  localDayStart,
  rawComputeToDocFields,
  serializeDoc,
  buildCalendarFromDb,
  getMonthCalendar,
  getFeatured,
  importSuggestionsFromCompute,
  ensurePublishedSeed,
  eventToAdminDto,
  findEventByPublicId,
  inferEventKind,
};
