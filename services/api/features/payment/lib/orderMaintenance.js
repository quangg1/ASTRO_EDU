const { orderRepository } = require('../repositories/orderRepository');

/** Thời gian giữ đơn pending trước khi huỷ (người dùng phải tạo đơn mới). */
const PENDING_TTL_MS = 60 * 60 * 1000;

/** Đơn tự học không gắn lớp; dữ liệu cũ có thể để trống theo nhiều kiểu. */
function catalogOrderFilter() {
  return { $or: [{ cohortId: null }, { cohortId: '' }, { cohortId: { $exists: false } }] };
}

function pendingExpiresAt(createdAt) {
  return new Date(new Date(createdAt).getTime() + PENDING_TTL_MS);
}

async function expireStalePendingOrders() {
  const now = new Date();
  const createdCutoff = new Date(Date.now() - PENDING_TTL_MS);
  const result = await orderRepository.cancelMany({
    status: 'pending',
    $or: [
      { expiresAt: { $ne: null, $lt: now } },
      { expiresAt: null, createdAt: { $lt: createdCutoff } },
    ],
  });
  return result.modifiedCount || 0;
}

/** Huỷ pending còn sót khi user đã có đơn completed cùng khóa (+ cohort nếu có). */
async function cancelPendingSupersededByCompleted() {
  const completedGroups = await orderRepository.groupCompletedByLearnerCourse();

  let cancelled = 0;
  for (const group of completedGroups) {
    const { userId, courseId, cohortId } = group._id;
    const filter = { userId, courseId, status: 'pending' };
    if (cohortId) {
      filter.cohortId = cohortId;
    } else {
      Object.assign(filter, catalogOrderFilter());
    }
    const result = await orderRepository.cancelMany(filter);
    cancelled += result.modifiedCount || 0;
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
