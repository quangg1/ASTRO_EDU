const crypto = require('crypto');

const ALLOWED_EVENT_NAMES = new Set([
  'lp_module_viewed',
  'lp_node_viewed',
  'lp_lesson_opened',
  'lp_lesson_completed_toggled',
  'lp_lesson_dwell',
  'lp_lesson_mastered',
  'lp_concept_opened',
  'lp_concept_anchor_clicked',
  'lp_depth_switched',
  'lp_path_exited',
  'scene_entity_focus_duration',
  'scene_entity_clicked',
  'scene_concept_overlay_shown',
  'scene_contextual_quiz_prompted',
  'scene_contextual_quiz_passed',
  'scene_entity_discovered',
  'deep_history_beat_dwell',
  'deep_history_site_opened',
  'story_tour_completed',
]);

function normalizeClient(raw) {
  const value = String(raw || '').trim().toLowerCase();
  if (value === 'android' || value === 'ios') return value;
  return 'web';
}

function legacyEventIdFingerprint(rawEvent, sessionId) {
  const payload = {
    sessionId,
    eventName: rawEvent?.eventName,
    timestamp: rawEvent?.timestamp,
    lessonId: rawEvent?.lessonId,
    moduleId: rawEvent?.moduleId,
    metadata: rawEvent?.metadata,
  };
  return `legacy_${crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 24)}`;
}

/**
 * @param {unknown} rawEvent
 * @param {string|null|undefined} userId
 * @returns {null|Record<string, unknown>}
 */
function normalizeLearningPathEvent(rawEvent, userId) {
  const eventName = String(rawEvent?.eventName || '').trim();
  const sessionId = String(rawEvent?.sessionId || '').trim();
  const depthRaw = String(rawEvent?.depth || '').trim();
  const depth = ['beginner', 'explorer', 'researcher'].includes(depthRaw) ? depthRaw : null;
  if (!eventName || !ALLOWED_EVENT_NAMES.has(eventName) || !sessionId) return null;

  const timestampRaw = rawEvent?.timestamp ? new Date(rawEvent.timestamp) : new Date();
  const timestamp = Number.isNaN(timestampRaw.getTime()) ? new Date() : timestampRaw;

  const eventIdRaw = String(rawEvent?.eventId || '').trim();
  const eventId = eventIdRaw || legacyEventIdFingerprint(rawEvent, sessionId);

  const schemaVersionRaw = Number(rawEvent?.schemaVersion);
  const schemaVersion = Number.isFinite(schemaVersionRaw) && schemaVersionRaw > 0 ? Math.floor(schemaVersionRaw) : 1;

  const anonSessionId = String(rawEvent?.anonSessionId || '').trim() || null;

  return {
    eventId,
    schemaVersion,
    userId: userId || null,
    anonSessionId,
    sessionId,
    eventName,
    timestamp,
    moduleId: rawEvent?.moduleId ? String(rawEvent.moduleId).trim() : null,
    nodeId: rawEvent?.nodeId ? String(rawEvent.nodeId).trim() : null,
    lessonId: rawEvent?.lessonId ? String(rawEvent.lessonId).trim() : null,
    depth,
    durationSec: Number.isFinite(Number(rawEvent?.durationSec)) ? Number(rawEvent.durationSec) : null,
    activeSec: Number.isFinite(Number(rawEvent?.activeSec)) ? Number(rawEvent.activeSec) : null,
    idleSec: Number.isFinite(Number(rawEvent?.idleSec)) ? Number(rawEvent.idleSec) : null,
    completed: typeof rawEvent?.completed === 'boolean' ? rawEvent.completed : null,
    client: normalizeClient(rawEvent?.client),
    appVersion: rawEvent?.appVersion ? String(rawEvent.appVersion).trim() : null,
    metadata: rawEvent?.metadata && typeof rawEvent.metadata === 'object' ? rawEvent.metadata : {},
  };
}

module.exports = {
  ALLOWED_EVENT_NAMES,
  normalizeLearningPathEvent,
};
