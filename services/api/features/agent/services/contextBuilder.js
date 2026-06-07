const UserProgress = require('../../learning-path/models/UserProgress');
const LearnerAgentProfile = require('../models/LearnerAgentProfile');
const { getCachedContext } = require('./contextCache');
const { getLearningPathLessonIndex } = require('./toolAuthorizers/lpCurriculum');
const { buildNarrativeContext } = require('./narrativeContextService');
const {
  getAgentLearningContext,
  getLearnerSnapshot: getEngineLearnerSnapshot,
} = require('../../learning-state/services/learningStateEngine');
const {
  enrichAgentContextExtras,
  buildCohortContext,
  buildLearnerEconomyCtx,
} = require('./agentContextEnrichment');
const {
  buildEarthFossilContext,
  shouldBuildEarthFossilContext,
} = require('./earthFossilContextService');
const { buildExploreSceneContext } = require('./exploreSceneContextService');
const { buildShowcaseAgentContext } = require('./showcaseNavigationService');
const UserReward = require('../../rewards/models/UserReward');
const { getWalletLearnerMeta } = require('../../rewards/services/learnerTierService');
const LearnerProfile = require('../../users/models/LearnerProfile');

/**
 * @param {string|null|undefined} userId
 * @param {Record<string, unknown>|null|undefined} sessionContext
 * @param {Record<string, unknown>|null|undefined} learnerSnapshot
 * @param {string|undefined} userRole
 */
