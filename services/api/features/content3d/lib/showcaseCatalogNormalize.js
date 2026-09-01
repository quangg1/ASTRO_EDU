const {
  normalizeMediaUrlField,
  trimTo,
  finiteOr,
} = require('./showcaseFieldNormalize');

/**
 * Chuẩn hóa bundle catalog do studio đẩy lên: mục catalog, quỹ đạo và các
 * "story" (chuyến bay có kịch bản). Hàng không hợp lệ bị loại thay vì lưu nửa vời.
 */

const GROUPS = new Set(['planets_moons', 'dwarf_asteroids', 'comets', 'spacecraft']);

const MAX_CATALOG = 300;
const MAX_ORBITS = 200;
const MAX_STORIES = 50;
const MAX_WAYPOINTS = 30;

/** Đường dẫn nội bộ phải bắt đầu bằng `/` và đủ ngắn để lưu vào bundle. */
function internalPath(raw) {
  const text = String(raw || '').trim();
  return text.startsWith('/') && text.length < 500 ? text : '';
}

/** Chỉ gán field khi có giá trị — bundle giữ nguyên hình dạng gọn như trước. */
function assignIfPresent(target, key, value) {
  if (value) target[key] = value;
}

function normalizeCatalogEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  const name = String(raw.name || '').trim();
  const group = String(raw.group || '').trim();
  if (!id || id.length > 120 || !name || name.length > 200 || !GROUPS.has(group)) return null;

  const entry = { id, name, group };
  assignIfPresent(entry, 'linkedPlanetName', trimTo(raw.linkedPlanetName, 80));
  assignIfPresent(entry, 'texturePath', internalPath(raw.texturePath));

  const diffuseMapUrl =
    normalizeMediaUrlField(raw.diffuseMapUrl) || normalizeMediaUrlField(raw.textureUrl);
  if (diffuseMapUrl) {
    entry.textureUrl = diffuseMapUrl;
    entry.diffuseMapUrl = diffuseMapUrl;
  }
  for (const key of ['normalMapUrl', 'specularMapUrl', 'cloudMapUrl', 'modelUrl']) {
    assignIfPresent(entry, key, normalizeMediaUrlField(raw[key]));
  }

  entry.nameVi = String(raw.nameVi || '').trim();
  entry.museumBlurbVi = String(raw.museumBlurbVi || '').trim();
  entry.published = raw.published !== false;
  return entry;
}

function normalizeStoryWaypoint(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const captionVi = String(raw.captionVi || raw.caption || '').trim();
  if (!captionVi) return null;

  const waypoint = { captionVi: captionVi.slice(0, 2000) };
  assignIfPresent(waypoint, 'entityId', trimTo(raw.entityId, 120));
  assignIfPresent(waypoint, 'focusPlanetName', trimTo(raw.focusPlanetName, 80));

  if (raw.camera && typeof raw.camera === 'object') {
    const distance = Number(raw.camera.distance);
    const az = Number(raw.camera.az);
    const el = Number(raw.camera.el);
    if (Number.isFinite(distance) && Number.isFinite(az) && Number.isFinite(el)) {
      // Kẹp để camera không chui vào trong thiên thể hoặc lật qua cực.
      waypoint.camera = {
        distance: Math.min(2600, Math.max(0.8, distance)),
        az,
        el: Math.max(-89, Math.min(89, el)),
      };
    }
  }

  const durationSec = Number(raw.durationSec);
  if (Number.isFinite(durationSec) && durationSec >= 2 && durationSec <= 120) {
    waypoint.durationSec = durationSec;
  }

  // Không có đích ngắm thì waypoint vô nghĩa.
  return waypoint.entityId || waypoint.focusPlanetName ? waypoint : null;
}

function normalizeStory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  const title = String(raw.title || '').trim();
  const targetPlanetName = String(raw.targetPlanetName || '').trim();
  if (!id || id.length > 120 || !title || !targetPlanetName) return null;

  const story = {
    id,
    title: title.slice(0, 200),
    subtitle: trimTo(raw.subtitle, 300),
    detail: trimTo(raw.detail, 2000),
    targetPlanetName: targetPlanetName.slice(0, 80),
  };
  assignIfPresent(story, 'unlockEntityId', trimTo(raw.unlockEntityId, 120));

  const waypoints = Array.isArray(raw.waypoints)
    ? raw.waypoints.map(normalizeStoryWaypoint).filter(Boolean)
    : [];
  if (waypoints.length > 0) story.waypoints = waypoints.slice(0, MAX_WAYPOINTS);
  return story;
}

function normalizeOrbit(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const id = String(raw.id || '').trim();
  const name = String(raw.name || '').trim();
  if (!id || id.length > 120 || !name || name.length > 200) return null;

  const orbit = {
    id,
    name: name.slice(0, 200),
    // Số phải đúng kiểu number: chuỗi từ form editor coi như thiếu và lấy mặc định.
    distance: Number.isFinite(raw.distance) ? raw.distance : 0,
    period: Number.isFinite(raw.period) ? raw.period : 0,
    size: Number.isFinite(raw.size) ? raw.size : 0.05,
    color: String(raw.color || '#94a3b8').slice(0, 32),
    orbitColor: String(raw.orbitColor || '#64748b').slice(0, 32),
  };

  assignIfPresent(orbit, 'parentPlanetName', trimTo(raw.parentPlanetName, 80));
  assignIfPresent(orbit, 'parentShowcaseEntityId', trimTo(raw.parentShowcaseEntityId, 120));
  assignIfPresent(orbit, 'horizonsCommand', trimTo(raw.horizonsCommand, 80));
  assignIfPresent(orbit, 'horizonsCenter', trimTo(raw.horizonsCenter, 80));
  assignIfPresent(orbit, 'texturePath', internalPath(raw.texturePath));
  assignIfPresent(orbit, 'modelPath', internalPath(raw.modelPath));

  for (const key of ['phaseDeg', 'inclinationDeg', 'ascendingNodeDeg', 'modelScale']) {
    if (raw[key] != null && Number.isFinite(Number(raw[key]))) orbit[key] = Number(raw[key]);
  }
  if (Array.isArray(raw.modelRotationDeg) && raw.modelRotationDeg.length === 3) {
    orbit.modelRotationDeg = raw.modelRotationDeg.map((value) => finiteOr(value));
  }
  return orbit;
}

module.exports = {
  GROUPS,
  MAX_CATALOG,
  MAX_ORBITS,
  MAX_STORIES,
  normalizeCatalogEntry,
  normalizeStory,
  normalizeOrbit,
};
