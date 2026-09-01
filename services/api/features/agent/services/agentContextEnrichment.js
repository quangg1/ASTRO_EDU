const { getLearnerProgress } = require('../../learning-path/services/learningPathQueryService');
const { listConceptsByIds } = require('../../concepts/services/conceptService');
const { getBalanceSummary } = require('../../rewards/services/gemWalletService');
const {
  listUnlocksForEntity,
} = require('../../rewards/services/showcaseUnlockService');
const { listNearbyShopItems } = require('../../rewards/services/shopCatalogService');
const { getWalletLearnerMeta } = require('../../rewards/services/learnerTierService');
const { GEM_SPEND_SHOWCASE } = require('../../rewards/constants/gemEarn');
const { listTopDiscussionThreads } = require('../../community/services/communityReadService');
const { getLearningPathLessonIndex } = require('./toolAuthorizers/lpCurriculum');
const {
  buildCohortContext,
  buildStudioAssistContext,
} = require('../repositories/agentContextReadModel');

function extractBeatConfidence(beat) {
  if (!beat || typeof beat !== 'object') return null;
  const env = beat.environment;
  if (env && typeof env === 'object' && env.confidence) {
    return String(env.confidence).toLowerCase();
  }
  if (beat.confidence) return String(beat.confidence).toLowerCase();
  return null;
}

function confidenceDisclaimerVi(confidence) {
  const c = String(confidence || '').toLowerCase();
  if (c === 'consensus') {
    return 'Độ tin cậy khoa học: consensus — có thể trình bày tự tin hơn nhưng vẫn nêu nguồn khi cần.';
  }
  if (c === 'model') {
    return 'Độ tin cậy: model — nhấn mạnh đây là mô hình/giả thuyết, không khẳng định như số đo trực tiếp.';
  }
  if (c === 'estimate' || c === 'hypothesis') {
    return 'Độ tin cậy: ước lượng/hypothesis — nói rõ giới hạn và không gán nhầm thành consensus.';
  }
  return null;
}

/**
 * @param {string|null} userId
 * @param {Record<string, unknown>|null} sessionContext
 */
async function buildConceptGraphCtx(userId, sessionContext) {
  const lessonId =
    typeof sessionContext?.lessonId === 'string' ? sessionContext.lessonId.trim() : '';
  const { byId, concepts: lpConcepts } = await getLearningPathLessonIndex();

  let targetConceptIds = [];
  if (lessonId) {
    targetConceptIds = byId.get(lessonId)?.conceptIds || [];
  }
  if (!targetConceptIds.length) return null;

  const masteredSet = new Set();
  if (userId) {
    const progress = await getLearnerProgress(userId);
    for (const lid of progress?.learningPathMasteredLessonIds || []) {
      const hit = byId.get(lid);
      for (const cid of hit?.conceptIds || []) masteredSet.add(cid);
    }
  }

  let allIds = [...new Set(targetConceptIds)];
  const firstBatch = await listConceptsByIds(allIds);
  for (const c of firstBatch) {
    for (const p of c.prerequisites || []) allIds.push(String(p));
  }
  allIds = [...new Set(allIds)];

  const conceptDocs = await listConceptsByIds(allIds);
  const docById = Object.fromEntries(conceptDocs.map((c) => [c.id, c]));

  const currentConcepts = [];
  const missingPrerequisites = [];
  const frontier = [];

  for (const cid of targetConceptIds.slice(0, 4)) {
    const doc = docById[cid];
    const title = doc?.title || lpConcepts.get(cid)?.title || cid;
    const prereqs = (doc?.prerequisites || []).map(String);
    const unmet = prereqs.filter((p) => !masteredSet.has(p));
    currentConcepts.push({
      conceptId: cid,
      title,
      unmetPrerequisiteCount: unmet.length,
    });
    for (const p of unmet) {
      if (missingPrerequisites.some((m) => m.conceptId === p)) continue;
      const pdoc = docById[p];
      missingPrerequisites.push({
        conceptId: p,
        title: pdoc?.title || lpConcepts.get(p)?.title || p,
        forConceptId: cid,
      });
    }
    if (!unmet.length && !masteredSet.has(cid)) {
      frontier.push({ conceptId: cid, title });
    }
  }

  return {
    currentConcepts,
    missingPrerequisites: missingPrerequisites.slice(0, 6),
    frontier: frontier.slice(0, 4),
    masteredConceptCount: masteredSet.size,
  };
}

