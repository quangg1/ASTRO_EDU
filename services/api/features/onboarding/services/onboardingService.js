const UserOnboardingProfile = require('../models/UserOnboardingProfile');
const GemTransaction = require('../../rewards/models/GemTransaction');
const { GEM_EARN } = require('../../rewards/constants/gemEarn');
const { getCachedSeasonalMultiplier, scaleEarn } = require('../../rewards/services/gemRuntimeConfigService');
const { applyGemEarn } = require('../../rewards/services/rewardEngine');
const { recordDepthPreference } = require('../../agent/services/depthAdaptationService');
const {
  VALID_TOPIC_IDS,
  ONBOARDING_INTENTS,
  EXPERIENCE_LEVELS,
  MAX_TOPIC_PICKS,
} = require('../constants/onboardingOptions');
const { buildOnboardingRecommendations } = require('./onboardingRecommendations');

const VALID_INTENTS = new Set(ONBOARDING_INTENTS.map((x) => x.id));
const VALID_EXPERIENCE = new Set(EXPERIENCE_LEVELS.map((x) => x.id));

function experienceToDepth(level) {
  return EXPERIENCE_LEVELS.find((x) => x.id === level)?.preferredDepth || 'beginner';
}

function normalizeTopicIds(raw) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const t of raw) {
    const id = String(t || '').trim();
    if (!VALID_TOPIC_IDS.includes(id) || out.includes(id)) continue;
    out.push(id);
    if (out.length >= MAX_TOPIC_PICKS) break;
  }
  return out;
}

function serializeProfile(doc) {
  if (!doc) return null;
  return {
    completed: Boolean(doc.completedAt),
    skipped: Boolean(doc.skipped),
    completedAt: doc.completedAt || null,
    primaryIntent: doc.primaryIntent || null,
    topicIds: doc.topicIds || [],
    experienceLevel: doc.experienceLevel || null,
    preferredDepth: doc.preferredDepth || null,
    primaryTopicId: doc.primaryTopicId || null,
    primaryHref: doc.primaryHref || '/dashboard',
    starterLessonId: doc.starterLessonId || null,
    recommendations: doc.recommendations || [],
  };
}

async function getOnboardingStatus(userId) {
  const doc = await UserOnboardingProfile.findOne({ userId }).lean();
  return serializeProfile(doc);
}

async function onboardingGemAlreadyAwarded(userId) {
  return GemTransaction.exists({ userId, reason: 'onboarding_complete' });
}

async function completeOnboarding(userId, body, { skip = false } = {}) {
  if (!userId) {
    const err = new Error('Thiếu userId');
    err.status = 401;
    throw err;
  }

  let existing = await UserOnboardingProfile.findOne({ userId });
  if (existing?.completedAt) {
    return { profile: serializeProfile(existing.toObject()), gemReward: null, alreadyCompleted: true };
  }

  let primaryIntent = 'mixed';
  let topicIds = ['astrophysics'];
  let experienceLevel = 'beginner';
  let preferredDepth = 'beginner';

  if (!skip) {
    primaryIntent = String(body?.primaryIntent || '').trim();
    if (!VALID_INTENTS.has(primaryIntent)) {
      const err = new Error('Mục tiêu onboarding không hợp lệ');
      err.status = 400;
      throw err;
    }
    topicIds = normalizeTopicIds(body?.topicIds);
    if (!topicIds.length) {
      const err = new Error('Chọn ít nhất một chủ đề quan tâm');
      err.status = 400;
      throw err;
    }
    experienceLevel = String(body?.experienceLevel || '').trim();
    if (!VALID_EXPERIENCE.has(experienceLevel)) {
      const err = new Error('Trình độ không hợp lệ');
      err.status = 400;
      throw err;
    }
    preferredDepth = experienceToDepth(experienceLevel);
  }

  const built = await buildOnboardingRecommendations({
    primaryIntent,
    topicIds,
    experienceLevel,
  });
  await recordDepthPreference(userId, preferredDepth);

  const payload = {
    userId,
    completedAt: new Date(),
    skipped: Boolean(skip),
    primaryIntent,
    topicIds,
    experienceLevel,
    preferredDepth,
    primaryTopicId: built.primaryTopicId,
    primaryHref: built.primaryHref,
    starterLessonId: built.starter?.lessonId || null,
    starterModuleId: built.starter?.moduleId || null,
    starterNodeId: built.starter?.nodeId || null,
    recommendations: built.recommendations,
  };

  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
  } else {
    existing = await UserOnboardingProfile.create(payload);
  }

  let gemReward = null;
  if (!skip && !(await onboardingGemAlreadyAwarded(userId))) {
    const seasonalMult = await getCachedSeasonalMultiplier();
    const amt = scaleEarn(GEM_EARN.onboarding_complete, seasonalMult);
    if (amt > 0) {
      const agg = await applyGemEarn(userId, amt, {
        reason: 'onboarding_complete',
        metadata: { primaryIntent, topicIds, seasonalMultiplier: seasonalMult },
      });
      if (agg) {
        gemReward = {
          gemsEarned: amt,
          newBalance: agg.updated?.gemBalance ?? 0,
          label: 'Hoàn thành onboarding cá nhân hóa',
        };
      }
    }
  }

  return {
    profile: serializeProfile(existing.toObject()),
    gemReward,
    alreadyCompleted: false,
  };
}

module.exports = {
  getOnboardingStatus,
  completeOnboarding,
  ONBOARDING_INTENTS,
  EXPERIENCE_LEVELS,
  VALID_TOPIC_IDS,
  MAX_TOPIC_PICKS,
};
