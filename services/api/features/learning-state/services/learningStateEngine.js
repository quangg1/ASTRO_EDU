const { randomUUID } = require('crypto');
const LearningStateEvent = require('../models/LearningStateEvent');
const LessonLearningState = require('../models/LessonLearningState');
const ConceptLearningState = require('../models/ConceptLearningState');
const {
  getProfile: getAgentProfile,
  setPreferredDepth,
  markLearningStateMigrated,
} = require('../../agent/services/learnerAgentProfileService');
const {
  getLearnerProgress,
  markLessonCompletedAndMastered,
} = require('../../learning-path/services/learningPathQueryService');
const { getLearningPathLessonIndex } = require('../../agent/services/toolAuthorizers/lpCurriculum');
const showcaseContent = require('../../content3d/services/showcaseContentService');
const {
  markExploreContextualQuizDayCompleted,
} = require('../../content3d/services/exploreContextualQuizService');
const {
  applyRecallQuizToLesson,
  applyConceptQuizToConcept,
  applyExploreFocusToConcept,
  applyExploreQuizToLesson,
  applyDwellToLesson,
  applyRevisitToLesson,
  isSpacedReviewDue,
  spacedReviewPriority,
} = require('./learningStateScoring');

const DEPTH_ORDER = ['beginner', 'explorer', 'researcher'];

/** @returns {{ conceptIds: string[], lessonIds: string[] }} */
async function resolveEntityCurriculumLinks(entityId) {
  const eid = String(entityId || '').trim();
  if (!eid) return { conceptIds: [], lessonIds: [] };

  const content = await showcaseContent.getEntityContent(eid);
  let conceptIds = Array.isArray(content?.panelConfig?.conceptTagIds)
    ? content.panelConfig.conceptTagIds.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  let lessonIds = Array.isArray(content?.panelConfig?.lessonIds)
    ? content.panelConfig.lessonIds.map((x) => String(x || '').trim()).filter(Boolean)
    : [];

  if (!conceptIds.length && !lessonIds.length) {
    const bundle = await showcaseContent.getCatalogBundle();
    const row = (bundle?.catalog || []).find((c) => String(c?.id || '').trim() === eid);
    conceptIds = Array.isArray(row?.panelConfig?.conceptTagIds)
      ? row.panelConfig.conceptTagIds.map((x) => String(x || '').trim()).filter(Boolean)
      : [];
    lessonIds = Array.isArray(row?.panelConfig?.lessonIds)
      ? row.panelConfig.lessonIds.map((x) => String(x || '').trim()).filter(Boolean)
      : [];
  }

  return { conceptIds: [...new Set(conceptIds)], lessonIds: [...new Set(lessonIds)] };
}

/**
 * Cập nhật concept + lesson state từ Explore quiz (không ghi mastery LP server).
 */
async function applyExploreQuizOutcome(userId, { entityId, allCorrect, score, conceptIds, lessonIds }) {
  let cids = (conceptIds || []).map((x) => String(x).trim()).filter(Boolean);
  let lids = (lessonIds || []).map((x) => String(x).trim()).filter(Boolean);
  if (!cids.length && entityId) {
    const links = await resolveEntityCurriculumLinks(entityId);
    cids = links.conceptIds;
    if (!lids.length) lids = links.lessonIds;
  }
  const scoreNum = Number(score) || (allCorrect ? 100 : 0);
  for (const cid of cids) {
    const concept = await getOrCreateConceptState(userId, cid);
    applyConceptQuizToConcept(concept, { passed: Boolean(allCorrect), score: scoreNum });
    await concept.save();
  }
  for (const lid of lids) {
    const lesson = await getOrCreateLessonState(userId, lid);
    applyExploreQuizToLesson(lesson, { allCorrect: Boolean(allCorrect), score: scoreNum });
    await lesson.save();
  }
  if (entityId) {
    await markExploreContextualQuizDayCompleted(userId, String(entityId).trim());
  }
}

async function applyExploreFocusOutcome(userId, { entityId, dwellSec, conceptIds }) {
  let cids = (conceptIds || []).map((x) => String(x).trim()).filter(Boolean);
  if (!cids.length && entityId) {
    const links = await resolveEntityCurriculumLinks(entityId);
    cids = links.conceptIds;
  }
  for (const cid of cids) {
    const concept = await getOrCreateConceptState(userId, cid);
    applyExploreFocusToConcept(concept, { dwellSec });
    await concept.save();
  }
}

