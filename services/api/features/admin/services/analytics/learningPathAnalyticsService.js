const reporting = require('../../repositories/reportingRepository');
const { resolveRange, toRate, withConversionRates } = require('./analyticsRange');
const {
  DEPTHS,
  buildLearningPathLookup,
  resolveLessonDisplay,
  resolveConceptTitle,
} = require('../adminLearningPathAnalyticsLabels');

const TOP_LESSONS_LIMIT = 15;
const DEPTH_FILTER_OPTIONS = [
  { value: 'beginner', label: 'Cơ bản' },
  { value: 'explorer', label: 'Cơ chế' },
  { value: 'researcher', label: 'Chuyên sâu' },
];

/** `$addToSet` keeps nulls for non-matching branches; strip them before counting. */
function countDistinct(values) {
  return (Array.isArray(values) ? values : []).filter(Boolean).length;
}

function buildEventMatch({ startDate, moduleId, depth }) {
  return {
    timestamp: { $gte: startDate },
    ...(moduleId ? { moduleId } : {}),
    ...(depth ? { depth } : {}),
  };
}

/**
 * Concept ids seen in events may not exist in the learning-path document
 * (older content); backfill their titles from the concept collection.
 */
async function backfillConceptTitles(lookup, conceptIds) {
  const missing = conceptIds.filter((id) => {
    const title = lookup.conceptMap.get(id);
    return !title || title === id;
  });
  if (!missing.length) return;

  const concepts = await reporting.findConceptTitles(missing);
  for (const concept of concepts) {
    const id = String(concept.id || '').trim();
    if (!id) continue;
    lookup.conceptMap.set(id, String(concept.title || concept.short_description || id).trim() || id);
  }
}

async function getLearningPathAnalytics({ range: rangeInput, moduleId, depth } = {}) {
  const { range, startDate } = resolveRange(rangeInput);
  const selectedModuleId = moduleId || '';
  const selectedDepth = DEPTHS.includes(depth) ? depth : '';
  const match = buildEventMatch({ startDate, moduleId: selectedModuleId, depth: selectedDepth });

  const [learningPathDoc, summaryAgg, depthAgg, moduleAgg, lessonStatsAgg, funnelAgg, dwellAgg, conceptAgg] =
    await Promise.all([
      reporting.findMainLearningPath(),
      reporting.learningPathSummary(match),
      reporting.learningPathDepthSwitches(match),
      reporting.learningPathModuleEngagement(match),
      reporting.learningPathLessonStats(match),
      reporting.learningPathFunnel(match),
      reporting.learningPathDwellByModule(match),
      reporting.learningPathConceptEngagement(match),
    ]);

  const lookup = buildLearningPathLookup(learningPathDoc);
  const conceptIds = conceptAgg.map((row) => String(row._id || '').trim()).filter(Boolean);
  if (conceptIds.length) await backfillConceptTitles(lookup, conceptIds);

  const summary = summaryAgg[0] || {};
  const uniqueSessions = countDistinct(summary.uniqueSessions);
  const dwellByModule = new Map(
    dwellAgg.map((row) => [String(row._id || ''), row.avgDurationSec || 0]),
  );

  return {
    range,
    filters: { moduleId: selectedModuleId || null, depth: selectedDepth || null },
    filterOptions: {
      modules: lookup.modules.map((module) => ({
        moduleId: String(module.id),
        moduleTitle: module.titleVi || module.title || String(module.id),
        moduleOrder: Number(module.order) || null,
      })),
      depths: DEPTH_FILTER_OPTIONS,
    },
    summary: {
      totalEvents: summary.totalEvents || 0,
      uniqueUsers: countDistinct(summary.uniqueUsers),
      uniqueSessions,
      lessonOpens: summary.lessonOpens || 0,
      lessonCompletions: summary.lessonCompletions || 0,
      lessonMastered: summary.lessonMastered || 0,
      depthSwitches: summary.depthSwitches || 0,
    },
    funnel: buildFunnel(funnelAgg[0], uniqueSessions),
    depthDistribution: depthAgg.map((row) => ({ depth: row._id, switches: row.switches })),
    moduleEngagement: moduleAgg.map((row) => buildModuleEngagement(row, lookup, dwellByModule)),
    topLessons: buildTopLessons(lessonStatsAgg, lookup),
    topConcepts: conceptAgg.map((row) => {
      const conceptId = String(row._id || '').trim();
      return {
        conceptId,
        conceptTitle: resolveConceptTitle(conceptId, lookup),
        opens: row.opens || 0,
        uniqueUsers: countDistinct(row.users),
      };
    }),
  };
}

function buildFunnel(counts = {}, uniqueSessions) {
  return withConversionRates([
    { step: 'session_started', label: 'Phiên học', value: uniqueSessions },
    { step: 'module_viewed', label: 'Xem module', value: counts.moduleViewed || 0 },
    { step: 'node_viewed', label: 'Xem chủ đề', value: counts.nodeViewed || 0 },
    { step: 'lesson_opened', label: 'Mở bài học', value: counts.lessonOpened || 0 },
    { step: 'lesson_completed', label: 'Hoàn thành bài', value: counts.lessonCompleted || 0 },
    { step: 'lesson_mastered', label: 'Vượt kiểm tra (mastery)', value: counts.lessonMastered || 0 },
  ]);
}

function buildModuleEngagement(row, lookup, dwellByModule) {
  const moduleId = String(row._id || '');
  const info = lookup.moduleMap.get(moduleId);
  return {
    moduleId,
    moduleTitle: info?.moduleTitle || moduleId,
    moduleOrder: info?.moduleOrder || null,
    opens: row.opens || 0,
    uniqueSessions: countDistinct(row.sessions),
    uniqueUsers: countDistinct(row.users),
    avgDwellSec: Math.round((dwellByModule.get(moduleId) || 0) * 10) / 10,
  };
}

/** Ranked by absolute drop-off, so the biggest content leaks surface first. */
function buildTopLessons(rows, lookup) {
  return rows
    .map((row) => {
      const lessonId = String(row._id?.lessonId || '');
      const display = resolveLessonDisplay(lessonId, row._id?.moduleId, row._id?.nodeId, lookup);
      const opens = row.opens || 0;
      const completions = row.completions || 0;
      const dropOffCount = Math.max(0, opens - completions);
      return {
        lessonId,
        moduleId: row._id?.moduleId || null,
        nodeId: row._id?.nodeId || null,
        moduleTitle: display.moduleTitle,
        nodeTitle: display.nodeTitle,
        lessonTitle: display.lessonTitle,
        locationLabel: display.locationLabel,
        depth: display.depth,
        depthLabel: display.depthLabel,
        opens,
        uniqueSessions: countDistinct(row.openSessions),
        completions,
        uniqueCompletionSessions: countDistinct(row.completionSessions),
        dropOffCount,
        dropOffRate: toRate(dropOffCount, Math.max(1, opens)),
      };
    })
    .sort(
      (a, b) =>
        b.dropOffCount - a.dropOffCount ||
        b.completions - a.completions ||
        b.opens - a.opens,
    )
    .slice(0, TOP_LESSONS_LIMIT);
}

module.exports = { getLearningPathAnalytics };
