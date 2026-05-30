const Order = require('../models/Order');
const Enrollment = require('../../courses/models/Enrollment');
const { AppError } = require('../../../shared/errors');
const { PENDING_TTL_MS, pendingExpiresAt, catalogOrderFilter } = require('./orderMaintenance');

function cohortOrderFilter(cohortId) {
  return { cohortId: String(cohortId) };
}

/**
 * Đã sở hữu gói tự học (catalog) — không mua lại. Hết hạn do GV quản lý sau.
 */
async function assertCatalogNotAlreadyOwned({ userId, courseId }) {
  const courseIdStr = String(courseId);
  const enrollment = await Enrollment.findOne({ userId, courseId: courseIdStr }).lean();
  if (enrollment) {
    throw new AppError(
      400,
      'ALREADY_ENROLLED',
      'Bạn đã có quyền truy cập khóa học này — không cần mua lại.',
    );
  }
  const completedCatalog = await Order.findOne({
    userId,
    courseId: courseIdStr,
    status: 'completed',
    ...catalogOrderFilter(),
  }).lean();
  if (completedCatalog) {
    throw new AppError(
      400,
      'ALREADY_PURCHASED',
      'Bạn đã thanh toán gói tự học cho khóa này.',
    );
  }
}

/**
 * Đơn pending còn hiệu lực cho cùng khóa + loại (catalog vs cohort).
 */
async function findReusablePendingOrder({ userId, courseId, cohortId = null }) {
  const base = {
    userId,
    courseId: String(courseId),
    status: 'pending',
  };
  const filter = cohortId ? { ...base, ...cohortOrderFilter(cohortId) } : { ...base, ...catalogOrderFilter() };

  const orders = await Order.find(filter).sort({ createdAt: -1 }).lean();
  const now = Date.now();
  let reusable = null;

  function pendingExpiresMs(o) {
    if (o.expiresAt) return new Date(o.expiresAt).getTime();
    return new Date(o.createdAt).getTime() + PENDING_TTL_MS;
  }

  for (const o of orders) {
    if (now <= pendingExpiresMs(o)) {
      if (!reusable) reusable = o;
    } else {
      await Order.updateOne({ _id: o._id }, { status: 'cancelled' });
    }
  }

  if (orders.length > 1 && reusable) {
    for (const o of orders) {
      if (String(o._id) !== String(reusable._id) && o.status === 'pending') {
        if (now <= pendingExpiresMs(o)) {
          await Order.updateOne({ _id: o._id }, { status: 'cancelled' });
        }
      }
    }
  }

  return reusable;
}

/** Huỷ mọi đơn pending khác cùng SKU trước khi tạo đơn mới. */
async function cancelOtherPendingOrders({ userId, courseId, cohortId = null, exceptTxnRef = null }) {
  const base = {
    userId,
    courseId: String(courseId),
    status: 'pending',
  };
  const filter = cohortId ? { ...base, ...cohortOrderFilter(cohortId) } : { ...base, ...catalogOrderFilter() };
  if (exceptTxnRef) filter.txnRef = { $ne: exceptTxnRef };

  await Order.updateMany(filter, { status: 'cancelled' });
}

module.exports = {
  PENDING_TTL_MS,
  pendingExpiresAt,
  assertCatalogNotAlreadyOwned,
  findReusablePendingOrder,
  cancelOtherPendingOrders,
  catalogOrderFilter,
};