async function getOrCreateLessonState(userId, lessonId) {
  const lid = String(lessonId || '').trim();
  let row = await LessonLearningState.findOne({ userId, lessonId: lid });
  if (!row) {
    row = await LessonLearningState.create({ userId, lessonId: lid });
  }
  return row;
}

async function getOrCreateConceptState(userId, conceptId) {
  const cid = String(conceptId || '').trim();
  let row = await ConceptLearningState.findOne({ userId, conceptId: cid });
  if (!row) {
    row = await ConceptLearningState.create({ userId, conceptId: cid });
  }
  return row;
}

/**
 * One-time import misconceptions + spaced + quiz streak from LearnerAgentProfile.
 */
async function migrateLegacyProfile(userId) {
  const profile = await getAgentProfile(userId);
  if (!profile) return;

  const quizMap = profile.coach?.quizFailStreakByLesson || {};
  for (const [lessonId, fails] of Object.entries(quizMap)) {
    const n = Number(fails) || 0;
    if (n < 1) continue;
    const lesson = await getOrCreateLessonState(userId, lessonId);
    lesson.quizFailStreak = n;
    await lesson.save();
  }

  const reviewMap = profile.spacedReview?.lastReviewByLesson || {};
  for (const [lessonId, entry] of Object.entries(reviewMap)) {
    if (!entry || typeof entry !== 'object') continue;
    const lesson = await getOrCreateLessonState(userId, lessonId);
    lesson.spacedReview = {
      masteredAt: entry.masteredAt ? new Date(entry.masteredAt) : lesson.spacedReview?.masteredAt,
      lastReviewAt: entry.lastReviewAt ? new Date(entry.lastReviewAt) : null,
      reviewCount: Number(entry.reviewCount) || 0,
    };
    if (entry.masteredAt || lesson.mastery >= 80) {
      lesson.masteredAt = lesson.masteredAt || new Date(entry.masteredAt || Date.now());
      lesson.mastery = Math.max(lesson.mastery || 0, 80);
    }
    await lesson.save();
  }

  for (const m of profile.misconceptions || []) {
    const conceptId = String(m.conceptId || '').trim();
    const tag = String(m.tag || '').trim();
    if (!tag) continue;
    if (conceptId) {
      const concept = await getOrCreateConceptState(userId, conceptId);
      const list = concept.misconceptions || [];
      if (!list.find((x) => x.tag === tag)) {
        list.push({
          tag,
          count: Number(m.count) || 1,
          source: m.source === 'agent_inferred' ? 'agent' : 'quiz',
          lastAt: m.lastAt ? new Date(m.lastAt) : new Date(),
        });
        concept.misconceptions = list.slice(-8);
        await concept.save();
      }
    }
  }

  await markLearningStateMigrated(userId);
}

async function ensureMigrated(userId) {
  const profile = await getAgentProfile(userId, {
    projection: 'learningStateMigratedAt misconceptions coach spacedReview',
  });
  if (!profile) return;
  if (profile.learningStateMigratedAt) return;
  const hasLegacy =
    (profile.misconceptions?.length || 0) > 0 ||
    Object.keys(profile.coach?.quizFailStreakByLesson || {}).length > 0 ||
    Object.keys(profile.spacedReview?.lastReviewByLesson || {}).length > 0;
  if (!hasLegacy) {
    await markLearningStateMigrated(userId);
    return;
  }
  await migrateLegacyProfile(userId);
}

/**
 * @param {string} userId
 * @param {object} event
 */
