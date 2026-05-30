const Order = require('../../payment/models/Order');
const User = require('../../auth/models/User');
const Cohort = require('../../courses/models/Cohort');
const Enrollment = require('../../courses/models/Enrollment');
const CohortEnrollment = require('../../courses/models/CohortEnrollment');
const { amountToVndAggExpr, getUsdToVndRate } = require('../../../shared/money/revenueVnd');
const { runOrderMaintenance, pendingExpiresAt } = require('../../payment/lib/orderMaintenance');
const { resolveOrderKind } = require('../../payment/lib/serializeUserOrder');
const { AppError } = require('../../../shared/errors');
const { recordAdminAction } = require('../lib/recordAdminAction');

function serializeAdminOrder(order, userById, cohortById = new Map()) {
  const u = userById.get(String(order.userId));
  const meta = order.metadata || {};
  const expiresAt =
    order.expiresAt ||
    (order.status === 'pending' && order.createdAt ? pendingExpiresAt(order.createdAt) : null);
  const cohort = order.cohortId ? cohortById.get(String(order.cohortId)) : null;

  return {
    id: String(order._id),
    _id: String(order._id),
    userId: order.userId,
    buyerEmail: u?.email || null,
    buyerName: u?.displayName || null,
    courseId: order.courseId,
    courseSlug: order.courseSlug,
    cohortId: order.cohortId || null,
    cohortTitle: cohort?.title || null,
    orderKind: resolveOrderKind(order),
    amount: order.amount,
    listPrice: order.listPrice ?? 0,
    discountPct: order.discountPct ?? 0,
    discountAmount: order.discountAmount ?? 0,
    discountSource: order.discountSource || 'none',
    promoCode: order.promoCode || null,
    gemsCommitted: order.gemsCommitted ?? 0,
    currency: order.currency || 'VND',
    status: order.status,
    gateway: order.gateway || 'demo',
    txnRef: order.txnRef,
    transactionId: order.transactionId || null,
    adminNote: order.adminNote || '',
    createdAt: order.createdAt,
    paidAt: order.paidAt || null,
    expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    refundedAt: order.refundedAt || null,
    refundReason: order.refundReason || '',
    upgradeFromCatalog: Boolean(meta.upgradeFromCatalog),
    catalogCredit: meta.catalogCredit ?? null,
    cohortFullPrice: meta.cohortFullPrice ?? null,
  };
}

async function loadUserMap(userIds) {
  if (!userIds.length) return new Map();
  const users = await User.find({ _id: { $in: userIds } })
    .select('email displayName')
    .lean();
  return new Map(users.map((u) => [String(u._id), u]));
}

async function loadCohortMap(cohortIds) {
  if (!cohortIds.length) return new Map();
  const cohorts = await Cohort.find({ _id: { $in: cohortIds } })
    .select('title slug')
    .lean();
  return new Map(cohorts.map((c) => [String(c._id), c]));
}

async function resolveOrderSearchUserIds(q) {
  const trimmed = String(q || '').trim();
  if (!trimmed || trimmed.startsWith('GAL') || trimmed.startsWith('TXN')) return null;
  const rx = new RegExp(trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const users = await User.find({ $or: [{ email: rx }, { displayName: rx }] })
    .select('_id')
    .limit(50)
    .lean();
  return users.map((u) => String(u._id));
}

async function buildOrderListFilter({ status, q, courseSlug, from, to }) {
  const filter = {};
  if (status && status !== 'all') {
    if (status === 'inactive') {
      filter.status = { $in: ['cancelled', 'failed', 'refunded'] };
    } else {
      filter.status = status;
    }
  }
  if (courseSlug) filter.courseSlug = courseSlug;

  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const trimmed = String(q || '').trim();
  if (trimmed) {
    const or = [
      { txnRef: new RegExp(trimmed, 'i') },
      { transactionId: new RegExp(trimmed, 'i') },
      { courseSlug: new RegExp(trimmed, 'i') },
    ];
    const userIds = await resolveOrderSearchUserIds(trimmed);
    if (userIds?.length) or.push({ userId: { $in: userIds } });
    filter.$or = or;
  }

  return filter;
}

async function listAdminOrders({ status, q, courseSlug, from, to, page = 1, limit = 30 }) {
  await runOrderMaintenance();
  const filter = await buildOrderListFilter({ status, q, courseSlug, from, to });
  const take = Math.min(100, Math.max(1, limit));
  const skip = Math.max(0, (Math.max(1, page) - 1) * take);

  const [rows, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(take).lean(),
    Order.countDocuments(filter),
  ]);

  const userIds = [...new Set(rows.map((o) => String(o.userId)).filter(Boolean))];
  const cohortIds = [...new Set(rows.filter((o) => o.cohortId).map((o) => String(o.cohortId)))];
  const [userById, cohortById] = await Promise.all([
    loadUserMap(userIds),
    loadCohortMap(cohortIds),
  ]);

  return {
    items: rows.map((o) => serializeAdminOrder(o, userById, cohortById)),
    total,
    page: Math.max(1, page),
    limit: take,
  };
}

