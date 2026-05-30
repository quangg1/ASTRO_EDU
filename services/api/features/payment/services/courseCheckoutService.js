const Course = require('../../courses/models/Course')
const Enrollment = require('../../courses/models/Enrollment')
const UserReward = require('../../rewards/models/UserReward')
const GemTransaction = require('../../rewards/models/GemTransaction')
const { getOrCreateConfigDoc } = require('../../rewards/services/gemRuntimeConfigService')
const { getWalletLearnerMeta } = require('../../rewards/services/learnerTierService')
const { AppError } = require('../../../shared/errors')
const { COURSE_VOUCHER_TIERS, getTierById } = require('../constants/courseVoucherTiers')
const {
  resolvePromoForCheckout,
  computePromoDiscount,
  normalizeCode,
} = require('../../promotions/services/promoCodeService')
const { loadEnrollableCohort } = require('../../courses/services/cohortEnrollmentService')
const { resolveCohortCheckoutPrice } = require('../../courses/lib/cohortCheckoutPricing')
const { assertCatalogNotAlreadyOwned } = require('../lib/orderPurchaseGuard')
const CohortEnrollment = require('../../courses/models/CohortEnrollment')

function clampDiscountPct(pct, maxCap) {
  const p = Math.round(Number(pct) || 0)
  const cap = Math.round(Number(maxCap) || 15)
  return Math.min(Math.max(p, 0), Math.min(15, cap))
}

function computeGemVoucherDiscount(listPriceVnd, discountPct) {
  const price = Math.round(Number(listPriceVnd) || 0)
  const pct = clampDiscountPct(discountPct, 15)
  if (price <= 0 || pct <= 0) {
    return { discountAmount: 0, finalAmount: price, discountPct: 0 }
  }
  const discountAmount = Math.min(price, Math.round((price * pct) / 100))
  const finalAmount = Math.max(0, price - discountAmount)
  return { discountAmount, finalAmount, discountPct: pct }
}

async function assertPaidCoursePurchasable({ userId, courseId }) {
  const course = await Course.findOne({ _id: courseId, published: true }).lean()
  if (!course) throw new AppError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy khóa học')
  if (!course.isPaid || !(course.price > 0)) {
    throw new AppError(400, 'NOT_PAID_COURSE', 'Khóa học không yêu cầu thanh toán')
  }
  await assertCatalogNotAlreadyOwned({ userId, courseId: course._id })
  return course
}

async function assertCohortCheckoutPurchasable({ userId, courseId, cohortId }) {
  const course = await Course.findOne({ _id: courseId, published: true }).lean()
  if (!course) throw new AppError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy khóa học')
  const cohort = await loadEnrollableCohort({ courseId: course._id, cohortId })
  const pricing = await resolveCohortCheckoutPrice({ userId, cohort, course })
  if (!pricing.requiresPayment) {
    const msg = pricing.isCatalogUpgrade
      ? 'Bạn đã trả đủ học phí tự học — đăng ký lớp trực tiếp, không cần thanh toán thêm.'
      : 'Lớp này không yêu cầu thanh toán — dùng đăng ký lớp trực tiếp.'
    throw new AppError(400, pricing.isCatalogUpgrade ? 'COHORT_UPGRADE_FREE' : 'COHORT_FREE', msg)
  }
  const inCohort = await CohortEnrollment.findOne({ userId, cohortId: cohort._id }).lean()
  if (inCohort) {
    throw new AppError(400, 'ALREADY_IN_COHORT', 'Bạn đã ở trong lớp này')
  }
  return {
    course,
    cohort,
    listPrice: pricing.listPrice,
    currency: pricing.currency,
    cohortFullPrice: pricing.cohortFullPrice,
    catalogCredit: pricing.catalogCredit,
    isCatalogUpgrade: pricing.isCatalogUpgrade,
  }
}

/**
 * Báo giá checkout — một nguồn giảm: coupon | gem voucher | learner tier.
 */