async function recordLearningEvent(userId, event) {
  if (!userId) return null;
  await ensureMigrated(userId);

  const eventId = String(event.eventId || randomUUID()).trim();
  const type = String(event.type || '').trim();
  if (!type) return null;

  const existing = await LearningStateEvent.findOne({ userId, eventId }).lean();
  if (existing) return { duplicate: true, eventId };

  const doc = {
    eventId,
    userId,
    type,
    surface: event.surface || 'lp',
    lessonId: event.lessonId ? String(event.lessonId).trim() : null,
    conceptId: event.conceptId ? String(event.conceptId).trim() : null,
    entityId: event.entityId ? String(event.entityId).trim() : null,
    payload: event.payload && typeof event.payload === 'object' ? event.payload : {},
    source: event.source || 'api',
    timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
  };
  await LearningStateEvent.create(doc);

  if (type === 'recall_quiz_submitted' || (type === 'quiz_submitted' && doc.lessonId)) {
    const passed = Boolean(doc.payload.passed);
    const score = Number(doc.payload.score) || 0;
    const lesson = await getOrCreateLessonState(userId, doc.lessonId);
    applyRecallQuizToLesson(lesson, { passed, score });
    await lesson.save();
    if (passed && doc.lessonId) {
      await syncLessonMasteryToUserProgress(userId, doc.lessonId);
    }
  }

  if (type === 'concept_quiz_submitted' && doc.conceptId) {
    const passed = Boolean(doc.payload.passed);
    const score = Number(doc.payload.score) || 0;
    const concept = await getOrCreateConceptState(userId, doc.conceptId);
    applyConceptQuizToConcept(concept, {
      passed,
      score,
      misconceptionTag: doc.payload.misconceptionTag,
    });
    await concept.save();
    if (doc.lessonId) {
      const lesson = await getOrCreateLessonState(userId, doc.lessonId);
      if (passed) {
        lesson.mastery = Math.max(lesson.mastery || 0, Math.min(100, score));
      }
      await lesson.save();
    }
  }

  if (type === 'lesson_dwell' && doc.lessonId) {
    const sec = Number(doc.payload.dwellSec) || 0;
    if (sec > 0) {
      const lesson = await getOrCreateLessonState(userId, doc.lessonId);
      applyDwellToLesson(lesson, sec);
      await lesson.save();
    }
  }

  if (type === 'lesson_revisit' && doc.lessonId) {
    const lesson = await getOrCreateLessonState(userId, doc.lessonId);
    applyRevisitToLesson(lesson);
    await lesson.save();
  }

  if (type === 'spaced_review_completed' && doc.lessonId) {
    const lesson = await getOrCreateLessonState(userId, doc.lessonId);
    lesson.spacedReview = lesson.spacedReview || {};
    lesson.spacedReview.lastReviewAt = new Date();
    lesson.spacedReview.reviewCount = (Number(lesson.spacedReview.reviewCount) || 0) + 1;
    lesson.lastEvidenceAt = new Date();
    await lesson.save();
  }

  if (type === 'lesson_mastered' && doc.lessonId) {
    const lesson = await getOrCreateLessonState(userId, doc.lessonId);
    lesson.mastery = 100;
    lesson.masteredAt = lesson.masteredAt || new Date();
    lesson.spacedReview = lesson.spacedReview || {};
    lesson.spacedReview.masteredAt = lesson.spacedReview.masteredAt || new Date();
    lesson.lastEvidenceAt = new Date();
    await lesson.save();
    await syncLessonMasteryToUserProgress(userId, doc.lessonId);
  }

  if (type === 'explore_entity_focus' && doc.entityId) {
    await applyExploreFocusOutcome(userId, {
      entityId: doc.entityId,
      dwellSec: Number(doc.payload.dwellSec) || 0,
      conceptIds: doc.payload.conceptIds,
    });
  }

  if (type === 'explore_entity_discovered' && doc.entityId) {
    await applyExploreFocusOutcome(userId, {
      entityId: doc.entityId,
      dwellSec: 3,
      conceptIds: doc.payload.conceptIds,
    });
  }

  if (type === 'explore_quiz_submitted' && doc.entityId) {
    const allCorrect = Boolean(doc.payload.allCorrect);
    const total = Number(doc.payload.totalCount) || 0;
    const correct = Number(doc.payload.correctCount) || 0;
    const score =
      Number(doc.payload.score) ||
      (total > 0 ? Math.round((correct / total) * 100) : allCorrect ? 100 : 0);
    await applyExploreQuizOutcome(userId, {
      entityId: doc.entityId,
      allCorrect,
      score,
      conceptIds: doc.payload.conceptIds,
      lessonIds: doc.payload.lessonIds,
    });
  }

  if (type === 'depth_preference_set') {
    const depth = String(doc.payload.depth || '').toLowerCase();
    if (DEPTH_ORDER.includes(depth)) {
      await setPreferredDepth(userId, depth);
    }
  }

  return { eventId, type };
}

