/* eslint-disable no-restricted-imports -- Admin read-model: cross-feature aggregates for ops console. */
/**
 * Admin commerce / enrollment read-write boundary.
 *
 * Order, enrollment and course admin consoles need Course / Cohort /
 * Enrollment / CohortEnrollment / Order together. Those foreign model
 * imports live here so admin services never touch another feature's models
 * directly.
 */
const Order = require('../../payment/models/Order');
const Enrollment = require('../../courses/models/Enrollment');
const CohortEnrollment = require('../../courses/models/CohortEnrollment');
const Course = require('../../courses/models/Course');
const Cohort = require('../../courses/models/Cohort');
const { amountToVndAggExpr } = require('../../../shared/money/revenueVnd');

// ----------------------------------------------------------------- courses

function listCourses(filter, { skip, limit } = {}) {
  return Course.find(filter)
    .select('title slug published price currency isPaid teacherId createdAt updatedAt')
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();
}

const countCourses = (filter = {}) => Course.countDocuments(filter);

function findCourseByIdLean(courseId) {
  return Course.findById(courseId).lean();
}

function findCourseDocById(courseId) {
  return Course.findById(courseId);
}

// ----------------------------------------------------------------- cohorts

function findCohortByIdLean(cohortId) {
  return Cohort.findById(cohortId).lean();
}

function findCohortsByIds(cohortIds, select = 'title slug') {
  if (!cohortIds.length) return Promise.resolve([]);
  return Cohort.find({ _id: { $in: cohortIds } })
    .select(select)
    .lean();
}

// ------------------------------------------------------------------ orders

function listOrders(filter, { skip, limit } = {}) {
  return Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
}

const countOrders = (filter = {}) => Order.countDocuments(filter);

function findOrderByTxnRefLean(txnRef) {
  return Order.findOne({ txnRef }).lean();
}

function findOrderDocByTxnRef(txnRef) {
  return Order.findOne({ txnRef });
}

function listRecentNonCancelledOrders(limit = 20) {
  return Order.find({ status: { $ne: 'cancelled' } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
}

async function getOrderOverviewCounts() {
  const [
    totalOrders,
    completedOrders,
    failedOrders,
    refundedOrders,
    cancelledOrders,
    pendingOrders,
    agg,
  ] = await Promise.all([
    Order.countDocuments({ status: { $nin: ['cancelled'] } }),
    Order.countDocuments({ status: 'completed' }),
    Order.countDocuments({ status: 'failed' }),
    Order.countDocuments({ status: 'refunded' }),
    Order.countDocuments({ status: 'cancelled' }),
    Order.countDocuments({ status: 'pending' }),
    Order.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, sum: { $sum: amountToVndAggExpr() } } },
    ]),
  ]);
  const totalRevenue = agg.length > 0 ? Math.round(agg[0].sum) : 0;
  return {
    totalOrders,
    completedOrders,
    failedOrders,
    refundedOrders,
    cancelledOrders,
    pendingOrders,
    totalRevenue,
  };
}

// ------------------------------------------------------------- enrollments

function findCatalogEnrollment(userId, courseId) {
  return Enrollment.findOne({ userId: String(userId), courseId });
}

function createCatalogEnrollment(doc) {
  return Enrollment.create(doc);
}

function deleteCatalogEnrollment(userId, courseId) {
  return Enrollment.deleteOne({ userId: String(userId), courseId });
}

function findCohortEnrollmentLean(userId, cohortId) {
  return CohortEnrollment.findOne({ cohortId, userId: String(userId) }).lean();
}

function deleteCohortEnrollment(userId, cohortId) {
  return CohortEnrollment.deleteOne({ userId: String(userId), cohortId });
}

function revokeAccessForRefundedOrder(order) {
  if (order.cohortId) {
    return Promise.all([
      CohortEnrollment.deleteOne({ userId: order.userId, cohortId: order.cohortId }),
      (() => {
        const meta = order.metadata || {};
        if (!meta.upgradeFromCatalog) {
          return Enrollment.deleteOne({ userId: order.userId, courseId: order.courseId });
        }
        return Promise.resolve();
      })(),
    ]);
  }
  return Enrollment.deleteOne({ userId: order.userId, courseId: order.courseId });
}

module.exports = {
  listCourses,
  countCourses,
  findCourseByIdLean,
  findCourseDocById,
  findCohortByIdLean,
  findCohortsByIds,
  listOrders,
  countOrders,
  findOrderByTxnRefLean,
  findOrderDocByTxnRef,
  listRecentNonCancelledOrders,
  getOrderOverviewCounts,
  findCatalogEnrollment,
  createCatalogEnrollment,
  deleteCatalogEnrollment,
  findCohortEnrollmentLean,
  deleteCohortEnrollment,
  revokeAccessForRefundedOrder,
};
