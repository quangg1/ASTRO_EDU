const { AppError } = require('../../../shared/errors');
const { hasCatalogEnrollment } = require('../../courses/services/courseAccessService');
const { orderRepository } = require('../repositories/orderRepository');
const { PENDING_TTL_MS, pendingExpiresAt, catalogOrderFilter } = require('./orderMaintenance');

const skuFilter = (courseId, cohortId) => ({
  courseId: String(courseId),
  ...(cohortId ? { cohortId: String(cohortId) } : catalogOrderFilter()),
});

const pendingExpiresMs = (order) =>
  order.expiresAt
    ? new Date(order.expiresAt).getTime()
    : new Date(order.createdAt).getTime() + PENDING_TTL_MS;

/**
 * Đã sở hữu gói tự học (catalog) — không mua lại. Hết hạn do GV quản lý sau.
 */
async function assertCatalogNotAlreadyOwned({ userId, courseId }) {
  const courseIdStr = String(courseId);
  if (await hasCatalogEnrollment(userId, courseIdStr)) {
    throw new AppError(
      400,
      'ALREADY_ENROLLED',
      'Bạn đã có quyền truy cập khóa học này — không cần mua lại.',
    );
  }

  const completedCatalog = await orderRepository.findCompleted({
    userId,
    ...skuFilter(courseIdStr, null),
  });
  if (completedCatalog) {
    throw new AppError(400, 'ALREADY_PURCHASED', 'Bạn đã thanh toán gói tự học cho khóa này.');
  }
}

/**
 * Trả về đơn pending còn hiệu lực cho cùng khóa + loại (tự học hay theo lớp),
 * đồng thời dọn các đơn trùng để mỗi SKU chỉ còn đúng một đơn đang chờ.
 */
async function findReusablePendingOrder({ userId, courseId, cohortId = null }) {
  const orders = await orderRepository.listPending({
    userId,
    ...skuFilter(courseId, cohortId),
  });

  const now = Date.now();
  let reusable = null;

  for (const order of orders) {
    if (now <= pendingExpiresMs(order)) {
      if (!reusable) reusable = order;
      else await orderRepository.cancelById(order._id);
    } else {
      await orderRepository.cancelById(order._id);
    }
  }

  return reusable;
}

/** Huỷ mọi đơn pending khác cùng SKU trước khi tạo đơn mới. */
async function cancelOtherPendingOrders({ userId, courseId, cohortId = null, exceptTxnRef = null }) {
  const filter = {
    userId,
    status: 'pending',
    ...skuFilter(courseId, cohortId),
  };
  if (exceptTxnRef) filter.txnRef = { $ne: exceptTxnRef };

  await orderRepository.cancelMany(filter);
}

module.exports = {
  PENDING_TTL_MS,
  pendingExpiresAt,
  assertCatalogNotAlreadyOwned,
  findReusablePendingOrder,
  cancelOtherPendingOrders,
  catalogOrderFilter,
};