async function syncLessonMasteryToUserProgress(userId, lessonId) {
  await markLessonCompletedAndMastered(userId, lessonId);
}

async function recordQuizOutcome(userId, { lessonId, passed, misconceptionTag, score }) {
  if (!lessonId) return null;
  const event = await recordLearningEvent(userId, {
    type: 'recall_quiz_submitted',
    lessonId,
    payload: {
      passed,
      misconceptionTag,
      score: score ?? (passed ? 100 : 0),
    },
    source: 'agent_quiz_outcome',
  });
  if (!passed && misconceptionTag) {
    const { byId } = await getLearningPathLessonIndex();
    const hit = byId.get(String(lessonId).trim());
    const conceptId = hit?.conceptIds?.[0];
    if (conceptId) {
      const concept = await getOrCreateConceptState(userId, conceptId);
      applyConceptQuizToConcept(concept, {
        passed: false,
        score: score ?? 0,
        misconceptionTag,
      });
      await concept.save();
    }
  }
  return event;
}

async function recordRecallQuizSubmit(userId, lessonId, graded) {
  const passed = graded.total > 0 && graded.correct === graded.total;
  return recordLearningEvent(userId, {
    type: 'recall_quiz_submitted',
    lessonId,
    payload: { passed, score: graded.score, correctCount: graded.correct, total: graded.total },
    source: 'recall_quiz',
  });
}

async function recordConceptQuizSubmit(userId, { lessonId, conceptId, passed, score }) {
  return recordLearningEvent(userId, {
    type: 'concept_quiz_submitted',
    lessonId,
    conceptId,
    payload: { passed, score },
    source: 'concept_quiz',
  });
}

async function getWeakLessons(userId, opts = {}) {
  if (!userId) return [];
  await ensureMigrated(userId);
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const query = { userId, struggleScore: { $gt: 0 }, lastEvidenceAt: { $gte: since7d } };
  if (opts.lessonId) {
    const focus = await LessonLearningState.findOne({ userId, lessonId: opts.lessonId }).lean();
    const rows = await LessonLearningState.find(query).sort({ struggleScore: -1 }).limit(8).lean();
    if (focus?.struggleScore > 0) {
      const rest = rows.filter((r) => r.lessonId !== focus.lessonId);
      return [focus, ...rest].slice(0, 8).map(formatWeakLesson);
    }
  }
  const rows = await LessonLearningState.find(query).sort({ struggleScore: -1 }).limit(8).lean();
  return rows.map(formatWeakLesson);
}

function formatWeakLesson(row) {
  return {
    lessonId: row.lessonId,
    signals: row.signals || [],
    score: row.struggleScore || 0,
    dwellSec: row.dwellSecTotal7d,
    revisitCount: row.revisitCount7d,
    quizFailCount: row.quizFailStreak,
    mastery: row.mastery,
    nextBestAction: row.nextBestAction,
  };
}

async function getSpacedReviewDue(userId, opts = {}) {
  const limit = Math.min(8, Math.max(1, Number(opts.limit) || 5));
  if (!userId) return { dueLessons: [], totalDue: 0 };
  await ensureMigrated(userId);

  const [progress, lessons, { byId }] = await Promise.all([
    getLearnerProgress(userId),
    LessonLearningState.find({
      userId,
      $or: [{ masteredAt: { $ne: null } }, { mastery: { $gte: 80 } }],
    }).lean(),
    getLearningPathLessonIndex(),
  ]);

  const masteredSet = new Set(
    (progress?.learningPathMasteredLessonIds || []).map(String).filter(Boolean),
  );
  for (const l of lessons) masteredSet.add(l.lessonId);

  const due = [];
  for (const lessonId of masteredSet) {
    const row =
      lessons.find((l) => l.lessonId === lessonId) ||
      (await LessonLearningState.findOne({ userId, lessonId }).lean());
    if (!row) continue;
    if (!isSpacedReviewDue(row)) continue;
    const meta = byId.get(lessonId);
    if (!meta) continue;
    const reviewCount = Number(row.spacedReview?.reviewCount) || 0;
    const elapsed = spacedReviewPriority(row);
    due.push({
      lessonId,
      title: meta.titleVi || lessonId,
      moduleId: meta.moduleId,
      nodeId: meta.nodeId,
      dueReason: reviewCount === 0 ? 'first_review' : 'scheduled',
      daysSinceReview: Math.floor(elapsed * (reviewCount === 0 ? 1 : 3)),
      priority: elapsed,
    });
  }

  due.sort((a, b) => b.priority - a.priority);
  const dueLessons = due.slice(0, limit).map(({ priority, ...rest }) => rest);
  return { dueLessons, totalDue: due.length };
}

