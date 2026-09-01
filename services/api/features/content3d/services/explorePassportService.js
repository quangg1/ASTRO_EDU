const {
  listEventsForUserByNames,
} = require('../../learning-path/services/learningPathEventQueryService');

const PASSPORT_EVENT_NAMES = [
  'scene_entity_discovered',
  'deep_history_beat_dwell',
  'deep_history_site_opened',
  'story_tour_completed',
];

/**
 * @param {string} userId
 * @returns {Promise<{ discoveries: string[], dhBeats: object[], dhSites: object[], storyTours: object[] }>}
 */
async function buildExplorePassportPayload(userId) {
  const rows = await listEventsForUserByNames(String(userId || '').trim(), PASSPORT_EVENT_NAMES, {
    projection: 'eventName metadata timestamp',
    sort: { timestamp: 1 },
  });

  const discoverySet = new Set();
  const dhBeatMap = new Map();
  const dhSiteMap = new Map();
  const storyMap = new Map();

  for (const row of rows) {
    const meta = row.metadata && typeof row.metadata === 'object' ? row.metadata : {};
    const at = row.timestamp ? new Date(row.timestamp).toISOString() : undefined;
    const eventName = String(row.eventName || '');

    if (eventName === 'scene_entity_discovered') {
      const entityId = String(meta.entityId || '').trim();
      if (entityId) discoverySet.add(entityId);
    }
    if (eventName === 'deep_history_beat_dwell') {
      const entityId = String(meta.entityId || '').trim();
      const beatId = String(meta.beatId || '').trim();
      if (entityId && beatId) {
        dhBeatMap.set(`${entityId}::${beatId}`, { entityId, beatId, at });
      }
    }
    if (eventName === 'deep_history_site_opened') {
      const entityId = String(meta.entityId || '').trim();
      const siteId = String(meta.siteId || '').trim();
      if (entityId && siteId) {
        dhSiteMap.set(`${entityId}::${siteId}`, { entityId, siteId, at });
      }
    }
    if (eventName === 'story_tour_completed') {
      const storyId = String(meta.storyId || '').trim();
      if (storyId) storyMap.set(storyId, { storyId, at });
    }
  }

  return {
    discoveries: [...discoverySet],
    dhBeats: [...dhBeatMap.values()],
    dhSites: [...dhSiteMap.values()],
    storyTours: [...storyMap.values()],
  };
}

module.exports = { buildExplorePassportPayload };
