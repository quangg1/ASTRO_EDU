const {
  promoCodeRepository,
  promoRedemptionRepository,
} = require('../repositories/promoRepository');
const {
  listPublishedPricingByIds,
} = require('../../courses/services/coursePricingLookupService');
const { AppError } = require('../../../shared/errors');

/** Quét tối đa bấy nhiêu campaign để tìm mã còn lượt dùng. */
const MAX_ACTIVE_SCAN = 30;

function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '');
}

function isWithinWindow(doc, now = new Date()) {
  if (doc.startsAt && now < new Date(doc.startsAt)) return false;
  if (doc.endsAt && now > new Date(doc.endsAt)) return false;
  return true;
}

function appliesToCourse(doc, courseId) {
  const ids = Array.isArray(doc.courseIds) ? doc.courseIds.map(String) : [];
  if (!ids.length) return true;
  return ids.includes(String(courseId));
}

function buildDiscountLabelVi(p) {
  if (p.discountType === 'percent') return `Giảm ${Math.round(p.discountValue)}%`;
  return `Giảm ${Math.round(p.discountValue).toLocaleString('vi-VN')}đ`;
}

/** Nội dung hiển thị cho user — tự sinh tiêu đề nếu admin chưa nhập banner. */
function buildPromoDisplay(p) {
  const discountLabelVi = buildDiscountLabelVi(p);
  const bannerTitleVi = String(p.bannerTitleVi || '').trim() || `Ưu đãi ${discountLabelVi}`;
  const bannerBodyVi =
    String(p.bannerBodyVi || '').trim() || `Nhập mã ${p.code} khi thanh toán khóa học trả phí.`;
  return {
    code: p.code,
    promoCodeId: String(p._id),
    labelVi: p.labelVi || p.code,
    eventKey: p.eventKey || p.code.toLowerCase(),
    bannerTitleVi,
    bannerBodyVi,
    bannerAccentColor: p.bannerAccentColor || '#06b6d4',
    discountType: p.discountType,
    discountValue: p.discountValue,
    discountLabelVi,
    endsAt: p.endsAt ? new Date(p.endsAt).toISOString() : null,
    appliesToAll: !Array.isArray(p.courseIds) || p.courseIds.length === 0,
  };
}

function activePromoQuery(now = new Date()) {
  return {
    active: true,
    $and: [
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
    ],
  };
}

function isPromoAvailable(p, now = new Date()) {
  if (!isWithinWindow(p, now)) return false;
  if (p.maxRedemptions != null && p.redemptionCount >= p.maxRedemptions) return false;
  return true;
}

function computePromoDiscount(listPrice, promo) {
  const price = Math.round(Number(listPrice) || 0);
  if (price <= 0) {
    return { discountAmount: 0, finalAmount: 0, discountPct: 0 };
  }
  if (promo.discountType === 'fixed') {
    const discountAmount = Math.min(price, Math.round(Number(promo.discountValue) || 0));
    const finalAmount = Math.max(0, price - discountAmount);
    const discountPct = price > 0 ? Math.round((discountAmount / price) * 100) : 0;
    return { discountAmount, finalAmount, discountPct };
  }
  const pct = Math.min(100, Math.max(0, Math.round(Number(promo.discountValue) || 0)));
  const discountAmount = Math.min(price, Math.round((price * pct) / 100));
  const finalAmount = Math.max(0, price - discountAmount);
  return { discountAmount, finalAmount, discountPct: pct };
}

/**
 * @param {{ code: string, courseId: string, userId: string, forDisplay?: boolean }} params
 */
async function resolvePromoForCheckout({ code, courseId, userId, forDisplay = false }) {
  const normalized = normalizeCode(code);
  if (!normalized) {
    throw new AppError(400, 'PROMO_REQUIRED', 'Nhập mã giảm giá');
  }
  const promo = await promoCodeRepository.findByCode(normalized);
  if (!promo || !promo.active) {
    throw new AppError(404, 'PROMO_INVALID', 'Mã giảm giá không hợp lệ hoặc đã hết hạn');
  }
  if (!isWithinWindow(promo)) {
    throw new AppError(400, 'PROMO_EXPIRED', 'Mã giảm giá chưa có hiệu lực hoặc đã hết hạn');
  }
  if (!appliesToCourse(promo, courseId)) {
    throw new AppError(400, 'PROMO_NOT_APPLICABLE', 'Mã không áp dụng cho khóa học này');
  }
  if (promo.maxRedemptions != null && promo.redemptionCount >= promo.maxRedemptions) {
    throw new AppError(400, 'PROMO_EXHAUSTED', 'Mã đã hết lượt sử dụng');
  }
  const maxPerUser = Math.max(1, promo.maxPerUser || 1);
  const usedByUser = await promoRedemptionRepository.countForUser(promo._id, String(userId));
  if (usedByUser >= maxPerUser) {
    throw new AppError(400, 'PROMO_ALREADY_USED', 'Bạn đã dùng mã này');
  }

  const payload = {
    promoCodeId: String(promo._id),
    code: promo.code,
    labelVi: promo.labelVi || promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    eventKey: promo.eventKey || null,
    bannerTitleVi: promo.bannerTitleVi || '',
    bannerBodyVi: promo.bannerBodyVi || '',
    bannerAccentColor: promo.bannerAccentColor || '#06b6d4',
  };
  if (forDisplay) return payload;
  return { promo, ...payload };
}