async function recordSpacedReview(userId, lessonId) {
  return recordLearningEvent(userId, {
    type: 'spaced_review_completed',
    lessonId,
    source: 'spaced_review',
  });
}

async function evaluateDepthSuggestion(userId, ctx = {}) {
  if (!userId) return null;
  await ensureMigrated(userId);
  const current = String(ctx.currentDepth || 'beginner').toLowerCase();
  if (!DEPTH_ORDER.includes(current)) return null;

  const [profile, weak] = await Promise.all([
    getAgentProfile(userId, { projection: 'depthPrefs' }),
    getWeakLessons(userId, { lessonId: ctx.lessonId }),
  ]);

  const lessonId = ctx.lessonId ? String(ctx.lessonId) : '';
  const top = weak[0];
  const onThisLesson = top?.lessonId === lessonId;

  const prev = (d) => {
    const i = DEPTH_ORDER.indexOf(d);
    return i > 0 ? DEPTH_ORDER[i - 1] : null;
  };
  const next = (d) => {
    const i = DEPTH_ORDER.indexOf(d);
    return i >= 0 && i < DEPTH_ORDER.length - 1 ? DEPTH_ORDER[i + 1] : null;
  };

  if (onThisLesson && top?.signals?.includes('quiz_fail_streak')) {
    const easier = prev(current);
    if (easier) {
      return {
        suggestedDepth: easier,
        reason: 'Bạn gặp khó với quiz ở mức này — thử mức giải thích nhẹ hơn?',
        confidence: 'medium',
      };
    }
  }

  if (onThisLesson && top?.signals?.includes('high_dwell') && !top?.signals?.includes('quiz_fail_streak')) {
    const harder = next(current);
    if (harder) {
      return {
        suggestedDepth: harder,
        reason: 'Bạn dành nhiều thời gian cho bài — có thể thử mức sâu hơn khi đã sẵn sàng.',
        confidence: 'low',
      };
    }
  }

  const preferred = profile?.depthPrefs?.preferredDepth;
  if (preferred && preferred !== current && DEPTH_ORDER.includes(preferred)) {
    return {
      suggestedDepth: preferred,
      reason: 'Bạn thường học hiệu quả hơn ở mức depth này.',
      confidence: 'low',
    };
  }

  return null;
}

async function recordDepthPreference(userId, depth) {
  return recordLearningEvent(userId, {
    type: 'depth_preference_set',
    payload: { depth },
    source: 'depth_preference',
  });
}

async function getMisconceptions(userId, limit = 12) {
  if (!userId) return [];
  await ensureMigrated(userId);
  const concepts = await ConceptLearningState.find({ userId })
    .sort({ updatedAt: -1 })
    .limit(20)
    .lean();
  const out = [];
  for (const c of concepts) {
    for (const m of c.misconceptions || []) {
      out.push({
        conceptId: c.conceptId,
        tag: m.tag,
        count: m.count,
        source: m.source,
        lastAt: m.lastAt,
      });
    }
  }
  return out.slice(-limit);
}

async function getLessonState(userId, lessonId) {
  if (!userId || !lessonId) return null;
  await ensureMigrated(userId);
  return LessonLearningState.findOne({ userId, lessonId: String(lessonId).trim() }).lean();
}

async function getConceptState(userId, conceptId) {
  if (!userId || !conceptId) return null;
  await ensureMigrated(userId);
  return ConceptLearningState.findOne({ userId, conceptId: String(conceptId).trim() }).lean();
}

/**
 * Snapshot cho agent widget + contextBuilder.
 */