async function getAdminOrderDetail(txnRef) {
  await runOrderMaintenance();
  const order = await Order.findOne({ txnRef }).lean();
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  }
  const userById = await loadUserMap([String(order.userId)]);
  const cohortById = order.cohortId
    ? await loadCohortMap([String(order.cohortId)])
    : new Map();
  return serializeAdminOrder(order, userById, cohortById);
}

async function updateAdminOrderNote({ actorUserId, txnRef, adminNote }) {
  const order = await Order.findOne({ txnRef });
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  }
  order.adminNote = String(adminNote || '').trim().slice(0, 2000);
  await order.save();

  await recordAdminAction({
    actorUserId,
    action: 'order_note_update',
    targetType: 'order',
    targetId: txnRef,
    reason: 'Cập nhật ghi chú đơn hàng',
    payload: { adminNote: order.adminNote },
  });

  const userById = await loadUserMap([String(order.userId)]);
  return serializeAdminOrder(order.toObject(), userById);
}

async function cancelAdminPendingOrder({ actorUserId, txnRef, reason }) {
  const order = await Order.findOne({ txnRef });
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  }
  if (order.status !== 'pending') {
    throw new AppError(400, 'ORDER_NOT_PENDING', 'Chỉ huỷ được đơn đang chờ thanh toán');
  }
  order.status = 'cancelled';
  await order.save();

  await recordAdminAction({
    actorUserId,
    action: 'order_cancel',
    targetType: 'order',
    targetId: txnRef,
    reason: reason || 'Admin huỷ đơn pending',
  });

  const userById = await loadUserMap([String(order.userId)]);
  return serializeAdminOrder(order.toObject(), userById);
}

async function refundAdminOrder({ actorUserId, txnRef, reason, revokeAccess = true }) {
  const order = await Order.findOne({ txnRef });
  if (!order) {
    throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  }
  if (order.status !== 'completed') {
    throw new AppError(400, 'ORDER_NOT_REFUNDABLE', 'Chỉ hoàn tiền đơn đã thanh toán');
  }

  order.status = 'refunded';
  order.refundedAt = new Date();
  order.refundedByUserId = String(actorUserId);
  order.refundReason = String(reason || 'Hoàn tiền thủ công (demo)').trim().slice(0, 2000);
  await order.save();

  if (revokeAccess) {
    if (order.cohortId) {
      await CohortEnrollment.deleteOne({ userId: order.userId, cohortId: order.cohortId });
      const meta = order.metadata || {};
      if (!meta.upgradeFromCatalog) {
        await Enrollment.deleteOne({ userId: order.userId, courseId: order.courseId });
      }
    } else {
      await Enrollment.deleteOne({ userId: order.userId, courseId: order.courseId });
    }
  }

  await recordAdminAction({
    actorUserId,
    action: 'order_refund',
    targetType: 'order',
    targetId: txnRef,
    reason: order.refundReason,
    payload: { revokeAccess: Boolean(revokeAccess), amount: order.amount },
  });

  const userById = await loadUserMap([String(order.userId)]);
  return serializeAdminOrder(order.toObject(), userById);
}

async function getAdminOrderOverview() {
  await runOrderMaintenance();

  const totalOrders = await Order.countDocuments({ status: { $nin: ['cancelled'] } });
  const completedOrders = await Order.countDocuments({ status: 'completed' });
  const failedOrders = await Order.countDocuments({ status: 'failed' });
  const refundedOrders = await Order.countDocuments({ status: 'refunded' });
  const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });
  const pendingOrders = await Order.countDocuments({ status: 'pending' });
  const agg = await Order.aggregate([
    { $match: { status: 'completed' } },
    { $group: { _id: null, sum: { $sum: amountToVndAggExpr() } } },
  ]);
  const totalRevenue = agg.length > 0 ? Math.round(agg[0].sum) : 0;

  const recentRaw = await Order.find({ status: { $ne: 'cancelled' } })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  const userIds = [...new Set(recentRaw.map((o) => String(o.userId)).filter(Boolean))];
  const cohortIds = [...new Set(recentRaw.filter((o) => o.cohortId).map((o) => String(o.cohortId)))];
  const [userById, cohortById] = await Promise.all([
    loadUserMap(userIds),
    loadCohortMap(cohortIds),
  ]);

  const recentOrders = recentRaw.map((o) => serializeAdminOrder(o, userById, cohortById));

  return {
    stats: {
      totalOrders,
      completedOrders,
      failedOrders,
      refundedOrders,
      cancelledOrders,
      pendingOrders,
      totalRevenue,
      revenueCurrency: 'VND',
      usdToVndRate: getUsdToVndRate(),
    },
    orders: recentOrders,
  };
}

module.exports = {
  getAdminOrderOverview,
  listAdminOrders,
  getAdminOrderDetail,
  updateAdminOrderNote,
  cancelAdminPendingOrder,
  refundAdminOrder,
  serializeAdminOrder,
};