async function findActiveBannerForCourse(courseId) {
  const now = new Date();
  const promos = await promoCodeRepository.listActive(activePromoQuery(now), {
    sort: { endsAt: 1, createdAt: -1 },
  });

  for (const p of promos) {
    if (!isPromoAvailable(p, now)) continue;
    if (!appliesToCourse(p, courseId)) continue;
    return buildPromoDisplay(p);
  }
  return null;
}

/**
 * Danh sách campaign đang chạy — hiển thị banner site-wide & thông báo.
 * @param {{ limit?: number }} opts
 */
async function listActivePromotions({ limit = 8 } = {}) {
  const now = new Date();
  // Lấy dư rồi lọc, vì "còn lượt dùng" không biểu diễn được bằng query.
  const promos = await promoCodeRepository.listActive(activePromoQuery(now), {
    sort: { createdAt: -1 },
    limit: Math.min(limit * 3, MAX_ACTIVE_SCAN),
  });

  const available = promos.filter((p) => isPromoAvailable(p, now)).slice(0, limit);
  if (!available.length) return [];

  const allCourseIds = [
    ...new Set(available.flatMap((p) => (Array.isArray(p.courseIds) ? p.courseIds.map(String) : []))),
  ];
  let courseMap = {};
  if (allCourseIds.length) {
    const courses = await listPublishedPricingByIds(allCourseIds);
    courseMap = Object.fromEntries(courses.map((c) => [String(c._id), c]));
  }

  return available.map((p) => {
    const display = buildPromoDisplay(p);
    const courseIds = Array.isArray(p.courseIds) ? p.courseIds.map(String) : [];
    const courses = courseIds
      .map((id) => courseMap[id])
      .filter(Boolean)
      .map((c) => ({
        id: String(c._id),
        title: c.title,
        slug: c.slug,
        href: `/courses/${c.slug}`,
        checkoutHref: `/courses/${c.slug}/checkout?promo=${encodeURIComponent(p.code)}`,
      }));
    const primaryHref =
      courses[0]?.href || (display.appliesToAll ? '/courses?pricing=paid' : '/courses');
    const primaryCheckout =
      courses[0]?.checkoutHref ||
      (display.appliesToAll ? `/courses?pricing=paid` : '/courses');

    return {
      ...display,
      courses,
      primaryHref,
      primaryCheckoutHref: primaryCheckout,
    };
  });
}

async function recordPromoRedemption(
  { promoCodeId, code, userId, courseId, orderId, txnRef, discountAmount },
  session,
) {
  await promoRedemptionRepository.record(
    { promoCodeId, code, userId, courseId, orderId, txnRef, discountAmount },
    session,
  );
  await promoCodeRepository.incrementRedemptions(promoCodeId, session);
}

function promoToAdminDto(doc) {
  const d = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(d._id),
    code: d.code,
    labelVi: d.labelVi,
    descriptionVi: d.descriptionVi,
    discountType: d.discountType,
    discountValue: d.discountValue,
    courseIds: d.courseIds || [],
    startsAt: d.startsAt ? new Date(d.startsAt).toISOString() : null,
    endsAt: d.endsAt ? new Date(d.endsAt).toISOString() : null,
    maxRedemptions: d.maxRedemptions,
    redemptionCount: d.redemptionCount ?? 0,
    maxPerUser: d.maxPerUser ?? 1,
    active: Boolean(d.active),
    eventKey: d.eventKey,
    bannerTitleVi: d.bannerTitleVi,
    bannerBodyVi: d.bannerBodyVi,
    bannerAccentColor: d.bannerAccentColor,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

module.exports = {
  normalizeCode,
  computePromoDiscount,
  resolvePromoForCheckout,
  findActiveBannerForCourse,
  listActivePromotions,
  buildPromoDisplay,
  recordPromoRedemption,
  promoToAdminDto,
  appliesToCourse,
  isWithinWindow,
};
