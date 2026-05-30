const Order = require('../models/Order');

/** Thời gian giữ đơn pending trước khi huỷ (người dùng phải tạo đơn mới). */
const PENDING_TTL_MS = 60 * 60 * 1000;

function catalogOrderFilter() {
  return { $or: [{ cohortId: null }, { cohortId: '' }, { cohortId: { $exists: false } }] };
}

function pendingExpiresAt(createdAt) {
  return new Date(new Date(createdAt).getTime() + PENDING_TTL_MS);
}

async function expireStalePendingOrders() {
  const now = new Date();
  const createdCutoff = new Date(Date.now() - PENDING_TTL_MS);
  const result = await Order.updateMany(
    {
      status: 'pending',
      $or: [
        { expiresAt: { $ne: null, $lt: now } },
        { expiresAt: null, createdAt: { $lt: createdCutoff } },
      ],
    },
    { status: 'cancelled' },
  );
  return result.modifiedCount || 0;
}

/** Huỷ pending còn sót khi user đã có đơn completed cùng khóa (+ cohort nếu có). */
async function cancelPendingSupersededByCompleted() {
  const completedGroups = await Order.aggregate([
    { $match: { status: 'completed' } },
    {
      $group: {
        _id: {
          userId: '$userId',
          courseId: '$courseId',
          cohortId: { $ifNull: ['$cohortId', ''] },
        },
      },
    },
  ]);

  let cancelled = 0;
  for (const g of completedGroups) {
    const { userId, courseId, cohortId } = g._id;
    const filter = { userId, courseId, status: 'pending' };
    if (cohortId) {
      filter.cohortId = cohortId;
    } else {
      Object.assign(filter, catalogOrderFilter());
    }
    const res = await Order.updateMany(filter, { status: 'cancelled' });
    cancelled += res.modifiedCount || 0;
  }
  return cancelled;
}

async function runOrderMaintenance() {
  const expired = await expireStalePendingOrders();
  const superseded = await cancelPendingSupersededByCompleted();
  return { expired, superseded };
}

module.exports = {
  PENDING_TTL_MS,
  pendingExpiresAt,
  catalogOrderFilter,
  expireStalePendingOrders,
  cancelPendingSupersededByCompleted,
  runOrderMaintenance,
};
