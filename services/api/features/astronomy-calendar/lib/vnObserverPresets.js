/** Preset quan sát Việt Nam — MVP trước khi có timezone profile. */

const VN_OBSERVER_PRESETS = Object.freeze({
  default: {
    id: 'vn-default',
    labelVi: 'Việt Nam (mặc định)',
    lat: 10.8,
    lon: 106.66,
    tzOffsetMinutes: 420,
  },
  hanoi: {
    id: 'hanoi',
    labelVi: 'Hà Nội',
    lat: 21.03,
    lon: 105.85,
    tzOffsetMinutes: 420,
  },
  hcm: {
    id: 'hcm',
    labelVi: 'TP. Hồ Chí Minh',
    lat: 10.82,
    lon: 106.63,
    tzOffsetMinutes: 420,
  },
  danang: {
    id: 'danang',
    labelVi: 'Đà Nẵng',
    lat: 16.05,
    lon: 108.22,
    tzOffsetMinutes: 420,
  },
});

function resolveObserverFromQuery(query = {}) {
  const presetKey = String(query.preset || '').trim().toLowerCase();
  const preset = VN_OBSERVER_PRESETS[presetKey] || VN_OBSERVER_PRESETS.default;

  const latRaw = query.lat != null ? Number(query.lat) : NaN;
  const lonRaw = query.lon != null ? Number(query.lon) : NaN;
  const tzRaw = query.tzOffsetMinutes != null ? Number(query.tzOffsetMinutes) : NaN;

  const lat = Number.isFinite(latRaw) ? Math.max(-90, Math.min(90, latRaw)) : preset.lat;
  const lon = Number.isFinite(lonRaw) ? lonRaw : preset.lon;
  const tzOffsetMinutes = Number.isFinite(tzRaw) ? tzRaw : preset.tzOffsetMinutes;

  return {
    lat,
    lon,
    tzOffsetMinutes,
    presetId: Number.isFinite(latRaw) && Number.isFinite(lonRaw) ? 'custom' : preset.id,
    labelVi:
      Number.isFinite(latRaw) && Number.isFinite(lonRaw)
        ? `${lat.toFixed(2)}° · ${lon.toFixed(2)}°`
        : preset.labelVi,
  };
}

module.exports = {
  VN_OBSERVER_PRESETS,
  resolveObserverFromQuery,
};
