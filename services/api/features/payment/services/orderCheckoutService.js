const crypto = require('crypto');
const { AppError } = require('../../../shared/errors');
const { getPublishedPricing } = require('../../courses/services/coursePricingLookupService');
const { loadEnrollableCohort } = require('../../courses/services/cohortEnrollmentService');
const { orderRepository } = require('../repositories/orderRepository');
const { getCheckoutQuote } = require('./courseCheckoutService');
const { completeOrderAndEnroll } = require('./paymentFulfillmentService');
const { enrichOrdersForUser } = require('../lib/serializeUserOrder');
const { runOrderMaintenance, PENDING_TTL_MS, pendingExpiresAt } = require('../lib/orderMaintenance');
const {
  findReusablePendingOrder,
  cancelOtherPendingOrders,
} = require('../lib/orderPurchaseGuard');

const mintTxnRef = () => `GAL${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
const mintTransactionId = () =>
  `TXN${Date.now()}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

function discountSourceOf(quote, selected) {
  if (quote.discountSource) return quote.discountSource;
  if (selected.promoCode) return 'promo';
  if (selected.tierId) return 'gem_voucher';
  if (selected.learnerTierId) return 'learner_tier';
  return 'none';
}

function expiresAtMs(order) {
  return order.expiresAt
    ? new Date(order.expiresAt).getTime()
    : new Date(order.createdAt).getTime() + PENDING_TTL_MS;
}

/**
 * Tạo đơn pending — chưa trừ gem, chưa ghi danh. Nếu người học bấm lại nút mua
 * thì dùng lại đơn còn hiệu lực thay vì sinh thêm đơn mới.
 */
async function mintPendingOrder({ userId, courseId, voucherTierId, promoCode, cohortId }) {
  const quote = await getCheckoutQuote({
    userId,
    courseId,
    voucherTierId,
    promoCode,
    cohortId,
  });

  const course = await getPublishedPricing(courseId);
  if (!course) throw new AppError(404, 'COURSE_NOT_FOUND', 'Không tìm thấy khóa học');

  let resolvedCohortId = null;
  if (cohortId) {
    const cohort = await loadEnrollableCohort({ courseId: course._id, cohortId });
    resolvedCohortId = String(cohort._id);
  }

  const reusable = await findReusablePendingOrder({
    userId,
    courseId: course._id,
    cohortId: resolvedCohortId,
  });
  if (reusable) return { course, order: reusable, quote, reusedPending: true };

  await cancelOtherPendingOrders({ userId, courseId: course._id, cohortId: resolvedCohortId });

  const selected = quote.selected;
  const order = await orderRepository.create({
    userId,
    courseId: String(course._id),
    courseSlug: course.slug,
    cohortId: resolvedCohortId,
    listPrice: quote.listPrice,
    discountPct: selected.discountPct,
    discountAmount: selected.discountAmount,
    amount: selected.finalAmount,
    voucherTierId: selected.tierId,
    learnerTierId: selected.learnerTierId,
    promoCodeId: selected.promoCodeId,
    promoCode: selected.promoCode,
    discountSource: discountSourceOf(quote, selected),
    gemsCommitted: selected.gemCost,
    currency: quote.currency || 'VND',
    status: 'pending',
    expiresAt: pendingExpiresAt(new Date()),
    gateway: 'demo',
    txnRef: mintTxnRef(),
    metadata: {
      demoMode: true,
      ...(quote.isCatalogUpgrade
        ? {
            upgradeFromCatalog: true,
            catalogCredit: quote.catalogCredit,
            cohortFullPrice: quote.cohortFullPrice,
          }
        : {}),
    },
  });

  return { course, order, quote, reusedPending: false };
}

async function createCheckout(userId, input) {
  const { course, order, quote, reusedPending } = await mintPendingOrder({ userId, ...input });

  return {
    txnRef: order.txnRef,
    reusedPending,
    amount: order.amount,
    listPrice: order.listPrice,
    discountAmount: order.discountAmount,
    discountPct: order.discountPct,
    currency: order.currency,
    courseSlug: course.slug,
    courseTitle: quote.courseTitle,
    gemsCommitted: order.gemsCommitted,
    promoCode: order.promoCode,
    discountSource: order.discountSource,
    learnerTierId: order.learnerTierId,
    expiresAt: new Date(expiresAtMs(order)).toISOString(),
    demoMode: true,
  };
}

async function confirmCheckout({ userId, txnRef, paymentMethod }) {
  if (paymentMethod !== 'card') {
    throw new AppError(400, 'INVALID_PAYMENT_METHOD', 'Phương thức thanh toán không hợp lệ');
  }

  const order = await orderRepository.findDocByTxnRefForUser(txnRef, userId);
  if (!order) throw new AppError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');

  // Bấm xác nhận hai lần không được tính tiền hai lần.
  if (order.status === 'completed') {
    return {
      status: 'completed',
      courseSlug: order.courseSlug,
      txnRef: order.txnRef,
      alreadyCompleted: true,
    };
  }
  if (order.status !== 'pending') {
    throw new AppError(400, 'ORDER_NOT_PAYABLE', 'Đơn hàng không thể thanh toán');
  }
  if (Date.now() > expiresAtMs(order)) {
    order.status = 'cancelled';
    await order.save();
    throw new AppError(400, 'ORDER_EXPIRED', 'Đơn hàng đã hết hạn. Vui lòng tạo đơn mới.');
  }

  const transactionId = mintTransactionId();
  const result = await completeOrderAndEnroll({ txnRef, transactionId });

  return {
    status: 'completed',
    courseSlug: result.courseSlug,
    txnRef,
    transactionId,
    paidAt: new Date().toISOString(),
  };
}

async function getOrderStatus(userId, txnRef) {
  const order = await orderRepository.findByTxnRefForUser(txnRef, userId);
  if (!order) throw AppError.notFound('Không tìm thấy đơn hàng');

  return {
    status: order.status,
    courseSlug: order.courseSlug,
    paidAt: order.paidAt || null,
    transactionId: order.transactionId || null,
  };
}

/** Dọn đơn treo trước khi liệt kê để lịch sử không hiện đơn đã quá hạn. */
async function listOrders(userId) {
  await runOrderMaintenance();
  return enrichOrdersForUser(await orderRepository.listVisibleForUser(userId));
}

module.exports = { createCheckout, confirmCheckout, getOrderStatus, listOrders };
