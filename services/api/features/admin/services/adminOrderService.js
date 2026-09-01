const commerce = require('../repositories/adminCommerceReportingRepository');
const {
  listDirectoryEntries,
  searchDirectoryIds,
} = require('../../auth/services/userDirectoryService');
const { getUsdToVndRate } = require('../../../shared/money/revenueVnd');
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
  const entries = await listDirectoryEntries(userIds);
  return new Map(entries.map((entry) => [entry.id, entry]));
}

async function loadCohortMap(cohortIds) {
  if (!cohortIds.length) return new Map();
  const cohorts = await commerce.findCohortsByIds(cohortIds, 'title slug');
  return new Map(cohorts.map((c) => [String(c._id), c]));
}

/** Mã đơn (`GAL…`, `TXN…`) tra thẳng, không phí một vòng tìm người mua. */
async function resolveOrderSearchUserIds(q) {
  const trimmed = String(q || '').trim();
  if (!trimmed || trimmed.startsWith('GAL') || trimmed.startsWith('TXN')) return null;
  return searchDirectoryIds(trimmed);
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
    commerce.listOrders(filter, { skip, limit: take }),
    commerce.countOrders(filter),
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
  const order = await commerce.findOrderByTxnRefLean(txnRef);
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
  const order = await commerce.findOrderDocByTxnRef(txnRef);
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
  const order = await commerce.findOrderDocByTxnRef(txnRef);
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
  const order = await commerce.findOrderDocByTxnRef(txnRef);
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
    await commerce.revokeAccessForRefundedOrder(order);
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

  const statsCounts = await commerce.getOrderOverviewCounts();
  const recentRaw = await commerce.listRecentNonCancelledOrders(20);

  const userIds = [...new Set(recentRaw.map((o) => String(o.userId)).filter(Boolean))];
  const cohortIds = [...new Set(recentRaw.filter((o) => o.cohortId).map((o) => String(o.cohortId)))];
  const [userById, cohortById] = await Promise.all([
    loadUserMap(userIds),
    loadCohortMap(cohortIds),
  ]);

  const recentOrders = recentRaw.map((o) => serializeAdminOrder(o, userById, cohortById));

  return {
    stats: {
      ...statsCounts,
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