async function getCheckoutQuote({
  userId,
  courseId,
  voucherTierId,
  promoCode,
  useLearnerTierDiscount,
  cohortId = null,
}) {
  let course
  let listPrice
  let checkoutCurrency
  let cohortCheckout = null
  let cohortFullPrice = null
  let catalogCredit = 0
  let isCatalogUpgrade = false

  if (cohortId) {
    const bundle = await assertCohortCheckoutPurchasable({ userId, courseId, cohortId })
    course = bundle.course
    cohortCheckout = bundle.cohort
    listPrice = bundle.listPrice
    checkoutCurrency = bundle.currency
    cohortFullPrice = bundle.cohortFullPrice
    catalogCredit = bundle.catalogCredit
    isCatalogUpgrade = bundle.isCatalogUpgrade
  } else {
    course = await assertPaidCoursePurchasable({ userId, courseId })
    listPrice = Math.round(Number(course.price) || 0)
    checkoutCurrency = course.currency || 'VND'
  }

  const cfg = await getOrCreateConfigDoc()
  const maxCap = cfg?.voucherMaxDiscountPct ?? 15
  const ur = await UserReward.findOne({ userId }).lean()
  const gemBalance = ur?.gemBalance ?? 0
  const totalGemsEarned = ur?.totalGemsEarned ?? 0
  const learnerProgress = getWalletLearnerMeta(totalGemsEarned)
  const learnerTier = learnerProgress.current
  const tierCheckoutPct = clampDiscountPct(learnerTier.checkoutDiscountPct, maxCap)

  const hasPromo = Boolean(normalizeCode(promoCode))
  const hasVoucher = Boolean(String(voucherTierId || '').trim())
  const wantTier =
    useLearnerTierDiscount !== false && tierCheckoutPct > 0 && !hasPromo && !hasVoucher

  if (hasPromo && hasVoucher) {
    throw new AppError(
      400,
      'DISCOUNT_EXCLUSIVE',
      'Chỉ được dùng một mã giảm giá: coupon, voucher gem hoặc ưu đãi hạng.',
    )
  }
  if (hasPromo && useLearnerTierDiscount === true && tierCheckoutPct > 0) {
    throw new AppError(
      400,
      'DISCOUNT_EXCLUSIVE',
      'Không dùng coupon cùng ưu đãi hạng Learner.',
    )
  }

  const tiers = COURSE_VOUCHER_TIERS.map((t) => {
    const effectivePct = clampDiscountPct(t.discountPct, maxCap)
    const { discountAmount, finalAmount } = computeGemVoucherDiscount(listPrice, effectivePct)
    const supersededByTier = !hasPromo && tierCheckoutPct >= effectivePct
    const eligible = !hasPromo && !supersededByTier && gemBalance >= t.gemCost
    return {
      id: t.id,
      labelVi: t.labelVi,
      discountPct: effectivePct,
      gemCost: t.gemCost,
      discountAmount,
      finalAmount,
      eligible,
      supersededByLearnerTier: supersededByTier,
      lockedReason: hasPromo
        ? 'Không dùng cùng coupon'
        : supersededByTier
          ? `Hạng ${learnerTier.nameVi} đã cho ${tierCheckoutPct}% (không trừ gem)`
          : eligible
            ? null
            : `Cần ${t.gemCost} gem (bạn có ${gemBalance})`,
    }
  })

  let selected = null
  let discountSource = 'none'

  if (hasPromo) {
    const resolved = await resolvePromoForCheckout({
      code: promoCode,
      courseId: String(course._id),
      userId,
    })
    const discount = computePromoDiscount(listPrice, resolved.promo)
    selected = {
      tierId: null,
      labelVi: null,
      discountPct: discount.discountPct,
      gemCost: 0,
      discountAmount: discount.discountAmount,
      finalAmount: discount.finalAmount,
      promoCode: resolved.code,
      promoCodeId: resolved.promoCodeId,
      promoLabelVi: resolved.labelVi,
      learnerTierId: null,
      learnerTierLabelVi: null,
    }
    discountSource = 'promo'
  } else if (hasVoucher) {
    const tier = getTierById(voucherTierId)
    if (!tier) {
      throw new AppError(400, 'INVALID_VOUCHER', 'Voucher không hợp lệ')
    }
    if (tierCheckoutPct >= tier.discountPct) {
      throw new AppError(
        400,
        'VOUCHER_SUPERSEDED',
        `Hạng ${learnerTier.nameVi} đã cho ${tierCheckoutPct}% — không cần đốt gem voucher.`,
      )
    }
    const effectivePct = clampDiscountPct(tier.discountPct, maxCap)
    const { discountAmount, finalAmount, discountPct } = computeGemVoucherDiscount(listPrice, effectivePct)
    if (gemBalance < tier.gemCost) {
      throw new AppError(402, 'INSUFFICIENT_GEMS', 'Không đủ gem cho voucher này')
    }
    selected = {
      tierId: tier.id,
      labelVi: tier.labelVi,
      discountPct,
      gemCost: tier.gemCost,
      discountAmount,
      finalAmount,
      promoCode: null,
      promoCodeId: null,
      promoLabelVi: null,
      learnerTierId: null,
      learnerTierLabelVi: null,
    }
    discountSource = 'gem_voucher'
  } else if (wantTier) {
    const { discountAmount, finalAmount, discountPct } = computeGemVoucherDiscount(
      listPrice,
      tierCheckoutPct,
    )
    selected = {
      tierId: null,
      labelVi: null,
      discountPct,
      gemCost: 0,
      discountAmount,
      finalAmount,
      promoCode: null,
      promoCodeId: null,
      promoLabelVi: null,
      learnerTierId: learnerTier.id,
      learnerTierLabelVi: `${learnerTier.emoji} ${learnerTier.nameVi}`,
    }
    discountSource = 'learner_tier'
  } else {
    const { finalAmount } = computeGemVoucherDiscount(listPrice, 0)
    selected = {
      tierId: null,
      labelVi: null,
      discountPct: 0,
      gemCost: 0,
      discountAmount: 0,
      finalAmount,
      promoCode: null,
      promoCodeId: null,
      promoLabelVi: null,
      learnerTierId: null,
      learnerTierLabelVi: null,
    }
  }

  return {
    courseId: String(course._id),
    courseSlug: course.slug,
    courseTitle: course.title,
    cohortId: cohortCheckout ? String(cohortCheckout._id) : null,
    cohortTitle: cohortCheckout?.title || null,
    checkoutKind: cohortCheckout ? 'cohort' : 'catalog',
    currency: checkoutCurrency,
    listPrice,
    cohortFullPrice: cohortCheckout ? cohortFullPrice : null,
    catalogCredit: cohortCheckout ? catalogCredit : 0,
    isCatalogUpgrade: cohortCheckout ? isCatalogUpgrade : false,
    gemBalance,
    totalGemsEarned,
    maxDiscountPct: Math.min(15, maxCap),
    learnerTier: learnerProgress,
    tiers,
    selected,
    discountSource,
    exclusiveDiscountVi:
      'Mỗi khóa học chỉ một ưu đãi: coupon, voucher gem (đốt gem), hoặc giảm giá hạng Learner.',
    gemPolicyVi:
      'Gem là phần thưởng học tập. Hạng Learner tính trên tổng gem đã kiếm; giảm giá hạng không trừ gem.',
  }
}

