/**
 * Learner tiers — progression từ totalGemsEarned (gem đã kiếm, không trừ khi tiêu).
 * Perk checkout: một nguồn giảm / đơn (coupon | gem voucher | learner_tier).
 */

const LEARNER_TIERS = [
  {
    id: 'observer',
    order: 0,
    emoji: '🌑',
    nameVi: 'Observer',
    taglineVi: 'Bắt đầu khám phá vũ trụ tri thức.',
    minGemsEarned: 0,
    maxGemsEarned: 99,
    checkoutDiscountPct: 0,
    /** SKU trang trí tự unlock khi lên hạng (để trống nếu chưa seed). */
    decorationSkus: [],
    perks: [
      { id: 'baseline', labelVi: 'Truy cập lộ trình & khóa miễn phí', highlight: false },
      { id: 'gem_earn', labelVi: 'Kiếm gem khi học tích cực', highlight: false },
    ],
  },
  {
    id: 'navigator',
    order: 1,
    emoji: '🔭',
    nameVi: 'Navigator',
    taglineVi: 'Đã có thói quen học — ước ~5–25 ngày tích cực.',
    minGemsEarned: 100,
    maxGemsEarned: 499,
    checkoutDiscountPct: 0,
    decorationSkus: ['tier_navigator_trail'],
    perks: [
      { id: 'badge', labelVi: 'Huy hiệu Navigator trên hồ sơ', highlight: true },
      { id: 'trail', labelVi: 'Mở khóa 1 hiệu ứng trail avatar', highlight: true },
    ],
  },
  {
    id: 'astronomer',
    order: 2,
    emoji: '🌟',
    nameVi: 'Astronomer',
    taglineVi: 'Học viên cam kết — sweet spot đa số người học.',
    minGemsEarned: 500,
    maxGemsEarned: 1499,
    checkoutDiscountPct: 5,
    decorationSkus: ['tier_astronomer_frame'],
    perks: [
      { id: 'frame', labelVi: 'Khung avatar Astronomer', highlight: true },
      {
        id: 'checkout_5',
        labelVi: 'Giảm 5% khóa trả phí (hạng — không trừ gem)',
        highlight: true,
      },
    ],
  },
  {
    id: 'pioneer',
    order: 3,
    emoji: '🚀',
    nameVi: 'Pioneer',
    taglineVi: 'Power user — ~75–200 ngày học tích cực.',
    minGemsEarned: 1500,
    maxGemsEarned: 3999,
    checkoutDiscountPct: 10,
    decorationSkus: ['tier_pioneer_cosmetic'],
    perks: [
      { id: 'cosmetic', labelVi: 'Trang trí Pioneer độc quyền', highlight: true },
      {
        id: 'checkout_10',
        labelVi: 'Giảm 10% khóa trả phí (hạng — không trừ gem)',
        highlight: true,
      },
      { id: 'beta', labelVi: 'Ưu tiên tính năng beta (theo đợt mời)', highlight: false },
    ],
  },
  {
    id: 'voyager',
    order: 4,
    emoji: '✨',
    nameVi: 'Voyager',
    taglineVi: 'Cộng đồng hạt nhân — 200+ ngày học tích cực.',
    minGemsEarned: 4000,
    maxGemsEarned: null,
    checkoutDiscountPct: 15,
    decorationSkus: ['tier_voyager_badge'],
    perks: [
      { id: 'badge_v', labelVi: 'Huy hiệu Voyager độc quyền', highlight: true },
      {
        id: 'checkout_15',
        labelVi: 'Giảm 15% khóa trả phí (hạng — không trừ gem)',
        highlight: true,
      },
      { id: 'featured', labelVi: 'Cơ hội nổi bật trên cộng đồng', highlight: false },
    ],
  },
];

function getLearnerTierByEarned(totalGemsEarned) {
  const total = Math.max(0, Math.round(Number(totalGemsEarned) || 0));
  let current = LEARNER_TIERS[0];
  for (const tier of LEARNER_TIERS) {
    if (total >= tier.minGemsEarned) current = tier;
  }
  return current;
}

function getNextLearnerTier(tierId) {
  const idx = LEARNER_TIERS.findIndex((t) => t.id === tierId);
  if (idx < 0 || idx >= LEARNER_TIERS.length - 1) return null;
  return LEARNER_TIERS[idx + 1];
}

function getLearnerTierProgress(totalGemsEarned) {
  const total = Math.max(0, Math.round(Number(totalGemsEarned) || 0));
  const current = getLearnerTierByEarned(total);
  const next = getNextLearnerTier(current.id);
  if (!next) {
    return {
      current: formatTierPublic(current),
      next: null,
      gemsEarned: total,
      gemsToNext: 0,
      progressPct: 100,
    };
  }
  const span = next.minGemsEarned - current.minGemsEarned;
  const into = total - current.minGemsEarned;
  const progressPct = span > 0 ? Math.min(100, Math.round((into / span) * 100)) : 100;
  return {
    current: formatTierPublic(current),
    next: formatTierPublic(next),
    gemsEarned: total,
    gemsToNext: Math.max(0, next.minGemsEarned - total),
    progressPct,
  };
}

function formatTierPublic(tier) {
  return {
    id: tier.id,
    order: tier.order,
    emoji: tier.emoji,
    nameVi: tier.nameVi,
    taglineVi: tier.taglineVi,
    minGemsEarned: tier.minGemsEarned,
    maxGemsEarned: tier.maxGemsEarned,
    checkoutDiscountPct: tier.checkoutDiscountPct,
    perks: tier.perks,
  };
}

function listLearnerTiersPublic() {
  return LEARNER_TIERS.map(formatTierPublic);
}

function compareTierOrder(aId, bId) {
  const a = LEARNER_TIERS.find((t) => t.id === aId);
  const b = LEARNER_TIERS.find((t) => t.id === bId);
  return (a?.order ?? 0) - (b?.order ?? 0);
}

module.exports = {
  LEARNER_TIERS,
  getLearnerTierByEarned,
  getNextLearnerTier,
  getLearnerTierProgress,
  listLearnerTiersPublic,
  formatTierPublic,
  compareTierOrder,
};