/**
 * @param {string|null} userId
 * @param {Record<string, unknown>|null} sessionContext
 */
async function buildLearnerEconomyCtx(userId, sessionContext) {
  if (!userId) return null;

  const summary = await getBalanceSummary(userId);
  const balance = summary?.gemBalance ?? 0;
  const earned = summary?.totalGemsEarned ?? 0;
  const tierMeta = getWalletLearnerMeta(earned);

  const nearbyUnlocks = [];
  const entityId =
    typeof sessionContext?.entityId === 'string' ? sessionContext.entityId.trim() : '';

  if (entityId) {
    const unlocks = await listUnlocksForEntity(userId, entityId);
    const hasStory = unlocks.some((u) => u.contentType === 'story');
    const hasOrbit = unlocks.some((u) => u.contentType === 'orbit');
    if (!hasStory && balance < GEM_SPEND_SHOWCASE.story) {
      const gap = GEM_SPEND_SHOWCASE.story - balance;
      if (gap > 0 && gap <= 80) {
        nearbyUnlocks.push({
          kind: 'showcase_story',
          entityId,
          costGem: GEM_SPEND_SHOWCASE.story,
          gemsNeeded: gap,
          labelVi: `Mở story showcase (còn ${gap} gem)`,
        });
      }
    }
    if (!hasOrbit && balance < GEM_SPEND_SHOWCASE.orbit) {
      const gap = GEM_SPEND_SHOWCASE.orbit - balance;
      if (gap > 0 && gap <= 80 && nearbyUnlocks.length < 2) {
        nearbyUnlocks.push({
          kind: 'showcase_orbit',
          entityId,
          costGem: GEM_SPEND_SHOWCASE.orbit,
          gemsNeeded: gap,
          labelVi: `Mở orbit showcase (còn ${gap} gem)`,
        });
      }
    }
  }

  if (nearbyUnlocks.length < 3) {
    const shopItems = await listNearbyShopItems({
      balance,
      maxGap: 80,
      limit: 3 - nearbyUnlocks.length,
    });
    for (const item of shopItems) {
      nearbyUnlocks.push({
        kind: 'shop',
        skuId: item.skuId,
        costGem: item.basePriceGem,
        gemsNeeded: item.basePriceGem - balance,
        labelVi: item.nameVi || item.skuId,
      });
    }
  }

  return {
    gemBalance: balance,
    totalGemsEarned: earned,
    learnerTier: {
      id: tierMeta.current?.id,
      nameVi: tierMeta.current?.nameVi,
      emoji: tierMeta.current?.emoji,
      progressPct: tierMeta.progressPct,
      gemsToNextTier: tierMeta.gemsToNext,
      nextTierNameVi: tierMeta.next?.nameVi ?? null,
    },
    nearbyUnlocks: nearbyUnlocks.slice(0, 3),
  };
}

/**
 * @param {{ lessonId?: string, lessonSlug?: string, courseSlug?: string, limit?: number, q?: string }} opts
 */
async function searchCommunityThreadsForAgent(opts = {}) {
  const q = typeof opts.q === 'string' ? opts.q.trim() : '';
  if (q.length >= 2) {
    const { searchCommunityByQueryForAgent } = require('./contentSearchService');
    return searchCommunityByQueryForAgent({ q, limit: opts.limit });
  }

  const rows = await listTopDiscussionThreads({
    limit: opts.limit || 3,
    lessonSlug: opts.lessonSlug,
    lessonId: opts.lessonId,
    courseSlug: opts.courseSlug,
  });
  return rows.map(({ content: _c, ...rest }) => rest);
}

/**
 * @param {string|null} userId
 * @param {Record<string, unknown>|null} sessionContext
 * @param {string|undefined} userRole
 */
async function enrichAgentContextExtras(userId, sessionContext, userRole) {
  const [activeCohort, conceptGraphCtx, learnerEconomy, studioAssist] = await Promise.all([
    buildCohortContext(userId, sessionContext),
    buildConceptGraphCtx(userId, sessionContext),
    buildLearnerEconomyCtx(userId, sessionContext),
    buildStudioAssistContext(sessionContext, userRole),
  ]);
  return { activeCohort, conceptGraphCtx, learnerEconomy, studioAssist };
}

module.exports = {
  extractBeatConfidence,
  confidenceDisclaimerVi,
  buildCohortContext,
  buildConceptGraphCtx,
  buildLearnerEconomyCtx,
  buildStudioAssistContext,
  searchCommunityThreadsForAgent,
  enrichAgentContextExtras,
};
