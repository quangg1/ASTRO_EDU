const Cohort = require('../../courses/models/Cohort');
const { pendingExpiresAt } = require('./orderMaintenance');

function resolveOrderKind(order) {
  const meta = order.metadata || {};
  if (order.cohortId) {
    return meta.upgradeFromCatalog ? 'cohort_upgrade' : 'cohort';
  }
  return 'catalog';
}

/**
 * @param {import('mongoose').LeanDocument[]} orders
 */
async function enrichOrdersForUser(orders) {
  const cohortIds = [
    ...new Set(orders.filter((o) => o.cohortId).map((o) => String(o.cohortId))),
  ];
  const cohorts =
    cohortIds.length > 0
      ? await Cohort.find({ _id: { $in: cohortIds } })
          .select('title')
          .lean()
      : [];
  const titleById = Object.fromEntries(cohorts.map((c) => [String(c._id), c.title]));

  return orders.map((o) => {
    const meta = o.metadata || {};
    const cohortId = o.cohortId ? String(o.cohortId) : null;
    return {
      id: String(o._id),
      _id: String(o._id),
      courseId: o.courseId,
      courseSlug: o.courseSlug,
      cohortId,
      cohortTitle: cohortId ? titleById[cohortId] || null : null,
      orderKind: resolveOrderKind(o),
      amount: o.amount,
      listPrice: o.listPrice ?? 0,
      discountPct: o.discountPct ?? 0,
      discountAmount: o.discountAmount ?? 0,
      discountSource: o.discountSource || 'none',
      promoCode: o.promoCode || null,
      currency: o.currency || 'VND',
      status: o.status,
      gateway: o.gateway,
      transactionId: o.transactionId || null,
      txnRef: o.txnRef,
      paidAt: o.paidAt || null,
      createdAt: o.createdAt,
      expiresAt:
        o.status === 'pending' && o.createdAt
          ? (o.expiresAt
              ? new Date(o.expiresAt).toISOString()
              : pendingExpiresAt(o.createdAt).toISOString())
          : null,
      catalogCredit: meta.catalogCredit ?? null,
      cohortFullPrice: meta.cohortFullPrice ?? null,
      upgradeFromCatalog: Boolean(meta.upgradeFromCatalog),
    };
  });
}

module.exports = { enrichOrdersForUser, resolveOrderKind };
