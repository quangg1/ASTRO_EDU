const { amountToVnd, getUsdToVndRate } = require('../../../shared/money/revenueVnd');

/**
 * Giá lớp cohort (có GV) tách khỏi giá catalog tự học.
 * Thứ tự: cohort.price → course.cohortPrice → course.price
 */

function vndToCheckoutAmount(vnd, currency) {
  const n = Math.max(0, Math.round(Number(vnd) || 0));
  if (String(currency || 'VND').toUpperCase() === 'USD') {
    return Math.max(0, Math.round(n / getUsdToVndRate()));
  }
  return n;
}

/**
 * Học viên đã mua catalog → chỉ trả phần chênh (cohort − credit đã trả).
 * @param {{ cohortFullPrice: number, cohortCurrency: string, creditVnd: number }}
 */
function computeCohortUpgradeDue({ cohortFullPrice, cohortCurrency, creditVnd }) {
  const fullVnd = amountToVnd(cohortFullPrice, cohortCurrency);
  const credit = Math.max(0, Math.round(Number(creditVnd) || 0));
  const dueVnd = Math.max(0, fullVnd - credit);
  const currency = cohortCurrency || 'VND';
  const catalogCredit = vndToCheckoutAmount(credit, currency);
  const listPrice = vndToCheckoutAmount(dueVnd, currency);
  return {
    cohortFullPrice: Math.round(Number(cohortFullPrice) || 0),
    cohortCurrency: currency,
    catalogCredit,
    listPrice,
    requiresPayment: listPrice > 0,
    isCatalogUpgrade: credit > 0,
  };
}

function resolveCohortPrice(cohort, course) {
  const catalogPrice = Math.max(0, Math.round(Number(course?.price) || 0));
  const catalogCurrency = course?.currency || 'VND';

  const cohortOverride =
    cohort?.price != null && Number(cohort.price) > 0 ? Math.round(Number(cohort.price)) : null;
  const courseCohort =
    course?.cohortPrice != null && Number(course.cohortPrice) > 0
      ? Math.round(Number(course.cohortPrice))
      : null;

  let price = catalogPrice;
  if (cohortOverride != null) price = cohortOverride;
  else if (courseCohort != null) price = courseCohort;

  const currency =
    (cohort?.currency && ['VND', 'USD'].includes(cohort.currency) && cohort.currency) ||
    (course?.cohortCurrency && ['VND', 'USD'].includes(course.cohortCurrency) && course.cohortCurrency) ||
    catalogCurrency;

  const requiresPayment = price > 0;

  return {
    price,
    currency,
    requiresPayment,
    catalogPrice,
    catalogCurrency,
    usesCohortPremium: price > catalogPrice,
  };
}

function normalizeCourseCohortPricingFields(course) {
  if (course.cohortPrice != null) {
    course.cohortPrice = Math.max(0, Math.round(Number(course.cohortPrice) || 0));
  }
  if (course.cohortCurrency && !['VND', 'USD'].includes(course.cohortCurrency)) {
    course.cohortCurrency = course.currency || 'VND';
  }
  return course;
}

function normalizeCohortPricingFields(cohort, course) {
  if (cohort.price != null) {
    cohort.price = Math.max(0, Math.round(Number(cohort.price) || 0));
  }
  if (cohort.currency && !['VND', 'USD'].includes(cohort.currency)) {
    cohort.currency = null;
  }
  return cohort;
}

module.exports = {
  resolveCohortPrice,
  computeCohortUpgradeDue,
  normalizeCourseCohortPricingFields,
  normalizeCohortPricingFields,
};
