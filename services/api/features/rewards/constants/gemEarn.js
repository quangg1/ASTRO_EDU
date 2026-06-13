/**
 * Tier-1 Gem economy constants (đổi = PR + review).
 * Align docs/plans/gem-rewards-system.md §8.5 — admin không chỉnh trực tiếp các giá trị này.
 */

/** Tối thiểu thời gian đọc bài để được thưởng hoàn thành có dwell (giây) */
const DWELL_SEC_MIN = 60;

/** Tối thiểu xem một beat Deep History trước khi thưởng (giây) */
const DH_BEAT_DWELL_SEC_MIN = 30;

/** Tối đa số beat được thưởng gem trong một session Deep History */
const DH_MAX_BEAT_REWARDS_PER_SESSION = 5;

/**
 * GEM_EARN — base amounts trước seasonal multiplier (Tầng 2).
 * @readonly
 */
const GEM_EARN = Object.freeze({
  lp_complete_dwell: 5,
  depth_beginner: 8,
  depth_explorer: 14,
  depth_researcher: 20,
  recall_quiz_first: 8,
  recall_quiz_retry: 3,
  scene_entity_discovered: 5,
  scene_contextual_quiz_passed: 3,
  dh_beat_dwell: 4,
  dh_site_opened: 2,
  community_post: 3,
  community_helpful_answer: 8,
  community_helpful_vote: 1,
  onboarding_complete: 5,
  astronomy_event_observed: 20,
});

/** Tối thiểu ký tự (title + nội dung plain) để thưởng đăng bài thảo luận */
const COMMUNITY_POST_MIN_CHARS = 80;

/** Cooldown giữa hai lần đăng bài (ms) — chống spam */
const COMMUNITY_POST_COOLDOWN_MS = 10 * 60 * 1000;

/** Cap earn forum (Tầng 1 — align gem-economy-expansion.md §3.2) */
const COMMUNITY_CAP = Object.freeze({
  postsPerUtcDay: 1,
  helpfulAnswersPerWeek: 3,
  helpfulVotesPerWeek: 5,
});

/** Map depth LP → GEM_EARN key */
const DEPTH_TO_EARN_FIELD = Object.freeze({
  beginner: 'depth_beginner',
  explorer: 'depth_explorer',
  researcher: 'depth_researcher',
});

/** Giữ tên cũ cho code rewardEngine — giá trị lấy từ GEM_EARN */
function depthGemsMap() {
  return {
    beginner: GEM_EARN.depth_beginner,
    explorer: GEM_EARN.depth_explorer,
    researcher: GEM_EARN.depth_researcher,
  };
}

/** Chi phí mở showcase (sink) — có thể override giá hiển thị qua ShopItem/admin sau */
const GEM_SPEND_SHOWCASE = Object.freeze({
  story: 40,
  orbit: 55,
});

/**
 * Bounds cho GemRuntimeConfig (Tầng 2) — server validate mọi PATCH.
 */
const RUNTIME_CONFIG_BOUNDS = Object.freeze({
  seasonalMultiplier: { min: 1, max: 3 },
  weeklyDeepHistoryCap: { min: 20, max: 100 },
  voucherMaxDiscountPct: { min: 0, max: 20 },
  /** Override giá shop so với basePriceGem */
  priceOverrideBand: { minFactor: 0.7, maxFactor: 1.3 },
  manualAdjustMaxGemPerAction: 500,
  /** Flag “cần phê duyệt phụ”; MVP: reject cứng nếu vượt */
  manualAdjustApprovalThreshold: 500,
});

const DH_EARN_REASONS = Object.freeze(['dh_beat_dwell', 'dh_site_opened']);

const COMMUNITY_EARN_REASONS = Object.freeze([
  'community_post',
  'community_helpful_answer',
  'community_helpful_vote',
]);

module.exports = {
  DWELL_SEC_MIN,
  DH_BEAT_DWELL_SEC_MIN,
  DH_MAX_BEAT_REWARDS_PER_SESSION,
  DH_EARN_REASONS,
  COMMUNITY_EARN_REASONS,
  COMMUNITY_POST_MIN_CHARS,
  COMMUNITY_POST_COOLDOWN_MS,
  COMMUNITY_CAP,
  GEM_EARN,
  DEPTH_TO_EARN_FIELD,
  depthGemsMap,
  GEM_SPEND_SHOWCASE,
  RUNTIME_CONFIG_BOUNDS,
};