async function getLearnerSnapshot(userId) {
  if (!userId) {
    return {
      completedLessonCount: 0,
      masteredLessonCount: 0,
      recentLessonIds: [],
      weakLessons: [],
      misconceptions: [],
      spacedReviewDue: { dueLessons: [], totalDue: 0 },
      depthSuggestion: null,
      preferredDepth: null,
      learningStates: { lessonCount: 0, conceptCount: 0 },
    };
  }
  await ensureMigrated(userId);

  const [progress, weakLessons, misconceptions, spacedReviewDue, depthSuggestion, profile, lessonCount, conceptCount] =
    await Promise.all([
      getLearnerProgress(userId),
      getWeakLessons(userId),
      getMisconceptions(userId),
      getSpacedReviewDue(userId, { limit: 3 }),
      evaluateDepthSuggestion(userId, {}),
      getAgentProfile(userId, { projection: 'depthPrefs' }),
      LessonLearningState.countDocuments({ userId }),
      ConceptLearningState.countDocuments({ userId }),
    ]);

  return {
    completedLessonCount: progress?.learningPathCompletedLessonIds?.length ?? 0,
    masteredLessonCount: progress?.learningPathMasteredLessonIds?.length ?? 0,
    recentLessonIds: progress?.learningPathLastLessonId
      ? [progress.learningPathLastLessonId]
      : [],
    weakLessons,
    misconceptions,
    spacedReviewDue,
    depthSuggestion,
    preferredDepth: profile?.depthPrefs?.preferredDepth ?? null,
    learningStates: { lessonCount, conceptCount },
  };
}

/**
 * Bundle cho buildAgentContext.
 */
async function getAgentLearningContext(userId, sessionContext = {}) {
  const lessonId =
    typeof sessionContext?.lessonId === 'string' ? sessionContext.lessonId.trim() : '';
  const conceptIds = Array.isArray(sessionContext?.conceptIds)
    ? sessionContext.conceptIds
    : [];

  const [weakLessons, spacedReviewDue, depthSuggestion, misconceptions, lessonState] =
    await Promise.all([
      getWeakLessons(userId, { lessonId: lessonId || undefined }),
      getSpacedReviewDue(userId, { limit: 5 }),
      evaluateDepthSuggestion(userId, {
        lessonId: lessonId || undefined,
        currentDepth: sessionContext?.depth,
      }),
      getMisconceptions(userId),
      lessonId ? getLessonState(userId, lessonId) : Promise.resolve(null),
    ]);

  let conceptStates = [];
  if (conceptIds.length) {
    conceptStates = await ConceptLearningState.find({
      userId,
      conceptId: { $in: conceptIds.slice(0, 8) },
    }).lean();
  } else if (lessonState && sessionContext?.currentLesson?.conceptIds?.length) {
    const ids = sessionContext.currentLesson.conceptIds.slice(0, 5);
    conceptStates = await ConceptLearningState.find({
      userId,
      conceptId: { $in: ids },
    }).lean();
  }

  return {
    weakLessons,
    spacedReviewDue,
    depthSuggestion,
    misconceptions,
    lessonState,
    conceptStates,
    currentConceptIds: conceptStates.map((c) => c.conceptId),
  };
}

/**
 * Bridge từ LearningPathEvent raw ingest.
 */
