/** Serialize event + deep link Explore (Sky / Solar). */

function buildExploreHref({ exploreView, exploreTarget, lat, lon, peakAt, lessonHref }) {
  if (lessonHref && !exploreTarget) {
    return lessonHref;
  }
  const params = new URLSearchParams();
  if (exploreView === 'sky') {
    params.set('view', 'sky');
    if (exploreTarget) params.set('target', exploreTarget);
  } else if (exploreTarget) {
    params.set('entity', exploreTarget);
  }
  if (Number.isFinite(lat)) params.set('lat', String(lat));
  if (Number.isFinite(lon)) params.set('lon', String(lon));
  if (peakAt instanceof Date && !Number.isNaN(peakAt.getTime())) {
    params.set('time', peakAt.toISOString());
  }
  const q = params.toString();
  return q ? `/explore?${q}` : '/explore?view=sky';
}

function toIso(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function serializeCalendarEvent(raw, { now, observer }) {
  const startAt = raw.startAt instanceof Date ? raw.startAt : new Date(raw.startAt);
  const endAt = raw.endAt instanceof Date ? raw.endAt : new Date(raw.endAt);
  const peakAt = raw.peakAt
    ? raw.peakAt instanceof Date
      ? raw.peakAt
      : new Date(raw.peakAt)
    : null;

  const isLive = now >= startAt && now <= endAt;
  const lessonHref =
    typeof raw.lessonHref === 'string' && raw.lessonHref.trim() ? raw.lessonHref.trim() : null;
  const exploreHref = buildExploreHref({
    exploreView: raw.exploreView,
    exploreTarget: raw.exploreTarget,
    lat: observer?.lat,
    lon: observer?.lon,
    peakAt: peakAt || startAt,
    lessonHref,
  });
  const ctaLabelVi = lessonHref && !raw.exploreTarget ? 'Đọc bài pha trăng' : 'Mở La bàn Sky';

  return {
    id: raw.id,
    type: raw.type,
    source: raw.source,
    titleVi: raw.titleVi,
    summaryVi: raw.summaryVi || '',
    startAt: toIso(startAt),
    endAt: toIso(endAt),
    peakAt: peakAt ? toIso(peakAt) : null,
    isLive,
    exploreView: raw.exploreView || null,
    exploreTarget: raw.exploreTarget || null,
    exploreHref,
    lessonHref,
    ctaLabelVi,
    priority: raw.priority ?? 0,
  };
}

module.exports = {
  buildExploreHref,
  serializeCalendarEvent,
};