async function buildAgentContext(userId, sessionContext, learnerSnapshot, userRole) {
  const cached = userId ? getCachedContext(userId, sessionContext || {}) : null;
  if (cached) return cached;

  const clientSnapshot = learnerSnapshot && typeof learnerSnapshot === 'object' ? learnerSnapshot : {};
  const snapshotPreferred = clientSnapshot.preferredDepth;

  let progress = null;
  if (userId) {
    progress = await UserProgress.findOne({ userId })
      .select(
        'learningPathCompletedLessonIds learningPathMasteredLessonIds learningPathLastLessonId',
      )
      .lean();
  }

  const completedCount = progress?.learningPathCompletedLessonIds?.length ?? 0;
  const masteredCount = progress?.learningPathMasteredLessonIds?.length ?? 0;
  const recentLessonIds = Array.isArray(clientSnapshot.recentLessonIds)
    ? clientSnapshot.recentLessonIds.slice(0, 5)
    : progress?.learningPathLastLessonId
      ? [progress.learningPathLastLessonId]
      : [];

  let currentLesson = null;
  let activeSection = null;
  const lessonId =
    typeof sessionContext?.lessonId === 'string' ? sessionContext.lessonId.trim() : '';
  if (lessonId) {
    const { byId } = await getLearningPathLessonIndex();
    const hit = byId.get(lessonId);
    if (hit) {
      currentLesson = {
        lessonId: hit.lessonId,
        title: hit.titleVi,
        sectionTitles: hit.sectionTitles,
        moduleId: hit.moduleId,
        nodeId: hit.nodeId,
        conceptIds: hit.conceptIds || [],
      };
      const sectionId =
        typeof sessionContext?.activeSectionId === 'string'
          ? sessionContext.activeSectionId.trim()
          : '';
      if (sectionId && Array.isArray(hit.sections)) {
        const sec = hit.sections.find((s) => s.id === sectionId);
        if (sec) {
          activeSection = {
            sectionId: sec.id,
            title: sec.title || sessionContext?.activeSectionTitle || '',
            excerpt:
              typeof sessionContext?.activeSectionExcerpt === 'string' &&
              sessionContext.activeSectionExcerpt.trim()
                ? sessionContext.activeSectionExcerpt.trim().slice(0, 600)
                : sec.excerpt || '',
          };
        }
      }
      if (!activeSection && typeof sessionContext?.activeSectionExcerpt === 'string') {
        activeSection = {
          sectionId: sectionId || null,
          title: sessionContext?.activeSectionTitle || '',
          excerpt: sessionContext.activeSectionExcerpt.trim().slice(0, 600),
        };
      }
    }
  }

  let learningCtx = null;
  if (userId) {
    learningCtx = await getAgentLearningContext(userId, {
      lessonId,
      depth: sessionContext?.depth,
      currentLesson: currentLesson
        ? { conceptIds: currentLesson.conceptIds }
        : null,
    });
  }
  let weakLessons = Array.isArray(clientSnapshot.weakLessons)
    ? clientSnapshot.weakLessons
    : learningCtx?.weakLessons || [];

  const surface = sessionContext?.surface ?? 'general';
  const exploreNarrative =
    surface === 'explore' || sessionContext?.entityId || sessionContext?.narrativeKey;
  const exploreEarthFossils = shouldBuildEarthFossilContext(sessionContext || {});
  const exploreShowcase = surface === 'explore';
  const [narrativeContext, earthFossilContext, showcaseContext] = await Promise.all([
    exploreNarrative ? buildNarrativeContext(sessionContext || {}) : Promise.resolve(null),
    exploreEarthFossils
      ? buildEarthFossilContext(sessionContext || {})
      : Promise.resolve(null),
    exploreShowcase ? buildShowcaseAgentContext(sessionContext || {}) : Promise.resolve(null),
  ]);

  const spacedReviewDue = learningCtx?.spacedReviewDue ?? { dueLessons: [], totalDue: 0 };
  const depthSuggestion = learningCtx?.depthSuggestion ?? null;

  const built = {
    surface,
    pathname: sessionContext?.pathname ?? '/',
    lessonId: lessonId || null,
    lessonTitle: sessionContext?.lessonTitle ?? currentLesson?.title ?? null,
    moduleId: sessionContext?.moduleId ?? currentLesson?.moduleId ?? null,
    nodeId: sessionContext?.nodeId ?? currentLesson?.nodeId ?? null,
    depth: sessionContext?.depth ?? null,
    courseSlug: sessionContext?.courseSlug ?? null,
    narrativeKey: sessionContext?.narrativeKey ?? null,
    planet: sessionContext?.planet ?? null,
    stageTimeMa: sessionContext?.stageTimeMa ?? null,
    entityId: sessionContext?.entityId ?? null,
    coachTrigger: sessionContext?.coachTrigger ?? null,
    currentLesson,
    activeSection,
    narrativeContext,
    earthFossilContext,
    showcaseContext,
    exploreSceneContext: buildExploreSceneContext(sessionContext || {}),
    spacedReviewDue,
    depthSuggestion,
    progress: {
      completedLessonCount: completedCount,
      masteredLessonCount: masteredCount,
      recentLessonIds,
    },
    weakLessons,
    misconceptions: learningCtx?.misconceptions ?? [],
    lessonLearningState: learningCtx?.lessonState ?? null,
    conceptLearningStates: learningCtx?.conceptStates ?? [],
    tutoringStyle: 'balanced',
    learnerInterests: [],
    preferredDepth:
      snapshotPreferred === 'beginner' ||
      snapshotPreferred === 'explorer' ||
      snapshotPreferred === 'researcher'
        ? snapshotPreferred
        : null,
  };

  if (userId) {
    const [profile, learnerProfile] = await Promise.all([
      LearnerAgentProfile.findOne({ userId })
        .select('misconceptions proceduralMemory depthPrefs')
        .lean(),
      LearnerProfile.findOne({ userId }).select('interests').lean(),
    ]);
    if (Array.isArray(learnerProfile?.interests) && learnerProfile.interests.length) {
      built.learnerInterests = learnerProfile.interests
        .map((x) => String(x || '').trim())
        .filter(Boolean)
        .slice(0, 8);
    }
    if (!built.misconceptions?.length && profile?.misconceptions?.length) {
      built.misconceptions = profile.misconceptions.slice(-12);
    }
    const pref = profile?.depthPrefs?.preferredDepth;
    if (pref === 'beginner' || pref === 'explorer' || pref === 'researcher') {
      built.preferredDepth = pref;
    }
    const style = profile?.proceduralMemory?.tutoringStyle;
    if (style === 'hint_first' || style === 'explain_first' || style === 'balanced') {
      built.tutoringStyle = style;
    } else {
      built.tutoringStyle = 'balanced';
    }
  }

  const extras = await enrichAgentContextExtras(userId, sessionContext || {}, userRole);
  built.activeCohort = extras.activeCohort;
  built.conceptGraphCtx = extras.conceptGraphCtx;
  built.learnerEconomy = extras.learnerEconomy;
  built.studioAssist = extras.studioAssist;

  return built;
}