async function burnCommittedGemsForOrder(order, session = null) {
  const gems = Math.round(Number(order.gemsCommitted) || 0)
  const tierId = String(order.voucherTierId || '').trim()
  if (!gems || !tierId) return { burned: 0 }

  const q = UserReward.findOneAndUpdate(
    { userId: order.userId, gemBalance: { $gte: gems } },
    { $inc: { gemBalance: -gems } },
    { new: true, session: session || undefined },
  )
  const updated = await q.lean()

  if (!updated) {
    const err = new Error('INSUFFICIENT_GEMS_AT_FULFILL')
    err.code = 'INSUFFICIENT_GEMS_AT_FULFILL'
    throw err
  }

  await GemTransaction.create(
    [
      {
        userId: order.userId,
        delta: -gems,
        reason: 'course_voucher_checkout',
        balanceAfter: updated.gemBalance,
        metadata: {
          txnRef: order.txnRef,
          courseId: order.courseId,
          voucherTierId: tierId,
          discountPct: order.discountPct,
        },
      },
    ],
    session ? { session } : undefined,
  )

  return { burned: gems, gemBalance: updated.gemBalance }
}

module.exports = {
  COURSE_VOUCHER_TIERS,
  getCheckoutQuote,
  burnCommittedGemsForOrder,
  computeDiscountAmount: computeGemVoucherDiscount,
  assertPaidCoursePurchasable,
}
