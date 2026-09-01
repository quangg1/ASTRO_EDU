const { getCatalogPaymentCreditVnd } = require('../../payment/services/orderCreditService');
const { resolveCohortPrice, computeCohortUpgradeDue } = require('./cohortPricing');

/**
 * Giá checkout cohort sau khi trừ credit catalog (nếu có).
 * Credit lookup nằm ở payment/orderCreditService — không đọc Order model tại đây.
 */
async function resolveCohortCheckoutPrice({ userId, cohort, course }) {
  const pricing = resolveCohortPrice(cohort, course);
  if (!pricing.requiresPayment) {
    return {
      ...pricing,
      cohortFullPrice: pricing.price,
      catalogCredit: 0,
      listPrice: 0,
      isCatalogUpgrade: false,
    };
  }

  const { creditVnd } = await getCatalogPaymentCreditVnd({
    userId,
    courseId: course._id,
  });
  const upgrade = computeCohortUpgradeDue({
    cohortFullPrice: pricing.price,
    cohortCurrency: pricing.currency,
    creditVnd,
  });

  return {
    ...pricing,
    price: upgrade.listPrice,
    requiresPayment: upgrade.requiresPayment,
    cohortFullPrice: upgrade.cohortFullPrice,
    catalogCredit: upgrade.catalogCredit,
    listPrice: upgrade.listPrice,
    isCatalogUpgrade: upgrade.isCatalogUpgrade,
  };
}

module.exports = {
  getCatalogPaymentCreditVnd,
  resolveCohortCheckoutPrice,
};
