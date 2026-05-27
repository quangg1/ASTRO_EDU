const UserProgress = require('../../learning-path/models/UserProgress');
const LearnerAgentProfile = require('../models/LearnerAgentProfile');
const { getCachedContext } = require('./contextCache');
const { getLearningPathLessonIndex } = require('./toolAuthorizers/lpCurriculum');
const { detectWeakLessons } = require('./struggleDetector');
const { buildNarrativeContext } = require('./narrativeContextService');
const { getSpacedReviewDue } = require('./spacedReviewService');
const { evaluateDepthSuggestion } = require('./depthAdaptationService');

/**
 * @param {string|null|undefined} userId
 * @param {Record<string, unknown>|null|undefined} sessionContext
 * @param {Record<string, unknown>|null|undefined} learnerSnapshot
 */
async function buildAgentContext(userId, sessionContext, learnerSnapshot) {
  const cached = userId ? getCachedContext(userId, sessionContext || {}) : null;
  if (cached) return cached;

  const clientSnapshot = learnerSnapshot && typeof learnerSnapshot === 'object' ? learnerSnapshot : {};

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

  let weakLessons = Array.isArray(clientSnapshot.weakLessons) ? clientSnapshot.weakLessons : [];
  if (!weakLessons.length && userId) {
    weakLessons = await detectWeakLessons(userId, { lessonId: lessonId || undefined });
  }

  const surface = sessionContext?.surface ?? 'general';
  let narrativeContext = null;
  if (surface === 'explore' || sessionContext?.entityId || sessionContext?.narrativeKey) {
    narrativeContext = await buildNarrativeContext(sessionContext || {});
  }

  let spacedReviewDue = { dueLessons: [], totalDue: 0 };
  let depthSuggestion = null;
  if (userId) {
    const [spaced, depth] = await Promise.all([
      getSpacedReviewDue(userId, { limit: 5 }),
      evaluateDepthSuggestion(userId, {
        lessonId: lessonId || undefined,
        currentDepth: sessionContext?.depth,
      }),
    ]);
    spacedReviewDue = spaced;
    depthSuggestion = depth;
  }

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
    spacedReviewDue,
    depthSuggestion,
    progress: {
      completedLessonCount: completedCount,
      masteredLessonCount: masteredCount,
      recentLessonIds,
    },
    weakLessons,
    misconceptions: [],
  };

  if (userId) {
    const profile = await LearnerAgentProfile.findOne({ userId })
      .select('misconceptions')
      .lean();
    if (profile?.misconceptions?.length) {
      built.misconceptions = profile.misconceptions.slice(-12);
    }
  }

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
  const [progress, weakLessons, profile, spacedReviewDue, depthSuggestion] = await Promise.all([
    UserProgress.findOne({ userId }).lean(),
    detectWeakLessons(userId),
    LearnerAgentProfile.findOne({ userId }).select('misconceptions depthPrefs').lean(),
    getSpacedReviewDue(userId, { limit: 3 }),
    evaluateDepthSuggestion(userId, {}),
  ]);
  return {
    completedLessonCount: progress?.learningPathCompletedLessonIds?.length ?? 0,
    masteredLessonCount: progress?.learningPathMasteredLessonIds?.length ?? 0,
    recentLessonIds: progress?.learningPathLastLessonId
      ? [progress.learningPathLastLessonId]
      : [],
    weakLessons,
    misconceptions: profile?.misconceptions?.slice(-12) ?? [],
    preferredDepth: profile?.depthPrefs?.preferredDepth ?? null,
    spacedReviewDue,
    depthSuggestion,
    coachChips: await buildSnapshotChips(weakLessons, progress, spacedReviewDue),
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