async function bridgeLearningPathEvents(events) {
  if (!Array.isArray(events) || !events.length) return;
  for (const ev of events) {
    const userId = String(ev.userId || '').trim();
    const lessonId = String(ev.lessonId || '').trim();
    if (!userId) continue;

    if (ev.eventName === 'lp_lesson_dwell') {
      const sec = Number(ev.activeSec ?? ev.durationSec ?? 0);
      if (lessonId && sec >= 60) {
        await recordLearningEvent(userId, {
          eventId: `bridge_dwell_${ev.eventId}`,
          type: 'lesson_dwell',
          lessonId,
          payload: { dwellSec: sec },
          source: 'lp_event_bridge',
          timestamp: ev.timestamp,
        });
      }
    }

    if (ev.eventName === 'lp_lesson_opened' && lessonId) {
      await recordLearningEvent(userId, {
        eventId: `bridge_revisit_${ev.eventId}`,
        type: 'lesson_revisit',
        lessonId,
        source: 'lp_event_bridge',
        timestamp: ev.timestamp,
      });
    }

    if (ev.eventName === 'lp_lesson_mastered' && lessonId) {
      const lesson = await getOrCreateLessonState(userId, lessonId);
      lesson.mastery = 100;
      lesson.masteredAt = lesson.masteredAt || new Date();
      lesson.spacedReview = lesson.spacedReview || {};
      lesson.spacedReview.masteredAt = lesson.spacedReview.masteredAt || new Date();
      lesson.lastEvidenceAt = new Date();
      await lesson.save();
    }

    const meta = ev.metadata && typeof ev.metadata === 'object' ? ev.metadata : {};
    const entityId = String(meta.entityId || ev.entityId || '').trim();

    if (ev.eventName === 'scene_entity_focus_duration' && entityId) {
      const lsEventId =
        typeof meta.learningStateEventId === 'string' && meta.learningStateEventId.trim()
          ? meta.learningStateEventId.trim()
          : `bridge_explore_focus_${ev.eventId}`;
      if (await LearningStateEvent.findOne({ userId, eventId: lsEventId }).lean()) continue;
      await recordLearningEvent(userId, {
        eventId: lsEventId,
        type: 'explore_entity_focus',
        entityId,
        surface: 'explore',
        payload: {
          dwellSec: Number(meta.durationSec) || 0,
          conceptIds: Array.isArray(meta.conceptIds) ? meta.conceptIds : undefined,
        },
        source: 'lp_event_bridge',
        timestamp: ev.timestamp,
      });
    }

    if (ev.eventName === 'scene_entity_discovered' && entityId) {
      const lsEventId =
        typeof meta.learningStateEventId === 'string' && meta.learningStateEventId.trim()
          ? meta.learningStateEventId.trim()
          : `bridge_explore_disc_${ev.eventId}`;
      if (await LearningStateEvent.findOne({ userId, eventId: lsEventId }).lean()) continue;
      await recordLearningEvent(userId, {
        eventId: lsEventId,
        type: 'explore_entity_discovered',
        entityId,
        surface: 'explore',
        payload: { conceptIds: Array.isArray(meta.conceptIds) ? meta.conceptIds : undefined },
        source: 'lp_event_bridge',
        timestamp: ev.timestamp,
      });
    }

    if (ev.eventName === 'scene_contextual_quiz_passed' && entityId) {
      const correctCount = Number(meta.correctCount) || 0;
      const totalCount = Number(meta.totalCount) || 0;
      const allCorrect = totalCount > 0 && correctCount === totalCount;
      const lsEventId =
        typeof meta.learningStateEventId === 'string' && meta.learningStateEventId.trim()
          ? meta.learningStateEventId.trim()
          : `bridge_explore_quiz_${ev.eventId}`;
      if (await LearningStateEvent.findOne({ userId, eventId: lsEventId }).lean()) continue;
      await recordLearningEvent(userId, {
        eventId: lsEventId,
        type: 'explore_quiz_submitted',
        entityId,
        surface: 'explore',
        payload: {
          allCorrect,
          correctCount,
          totalCount,
          score: totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 100,
          conceptIds: Array.isArray(meta.conceptIds) ? meta.conceptIds : undefined,
          lessonIds: Array.isArray(meta.lessonIds) ? meta.lessonIds : undefined,
        },
        source: 'lp_event_bridge',
        timestamp: ev.timestamp,
      });
    }

    if (ev.eventName === 'scene_contextual_quiz_prompted' && entityId) {
      /* telemetry only — state updates on submit/pass */
    }
  }
}

module.exports = {
  recordLearningEvent,
  recordQuizOutcome,
  recordRecallQuizSubmit,
  recordConceptQuizSubmit,
  recordSpacedReview,
  recordDepthPreference,
  applyExploreQuizOutcome,
  applyExploreFocusOutcome,
  resolveEntityCurriculumLinks,
  getWeakLessons,
  getSpacedReviewDue,
  evaluateDepthSuggestion,
  getMisconceptions,
  getLessonState,
  getConceptState,
  getLearnerSnapshot,
  getAgentLearningContext,
  bridgeLearningPathEvents,
  ensureMigrated,
  syncLessonMasteryToUserProgress,
};
