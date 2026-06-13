const AstronomyEvent = require('../../astronomy-calendar/models/AstronomyEvent');
const { resolveEventContent, getTypeKitMap } = require('../../astronomy-calendar/services/typeKitService');

function compactEvent(doc, kitMap) {
  const content = resolveEventContent(doc, kitMap);
  return {
    eventId: doc.eventId,
    titleVi: doc.titleVi,
    type: doc.type,
    eventKind: doc.eventKind || 'observable',
    startAt: doc.startAt?.toISOString?.() || doc.startAt,
    endAt: doc.endAt?.toISOString?.() || doc.endAt,
    peakAt: doc.peakAt?.toISOString?.() || doc.peakAt,
    summaryVi: String(doc.summaryVi || '').slice(0, 320),
    lessonHref: doc.lessonHref || null,
    quizHref: doc.quizHref || null,
    exploreView: doc.exploreView || null,
    exploreTarget: doc.exploreTarget || null,
    typeLabelVi: content.typeLabelVi,
    observationTipsVi: content.observationTipsVi?.slice(0, 280) || null,
  };
}

/**
 * Ngữ cảnh lịch thiên văn cho Cosmo — sự kiện đang xem + sự kiện sắp tới.
 * @param {Record<string, unknown>|null} sessionContext
 */
async function buildAstronomyCalendarContext(sessionContext) {
  if (sessionContext?.surface !== 'calendar') return null;

  const kitMap = await getTypeKitMap();
  const now = new Date();
  const focusedId =
    typeof sessionContext.calendarEventId === 'string'
      ? sessionContext.calendarEventId.trim()
      : '';

  let focusedEvent = null;
  if (focusedId) {
    const doc = await AstronomyEvent.findOne({
      eventId: focusedId,
      status: 'published',
    }).lean();
    if (doc) focusedEvent = compactEvent(doc, kitMap);
  }

  const upcomingDocs = await AstronomyEvent.find({
    status: 'published',
    endAt: { $gte: now },
  })
    .sort({ peakAt: 1, startAt: 1 })
    .limit(6)
    .lean();

  const upcoming = upcomingDocs.map((d) => compactEvent(d, kitMap));

  return {
    focusedEvent,
    upcoming,
    clientHints: {
      calendarEventTitle: sessionContext.calendarEventTitle || null,
      calendarLessonHref: sessionContext.calendarLessonHref || null,
      calendarExploreTarget: sessionContext.calendarExploreTarget || null,
    },
  };
}

module.exports = { buildAstronomyCalendarContext };
