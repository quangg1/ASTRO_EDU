const reporting = require('../repositories/reportingRepository');

const EXPLORE_FUNNEL_STEPS = [
  { step: 'scene_entity_clicked', label: 'Click thiên thể', eventName: 'scene_entity_clicked' },
  { step: 'scene_entity_focus_duration', label: 'Focus ≥ ngưỡng', eventName: 'scene_entity_focus_duration' },
  { step: 'scene_concept_overlay_shown', label: 'Overlay khái niệm', eventName: 'scene_concept_overlay_shown' },
  { step: 'scene_contextual_quiz_prompted', label: 'Mở quiz', eventName: 'scene_contextual_quiz_prompted' },
  { step: 'scene_contextual_quiz_passed', label: 'Quiz đúng hết', eventName: 'scene_contextual_quiz_passed' },
];

async function getExploreAnalytics(startDate) {
  const eventNames = EXPLORE_FUNNEL_STEPS.map((s) => s.eventName).concat(['scene_entity_discovered']);
  const countsAgg = await reporting.exploreEventCounts(startDate, eventNames);

  const byEvent = new Map(
    countsAgg.map((row) => [
      String(row._id),
      {
        events: row.events || 0,
        uniqueUsers: (row.users || []).filter(Boolean).length,
        uniqueSessions: (row.sessions || []).length,
      },
    ]),
  );

  const funnel = EXPLORE_FUNNEL_STEPS.map((def, idx) => {
    const stats = byEvent.get(def.eventName) || { events: 0, uniqueUsers: 0, uniqueSessions: 0 };
    const value = stats.uniqueSessions;
    return {
      step: def.step,
      label: def.label,
      events: stats.events,
      uniqueUsers: stats.uniqueUsers,
      uniqueSessions: value,
      conversionFromStart: 0,
      conversionFromPrev: 0,
      _idx: idx,
    };
  });

  const base = funnel[0]?.uniqueSessions || 1;
  for (let i = 0; i < funnel.length; i += 1) {
    funnel[i].conversionFromStart = Math.round((funnel[i].uniqueSessions / base) * 1000) / 10;
    funnel[i].conversionFromPrev =
      i === 0 ? 100 : Math.round((funnel[i].uniqueSessions / Math.max(1, funnel[i - 1].uniqueSessions)) * 1000) / 10;
    delete funnel[i]._idx;
  }

  const discovery = byEvent.get('scene_entity_discovered') || { events: 0, uniqueUsers: 0, uniqueSessions: 0 };

  const topEntitiesAgg = await reporting.exploreTopEntityEvents(startDate, [
    'scene_entity_discovered',
    'scene_contextual_quiz_passed',
  ]);

  const entityMap = new Map();
  for (const row of topEntitiesAgg) {
    const entityId = String(row._id?.entityId || '').trim();
    if (!entityId) continue;
    const cur = entityMap.get(entityId) || { entityId, discoveries: 0, quizPasses: 0 };
    if (row._id.eventName === 'scene_entity_discovered') cur.discoveries = row.count;
    if (row._id.eventName === 'scene_contextual_quiz_passed') cur.quizPasses = row.count;
    entityMap.set(entityId, cur);
  }

  return {
    funnel,
    summary: {
      discoveries: discovery.events,
      discoveryUsers: discovery.uniqueUsers,
      quizPrompts: byEvent.get('scene_contextual_quiz_prompted')?.events || 0,
      quizPasses: byEvent.get('scene_contextual_quiz_passed')?.events || 0,
    },
    topEntities: [...entityMap.values()]
      .sort((a, b) => b.discoveries + b.quizPasses - (a.discoveries + a.quizPasses))
      .slice(0, 12),
  };
}

module.exports = { getExploreAnalytics, EXPLORE_FUNNEL_STEPS };
