/**
 * API công khai: credit học phí catalog đã thanh toán (đơn completed, không kèm cohort).
 * Courses gọi service này thay vì đọc Order model trực tiếp.
 */
const { orderRepository } = require('../repositories/orderRepository');
const { amountToVnd } = require('../../../shared/money/revenueVnd');
const { catalogOrderFilter } = require('../lib/orderMaintenance');

async function getCatalogPaymentCreditVnd({ userId, courseId }) {
  const orders = await orderRepository.findMany({
    userId,
    courseId: String(courseId),
    status: 'completed',
    ...catalogOrderFilter(),
  });

  let creditVnd = 0;
  for (const o of orders) {
    creditVnd += amountToVnd(o.amount, o.currency || 'VND');
  }
  return { creditVnd, orderCount: orders.length };
}

module.exports = { getCatalogPaymentCreditVnd };
