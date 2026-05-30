const Order = require('../../payment/models/Order');
const { amountToVnd } = require('../../../shared/money/revenueVnd');
const { resolveCohortPrice, computeCohortUpgradeDue } = require('./cohortPricing');

/**
 * Tổng học phí catalog đã thanh toán (đơn completed, không kèm cohort).
 */
async function getCatalogPaymentCreditVnd({ userId, courseId }) {
  const orders = await Order.find({
    userId,
    courseId: String(courseId),
    status: 'completed',
    $or: [{ cohortId: null }, { cohortId: '' }, { cohortId: { $exists: false } }],
  }).lean();

  let creditVnd = 0;
  for (const o of orders) {
    creditVnd += amountToVnd(o.amount, o.currency || 'VND');
  }
  return { creditVnd, orderCount: orders.length };
}

/**
 * Giá checkout cohort sau khi trừ credit catalog (nếu có).
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
