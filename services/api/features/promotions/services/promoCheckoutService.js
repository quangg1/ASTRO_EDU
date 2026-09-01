const { AppError } = require('../../../shared/errors');
const { getPublishedPricing } = require('../../courses/services/coursePricingLookupService');
const {
  findActiveBannerForCourse,
  resolvePromoForCheckout,
  computePromoDiscount,
} = require('./promoCodeService');

/** Khóa miễn phí không có gì để giảm giá nên cũng không hiện banner. */
async function getCourseBanner(courseId) {
  const course = await getPublishedPricing(courseId);
  if (!course?.requiresPayment) return null;
  return findActiveBannerForCourse(String(course._id));
}

async function validatePromoForCourse({ code, courseId, userId }) {
  const resolved = await resolvePromoForCheckout({ code, courseId, userId });

  const course = await getPublishedPricing(courseId);
  if (!course) throw new AppError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy khóa học');

  const listPrice = Math.round(Number(course.price) || 0);
  const discount = computePromoDiscount(listPrice, resolved.promo);

  return {
    code: resolved.code,
    labelVi: resolved.labelVi,
    discountType: resolved.discountType,
    discountValue: resolved.discountValue,
    discountAmount: discount.discountAmount,
    finalAmount: discount.finalAmount,
    discountPct: discount.discountPct,
    currency: course.currency || 'VND',
  };
}

module.exports = { getCourseBanner, validatePromoForCourse };
