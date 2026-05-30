/**
 * Tier-1 Gem economy constants (đổi = PR + review).
 * Align docs/plans/gem-rewards-system.md §8.5 — admin không chỉnh trực tiếp các giá trị này.
 */

/** Tối thiểu thời gian đọc bài để được thưởng hoàn thành có dwell (giây) */
const DWELL_SEC_MIN = 60;

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
  /** Tier C DH — handlers chưa wire hết; constants sẵn cho G1 */
  dh_beat_dwell: 4,
  dh_site_opened: 2,
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

module.exports = {
  DWELL_SEC_MIN,
  GEM_EARN,
  DEPTH_TO_EARN_FIELD,
  depthGemsMap,
  GEM_SPEND_SHOWCASE,
  RUNTIME_CONFIG_BOUNDS,
};