async function buildLearnerSnapshot(userId) {
  if (!userId) {
    return {
      completedLessonCount: 0,
      masteredLessonCount: 0,
      recentLessonIds: [],
      weakLessons: [],
      spacedReviewDue: { dueLessons: [], totalDue: 0 },
    };
  }
  const [engineSnap, economy, activeCohort] = await Promise.all([
    getEngineLearnerSnapshot(userId),
    buildLearnerEconomyCtx(userId, {}),
    buildCohortContext(userId, {}),
  ]);
  const weakLessons = engineSnap.weakLessons;
  const spacedReviewDue = engineSnap.spacedReviewDue;
  const depthSuggestion = engineSnap.depthSuggestion;

  let learnerTier = null;
  let gemBalance = economy?.gemBalance ?? 0;
  if (!economy) {
    const ur = await UserReward.findOne({ userId }).select('gemBalance totalGemsEarned').lean();
    gemBalance = ur?.gemBalance ?? 0;
    const tierMeta = getWalletLearnerMeta(ur?.totalGemsEarned ?? 0);
    learnerTier = {
      id: tierMeta.current?.id,
      nameVi: tierMeta.current?.nameVi,
      emoji: tierMeta.current?.emoji,
    };
  } else {
    learnerTier = economy.learnerTier;
  }

  return {
    completedLessonCount: engineSnap.completedLessonCount,
    masteredLessonCount: engineSnap.masteredLessonCount,
    recentLessonIds: engineSnap.recentLessonIds,
    weakLessons,
    misconceptions: engineSnap.misconceptions ?? [],
    preferredDepth: engineSnap.preferredDepth ?? null,
    spacedReviewDue,
    depthSuggestion,
    learningStates: engineSnap.learningStates,
    gemBalance,
    learnerTier,
    nearbyUnlocks: economy?.nearbyUnlocks ?? [],
    activeCohort: activeCohort
      ? {
          cohortTitle: activeCohort.cohortTitle,
          pendingAssignments: activeCohort.pendingAssignments,
          upcomingDeadlineCount: activeCohort.upcomingDeadlines?.length ?? 0,
        }
      : null,
    coachChips: await buildSnapshotChips(
      weakLessons,
      { learningPathLastLessonId: engineSnap.recentLessonIds?.[0] },
      spacedReviewDue,
    ),
  };
}

async function buildSnapshotChips(weakLessons, progress, spacedReviewDue) {
  const { byId } = await getLearningPathLessonIndex();
  const chips = [];
  const topDue = spacedReviewDue?.dueLessons?.[0];
  if (topDue?.lessonId) {
    chips.push({
      label: `Ôn lại: ${topDue.title}`,
      action: 'spaced_review',
      lessonId: topDue.lessonId,
      moduleId: topDue.moduleId,
      nodeId: topDue.nodeId,
    });
  }
  if (weakLessons?.length) {
    chips.push({ label: 'Hỏi trợ lý (gợi mở)', action: 'open_agent' });
    const top = weakLessons[0];
    if (top?.lessonId && top.lessonId !== topDue?.lessonId) {
      const meta = byId.get(top.lessonId);
      chips.push({
        label: 'Ôn bài đang khó',
        action: 'review_lesson',
        lessonId: top.lessonId,
        moduleId: meta?.moduleId,
        nodeId: meta?.nodeId,
      });
    }
  }
  const last = progress?.learningPathLastLessonId;
  if (last && !weakLessons?.some((w) => w.lessonId === last) && last !== topDue?.lessonId) {
    const meta = byId.get(last);
    chips.push({
      label: 'Tiếp tục bài gần nhất',
      action: 'continue_last',
      lessonId: last,
      moduleId: meta?.moduleId,
      nodeId: meta?.nodeId,
    });
  }
  return chips.slice(0, 4);
}

module.exports = { buildAgentContext, buildLearnerSnapshot };
